#!/usr/bin/env node
/**
 * Enumera as descrições de um fundo do Archeevo pelo código de referência.
 *
 * A varredura por ID é lenta e os IDs de uma paróquia não são contíguos. A
 * busca (/api/descriptions/search?q=) é difusa, mas aceita o próprio código de
 * referência como termo — o que permite pedir a série toda de uma vez.
 *
 * Uso: node scripts/arquivo-abm-livros.mjs [termos...]
 */
const origem = 'https://arquivo-abm.madeira.gov.pt';
const H = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'application/json',
};

const termos = process.argv.slice(2);
if (!termos.length) termos.push('PT/ABM/PPTS01/001', 'PT/ABM/PPTS01/002', 'PPTS01 baptismos', 'Canhas 1765');

const vistos = new Map();

for (const termo of termos) {
  for (let pagina = 1; pagina <= 4; pagina++) {
    let r;
    try {
      const res = await fetch(
        `${origem}/api/descriptions/search?q=${encodeURIComponent(termo)}&page=${pagina}&perPage=50`,
        { headers: H }
      );
      if (!res.ok) break;
      r = await res.json();
    } catch {
      break;
    }
    const itens = r.Items ?? r.items ?? [];
    if (!itens.length) break;
    for (const it of itens) {
      const cod = it.CompleteUnitId ?? '';
      if (!/PPTS01/i.test(cod)) continue;
      const id = it.ID ?? it.Id;
      if (vistos.has(id)) continue;
      vistos.set(id, {
        id,
        cod,
        ini: (it.UnitDateInitial ?? '').slice(0, 10),
        fim: (it.UnitDateFinal ?? '').slice(0, 10),
        tit: it.UnitTitle ?? '',
      });
    }
  }
}

const achados = [...vistos.values()].sort((a, b) => a.cod.localeCompare(b.cod));
console.log(`\n=== ${achados.length} descrições da paróquia dos Canhas ===`);
console.log('    ID  CÓDIGO                        DATAS                    TÍTULO');
for (const a of achados)
  console.log(`${String(a.id).padStart(6)}  ${a.cod.padEnd(28)} ${a.ini}..${a.fim}  ${a.tit}`);
