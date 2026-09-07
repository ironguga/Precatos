#!/usr/bin/env node
/**
 * Tenta a busca do Archeevo por nome, antes de varrer imagens à mão.
 *
 * Os livros paroquiais raramente estão indexados ao nível do assento, mas o
 * ABM pode ter descrições ou índices onde "Pitta" apareça. Vale testar antes
 * de baixar centenas de imagens.
 */
const origem = 'https://arquivo-abm.madeira.gov.pt';
const H = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
  Accept: 'application/json',
};

const termos = ['Pitta', 'Pita', 'Lombo do Outeiro'];
const moldes = [
  (t) => `/api/descriptions/search?filter.AnyField.Contains=${encodeURIComponent(t)}&page=1&perPage=10`,
  (t) => `/api/descriptions/search?filter.FreeText.Contains=${encodeURIComponent(t)}&page=1&perPage=10`,
  (t) => `/api/search?q=${encodeURIComponent(t)}&page=1&perPage=10`,
  (t) => `/api/descriptions/search?q=${encodeURIComponent(t)}&page=1&perPage=10`,
];

for (const termo of termos) {
  console.log(`\n=== "${termo}" ===`);
  for (const molde of moldes) {
    const caminho = molde(termo);
    try {
      const res = await fetch(origem + caminho, { headers: H });
      const corpo = await res.text();
      console.log(`${res.status}  ${caminho}`);
      if (res.status === 200) console.log('    ' + corpo.replace(/\s+/g, ' ').slice(0, 700));
    } catch (e) {
      console.log(`erro  ${caminho}: ${e.message}`);
    }
  }
}
