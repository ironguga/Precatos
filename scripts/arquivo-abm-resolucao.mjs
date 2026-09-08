#!/usr/bin/env node
/**
 * Quatro coisas por testar antes de dar o tecto por fechado:
 *
 * 1. O endpoint de armazenamento aceita parâmetros de tamanho? As imagens que
 *    baixo têm 662-1030 px de largura (variante DISSEMINATION). Se o servidor
 *    servir maior, o assento de 1641 — cuja filiação está numa mancha — pode
 *    voltar a ler-se.
 * 2. Que variantes existem mesmo para uma imagem? Imprimo o registo cru.
 * 3. A página do visualizador de um livro sem /digitalobjects diz alguma coisa?
 * 4. O livro existe noutro repositório — FamilySearch?
 */
const origem = 'https://arquivo-abm.madeira.gov.pt';
const H = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
};

async function bytes(url, extra = {}) {
  try {
    const r = await fetch(url, { headers: { ...H, ...extra } });
    if (!r.ok) return { estado: r.status };
    const b = Buffer.from(await r.arrayBuffer());
    // dimensões do JPEG pelo marcador SOF
    let dim = '';
    for (let i = 2; i < b.length - 9; ) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) {
        dim = `${b.readUInt16BE(i + 7)}x${b.readUInt16BE(i + 5)}`;
        break;
      }
      i += 2 + b.readUInt16BE(i + 2);
    }
    return { estado: 200, bytes: b.length, dim, tipo: r.headers.get('content-type') };
  } catch (e) {
    return { estado: String(e).slice(0, 60) };
  }
}

console.log('=== 1/2 · variantes e tamanhos de uma imagem conhecida ===');
// Livro 2.º de casamentos dos Canhas (48626): a imagem 7 é o assento de 1641.
const r = await fetch(`${origem}/api/descriptions/48626/digitalobjects`, { headers: { ...H, Accept: 'application/json' } });
const dados = await r.json();
const achar = (no, saida = []) => {
  if (Array.isArray(no)) { no.forEach((x) => achar(x, saida)); return saida; }
  if (!no || typeof no !== 'object') return saida;
  const v = {};
  for (const [k, val] of Object.entries(no))
    if (typeof val === 'string' && /^vault:\/\//.test(val)) v[k] = val;
  if (Object.keys(v).length) saida.push({ nome: no.Name ?? no.FileName ?? null, vaults: v, cru: no });
  Object.values(no).forEach((x) => achar(x, saida));
  return saida;
};
const pgs = achar(dados).filter((p) => p.nome).sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt', { numeric: true }));
const alvo = pgs[6] ?? pgs[0];
console.log('página escolhida:', alvo?.nome);
console.log('registo cru:', JSON.stringify(alvo?.cru).slice(0, 900));
console.log();

for (const [q, oid] of Object.entries(alvo?.vaults ?? {})) {
  const base = `${origem}/api/storage/storageobject?objectId=${encodeURIComponent(oid)}`;
  const variantes = [
    ['sem parâmetro', base],
    ['&width=4000', `${base}&width=4000`],
    ['&size=full', `${base}&size=full`],
    ['&maxSize=4000', `${base}&maxSize=4000`],
    ['&scale=4', `${base}&scale=4`],
    ['&quality=100', `${base}&quality=100`],
    ['&original=true', `${base}&original=true`],
  ];
  for (const [rot, url] of variantes) {
    const x = await bytes(url);
    console.log(`  ${q.padEnd(14)} ${rot.padEnd(16)} -> ${x.estado} ${x.dim ?? ''} ${x.bytes ?? ''}`);
  }
}

console.log('\n=== 3 · o visualizador de livros sem digitalobjects ===');
for (const id of [2195, 44085]) {
  for (const cam of [`/viewer/descriptions/${id}`, `/api/descriptions/${id}/representations`, `/api/descriptions/${id}/digitalobjects`, `/details?id=${id}`]) {
    try {
      const res = await fetch(origem + cam, { headers: H });
      const t = await res.text();
      console.log(`  ${id} ${cam} -> ${res.status}, ${t.length} bytes; ${t.slice(0, 160).replace(/\s+/g, ' ')}`);
    } catch (e) { console.log(`  ${id} ${cam} -> ${String(e).slice(0, 50)}`); }
  }
}

console.log('\n=== 4 · o mesmo livro noutro repositório ===');
const buscas = [
  'https://www.familysearch.org/service/search/catalog/results?q.text=Canhas%20Ponta%20do%20Sol&f.recordCountry=Portugal',
  'https://www.familysearch.org/search/catalog/results?q.placeString=Portugal%2C%20Madeira%2C%20Ponta%20do%20Sol',
  'https://arquivo.pt/wayback/19960101000000*/arquivo-abm.madeira.gov.pt',
];
for (const u of buscas) {
  try {
    const res = await fetch(u, { headers: { ...H, Accept: 'text/html,application/json' } });
    const t = await res.text();
    console.log(`  ${u.slice(0, 80)} -> ${res.status}, ${t.length} bytes`);
    const m = t.match(/Canhas[^<>{}]{0,120}/gi);
    if (m) console.log('    ', [...new Set(m)].slice(0, 12).join(' | ').slice(0, 700));
  } catch (e) { console.log(`  ${u.slice(0, 60)} -> ${String(e).slice(0, 60)}`); }
}
