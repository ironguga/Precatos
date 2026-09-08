#!/usr/bin/env node
/**
 * O registo de cada página traz TRÊS variantes:
 *   OriginalURL      vault://ORIGINAL/<hash>      "Length": 329711 bytes
 *   DisseminationURL vault://DISSEMINATION/<hash> 107 422 bytes, 668x980
 *   ThumbnailURL     vault://THUMB/<hash>         5 692 bytes, 128x188
 *
 * O endpoint que eu uso — /api/storage/storageobject?objectId=vault://ORIGINAL/…
 * — devolve 404 para a ORIGINAL. Mas o ficheiro existe: o catálogo declara-lhe
 * o tamanho. Se houver outro endereço que o sirva, o assento de 1641 (imagem 7
 * do Livro 2.º de casamentos dos Canhas), cuja filiação está numa mancha,
 * passa de 668 px para ~1150 px de largura — e pode voltar a ler-se.
 *
 * Este script tenta sistematicamente as formas plausíveis.
 */
const origem = 'https://arquivo-abm.madeira.gov.pt';
const H = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' };

async function sonda(url, rot) {
  try {
    const r = await fetch(url, { headers: H });
    if (!r.ok) return `${rot} -> ${r.status}`;
    const b = Buffer.from(await r.arrayBuffer());
    let dim = '';
    for (let i = 2; i < b.length - 9; ) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) { dim = `${b.readUInt16BE(i + 7)}x${b.readUInt16BE(i + 5)}`; break; }
      i += 2 + b.readUInt16BE(i + 2);
    }
    return `${rot} -> 200  ${String(b.length).padStart(8)} bytes  ${dim}  ${r.headers.get('content-type')}`;
  } catch (e) { return `${rot} -> ${String(e).slice(0, 50)}`; }
}

const r = await fetch(`${origem}/api/descriptions/48626/digitalobjects`, { headers: { ...H, Accept: 'application/json' } });
const dados = await r.json();
const achar = (no, s = []) => {
  if (Array.isArray(no)) { no.forEach((x) => achar(x, s)); return s; }
  if (!no || typeof no !== 'object') return s;
  if (no.OriginalURL && no.DisseminationURL) s.push(no);
  Object.values(no).forEach((x) => achar(x, s));
  return s;
};
const pgs = achar(dados).sort((a, b) => String(a.Name ?? '').localeCompare(String(b.Name ?? ''), 'pt', { numeric: true }));
const p = pgs[6] ?? pgs[0];
console.log('página:', p.Name, '· RepresentationID', p.RepresentationID, '· FileID/ID', p.ID, '· Length', p.Length);
const oid = p.OriginalURL, hash = p.Digest, rep = p.RepresentationID, fid = p.ID;
const e = encodeURIComponent;

const formas = [
  ['storageobject objectId ORIGINAL', `${origem}/api/storage/storageobject?objectId=${e(oid)}`],
  ['storageobject sem encode', `${origem}/api/storage/storageobject?objectId=${oid}`],
  ['storage/download', `${origem}/api/storage/download?objectId=${e(oid)}`],
  ['storage/file', `${origem}/api/storage/file?objectId=${e(oid)}`],
  ['storageobject id=hash', `${origem}/api/storage/storageobject?objectId=${hash}`],
  ['representations/{rep}', `${origem}/api/representations/${rep}`],
  ['representations/{rep}/file', `${origem}/api/representations/${rep}/file`],
  ['representations/{rep}/download', `${origem}/api/representations/${rep}/download`],
  ['representations/{rep}/original', `${origem}/api/representations/${rep}/original`],
  ['digitalobjects/{fid}', `${origem}/api/digitalobjects/${fid}`],
  ['digitalobjects/{fid}/download', `${origem}/api/digitalobjects/${fid}/download`],
  ['digitalobjects/{fid}/file', `${origem}/api/digitalobjects/${fid}/file`],
  ['files/{fid}', `${origem}/api/files/${fid}`],
  ['files/{fid}/download', `${origem}/api/files/${fid}/download`],
  ['download?representationId', `${origem}/api/download?representationId=${rep}`],
  ['download?fileId', `${origem}/api/download?fileId=${fid}`],
  ['storage/storageobject?objectId&type=ORIGINAL', `${origem}/api/storage/storageobject?objectId=${e(p.DisseminationURL)}&type=ORIGINAL`],
  ['viewer download', `${origem}/viewer/download/${rep}`],
  ['Archeevo7 report', `${origem}/Archeevo7/storage/storageobject?objectId=${e(oid)}`],
  ['storageobject MASTER', `${origem}/api/storage/storageobject?objectId=${e('vault://MASTER/' + hash)}`],
  ['storageobject PRESERVATION', `${origem}/api/storage/storageobject?objectId=${e('vault://PRESERVATION/' + hash)}`],
  ['(controlo) DISSEMINATION', `${origem}/api/storage/storageobject?objectId=${e(p.DisseminationURL)}`],
];
for (const [rot, u] of formas) console.log('  ' + (await sonda(u, rot.padEnd(42))));
