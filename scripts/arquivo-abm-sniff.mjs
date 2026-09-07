#!/usr/bin/env node
/**
 * Descobre o endpoint que serve as imagens no Archeevo.
 *
 * Já sabemos:
 *   /api/descriptions/{id}                  -> metadados do livro
 *   /api/descriptions/{id}/representations  -> Structure.Nodes com {ID, Name}
 * Falta o endpoint da imagem em si. O bundle constrói os URLs com template
 * literals, por isso procuramos o contexto à volta dos caminhos conhecidos.
 *
 * Uso: node scripts/arquivo-abm-sniff.mjs <url-do-visualizador>
 */

const alvo = process.argv[2];
const origem = new URL(alvo).origin;
const descricaoId = new URL(alvo).pathname.match(/\/descriptions\/(\d+)/)[1];

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
};

const pagina = await (await fetch(alvo, { headers: HEADERS })).text();
const bundles = [...pagina.matchAll(/(?:src|href)="([^"]+\.js)"/g)].map((m) =>
  new URL(m[1], origem).toString()
);

console.log('=== CONTEXTO DOS CAMINHOS NO BUNDLE ===');
const vistos = new Set();
for (const b of bundles) {
  const js = await (await fetch(b, { headers: HEADERS })).text();
  const re = /.{0,140}\/(?:representations|dissemination|thumbnail|download|viewer)[/"'`].{0,160}/gi;
  for (const m of js.matchAll(re)) {
    const t = m[0].replace(/\s+/g, ' ');
    const chave = t.slice(0, 80);
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    console.log('\n· ' + t);
    if (vistos.size > 45) break;
  }
  if (vistos.size > 45) break;
}

// Estrutura completa: quantos nós e que campos tem cada um
console.log('\n=== ESTRUTURA DA REPRESENTAÇÃO ===');
const reps = await (
  await fetch(`${origem}/api/descriptions/${descricaoId}/representations`, {
    headers: { ...HEADERS, Accept: 'application/json' },
  })
).json();
const rep = Array.isArray(reps) ? reps[0] : reps;
const nos = rep.Structure.Nodes;
console.log(`nós: ${nos.length}`);
console.log('campos de um nó:', JSON.stringify(nos[0]));
console.log('campos da representação:', Object.keys(rep).join(', '));
console.log('representação (sem Structure):', JSON.stringify({ ...rep, Structure: '…' }).slice(0, 900));
console.log('nó 145:', JSON.stringify(nos[144]));
console.log('nó 155:', JSON.stringify(nos[154]));

// Testa endpoints de imagem para o nó 145
const repId = rep.ID ?? rep.RepresentationID ?? rep.Id;
const noId = nos[144].ID;
console.log(`\n=== TENTATIVAS DE IMAGEM (nó ${noId}, representação ${repId}) ===`);
const tentativas = [
  `/api/descriptions/${descricaoId}/representations/${noId}`,
  `/api/descriptions/${descricaoId}/representations/${repId}/files/${noId}`,
  `/api/representations/${repId}/files/${noId}`,
  `/api/representations/files/${noId}`,
  `/api/files/${noId}`,
  `/api/files/${noId}/content`,
  `/api/dissemination/${noId}`,
  `/api/thumbnails/${noId}`,
  `/api/viewer/files/${noId}`,
  `/api/nodes/${noId}`,
  `/api/nodes/${noId}/content`,
];
for (const caminho of tentativas) {
  try {
    const r = await fetch(origem + caminho, { headers: HEADERS });
    const tipo = r.headers.get('content-type') || '';
    const tam = r.headers.get('content-length') || '?';
    console.log(`${r.status}  ${tipo.padEnd(34)} ${String(tam).padStart(10)}  ${caminho}`);
    if (r.status === 200 && tipo.includes('json')) {
      console.log('      ' + (await r.text()).replace(/\s+/g, ' ').slice(0, 500));
    }
  } catch (e) {
    console.log(`erro  ${caminho}: ${e.message}`);
  }
}
