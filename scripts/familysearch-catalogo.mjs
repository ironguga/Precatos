#!/usr/bin/env node
/**
 * O que se pode saber do FamilySearch SEM conta.
 *
 * O catálogo (/service/search/catalog) devolve 401. Mas há três superfícies
 * públicas que dão a mesma informação — os números de microfilme e de DGS:
 *   · o Research Wiki (wiki público, sem login)
 *   · as páginas de catálogo em HTML, que às vezes respondem sem sessão
 *   · o WorldCat, que espelha as fichas dos microfilmes do FamilySearch
 *
 * Objectivo concreto: os números de rolo dos registos paroquiais de
 * Ponta do Sol / Canhas, Madeira — em especial os que cobrem
 * casamentos 1592-1639 e baptismos 1614-1641.
 */
const H = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36', 'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8' };
async function t(u, extra = {}) {
  try { const r = await fetch(u, { headers: { ...H, ...extra }, redirect: 'follow' }); return { e: r.status, s: await r.text() }; }
  catch (e) { return { e: String(e).slice(0, 70), s: '' }; }
}
const mostrar = (s, re, n = 14) => {
  const m = s.match(re);
  if (m) console.log('    ', [...new Set(m)].slice(0, n).join('\n      ').slice(0, 1600));
  else console.log('     (sem correspondências)');
};

console.log('=== 1 · Research Wiki (público) ===');
for (const u of [
  'https://www.familysearch.org/en/wiki/Portugal,_Madeira_Islands_Civil_Registration',
  'https://www.familysearch.org/en/wiki/Ponta_do_Sol,_Funchal,_Madeira,_Portugal_Genealogy',
  'https://www.familysearch.org/en/wiki/Madeira,_Portugal_Genealogy',
  'https://www.familysearch.org/en/wiki/Portugal_Church_Records',
  'https://www.familysearch.org/en/wiki/Special:Search?search=Ponta+do+Sol+Madeira',
]) {
  const r = await t(u);
  console.log(`\n  ${u.slice(0, 92)} -> ${r.e}, ${r.s.length} bytes`);
  mostrar(r.s, /(Ponta do Sol|Canhas|Calheta|paroquiais|Catholic Church Records|film\s*\d{5,7}|DGS\s*\d{6,8})[^<>{}]{0,100}/gi);
}

console.log('\n=== 2 · páginas de catálogo em HTML ===');
for (const u of [
  'https://www.familysearch.org/search/catalog/results?q.placeString=Portugal%2C+Madeira%2C+Ponta+do+Sol',
  'https://www.familysearch.org/search/catalog/results?q.text=Ponta+do+Sol+Madeira+registos+paroquiais',
  'https://www.familysearch.org/service/search/catalog/place-suggest?placeText=Ponta%20do%20Sol',
  'https://www.familysearch.org/service/search/catalog/places?text=Ponta+do+Sol',
]) {
  const r = await t(u, { Accept: 'application/json, text/html' });
  console.log(`\n  ${u.slice(0, 92)} -> ${r.e}, ${r.s.length} bytes`);
  if (r.s.length && r.s.length < 3000) console.log('    ', r.s.slice(0, 800).replace(/\s+/g, ' '));
  else mostrar(r.s, /(Ponta do Sol|Canhas|Registos paroquiais|Church records)[^<>{}]{0,100}/gi);
}

console.log('\n=== 3 · WorldCat, que espelha as fichas dos microfilmes ===');
for (const u of [
  'https://search.worldcat.org/search?q=Registos+paroquiais+Ponta+do+Sol+Madeira',
  'https://search.worldcat.org/search?q=%22Ponta+do+Sol%22+paroquiais+Madeira',
]) {
  const r = await t(u);
  console.log(`\n  ${u.slice(0, 92)} -> ${r.e}, ${r.s.length} bytes`);
  mostrar(r.s, /(Ponta do Sol|Canhas|paroquiais|Sociedade Genealógica|microfilm)[^<>{}]{0,110}/gi);
}
