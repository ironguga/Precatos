#!/usr/bin/env node
/**
 * O pacote do visualizador conhece cinco caminhos de imagem. Quatro eu já usava.
 * O quinto — /api/tasks/download/?identifier= — nunca testei, e um endereço
 * chamado «download» não serve miniaturas: serve ficheiros.
 *
 * Se ele entregar a variante ORIGINAL do fólio 75 do Livro 1.º de casamentos da
 * Ponta do Sol, a filiação de Diogo Fernandes Pita lê-se.
 */
const origem = 'https://arquivo-abm.madeira.gov.pt';
const H = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Referer: `${origem}/viewer/descriptions/48721`,
};
const DISS = '2FDB4B09315CCCB4DC8AB4B779CEE1B5';
const ORIG = '497028441981BA1B3011001ED8950928';

function dim(b) {
  for (let i = 2; i < b.length - 9; ) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1];
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return `${b.readUInt16BE(i + 7)}x${b.readUInt16BE(i + 5)}`;
    i += 2 + b.readUInt16BE(i + 2);
  }
  return '—';
}

async function sonda(rot, url, init = {}) {
  try {
    const r = await fetch(url, { headers: H, ...init });
    const ct = (r.headers.get('content-type') ?? '').split(';')[0];
    const cd = r.headers.get('content-disposition') ?? '';
    if (!r.ok) return console.log(`  ${rot.padEnd(52)} ${r.status}`);
    const b = Buffer.from(await r.arrayBuffer());
    if (b.length === 2255) return console.log(`  ${rot.padEnd(52)} 200  (casca vazia)`);
    const extra = /image/.test(ct) ? dim(b)
      : /json|xml|text/.test(ct) ? b.toString('utf8').slice(0, 200).replace(/\s+/g, ' ') : '';
    console.log(`  ${rot.padEnd(52)} 200  ${String(b.length).padStart(9)}b  ${ct}  ${cd}  ${extra}`);
    if (b.length > 200000 && /image|octet|pdf|zip/.test(ct)) {
      const { writeFile, mkdir } = await import('node:fs/promises');
      await mkdir('arquivo/assentos', { recursive: true });
      const ext = /pdf/.test(ct) ? 'pdf' : /zip/.test(ct) ? 'zip' : 'jpg';
      const f = `arquivo/assentos/pontadosol-f75-${rot.replace(/\W+/g, '')}.${ext}`;
      await writeFile(f, b);
      console.log(`      >>> GUARDADO em ${f}`);
    }
  } catch (e) { console.log(`  ${rot.padEnd(52)} ${String(e).slice(0, 60)}`); }
}

console.log('===== /api/tasks/download/ com vários identificadores =====');
for (const [rot, id] of [
  ['livro 48721', '48721'],
  ['assento 603056', '603056'],
  ['hash ORIGINAL', ORIG],
  ['hash DISSEMINATION', DISS],
  ['vault ORIGINAL', `vault://ORIGINAL/${ORIG}`],
  ['vault DISSEMINATION', `vault://DISSEMINATION/${DISS}`],
]) {
  await sonda(`GET tasks/download ${rot}`, `${origem}/api/tasks/download/?identifier=${encodeURIComponent(id)}`);
}

console.log('\n===== variações do caminho =====');
for (const caminho of ['tasks/download', 'tasks/download/', 'task/download', 'tasks/downloads']) {
  await sonda(`${caminho} · ORIGINAL`, `${origem}/api/${caminho}?identifier=${encodeURIComponent('vault://ORIGINAL/' + ORIG)}`);
}

console.log('\n===== POST, caso o download seja uma tarefa a criar =====');
for (const [rot, corpo] of [
  ['descriptionId 48721', { descriptionId: 48721 }],
  ['identifier vault ORIGINAL', { identifier: `vault://ORIGINAL/${ORIG}` }],
  ['objectId vault ORIGINAL', { objectId: `vault://ORIGINAL/${ORIG}` }],
]) {
  await sonda(`POST ${rot}`, `${origem}/api/tasks/download/`, {
    method: 'POST',
    headers: { ...H, 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });
}
