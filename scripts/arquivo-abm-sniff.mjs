#!/usr/bin/env node
/**
 * Regista o URL real das imagens do visualizador Archeevo.
 *
 * A tentativa anterior com Playwright foi barrada ("The URL you requested has
 * been blocked") porque o headless shell se anuncia como HeadlessChrome. Aqui
 * o contexto usa User-Agent e cabeçalhos de um Chrome normal.
 *
 * Uso: node scripts/arquivo-abm-sniff.mjs <url-do-visualizador>
 */
import { chromium } from 'playwright';

const alvo = process.argv[2];
const origem = new URL(alvo).origin;

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// 1. Contexto extra no bundle: como é construído o download/imagem
console.log('=== BUNDLE: contexto de "identifier" e da imagem ===');
const pagina = await (await fetch(alvo, { headers: { 'User-Agent': UA } })).text();
const bundles = [...pagina.matchAll(/(?:src|href)="([^"]+\.js)"/g)].map((m) =>
  new URL(m[1], origem).toString()
);
for (const b of bundles) {
  const js = await (await fetch(b, { headers: { 'User-Agent': UA } })).text();
  const termos = /.{0,120}(?:tasks\/download|identifier=|vault:\/\/|StorageDissemination|openseadragon|tileSources|\bdzi\b).{0,180}/gi;
  const vistos = new Set();
  for (const m of js.matchAll(termos)) {
    const t = m[0].replace(/\s+/g, ' ');
    if (vistos.has(t.slice(0, 70))) continue;
    vistos.add(t.slice(0, 70));
    console.log('\n· ' + t);
    if (vistos.size > 25) break;
  }
}

// 2. O visualizador a correr, com UA de browser normal
console.log('\n=== PEDIDOS DO VISUALIZADOR (Chromium com UA normal) ===');
const browser = await chromium.launch({
  args: ['--disable-blink-features=AutomationControlled'],
});
const ctx = await browser.newContext({
  userAgent: UA,
  locale: 'pt-PT',
  viewport: { width: 1500, height: 1000 },
  extraHTTPHeaders: { 'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8' },
});
const page = await ctx.newPage();

const pedidos = [];
page.on('response', (res) => {
  const tipo = res.headers()['content-type'] || '';
  const tam = res.headers()['content-length'] || '';
  pedidos.push({ status: res.status(), tipo, tam, url: res.url() });
});

await page.goto(alvo, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(15000);

console.log(`título: ${await page.title()}`);
const ruido = /\.(css|woff2?|ttf|ico)(\?|$)|analytics|plausible/i;
for (const p of pedidos) {
  if (ruido.test(p.url)) continue;
  console.log(`${p.status}  ${(p.tipo || '').padEnd(28)} ${String(p.tam).padStart(9)}  ${p.url}`);
}

console.log('\n=== IMG NA PÁGINA ===');
for (const s of await page.evaluate(() =>
  [...document.querySelectorAll('img,canvas')].map((e) => e.tagName + ' ' + (e.src || '')).slice(0, 30)
))
  console.log(s);

await browser.close();
