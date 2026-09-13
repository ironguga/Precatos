#!/usr/bin/env node
/**
 * A página do visualizador tem 2255 bytes: é a casca de uma aplicação
 * JavaScript, e os endereços das imagens estão no pacote de código que ela
 * carrega. Procurei mosaicos no HTML — que está vazio — e não no código.
 *
 * Este script vai buscar a casca, segue todos os <script src> e <link href>,
 * e procura no código todos os endereços de imagem que a aplicação conhece.
 * Se existir um endereço que sirva mais do que 721 px, está aqui.
 */
const origem = 'https://arquivo-abm.madeira.gov.pt';
const H = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' };

const casca = await (await fetch(`${origem}/viewer/descriptions/48721`, { headers: H })).text();
console.log(`casca: ${casca.length} bytes\n${casca.slice(0, 1400)}\n`);

const recursos = new Set();
for (const m of casca.matchAll(/<(?:script|link)[^>]+(?:src|href)=["']([^"']+)["']/gi)) recursos.add(m[1]);
console.log(`=== ${recursos.size} recursos referidos ===`);
for (const r of recursos) console.log(`  ${r}`);

const PADRAO = /(storageobject|digitalobject|representation|iiif|deepzoom|dzi|tile|thumbnail|dissemination|original|maxSize|maxWidth|\bwidth=|resolution|download)/i;
for (const r of recursos) {
  if (!/\.js(\?|$)/i.test(r)) continue;
  const url = r.startsWith('http') ? r : `${origem}${r.startsWith('/') ? '' : '/'}${r}`;
  try {
    const res = await fetch(url, { headers: H });
    if (!res.ok) { console.log(`\n--- ${r}: HTTP ${res.status}`); continue; }
    const js = await res.text();
    console.log(`\n===== ${r} · ${js.length} bytes =====`);
    // apanha cadeias que pareçam caminhos de API
    const achados = new Set();
    for (const m of js.matchAll(/["'`]([^"'`\s]{6,120})["'`]/g)) {
      const s = m[1];
      if (/^\/?(api|viewer|iiif|storage)\//i.test(s) || (PADRAO.test(s) && s.includes('/'))) achados.add(s);
    }
    for (const a of [...achados].sort().slice(0, 60)) console.log(`  ${a}`);
    if (!achados.size) console.log('  (sem caminhos de API)');
  } catch (e) { console.log(`\n--- ${r}: ${String(e).slice(0, 60)}`); }
}
