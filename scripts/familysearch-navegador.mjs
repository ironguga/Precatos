#!/usr/bin/env node
/**
 * O FamilySearch é uma aplicação renderizada no cliente: pedir o HTML devolve
 * uma casca de 6 kB. Com um navegador a sério, as páginas PÚBLICAS — o
 * Research Wiki e a navegação do catálogo por lugar — mostram o que têm.
 *
 * NÃO faz login e NÃO cria conta: só lê o que está aberto a qualquer visitante.
 * O objectivo é apurar os números de microfilme/DGS dos registos paroquiais de
 * Ponta do Sol e Canhas, para que quem tenha conta vá lá direito.
 */
import { chromium } from 'playwright';

const alvos = [
  ['wiki · Madeira', 'https://www.familysearch.org/en/wiki/Madeira,_Portugal_Genealogy'],
  ['wiki · Portugal Church Records', 'https://www.familysearch.org/en/wiki/Portugal_Church_Records'],
  ['wiki · busca Ponta do Sol', 'https://www.familysearch.org/en/wiki/Special:Search?search=Ponta+do+Sol&fulltext=1'],
  ['catálogo · lugar', 'https://www.familysearch.org/search/catalog/results?q.placeString=Portugal%2C%20Madeira%2C%20Ponta%20do%20Sol'],
  ['catálogo · texto', 'https://www.familysearch.org/search/catalog/results?q.text=Ponta%20do%20Sol%20Madeira'],
];

const b = await chromium.launch();
const ctx = await b.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  locale: 'pt-PT',
});
for (const [rot, u] of alvos) {
  const p = await ctx.newPage();
  console.log(`\n===== ${rot} =====\n${u}`);
  try {
    const resp = await p.goto(u, { waitUntil: 'networkidle', timeout: 60000 });
    console.log('  HTTP', resp?.status());
    await p.waitForTimeout(4000);
    const txt = (await p.innerText('body')).replace(/\n{3,}/g, '\n\n');
    console.log('  ---- texto renderizado (até 3500 car.) ----');
    console.log(txt.slice(0, 3500));
    const alvo = txt.match(/(Ponta do Sol|Canhas|Calheta|paroquiais|Church records|\b\d{6,8}\b)[^\n]{0,90}/gi);
    if (alvo) {
      console.log('  ---- linhas de interesse ----');
      console.log('   ', [...new Set(alvo)].slice(0, 30).join('\n    '));
    }
  } catch (e) {
    console.log('  erro:', String(e).slice(0, 200));
  }
  await p.close();
}
await b.close();
