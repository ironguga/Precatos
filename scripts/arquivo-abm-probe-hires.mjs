#!/usr/bin/env node
/**
 * A cópia de difusão sai a ~936x1395 px. Este probe procura uma variante de
 * maior resolução: mostra o registo completo de uma imagem em /digitalobjects
 * (para ver que IDs de armazenamento existem além de DISSEMINATION/THUMB) e
 * testa a rota de download encontrada no bundle (/api/tasks/download).
 */
const alvo = process.argv[2];
const origem = new URL(alvo).origin;
const descricaoId = new URL(alvo).pathname.match(/\/descriptions\/(\d+)/)[1];
const H = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
};

const dig = await (await fetch(`${origem}/api/descriptions/${descricaoId}/digitalobjects`, {
  headers: { ...H, Accept: 'application/json' },
})).json();

console.log('=== FORMA DA RESPOSTA ===');
console.log('tipo:', Array.isArray(dig) ? `array[${dig.length}]` : typeof dig);
const raiz = Array.isArray(dig) ? dig[0] : dig;
console.log('chaves de topo:', Object.keys(raiz).join(', '));

// Localiza os registos que têm vault://
const registos = [];
(function anda(n) {
  if (Array.isArray(n)) return n.forEach(anda);
  if (!n || typeof n !== 'object') return;
  if (Object.values(n).some((v) => typeof v === 'string' && v.startsWith('vault://'))) registos.push(n);
  Object.values(n).forEach(anda);
})(dig);

console.log(`\n=== REGISTO COMPLETO DA IMAGEM 145 (de ${registos.length}) ===`);
const r145 = registos[144] ?? registos[0];
console.log(JSON.stringify(r145, null, 1).slice(0, 1800));

const todasChaves = new Set(registos.flatMap((r) => Object.keys(r)));
console.log('\nchaves presentes nos registos:', [...todasChaves].join(', '));
const variantes = new Set();
for (const r of registos)
  for (const v of Object.values(r))
    if (typeof v === 'string' && v.startsWith('vault://')) variantes.add(v.split('/')[2]);
console.log('variantes vault:// encontradas:', [...variantes].join(', '));

// Testa a rota de download do bundle e variações do storageobject
const diss = Object.values(r145).find((v) => typeof v === 'string' && v.includes('DISSEMINATION'));
const id = r145.ID ?? r145.Id;
console.log(`\n=== TENTATIVAS DE MAIOR RESOLUÇÃO (id=${id}) ===`);
const tentativas = [
  `/api/tasks/download/?identifier=${id}`,
  `/api/tasks/download/?identifier=${encodeURIComponent(diss ?? '')}`,
  `/api/storage/storageobject?objectId=${encodeURIComponent(diss ?? '')}&original=true`,
  `/api/storage/storageobject?objectId=${encodeURIComponent((diss ?? '').replace('DISSEMINATION', 'MASTER'))}`,
  `/api/storage/storageobject?objectId=${encodeURIComponent((diss ?? '').replace('DISSEMINATION', 'ORIGINAL'))}`,
];
for (const c of tentativas) {
  try {
    const res = await fetch(origem + c, { headers: H });
    const tipo = res.headers.get('content-type') || '';
    const buf = res.ok ? Buffer.from(await res.arrayBuffer()) : Buffer.alloc(0);
    let dim = '';
    if (tipo.includes('jpeg')) {
      let i = 2;
      while (i < buf.length) {
        if (buf[i] !== 0xff) { i++; continue; }
        const m = buf[i + 1];
        if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) {
          dim = `${buf.readUInt16BE(i + 7)}x${buf.readUInt16BE(i + 5)} px`;
          break;
        }
        i += 2 + buf.readUInt16BE(i + 2);
      }
    }
    console.log(`${res.status}  ${tipo.padEnd(26)} ${String(buf.length).padStart(9)}  ${dim.padEnd(14)}  ${c.slice(0, 95)}`);
  } catch (e) {
    console.log(`erro  ${c.slice(0, 95)}: ${e.message}`);
  }
}
