#!/usr/bin/env node
/**
 * Descarrega a imagem de um ASSENTO — não do livro.
 *
 * Descoberta que motiva este script: o Livro 1.º de casamentos dos Canhas
 * (descrição 2195) devolve zero páginas em /digitalobjects; o livro parecia
 * não estar digitalizado. Mas a descrição ao nível do assento — por exemplo
 * 170550, «Registo de casamento: Manuel Correia c.c. Francisca Lopes», 1622,
 * Liv. 476 f. 31 v.º — traz os campos
 *
 *     StorageDisseminationID: vault://DISSEMINATION/<hash>
 *     StorageThumbnailID:     vault://THUMB/<hash>
 *
 * e esses servem-se por /api/storage/storageobject?objectId=… . Ou seja: o
 * livro é alcançável assento a assento, mesmo quando não é alcançável página
 * a página.
 *
 * Uso:  node scripts/arquivo-abm-assentos.mjs 170550 169595 …
 *       (ou pela variável ABM_ITENS, separada por espaços/vírgulas)
 */
import { mkdir, writeFile } from 'node:fs/promises';

const origem = 'https://arquivo-abm.madeira.gov.pt';
const H = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
};
const destino = 'arquivo/assentos';

/** Lê as dimensões de um JPEG sem descodificar a imagem. */
function dimensoes(b) {
  for (let i = 2; i < b.length - 9; ) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1];
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) {
      return `${b.readUInt16BE(i + 7)}x${b.readUInt16BE(i + 5)}`;
    }
    i += 2 + b.readUInt16BE(i + 2);
  }
  return '?';
}

async function guardar(id, rotulo, objectId) {
  const url = `${origem}/api/storage/storageobject?objectId=${encodeURIComponent(objectId)}`;
  try {
    const r = await fetch(url, { headers: H });
    if (!r.ok) { console.log(`  ${rotulo.padEnd(13)} HTTP ${r.status}`); return; }
    const b = Buffer.from(await r.arrayBuffer());
    const ficheiro = `${destino}/${id}-${rotulo}.jpg`;
    await writeFile(ficheiro, b);
    console.log(`  ${rotulo.padEnd(13)} ${String(b.length).padStart(8)} bytes  ${dimensoes(b)}  -> ${ficheiro}`);
  } catch (e) {
    console.log(`  ${rotulo.padEnd(13)} ${String(e).slice(0, 70)}`);
  }
}

/** Percorre uma árvore JSON e recolhe todos os nós que declarem variantes. */
function variantes(no, achados = []) {
  if (Array.isArray(no)) { no.forEach((x) => variantes(x, achados)); return achados; }
  if (!no || typeof no !== 'object') return achados;
  if (no.OriginalURL || no.DisseminationURL || no.ThumbnailURL) achados.push(no);
  Object.values(no).forEach((x) => variantes(x, achados));
  return achados;
}

const alvos = (process.argv.slice(2).join(' ') || process.env.ABM_ITENS || '')
  .split(/[\s,]+/)
  .filter(Boolean);

await mkdir(destino, { recursive: true });

for (const id of alvos) {
  console.log(`\n===== ${id} =====`);
  const r = await fetch(`${origem}/api/descriptions/${id}`, { headers: { ...H, Accept: 'application/json' } });
  if (!r.ok) { console.log(`  descrição: HTTP ${r.status}`); continue; }
  const d = await r.json();
  console.log(`  ${d.CompleteUnitId ?? '?'}  ${d.UnitDateInitial ?? '?'}`);
  console.log(`  ${d.UnitTitle ?? '?'}`);
  console.log(`  PhysLoc: ${d.PhysLoc ?? '—'}   Parent: ${d.Parent ?? '—'}`);

  // 1. As variantes declaradas na própria descrição do assento.
  const directas = [
    ['original', d.StorageOriginalID],
    ['dissem', d.StorageDisseminationID],
    ['thumb', d.StorageThumbnailID],
  ].filter(([, v]) => v);
  for (const [rot, v] of directas) await guardar(id, rot, v);

  // 2. E as que venham por /digitalobjects — se o assento tiver as suas.
  try {
    const rd = await fetch(`${origem}/api/descriptions/${id}/digitalobjects`, {
      headers: { ...H, Accept: 'application/json' },
    });
    if (rd.ok) {
      const vs = variantes(await rd.json());
      console.log(`  digitalobjects: ${vs.length} nó(s)`);
      for (let i = 0; i < vs.length && i < 4; i++) {
        const v = vs[i];
        if (v.OriginalURL) await guardar(id, `do${i}-original`, v.OriginalURL);
        if (v.DisseminationURL) await guardar(id, `do${i}-dissem`, v.DisseminationURL);
      }
    } else {
      console.log(`  digitalobjects: HTTP ${rd.status}`);
    }
  } catch (e) {
    console.log(`  digitalobjects: ${String(e).slice(0, 70)}`);
  }
}
