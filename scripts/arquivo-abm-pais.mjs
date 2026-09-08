#!/usr/bin/env node
/**
 * Dada uma descrição ao nível do assento, imprime todos os campos — incluindo
 * Parent e RootParent — para se chegar ao identificador do LIVRO, que é o que
 * o descarregador de imagens precisa.
 */
const origem = 'https://arquivo-abm.madeira.gov.pt';
const H = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36', Accept: 'application/json' };
for (const id of process.argv.slice(2)) {
  const res = await fetch(`${origem}/api/descriptions/${id}`, { headers: H });
  if (!res.ok) { console.log(`${id}: HTTP ${res.status}`); continue; }
  const d = await res.json();
  console.log(`\n===== ${id} =====`);
  for (const [k, v] of Object.entries(d)) {
    if (v === null || v === '' || (Array.isArray(v) && !v.length)) continue;
    const s = typeof v === 'object' ? JSON.stringify(v).slice(0, 300) : String(v).slice(0, 300);
    console.log(`  ${k}: ${s}`);
  }
}
