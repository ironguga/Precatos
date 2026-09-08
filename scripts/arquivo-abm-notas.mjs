#!/usr/bin/env node
/**
 * Procura, por varrimento de identificadores, as séries e livros NOTARIAIS do
 * ABM — livros de notas dos tabeliães — anteriores a 1800.
 *
 * Porquê: os assentos de óbito dos Canhas dizem que Francisco Pita (1721),
 * Maria de Ponte (1723) e António Vieira de Ponte (1733) fizeram testamentos
 * «aprovados pelo Tabelião», e nomeiam dois deles: Manoel Alves Mourado e
 * António da Sylva de Abreu. Um testamento aprovado fica no livro de notas do
 * tabelião. O de Francisco Pita nomearia a mulher e os filhos — e resolveria a
 * décima geração materna.
 *
 * A busca por texto e o endpoint ?parent= do Archeevo do ABM estão ambos
 * partidos (devolvem sempre o mesmo resultado). Só o varrimento serve.
 */
const origem = 'https://arquivo-abm.madeira.gov.pt';
const H = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'application/json',
};

const de = Number(process.argv[2] ?? 30000);
const ate = Number(process.argv[3] ?? 60000);
const ALVO = /nota|tabeli|escritur|testament|judici|órf|orf[ãa]|sesmari|tombo/i;

async function descricao(id) {
  for (let t = 0; t < 3; t++) {
    try {
      const res = await fetch(`${origem}/api/descriptions/${id}`, { headers: H });
      if (res.status === 404) return null;
      if (!res.ok) { await new Promise((r) => setTimeout(r, 250 * (t + 1))); continue; }
      return await res.json();
    } catch {
      await new Promise((r) => setTimeout(r, 250 * (t + 1)));
    }
  }
  return null;
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
    const tit = d.UnitTitle ?? '';
    const cod = d.CompleteUnitId ?? '';
    if (!ALVO.test(tit) && !ALVO.test(cod)) continue;
    const ini = (d.UnitDateInitial ?? '').slice(0, 10);
    const ano = Number(ini.slice(0, 4));
    if (ano && ano >= 1800) continue;
    achados.push({ id: ids[k], cod, tit, ini, fim: (d.UnitDateFinal ?? '').slice(0, 10) });
  }
  if ((i - de) % 2400 === 0) console.error(`  … ${i}`);
}

achados.sort((a, b) => (a.cod || '').localeCompare(b.cod || ''));
console.log(`=== ${achados.length} descrições notariais/judiciais anteriores a 1800, IDs ${de}-${ate} ===`);
for (const a of achados)
  console.log(`${String(a.id).padStart(7)}  ${(a.cod || '?').padEnd(32)} ${a.ini}..${a.fim}  ${a.tit}`);
