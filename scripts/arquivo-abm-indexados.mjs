#!/usr/bin/env node
/**
 * Procura os Pitta dos Canhas em fontes com indexação nominal.
 *
 * O Archeevo do ABM não indexa o texto dos assentos — só descrições de
 * catálogo. Mas há bases que transcreveram registos paroquiais da Madeira ao
 * nível do nome. Se o baptismo de Pedro da Silva Pitta estiver transcrito
 * algures, é aí e não no ABM.
 */
const H = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
};

async function tenta(nome, url, extra = {}) {
  try {
    const res = await fetch(url, { headers: { ...H, ...extra }, redirect: 'follow' });
    const tipo = res.headers.get('content-type') || '';
    const corpo = await res.text();
    console.log(`\n=== ${nome} ===`);
    console.log(`${res.status}  ${tipo}  ${corpo.length} bytes`);
    console.log(`URL: ${url}`);
    if (res.ok) {
      const limpo = corpo.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      // mostra só onde aparecem os termos que interessam
      for (const termo of ['Pitta', 'Pita', 'Canhas', 'Outeiro']) {
        const re = new RegExp(`.{0,90}${termo}.{0,90}`, 'gi');
        const achados = [...limpo.matchAll(re)].slice(0, 4);
        for (const a of achados) console.log(`  «${termo}» … ${a[0].trim()}`);
      }
      if (tipo.includes('json')) console.log('  ' + corpo.slice(0, 600));
    }
  } catch (e) {
    console.log(`\n=== ${nome} ===\nerro: ${e.message}`);
  }
}

// Tombo.pt — agregador português de registos paroquiais transcritos
await tenta('tombo.pt busca Pitta Canhas', 'https://www.tombo.pt/busca?q=' + encodeURIComponent('Pitta Canhas'));
await tenta('tombo.pt busca Pedro da Silva Pitta', 'https://www.tombo.pt/busca?q=' + encodeURIComponent('Pedro da Silva Pitta'));

// FamilySearch — catálogo e busca de registos (pode exigir sessão)
await tenta(
  'FamilySearch catálogo Canhas',
  'https://www.familysearch.org/service/search/catalog/search?q.text=' + encodeURIComponent('Canhas Madeira')
);
await tenta(
  'FamilySearch registos Pitta Madeira',
  'https://www.familysearch.org/service/search/hr/v2/personas?q.surname=Pitta&q.birthLikePlace=Madeira&limit=10'
);

// Geneall / Geneanet — perfis públicos
await tenta('Geneanet Pitta Canhas', 'https://www.geneanet.org/fonds/individus/?go=1&nom=PITTA&prenom=Pedro&pays=PRT');

// CulturaMadeira / Arquivos.pt (arquivo da web português) sobre o ABM
await tenta(
  'Arquivos.pt sobre Pitta Canhas',
  'https://arquivo.pt/textsearch?q=' + encodeURIComponent('"Pitta" Canhas Madeira genealogia') + '&maxItems=10'
);
