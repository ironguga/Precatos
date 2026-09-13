#!/usr/bin/env node
/**
 * A pergunta que eu nunca fiz ao arquivo: o visualizador deixa ampliar?
 *
 * Medi que /api/storage/storageobject devolve 721x1107 para o fólio 75 do
 * Livro 1.º de casamentos da Ponta do Sol, e que a variante ORIGINAL responde
 * 404. Concluí daí que 721 px era tudo o que existia. Mas essa conclusão tem um
 * buraco: **se o visualizador do sítio permitir ampliar a página no ecrã**,
 * então existe informação acima de 721 px e é servida — por um endereço de
 * MOSAICOS (IIIF, Deep Zoom, OpenSeadragon), que é outra porta e eu nunca lhe
 * bati.
 *
 * Este script vai buscar a página do visualizador, extrai os endereços que ela
 * refere, e depois experimenta as formas de mosaico conhecidas.
 */
const origem = 'https://arquivo-abm.madeira.gov.pt';
const H = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept-Language': 'pt-PT,pt;q=0.9',
};

const livro = process.argv[2] ?? '48721';
const hash = process.argv[3] ?? '2FDB4B09315CCCB4DC8AB4B779CEE1B5'; // DISSEMINATION do fólio 75
const orig = process.argv[4] ?? '497028441981BA1B3011001ED8950928'; // ORIGINAL declarada

function dim(b) {
  for (let i = 2; i < b.length - 9; ) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1];
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return `${b.readUInt16BE(i + 7)}x${b.readUInt16BE(i + 5)}`;
    i += 2 + b.readUInt16BE(i + 2);
  }
  return '—';
}

async function sonda(rot, url) {
  try {
    const r = await fetch(url, { headers: H });
    const ct = r.headers.get('content-type') ?? '';
    if (!r.ok) return console.log(`  ${rot.padEnd(46)} ${r.status}`);
    const b = Buffer.from(await r.arrayBuffer());
    const extra = /image/.test(ct) ? dim(b) : (/json|xml/.test(ct) ? b.toString('utf8').slice(0, 180).replace(/\s+/g, ' ') : '');
    console.log(`  ${rot.padEnd(46)} 200  ${String(b.length).padStart(8)}b  ${ct.split(';')[0]}  ${extra}`);
  } catch (e) { console.log(`  ${rot.padEnd(46)} ${String(e).slice(0, 50)}`); }
}

// 1. O que a página do visualizador refere
console.log(`===== visualizador do livro ${livro} =====`);
try {
  const r = await fetch(`${origem}/viewer/descriptions/${livro}`, { headers: H });
  const html = await r.text();
  console.log(`  HTTP ${r.status}, ${html.length} bytes`);
  const alvos = new Set();
  for (const m of html.matchAll(/["'(]([^"'()\s]*(?:iiif|tile|dzi|deepzoom|zoom|seadragon|image)[^"'()\s]*)["')]/gi))
    alvos.add(m[1]);
  for (const a of [...alvos].slice(0, 40)) console.log(`    ref: ${a}`);
  if (!alvos.size) console.log('    (nenhuma referência a mosaicos ou IIIF)');
} catch (e) { console.log(`  ${String(e).slice(0, 80)}`); }

// 2. As formas de mosaico conhecidas
console.log(`\n===== formas de mosaico, para o hash ${hash.slice(0, 8)}… =====`);
const formas = [
  ['IIIF info.json', `${origem}/iiif/${hash}/info.json`],
  ['IIIF api info', `${origem}/api/iiif/${hash}/info.json`],
  ['IIIF full/full', `${origem}/iiif/${hash}/full/full/0/default.jpg`],
  ['IIIF full/max', `${origem}/iiif/${hash}/full/max/0/default.jpg`],
  ['IIIF vault id', `${origem}/iiif/${encodeURIComponent('vault://DISSEMINATION/' + hash)}/info.json`],
  ['DZI descriptor', `${origem}/api/storage/storageobject.dzi?objectId=vault://DISSEMINATION/${hash}`],
  ['DZI ficheiros', `${origem}/api/storage/${hash}_files/13/0_0.jpg`],
  ['tile api', `${origem}/api/storage/tile?objectId=vault://DISSEMINATION/${hash}&level=13&x=0&y=0`],
  ['deepzoom', `${origem}/deepzoom/${hash}.dzi`],
  ['storage master', `${origem}/api/storage/storageobject?objectId=vault://MASTER/${orig}`],
  ['storage preserv.', `${origem}/api/storage/storageobject?objectId=vault://PRESERVATION/${orig}`],
  ['original c/ format', `${origem}/api/storage/storageobject?objectId=vault://ORIGINAL/${orig}&format=jpg`],
  ['download', `${origem}/api/storage/download?objectId=vault://ORIGINAL/${orig}`],
  ['file', `${origem}/api/storage/file?objectId=vault://ORIGINAL/${orig}`],
];
for (const [rot, url] of formas) await sonda(rot, url);
