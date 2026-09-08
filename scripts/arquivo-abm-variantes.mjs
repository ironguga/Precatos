#!/usr/bin/env node
/**
 * Para um livro e uma página, imprime TODAS as variantes que o catálogo
 * declara — nome, URL de cofre e tamanho em bytes — e tenta buscar cada uma.
 *
 * Porquê: as páginas do Livro 1.º de casamentos da Ponta do Sol (48721) vêm a
 * 708 px de largura, e o assento de Diogo Fernandes Pita de 1616, no fólio 75,
 * não se lê a essa escala. Se o catálogo declarar uma ORIGINAL maior e ela for
 * servida — ao contrário do que acontece no livro 48626 — o assento lê-se.
 *
 * Uso: node scripts/arquivo-abm-variantes.mjs <idLivro> <indiceDaPagina>…
 */
const origem = 'https://arquivo-abm.madeira.gov.pt';
const H = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' };

function dimensoes(b) {
  for (let i = 2; i < b.length - 9; ) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1];
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return `${b.readUInt16BE(i + 7)}x${b.readUInt16BE(i + 5)}`;
    i += 2 + b.readUInt16BE(i + 2);
  }
  return '?';
}

function achar(no, s = []) {
  if (Array.isArray(no)) { no.forEach((x) => achar(x, s)); return s; }
  if (!no || typeof no !== 'object') return s;
  if (no.DisseminationURL || no.OriginalURL) s.push(no);
  Object.values(no).forEach((x) => achar(x, s));
  return s;
}

const livro = process.argv[2];
const paginas = process.argv.slice(3).map(Number);

const r = await fetch(`${origem}/api/descriptions/${livro}/digitalobjects`, { headers: { ...H, Accept: 'application/json' } });
const pgs = achar(await r.json()).sort((a, b) => String(a.Name ?? '').localeCompare(String(b.Name ?? ''), 'pt', { numeric: true }));
console.log(`livro ${livro}: ${pgs.length} páginas`);

for (const i of paginas) {
  const p = pgs[i - 1];
  if (!p) { console.log(`\npágina ${i}: não existe`); continue; }
  console.log(`\n===== página ${i}  (${p.Name ?? '?'}) =====`);
  for (const [k, v] of Object.entries(p)) {
    if (typeof v === 'string' && v.startsWith('vault://')) console.log(`  ${k}: ${v}`);
    if (/length|size|width|height/i.test(k) && typeof v === 'number') console.log(`  ${k}: ${v}`);
  }
  for (const chave of ['OriginalURL', 'DisseminationURL', 'ThumbnailURL']) {
    const v = p[chave];
    if (!v) continue;
    try {
      const res = await fetch(`${origem}/api/storage/storageobject?objectId=${encodeURIComponent(v)}`, { headers: H });
      if (!res.ok) { console.log(`  → ${chave}: HTTP ${res.status}`); continue; }
      const b = Buffer.from(await res.arrayBuffer());
      console.log(`  → ${chave}: ${b.length} bytes  ${dimensoes(b)}`);
    } catch (e) { console.log(`  → ${chave}: ${String(e).slice(0, 60)}`); }
  }
}
