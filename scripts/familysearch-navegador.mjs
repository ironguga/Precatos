#!/usr/bin/env node
/**
 * Lê com navegador as páginas PÚBLICAS do FamilySearch. Não faz login e não
 * cria conta. Imprime o estado HTTP de cada página, porque é isso que
 * distingue «precisa de sessão» (401) de «o sítio recusa esta máquina» (403).
 */
import { chromium } from 'playwright';
const alvos = [
  ['wiki · Madeira', 'https://www.familysearch.org/en/wiki/Madeira,_Portugal_Genealogy'],
  ['wiki · Portugal Church Records', 'https://www.familysearch.org/en/wiki/Portugal_Church_Records'],
  ['catálogo · lugar', 'https://www.familysearch.org/search/catalog/results?q.placeString=Portugal%2C%20Madeira%2C%20Ponta%20do%20Sol'],
  ['catálogo · texto', 'https://www.familysearch.org/search/catalog/results?q.text=Ponta%20do%20Sol%20Madeira'],
  ['raiz', 'https://www.familysearch.org/'],
  ['(controlo) Arquivo.pt', 'https://arquivo.pt/'],
];
const b = await chromium.launch();
const ctx = await b.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  locale: 'pt-PT', viewport: { width: 1400, height: 1000 },
});
for (const [rot, u] of alvos) {
  const p = await ctx.newPage();
  let estado = '?', bytes = 0, txt = '';
  try {
    const r = await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 45000 });
    estado = r?.status();
    await p.waitForTimeout(5000);
    txt = (await p.innerText('body')).replace(/\n{3,}/g, '\n\n');
    bytes = (await p.content()).length;
  } catch (e) { estado = 'erro: ' + String(e).slice(0, 90); }
  console.log(`\n===== ${rot} =====`);
  console.log(`  ${u}`);
  console.log(`  HTTP ${estado} · ${bytes} bytes de HTML · ${txt.length} car. de texto`);
  if (txt.trim()) console.log('  ----\n' + txt.slice(0, 1800));
  await p.close();
}
await b.close();
