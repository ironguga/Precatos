#!/usr/bin/env node
/**
 * O ramo Ferro pode ser madeirense, português continental, italiano ou
 * brasileiro. Antes de pedir dados à família, vale medir QUE ARQUIVOS estão
 * ao alcance a partir daqui — porque a estratégia muda conforme a resposta.
 */
const alvos = [
  ['ABM Madeira (controlo)', 'https://arquivo-abm.madeira.gov.pt/api/descriptions/48721'],
  ['Antenati · Itália', 'https://antenati.cultura.gov.it/'],
  ['Antenati · busca', 'https://antenati.cultura.gov.it/search-nominative/?searchTerms=Ferro'],
  ['Arq. Público de São Paulo', 'https://www.arquivoestado.sp.gov.br/'],
  ['Familysearch (conhecido 403)', 'https://www.familysearch.org/'],
  ['Tombo.pt', 'https://tombo.pt/'],
  ['Arquivos.pt (controlo)', 'https://arquivo.pt/'],
  ['ANTT DigitArq', 'https://digitarq.arquivos.pt/'],
  ['Arq. Distrital do Porto', 'https://pesquisa.adporto.arquivos.pt/'],
  ['Geneanet', 'https://www.geneanet.org/'],
  ['Portal Português de Arquivos', 'https://portal.arquivos.pt/'],
  ['Registro Civil BR (arpen)', 'https://www.registrocivil.org.br/'],
];
const H = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
};
for (const [rot, url] of alvos) {
  const t0 = Date.now();
  try {
    const c = new AbortController();
    const to = setTimeout(() => c.abort(), 20000);
    const r = await fetch(url, { headers: H, signal: c.signal, redirect: 'follow' });
    clearTimeout(to);
    const b = await r.text();
    const texto = b.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    console.log(`${rot.padEnd(32)} ${String(r.status).padEnd(4)} ${String(b.length).padStart(8)}b html  ${String(texto.length).padStart(7)} car.  ${Date.now() - t0}ms`);
  } catch (e) {
    console.log(`${rot.padEnd(32)} ERRO  ${String(e).slice(0, 60)}`);
  }
}
