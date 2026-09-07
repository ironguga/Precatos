#!/usr/bin/env node
/**
 * Abre a página do visualizador num Chromium real e regista todos os pedidos
 * de rede, para descobrir por que endpoint as imagens são servidas.
 *
 * Uso: node scripts/arquivo-abm-sniff.mjs <url-do-visualizador>
 */
import { chromium } from 'playwright';

const url = process.argv[2];
if (!url) {
  console.error('Informe a URL do visualizador.');
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });

const pedidos = [];
page.on('request', (req) => pedidos.push({ metodo: req.method(), url: req.url() }));

const respostasJson = [];
page.on('response', async (res) => {
  const tipo = res.headers()['content-type'] || '';
  if (!tipo.includes('json')) return;
  try {
    const corpo = await res.text();
    respostasJson.push({ url: res.url(), corpo: corpo.slice(0, 1500) });
  } catch {
    /* resposta já consumida */
  }
});

await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(6000);

console.log('\n=== TÍTULO ===');
console.log(await page.title());

console.log('\n=== PEDIDOS DE REDE (sem estáticos) ===');
const ruido = /\.(css|woff2?|ttf|svg|ico|png\?v=|gif)(\?|$)|google|gtag|analytics/i;
for (const p of pedidos) {
  if (ruido.test(p.url)) continue;
  console.log(`${p.metodo} ${p.url}`);
}

console.log('\n=== RESPOSTAS JSON (início de cada corpo) ===');
for (const r of respostasJson) {
  console.log(`\n--- ${r.url}`);
  console.log(r.corpo);
}

console.log('\n=== <img>/canvas NA PÁGINA ===');
const imgs = await page.evaluate(() =>
  [...document.querySelectorAll('img')].map((i) => i.src).slice(0, 40)
);
imgs.forEach((s) => console.log(s));

await browser.close();
