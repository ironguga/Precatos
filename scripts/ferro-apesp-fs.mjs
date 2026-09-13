#!/usr/bin/env node
/**
 * (1) O Arquivo Público de SP: perceber se a Hospedaria é busca livre ou
 *     pedido de certidão, e onde se faz.
 * (2) O FamilySearch com um navegador a sério. A resposta mudou de 403 para
 *     200 com «Pardon Our Interruption ... made us think you were a bot» — ou
 *     seja, deixou de ser bloqueio de rede e passou a ser um teste de robô.
 *     Um Chromium com JavaScript é um navegador verdadeiro, não uma falsificação.
 *     UMA tentativa, a ritmo humano, em páginas públicas. Se o aviso persistir,
 *     fica assim: não se forjam sinais para enganar a deteção.
 */
import { chromium } from 'playwright';

const H = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36', 'Accept-Language': 'pt-BR,pt;q=0.9' };

console.log('===== 1 · APESP: a imigração é busca ou certidão? =====');
for (const u of [
  'https://www.arquivoestado.sp.gov.br/apesp/servicos/cidadao/consulta-acervo',
  'https://web.arquivoestado.sp.gov.br/web/acervo/solicitacao_certidoes/imigracao',
]) {
  try {
    const r = await fetch(u, { headers: H });
    const b = await r.text();
    const t = b.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    console.log(`\n--- ${u}\n    ${r.status}  ${b.length}b  ${t.length} car.`);
    console.log(`    «${t.slice(0, 900)}»`);
  } catch (e) { console.log(`\n--- ${u}\n    ERRO ${String(e).slice(0, 60)}`); }
}

console.log('\n\n===== 2 · FamilySearch com navegador verdadeiro =====');
const nav = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await nav.newContext({
  locale: 'pt-BR',
  viewport: { width: 1366, height: 900 },
  userAgent: H['User-Agent'],
});
const pag = await ctx.newPage();
for (const [rot, u] of [
  ['wiki Madeira', 'https://www.familysearch.org/en/wiki/Madeira,_Portugal_Genealogy'],
  ['catálogo Ponta do Sol', 'https://www.familysearch.org/search/catalog/results?q.place=Ponta%20do%20Sol'],
]) {
  try {
    const resp = await pag.goto(u, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await pag.waitForTimeout(6000);          // ritmo humano, sem correr
    const texto = (await pag.innerText('body').catch(() => '')).replace(/\s+/g, ' ').trim();
    console.log(`\n--- ${rot}: HTTP ${resp?.status()}  ${texto.length} caracteres`);
    console.log(`    «${texto.slice(0, 500)}»`);
    await pag.waitForTimeout(3000);
  } catch (e) { console.log(`\n--- ${rot}: ERRO ${String(e).slice(0, 90)}`); }
}
await nav.close();
