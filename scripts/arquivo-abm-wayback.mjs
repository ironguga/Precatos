#!/usr/bin/env node
/**
 * O Arquivo.pt guardou o SÍTIO ANTIGO do ABM — arquivo.abm.madeira.gov.pt,
 * com hífen a menos — em capturas de 2017. O sítio de hoje é
 * arquivo-abm.madeira.gov.pt e corre Archeevo 7. O antigo pode ter servido as
 * imagens por outro caminho, e o Arquivo.pt pode tê-las guardado.
 *
 * Também vai buscar:
 *  - a «Relação da documentação digitalizada do ARM» (arquivo-madeira.org)
 *  - o blogue ARQUIVO HISTÓRICO (Madeira), etiqueta Genealogia
 */
const H = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' };
async function t(u, extra = {}) {
  try { const r = await fetch(u, { headers: { ...H, ...extra }, redirect: 'follow' }); return { e: r.status, s: await r.text(), ct: r.headers.get('content-type') }; }
  catch (e) { return { e: String(e).slice(0, 70), s: '' }; }
}

console.log('=== 1 · que URLs do sítio antigo do ABM o Arquivo.pt guardou ===');
for (const q of ['arquivo.abm.madeira.gov.pt/details*', 'arquivo.abm.madeira.gov.pt/viewer*', 'arquivo.abm.madeira.gov.pt/*jpg*', 'arquivo.abm.madeira.gov.pt/*image*']) {
  const u = `https://arquivo.pt/wayback/cdx?url=${encodeURIComponent(q)}&output=json&limit=25&fields=url,timestamp,mime`;
  const r = await t(u, { Accept: 'application/json' });
  console.log(`\n  [${q}] -> ${r.e}`);
  console.log('   ', r.s.slice(0, 1400).replace(/\n/g, '\n    '));
}

console.log('\n=== 2 · a captura de 2017 do details?id=2206, e o mesmo para 2195 ===');
for (const id of [2206, 2195, 48626]) {
  const u = `https://arquivo.pt/wayback/20170815000000/http://arquivo.abm.madeira.gov.pt/details?id=${id}`;
  const r = await t(u);
  console.log(`  id=${id} -> ${r.e}, ${r.s.length} bytes`);
  const m = r.s.match(/(\.jpg|\.jp2|imagem|imagens|digitaliz\w*|visualiza\w*)[^<>"']{0,80}/gi);
  if (m) console.log('    ', [...new Set(m)].slice(0, 14).join(' | ').slice(0, 800));
}

console.log('\n=== 3 · Relacao da documentacao digitalizada do ARM ===');
for (const u of ['https://arquivo.pt/wayback/20091219000000/http://www.arquivo-madeira.org/download.php?id=222',
                 'http://www.arquivo-madeira.org/download.php?id=222']) {
  const r = await t(u);
  console.log(`  ${u.slice(0, 90)} -> ${r.e}, ${r.s.length} bytes, ${r.ct}`);
  const m = r.s.match(/Canhas[^<>{}]{0,110}/gi);
  if (m) console.log('    ', [...new Set(m)].slice(0, 15).join('\n     ').slice(0, 1200));
}

console.log('\n=== 4 · blogue ARQUIVO HISTORICO (Madeira) ===');
for (const u of ['https://arquivohistoricomadeira.blogspot.com/search?q=Pita',
                 'https://arquivohistoricomadeira.blogspot.com/search?q=Canhas',
                 'https://arquivohistoricomadeira.blogspot.com/search/label/Genealogia']) {
  const r = await t(u);
  console.log(`  ${u.slice(0, 80)} -> ${r.e}, ${r.s.length} bytes`);
  const m = r.s.match(/(Pit[at]|Canhas)[^<>{}]{0,110}/gi);
  if (m) console.log('    ', [...new Set(m)].slice(0, 12).join('\n     ').slice(0, 1200));
}
