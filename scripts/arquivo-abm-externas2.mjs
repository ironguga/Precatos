#!/usr/bin/env node
/**
 * As fontes fora do ABM, atacadas a sério e com os nomes certos.
 *
 * Até agora só tinha corrido uma versão antiga deste script, com nomes que
 * entretanto se revelaram errados (procurava «Maria Rodrigues» onde é Antónia
 * Vieyra). Agora sei exactamente quem procurar:
 *
 *   Diogo Fernandes Pita × Inês Rodrigues   (Canhas, 1641)
 *   Manuel Correia × Francisca Lopes        (Canhas, 1622)
 *   Manoel de Ponte × Anna da Silva
 *   Pedro da Sylva de Ponte × Maria Vieyra Pita (Canhas, 1700)
 *   Pedro da Sylva de Figueiredo — o bisavô com capela na igreja da Piedade
 */
const H = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36', 'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8' };
const TERMOS = [
  '"Diogo Fernandes Pita"', '"Fernandes Pita" Canhas', '"Pedro da Silva de Ponte"',
  '"Silva Pitta" Canhas', '"Pita" Canhas genealogia', '"Pedro da Silva de Figueiredo" Madeira',
];

async function texto(u, extra = {}) {
  try {
    const r = await fetch(u, { headers: { ...H, ...extra }, redirect: 'follow' });
    const t = await r.text();
    return { estado: r.status, t };
  } catch (e) { return { estado: String(e).slice(0, 70), t: '' }; }
}

console.log('=== 1 · Arquivo.pt: busca de texto integral no arquivo da web portuguesa ===');
for (const q of TERMOS) {
  const u = `https://arquivo.pt/textsearch?q=${encodeURIComponent(q)}&maxItems=8&prettyPrint=false`;
  const { estado, t } = await texto(u, { Accept: 'application/json' });
  console.log(`\n  [${q}] -> ${estado}`);
  try {
    const j = JSON.parse(t);
    for (const it of (j.response_items ?? []).slice(0, 8))
      console.log(`    ${(it.tstamp ?? '').slice(0, 8)}  ${it.title?.slice(0, 90)}\n      ${it.originalURL?.slice(0, 110)}`);
    if (!(j.response_items ?? []).length) console.log('    (nada)');
  } catch { console.log('    ', t.slice(0, 200).replace(/\s+/g, ' ')); }
}

console.log('\n=== 2 · FamilySearch: catálogo da Ponta do Sol e dos Canhas ===');
for (const u of [
  'https://www.familysearch.org/service/search/catalog/search?q.text=Ponta%20do%20Sol%20Madeira&count=20',
  'https://www.familysearch.org/service/search/catalog/place?placeText=Ponta+do+Sol%2C+Madeira%2C+Portugal',
  'https://www.familysearch.org/search/catalog/results?q.placeString=Portugal,%20Madeira,%20Ponta%20do%20Sol&count=20',
  'https://www.familysearch.org/library/books/results?q.text=Canhas',
]) {
  const { estado, t } = await texto(u, { Accept: 'application/json, text/html' });
  console.log(`  ${u.slice(0, 95)} -> ${estado}, ${t.length} bytes`);
  const m = t.match(/(Canhas|Ponta do Sol)[^<>{}"]{0,90}/gi);
  if (m) console.log('    ', [...new Set(m)].slice(0, 10).join(' | ').slice(0, 600));
}

console.log('\n=== 3 · sítios de genealogia madeirense ===');
for (const u of [
  'https://madeiragenealogia.com/?s=Pita',
  'https://madeiragenealogia.com/?s=Canhas',
  'https://www.geneall.net/pt/busca/?tipo=nome&q=Pita',
  'https://www.geneanet.org/fonds/individus/?go=1&nom=PITA&prenom=Diogo',
]) {
  const { estado, t } = await texto(u);
  console.log(`  ${u.slice(0, 80)} -> ${estado}, ${t.length} bytes`);
  const m = t.match(/(Pita|Pitta|Canhas)[^<>{}]{0,80}/gi);
  if (m) console.log('    ', [...new Set(m)].slice(0, 10).join(' | ').slice(0, 600));
}
