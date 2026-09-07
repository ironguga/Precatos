#!/usr/bin/env node
/**
 * Levantamento exaustivo do que o ABM tem em linha da paróquia dos Canhas.
 *
 * A busca por texto do Archeevo é difusa e não devolve a série toda, por isso
 * varro os IDs em torno dos que já conheço (41777 casamentos 1692-1743, 41778
 * casamentos 1754-1793, 42119 baptismos 1680-1708) e filtro pelo código de
 * referência da paróquia. Imprimo também os campos de uma descrição, para se
 * ver que ligações a API expõe.
 */
const origem = 'https://arquivo-abm.madeira.gov.pt';
const H = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'application/json',
};

const de = Number(process.argv[2] ?? 41000);
const ate = Number(process.argv[3] ?? 43000);

async function descricao(id) {
  try {
    const res = await fetch(`${origem}/api/descriptions/${id}`, { headers: H });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Mostra uma vez todos os campos, para se ver o que a API dá além do título.
const amostra = await descricao(41778);
if (amostra) {
  console.log('=== campos que a API expõe numa descrição (41778) ===');
  for (const [k, v] of Object.entries(amostra)) {
    if (v === null || v === '' || (Array.isArray(v) && !v.length)) continue;
    const s = typeof v === 'object' ? JSON.stringify(v).slice(0, 160) : String(v).slice(0, 160);
    console.log(`  ${k}: ${s}`);
  }
  console.log();
}

const achados = [];
const lote = 24;
for (let i = de; i <= ate; i += lote) {
  const ids = [];
  for (let j = i; j < i + lote && j <= ate; j++) ids.push(j);
  const rs = await Promise.all(ids.map(descricao));
  for (let k = 0; k < ids.length; k++) {
    const d = rs[k];
    if (!d) continue;
    const cod = d.CompleteUnitId ?? d.UnitId ?? '';
    const tit = d.UnitTitle ?? '';
    if (!/PPTS01/i.test(cod) && !/canhas/i.test(tit)) continue;
    achados.push({
      id: ids[k],
      cod,
      tit,
      ini: (d.UnitDateInitial ?? '').slice(0, 10),
      fim: (d.UnitDateFinal ?? '').slice(0, 10),
      digital: d.HasDigitalObjects ?? d.HasRepresentations ?? '',
    });
  }
  if ((i - de) % 480 === 0) console.error(`  … ${i}`);
}

achados.sort((a, b) => (a.cod || '').localeCompare(b.cod || ''));
console.log(`=== ${achados.length} descrições dos Canhas entre ${de} e ${ate} ===`);
console.log('    ID  CÓDIGO                        DATAS                   DIG  TÍTULO');
for (const a of achados)
  console.log(
    `${String(a.id).padStart(6)}  ${(a.cod || '?').padEnd(28)} ${a.ini}..${a.fim}  ${String(a.digital).padEnd(5)} ${a.tit}`
  );
