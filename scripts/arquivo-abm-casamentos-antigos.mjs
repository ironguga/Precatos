#!/usr/bin/env node
/**
 * Varre IDs do Archeevo do ABM e recolhe TODOS os livros paroquiais de
 * casamentos (e de baptismos) anteriores a 1740, de qualquer freguesia.
 *
 * Porquê: o casamento de Pedro da Sylva de Ponte com Maria Roiz Pitta não está
 * em nenhum dos dois livros de casamentos dos Canhas que cobrem 1640-1743.
 * Ou está no Livro 4.º (1743-1754), que não consta do catálogo, ou casou
 * noutra freguesia — Ponta do Sol, Arco da Calheta, Tábua, Campanário,
 * Madalena do Mar, Estreito da Calheta. Este levantamento diz quais desses
 * livros existem em linha e com que identificador.
 */
const origem = 'https://arquivo-abm.madeira.gov.pt';
const H = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'application/json',
};

const de = Number(process.argv[2] ?? 39000);
const ate = Number(process.argv[3] ?? 52000);

async function descricao(id) {
  for (let t = 0; t < 3; t++) {
    try {
      const res = await fetch(`${origem}/api/descriptions/${id}`, { headers: H });
      if (res.status === 404) return null;
      if (!res.ok) { await new Promise((r) => setTimeout(r, 300 * (t + 1))); continue; }
      return await res.json();
    } catch {
      await new Promise((r) => setTimeout(r, 300 * (t + 1)));
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
    if (!/casamento|baptismo|batismo/i.test(tit)) continue;
    const ini = (d.UnitDateInitial ?? '').slice(0, 10);
    const ano = Number(ini.slice(0, 4));
    if (!ano || ano >= 1745) continue;
    achados.push({
      id: ids[k],
      cod: d.CompleteUnitId ?? d.UnitId ?? '',
      tit,
      ini,
      fim: (d.UnitDateFinal ?? '').slice(0, 10),
    });
  }
  if ((i - de) % 1200 === 0) console.error(`  … ${i}`);
}

achados.sort((a, b) => (a.cod || '').localeCompare(b.cod || ''));
console.log(`=== ${achados.length} livros de casamentos/baptismos anteriores a 1745, IDs ${de}-${ate} ===`);
for (const a of achados)
  console.log(`${String(a.id).padStart(6)}  ${(a.cod || '?').padEnd(30)} ${a.ini}..${a.fim}  ${a.tit}`);
