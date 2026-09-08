#!/usr/bin/env node
/**
 * MAPA dos identificadores do Archeevo do ABM.
 *
 * O problema das varreduras exaustivas é serem cegas: já gastei corridas
 * inteiras a percorrer 130 mil identificadores para descobrir que a faixa
 * estava vazia. Como as descrições de um mesmo livro são contíguas, basta
 * sondar de N em N para saber QUE fundo vive em QUE faixa — e só depois
 * varrer a faixa certa.
 *
 * Imprime, para cada sonda que responda, o identificador, o CompleteUnitId,
 * o nível de descrição e o título abreviado.
 *
 * Uso: node scripts/arquivo-abm-mapa.mjs <de> <ate> <passo>
 */
const origem = 'https://arquivo-abm.madeira.gov.pt';
const H = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'application/json',
};

const de = Number(process.argv[2] ?? 1);
const ate = Number(process.argv[3] ?? 600000);
const passo = Number(process.argv[4] ?? 500);

async function descricao(id) {
  for (let t = 0; t < 2; t++) {
    try {
      const r = await fetch(`${origem}/api/descriptions/${id}`, { headers: H });
      if (r.status === 404) return null;
      if (!r.ok) { await new Promise((s) => setTimeout(s, 200)); continue; }
      return await r.json();
    } catch { await new Promise((s) => setTimeout(s, 200)); }
  }
  return null;
}

const ids = [];
for (let i = de; i <= ate; i += passo) ids.push(i);

const linhas = [];
const lote = 32;
for (let i = 0; i < ids.length; i += lote) {
  const fatia = ids.slice(i, i + lote);
  const rs = await Promise.all(fatia.map(descricao));
  for (let k = 0; k < fatia.length; k++) {
    const d = rs[k];
    if (!d) { linhas.push(`${String(fatia[k]).padStart(7)}  —`); continue; }
    const cod = (d.CompleteUnitId ?? '?').padEnd(36);
    const niv = (d.DescriptionLevel ?? '?').padEnd(2);
    const ini = String(d.UnitDateInitial ?? '').slice(0, 4).padEnd(5);
    linhas.push(`${String(fatia[k]).padStart(7)}  ${cod} ${niv} ${ini} ${String(d.UnitTitle ?? '').slice(0, 70)}`);
  }
  if (i % 640 === 0) console.error(`  … ${ids[i]}`);
}
console.log(`=== mapa ${de}-${ate}, passo ${passo} ===`);
console.log(linhas.join('\n'));

// resumo: que prefixos aparecem em que faixas
console.log('\n=== faixas por prefixo ===');
const faixa = new Map();
for (const l of linhas) {
  const m = l.match(/^\s*(\d+)\s+(PT\/ABM\/[A-Z0-9]+)/);
  if (!m) continue;
  const [, id, pref] = m;
  const f = faixa.get(pref) ?? { min: Infinity, max: -1, n: 0 };
  f.min = Math.min(f.min, Number(id)); f.max = Math.max(f.max, Number(id)); f.n++;
  faixa.set(pref, f);
}
for (const [p, f] of [...faixa].sort((a, b) => a[1].min - b[1].min))
  console.log(`  ${p.padEnd(20)} ${String(f.min).padStart(7)} – ${String(f.max).padStart(7)}  (${f.n} sondas)`);
