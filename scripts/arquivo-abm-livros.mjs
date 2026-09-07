#!/usr/bin/env node
/**
 * Mapeia os livros da paróquia dos Canhas (fundo PT/ABM/PPTS01) no Archeevo.
 *
 * A busca do ABM (/api/descriptions/search?q=) indexa as descrições do
 * catálogo, não o texto dos assentos — não serve para achar um nome dentro de
 * um livro, mas serve para descobrir que livros existem e com que IDs, que é
 * o que permite ir direto ao livro de baptismos ou de casamentos certo.
 */
const origem = 'https://arquivo-abm.madeira.gov.pt';
const H = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
  Accept: 'application/json',
};

async function json(caminho) {
  const res = await fetch(origem + caminho, { headers: H });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function resumo(d) {
  const id = d.ID ?? d.Id ?? '?';
  const cod = d.CompleteUnitId ?? '';
  const tit = d.UnitTitle ?? d.Title ?? '';
  const ini = (d.UnitDateInitial ?? '').slice(0, 10);
  const fim = (d.UnitDateFinal ?? '').slice(0, 10);
  return `${String(id).padStart(6)}  ${cod.padEnd(26)} ${ini}..${fim}  ${tit}`;
}

// 1. Onde é que o livro 41778 se encaixa na hierarquia
console.log('=== HIERARQUIA A PARTIR DO LIVRO 41778 ===');
for (const molde of ['/api/descriptions/41778/parents', '/api/descriptions/41778/ancestors', '/api/descriptions/41778/tree', '/api/descriptions/41778/children', '/api/descriptions/41778/siblings']) {
  try {
    const d = await json(molde);
    console.log(`\n-- ${molde}`);
    console.log(JSON.stringify(d).slice(0, 900));
  } catch (e) {
    console.log(`-- ${molde}: ${e.message}`);
  }
}

// 2. Procurar os livros da paróquia por termo
for (const termo of ['Canhas baptismos', 'Canhas casamentos', 'Canhas óbitos', 'PPTS01']) {
  console.log(`\n=== BUSCA: "${termo}" ===`);
  try {
    const r = await json(`/api/descriptions/search?q=${encodeURIComponent(termo)}&page=1&perPage=40`);
    const itens = r.Items ?? r.items ?? [];
    console.log(`${itens.length} resultados`);
    for (const it of itens) {
      const cod = it.CompleteUnitId ?? '';
      // só o que é mesmo da paróquia dos Canhas
      if (!/PPTS01/i.test(cod) && !/Canhas/i.test(it.UnitTitle ?? '')) continue;
      console.log('  ' + resumo(it));
    }
  } catch (e) {
    console.log('falhou:', e.message);
  }
}
