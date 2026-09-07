#!/usr/bin/env node
/**
 * Procura os Pitta dos Canhas fora do arquivo: genealogias publicadas, fóruns,
 * catálogos de microfilme.
 *
 * O ambiente do agente tem estes domínios bloqueados pelo proxy de egresso; o
 * runner do GitHub tem internet aberta. Cada fonte é descarregada, convertida
 * a texto e filtrada pelos nomes que interessam, para o ficheiro não crescer
 * com ruído.
 */
const H = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
  Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
};

const FONTES = [
  ['geneall — Pita de Castro', 'https://geneall.net/pt/forum/37270/pita-de-castro-castro-pita/'],
  ['madeiragenealogia', 'https://madeiragenealogia.com/pt/'],
  ['madeiragenealogia busca Pitta', 'https://madeiragenealogia.com/pt/?s=Pitta'],
  ['tombo.pt busca Pitta Canhas', 'https://tombo.pt/pesquisa?q=Pitta%20Canhas'],
  [
    'FamilySearch catálogo Canhas',
    'https://www.familysearch.org/service/search/catalog/search?q.text=Canhas%20Ponta%20do%20Sol&f.recordCountry=Portugal',
  ],
  [
    'Clode, Registo Genealógico (texto integral)',
    'https://archive.org/stream/document.onl_luiz-peter-clode-registo-genealogico-de-familias-que-passaram-a-madeira/document.onl_luiz-peter-clode-registo-genealogico-de-familias-que-passaram-a-madeira_djvu.txt',
  ],
];

// nomes que interessam; qualquer linha que contenha um deles é guardada
const CHAVES = [
  'Pitta', 'Pita ', 'Pita,', 'Pita.', 'da Silva Pitta', 'Silva de Ponte',
  'Canhas', 'Outeiro', 'Laura dos Santos', 'Sabina Rosa',
];

function aTexto(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ');
}

for (const [nome, url] of FONTES) {
  console.log(`\n${'='.repeat(78)}\n=== ${nome}\n=== ${url}`);
  let res;
  try {
    res = await fetch(url, { headers: H, redirect: 'follow' });
  } catch (e) {
    console.log(`  falhou: ${e.message}`);
    continue;
  }
  console.log(`  HTTP ${res.status} ${res.headers.get('content-type') ?? ''}`);
  if (!res.ok) continue;
  let corpo;
  try {
    corpo = await res.text();
  } catch (e) {
    console.log(`  corpo ilegível: ${e.message}`);
    continue;
  }
  const texto = aTexto(corpo);
  const linhas = texto.split('\n').map((l) => l.trim()).filter(Boolean);
  const uteis = [];
  for (let i = 0; i < linhas.length; i++) {
    if (CHAVES.some((k) => linhas[i].includes(k))) {
      // guarda a linha e o contexto imediato
      for (let j = Math.max(0, i - 1); j <= Math.min(linhas.length - 1, i + 1); j++)
        if (!uteis.includes(linhas[j])) uteis.push(linhas[j]);
    }
  }
  if (!uteis.length) {
    console.log(`  (${linhas.length} linhas, nenhuma com os nomes procurados)`);
    continue;
  }
  console.log(`  ${uteis.length} linhas com os nomes procurados:`);
  for (const l of uteis.slice(0, 400)) console.log(`  | ${l.slice(0, 300)}`);
  if (uteis.length > 400) console.log(`  … mais ${uteis.length - 400} linhas`);
}
