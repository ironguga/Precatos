#!/usr/bin/env node
/**
 * Procura, fora dos registos paroquiais, séries que possam nomear Pedro da
 * Silva Pitta: testamentos, inventários, partilhas, tombos, vínculos.
 *
 * Os assentos de óbito dos Canhas mencionam repetidamente "apontamentos" e
 * testamentos entregues a testamenteiros. Se esses testamentos foram
 * depositados num juízo, o ABM pode tê-los em série própria — e um inventário
 * nomeia herdeiros, e muitas vezes a filiação do defunto.
 */
const origem = 'https://arquivo-abm.madeira.gov.pt';
const H = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'application/json',
};

const termos = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      'Pitta',
      'Canhas testamentos',
      'Canhas inventários',
      'Ponta do Sol inventários',
      'Ponta do Sol notarial',
      'Juízo dos Resíduos',
      'Provedoria de Capelas',
      'tombo Canhas',
      'vínculo Canhas',
      'Lombo do Outeiro',
    ];

const vistos = new Map();
for (const termo of termos) {
  for (let pagina = 1; pagina <= 3; pagina++) {
    let r;
    try {
      const res = await fetch(
        `${origem}/api/descriptions/search?q=${encodeURIComponent(termo)}&page=${pagina}&perPage=50`,
        { headers: H }
      );
      if (!res.ok) {
        console.log(`  (${termo} p${pagina}: HTTP ${res.status})`);
        break;
      }
      r = await res.json();
    } catch (e) {
      console.log(`  (${termo}: ${e.message})`);
      break;
    }
    const itens = r.Items ?? r.items ?? [];
    if (!itens.length) break;
    for (const it of itens) {
      const id = it.ID ?? it.Id;
      const chave = `${termo}|${id}`;
      if (vistos.has(chave)) continue;
      const ini = (it.UnitDateInitial ?? '').slice(0, 4);
      const fim = (it.UnitDateFinal ?? '').slice(0, 4);
      // só interessa o que possa cobrir a vida de Pedro
      const a = Number(ini) || 0;
      const b = Number(fim) || 9999;
      if (b < 1700 || a > 1830) continue;
      vistos.set(chave, {
        termo,
        id,
        cod: it.CompleteUnitId ?? '',
        tit: it.UnitTitle ?? '',
        ini,
        fim,
      });
    }
  }
}

console.log(`\n=== ${vistos.size} descrições fora dos registos paroquiais que cobrem 1700-1830 ===`);
for (const a of vistos.values())
  console.log(`[${a.termo}] ${String(a.id).padStart(6)}  ${a.cod.padEnd(30)} ${a.ini}..${a.fim}  ${a.tit}`);
