#!/usr/bin/env node
/**
 * Uma tentativa, e só uma: pedir a descarga com uma sessão normal de
 * navegador. O endpoint /api/tasks/download/ responde 403 — existe e recusa —
 * e a explicação mais simples é falta de sessão, porque o visualizador é uma
 * aplicação que carrega a página antes de pedir os ficheiros.
 *
 * Carrega-se a página, guardam-se os cookies, e repete-se o pedido com eles e
 * com os cabeçalhos que um browser envia. Se continuar 403, é política do
 * arquivo, e fica assim: não se procura maneira de contornar.
 */
const origem = 'https://arquivo-abm.madeira.gov.pt';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const ORIG = '497028441981BA1B3011001ED8950928';

let cookies = '';
function guarda(res) {
  const set = res.headers.getSetCookie?.() ?? [];
  const novos = set.map((c) => c.split(';')[0]).filter(Boolean);
  if (novos.length) cookies = [...new Set([...cookies.split('; ').filter(Boolean), ...novos])].join('; ');
}

// 1. abrir o sítio como um visitante
for (const caminho of ['/', '/viewer/descriptions/48721', '/api/descriptions/48721']) {
  const r = await fetch(origem + caminho, { headers: { 'User-Agent': UA, 'Accept-Language': 'pt-PT,pt;q=0.9' } });
  guarda(r);
  console.log(`GET ${caminho.padEnd(32)} ${r.status}`);
}
console.log(`cookies obtidos: ${cookies || '(nenhum)'}\n`);

// 2. repetir a descarga com sessão e cabeçalhos de navegador
const H = {
  'User-Agent': UA,
  'Accept': '*/*',
  'Accept-Language': 'pt-PT,pt;q=0.9',
  'X-Requested-With': 'XMLHttpRequest',
  'Referer': `${origem}/viewer/descriptions/48721`,
  'Origin': origem,
  ...(cookies ? { Cookie: cookies } : {}),
};

for (const [rot, id] of [
  ['livro', '48721'],
  ['vault ORIGINAL', `vault://ORIGINAL/${ORIG}`],
]) {
  const url = `${origem}/api/tasks/download/?identifier=${encodeURIComponent(id)}`;
  const r = await fetch(url, { headers: H });
  const b = Buffer.from(await r.arrayBuffer());
  console.log(`descarga ${rot.padEnd(18)} ${r.status}  ${b.length}b  ${r.headers.get('content-type') ?? ''}`);
  if (r.ok && b.length > 200000) {
    const { writeFile, mkdir } = await import('node:fs/promises');
    await mkdir('arquivo/assentos', { recursive: true });
    await writeFile('arquivo/assentos/pontadosol-descarga.bin', b);
    console.log('   >>> GUARDADO');
  } else if (!r.ok) {
    console.log(`   corpo: ${b.toString('utf8').slice(0, 200).replace(/\s+/g, ' ')}`);
  }
}
