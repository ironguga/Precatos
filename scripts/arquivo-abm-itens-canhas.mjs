#!/usr/bin/env node
/**
 * Procura as descrições AO NÍVEL DO ASSENTO da paróquia dos Canhas.
 *
 * Descoberta: o ABM tem, para alguns livros, uma descrição por assento, com o
 * NOME DOS NOIVOS NO TÍTULO — por exemplo
 *   PT/ABM/PCLT01/002/00003/000451  «Registo de casamento: Manuel Gomes Órfão
 *   c.c. Inês de Jesus Maria»
 * Estas descrições vivem nos identificadores acima dos 90 mil. Se os livros de
 * casamentos dos Canhas (PPTS01/002) estiverem assim indexados, o casamento de
 * Pedro da Sylva de Ponte com Maria Roiz Pitta aparece pelo nome, e acaba a
 * varredura de margens.
 */
const origem = 'https://arquivo-abm.madeira.gov.pt';
const H = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'application/json',
};

const de = Number(process.argv[2] ?? 90000);
const ate = Number(process.argv[3] ?? 200000);

async function descricao(id) {
  for (let t = 0; t < 2; t++) {
    try {
      const res = await fetch(`${origem}/api/descriptions/${id}`, { headers: H });
      if (res.status === 404) return null;
      if (!res.ok) { await new Promise((r) => setTimeout(r, 200)); continue; }
      return await res.json();
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  return null;
}

const achados = [];
const lote = 32;
for (let i = de; i <= ate; i += lote) {
  const ids = [];
  for (let j = i; j < i + lote && j <= ate; j++) ids.push(j);
  const rs = await Promise.all(ids.map(descricao));
  for (let k = 0; k < ids.length; k++) {
    const d = rs[k];
    if (!d) continue;
    const cod = d.CompleteUnitId ?? '';
    if (!/PPTS01/.test(cod)) continue;
    achados.push({
      id: ids[k],
      cod,
      tit: d.UnitTitle ?? '',
      ini: (d.UnitDateInitial ?? '').slice(0, 10),
    });
  }
  if ((i - de) % 6400 === 0) console.error(`  … ${i} (${achados.length})`);
}

achados.sort((a, b) => (a.cod || '').localeCompare(b.cod || ''));
console.log(`=== ${achados.length} descrições dos Canhas, IDs ${de}-${ate} ===`);
for (const a of achados)
  console.log(`${String(a.id).padStart(7)}  ${(a.cod || '?').padEnd(34)} ${a.ini}  ${a.tit}`);
