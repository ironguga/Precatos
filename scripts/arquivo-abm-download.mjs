#!/usr/bin/env node
/**
 * Baixa imagens do visualizador do Arquivo Regional e Biblioteca Pública da
 * Madeira (arquivo-abm.madeira.gov.pt), que corre Archeevo 7.
 *
 * A aplicação não expõe IIIF. O caminho real é:
 *   GET /api/descriptions/{id}/digitalobjects
 *       -> um registo por imagem, com os IDs de armazenamento (vault://…)
 *   GET /api/storage/storageobject?objectId=vault://DISSEMINATION/{hash}
 *       -> o JPEG em si
 *
 * Uso:
 *   node scripts/arquivo-abm-download.mjs <url-do-visualizador> [páginas] [--out DIR]
 *
 * Exemplos:
 *   node scripts/arquivo-abm-download.mjs https://arquivo-abm.madeira.gov.pt/viewer/descriptions/41778/247955 --list
 *   node scripts/arquivo-abm-download.mjs https://arquivo-abm.madeira.gov.pt/viewer/descriptions/41778/247955 145-149,151-155
 *
 * Requer Node 18+ (fetch nativo). Sem dependências.
 */

import fs from 'node:fs';
import path from 'node:path';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const HEADERS = { 'User-Agent': UA, 'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8' };

// Da melhor para a pior qualidade.
const QUALIDADES = ['MASTER', 'DISSEMINATION', 'THUMB'];

function parsePages(spec) {
  const out = [];
  for (const part of spec.split(',')) {
    const chunk = part.trim();
    if (!chunk) continue;
    const range = chunk.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const [a, b] = [Number(range[1]), Number(range[2])];
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) out.push(i);
    } else if (/^\d+$/.test(chunk)) {
      out.push(Number(chunk));
    } else {
      throw new Error(`Trecho inválido em páginas: "${chunk}"`);
    }
  }
  return [...new Set(out)].sort((x, y) => x - y);
}

async function get(url, init = {}) {
  const res = await fetch(url, { redirect: 'follow', ...init, headers: { ...HEADERS, ...(init.headers || {}) } });
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
  return res;
}

/**
 * Percorre o JSON à procura de objetos que tragam IDs de armazenamento
 * (a forma exata varia entre versões do Archeevo, por isso não assumimos
 * uma estrutura fixa).
 */
function extrairPaginas(dados) {
  const paginas = [];

  const visitar = (no) => {
    if (Array.isArray(no)) return no.forEach(visitar);
    if (!no || typeof no !== 'object') return;

    const vaults = {};
    for (const [chave, valor] of Object.entries(no)) {
      if (typeof valor !== 'string') continue;
      const m = valor.match(/^vault:\/\/([A-Z]+)\/(.+)$/);
      if (m) vaults[m[1]] = valor;
    }
    if (Object.keys(vaults).length) {
      paginas.push({
        nome: no.Name ?? no.FileName ?? no.OriginalName ?? null,
        ordem: no.Order ?? no.Position ?? no.Sequence ?? null,
        id: no.ID ?? no.Id ?? null,
        vaults,
      });
    }
    Object.values(no).forEach(visitar);
  };

  visitar(dados);

  // Ordena pelo nome do ficheiro (0001.jpg, 0002.jpg, …) quando existe.
  const comNome = paginas.filter((p) => p.nome);
  if (comNome.length === paginas.length && paginas.length) {
    paginas.sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt', { numeric: true }));
  }
  return paginas;
}

function melhorVault(vaults) {
  for (const q of QUALIDADES) if (vaults[q]) return { qualidade: q, objectId: vaults[q] };
  const [qualidade, objectId] = Object.entries(vaults)[0] ?? [];
  return objectId ? { qualidade, objectId } : null;
}

async function main() {
  const argv = process.argv.slice(2);
  const viewerUrl = argv.find((a) => a.startsWith('http'));
  if (!viewerUrl) {
    console.error('Informe a URL do visualizador. Veja o cabeçalho do ficheiro para exemplos.');
    process.exit(1);
  }
  const listOnly = argv.includes('--list');
  const outIdx = argv.indexOf('--out');
  const outDir = outIdx >= 0 ? argv[outIdx + 1] : 'imagens';
  const pageSpec = argv.find((a) => /^[\d,\-\s]+$/.test(a) && a.trim());

  const { origin, pathname } = new URL(viewerUrl);
  const descricaoId = (pathname.match(/\/descriptions\/(\d+)/) || [])[1];
  if (!descricaoId) throw new Error('Não consegui ler o ID da descrição a partir do URL.');

  const meta = await (await get(`${origin}/api/descriptions/${descricaoId}`, {
    headers: { Accept: 'application/json' },
  })).json();
  console.log(`${meta.UnitTitle ?? '(sem título)'}`);
  console.log(`${meta.CompleteUnitId ?? ''}  ${meta.Dimensions ?? ''}`);

  const dados = await (await get(`${origin}/api/descriptions/${descricaoId}/digitalobjects`, {
    headers: { Accept: 'application/json' },
  })).json();

  const paginas = extrairPaginas(dados);
  if (!paginas.length) {
    console.error('\nNão encontrei IDs de armazenamento em /digitalobjects.');
    console.error('Início da resposta (para diagnóstico):');
    console.error(JSON.stringify(dados).slice(0, 1500));
    process.exit(2);
  }

  const variantes = new Set(paginas.flatMap((p) => Object.keys(p.vaults)));
  console.log(`Imagens: ${paginas.length}   variantes disponíveis: ${[...variantes].join(', ')}`);

  if (listOnly || !pageSpec) {
    paginas.forEach((p, i) =>
      console.log(`  ${i + 1}\t${p.nome ?? ''}\t${Object.keys(p.vaults).join(',')}`)
    );
    return;
  }

  const wanted = parsePages(pageSpec);
  fs.mkdirSync(outDir, { recursive: true });

  for (const n of wanted) {
    const pagina = paginas[n - 1];
    if (!pagina) {
      console.warn(`  imagem ${n}: fora do intervalo (documento tem ${paginas.length})`);
      continue;
    }
    const escolha = melhorVault(pagina.vaults);
    if (!escolha) {
      console.warn(`  imagem ${n}: sem ficheiro associado`);
      continue;
    }
    const url = `${origin}/api/storage/storageobject?objectId=${encodeURIComponent(escolha.objectId)}`;
    const dest = path.join(outDir, `${String(n).padStart(4, '0')}.jpg`);
    try {
      const res = await get(url);
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(dest, buf);
      console.log(
        `  imagem ${n} (${pagina.nome ?? ''}, ${escolha.qualidade}) -> ${dest}  ${(buf.length / 1024).toFixed(0)} KB`
      );
    } catch (err) {
      console.error(`  imagem ${n}: falhou — ${err.message}`);
    }
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
