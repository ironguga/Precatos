#!/usr/bin/env node
/**
 * Enumera os livros da paróquia dos Canhas (fundo PT/ABM/PPTS01) no Archeevo.
 *
 * A busca por termo é difusa e o Archeevo não expõe hierarquia
 * (/parents, /children devolvem 404). Mas os IDs das descrições de um mesmo
 * fundo ficam em bloco: o Livro 5.º de casamentos é o 41778, portanto os
 * livros de baptismos e os outros de casamentos estão à volta. Varremos o
 * bloco e ficamos com o que tiver PPTS01 no código de referência.
 */
const origem = 'https://arquivo-abm.madeira.gov.pt';
const H = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'application/json',
};

const inicio = Number(process.argv[2] ?? 41700);
const fim = Number(process.argv[3] ?? 41860);

console.log(`A varrer descrições ${inicio}..${fim}\n`);
console.log('    ID  CÓDIGO                        DATAS            TÍTULO');

const achados = [];
for (let id = inicio; id <= fim; id++) {
  try {
    const res = await fetch(`${origem}/api/descriptions/${id}`, { headers: H });
    if (!res.ok) continue;
    const d = await res.json();
    const cod = d.CompleteUnitId ?? '';
    if (!/PPTS01/i.test(cod)) continue;
    const linha = `${String(id).padStart(6)}  ${cod.padEnd(28)} ${(d.UnitDateInitial ?? '').slice(0, 10)}..${(d.UnitDateFinal ?? '').slice(0, 10)}  ${d.UnitTitle ?? ''}`;
    console.log(linha);
    achados.push({ id, cod, titulo: d.UnitTitle });
  } catch {
    /* segue */
  }
}

console.log(`\n${achados.length} descrições da paróquia dos Canhas encontradas.`);
console.log('\nURLs do visualizador:');
for (const a of achados) console.log(`  ${origem}/viewer/descriptions/${a.id}   ${a.titulo ?? ''}`);
