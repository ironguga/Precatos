#!/usr/bin/env node
/**
 * O ABM tem descrições ao nível do assento individual, com o nome do pai e da
 * mãe no título — por exemplo:
 *   /descriptions/163946 → "Registo de batismo n.º 53: Ana. Pai: José Pita;
 *                           Mãe: Francisca Pita"
 *
 * Eu tinha varrido só os IDs 41000-43000, que são os livros; estes estão nas
 * centenas de milhar, e o meu filtro por código PPTS01 escondia-os. Aqui
 * pergunto ao motor de busca pelos nomes e vejo o que devolve, e inspecciono
 * uma descrição de assento para perceber a forma dos dados.
 */
const origem = 'https://arquivo-abm.madeira.gov.pt';
const H = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'application/json, text/html;q=0.9',
  'Accept-Language': 'pt-PT,pt;q=0.9',
};

async function json(url) {
  try {
    const r = await fetch(url, { headers: H });
    if (!r.ok) return { erro: `HTTP ${r.status}` };
    const t = await r.text();
    try {
      return JSON.parse(t);
    } catch {
      return { html: t.slice(0, 400) };
    }
  } catch (e) {
    return { erro: e.message };
  }
}

// 1. a forma de uma descrição ao nível do assento
console.log('=== forma de uma descrição de assento (163946) ===');
const amostra = await json(`${origem}/api/descriptions/163946`);
for (const [k, v] of Object.entries(amostra)) {
  if (v === null || v === '' || (Array.isArray(v) && !v.length)) continue;
  const s = typeof v === 'object' ? JSON.stringify(v).slice(0, 200) : String(v).slice(0, 200);
  console.log(`  ${k}: ${s}`);
}

// 2. busca por nome, sem filtro nenhum
const TERMOS = [
  'Pedro da Silva Pitta',
  'Pedro Pitta Canhas',
  '"Pedro da Silva Pitta"',
  'Pitta Canhas batismo',
  'Silva Pitta Canhas',
  'Antónia da Silva Pitta Canhas',
  'Catarina Gonçalves Pitta Canhas',
];

for (const termo of TERMOS) {
  console.log(`\n=== busca: ${termo} ===`);
  for (const forma of [
    `${origem}/api/descriptions/search?q=${encodeURIComponent(termo)}&page=1&perPage=30`,
    `${origem}/api/search?q=${encodeURIComponent(termo)}&page=1&perPage=30`,
    `${origem}/api/descriptions/search?searchTerm=${encodeURIComponent(termo)}&page=1&perPage=30`,
  ]) {
    const r = await json(forma);
    if (r.erro) {
      console.log(`  ${forma.split('/api/')[1].split('?')[0]}: ${r.erro}`);
      continue;
    }
    const itens = r.Items ?? r.items ?? r.Results ?? [];
    console.log(`  ${forma.split('/api/')[1].split('?')[0]}: ${itens.length} itens` +
      (r.TotalItems != null ? ` (total ${r.TotalItems})` : ''));
    for (const it of itens.slice(0, 15)) {
      const cod = it.CompleteUnitId ?? '';
      const tit = (it.UnitTitle ?? '').slice(0, 130);
      const ini = (it.UnitDateInitial ?? '').slice(0, 10);
      console.log(`    ${String(it.ID ?? it.Id).padStart(8)} ${cod.padEnd(26)} ${ini} ${tit}`);
    }
    if (itens.length) break; // esta forma serve; não repito as outras
  }
}
