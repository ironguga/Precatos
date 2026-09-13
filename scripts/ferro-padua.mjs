#!/usr/bin/env node
/**
 * O ramo Ferro é de PÁDUA. Isso abre duas frentes concretas:
 *
 * 1. ANTENATI (antenati.cultura.gov.it) — o portal do Estado italiano com o
 *    registo civil digitalizado. Pádua entra no estado civil italiano em 1871
 *    (o Veneto só é italiano desde 1866); antes disso são registos paroquiais
 *    e austríacos. O Antenati tem busca nominativa indexada.
 *
 * 2. A HOSPEDARIA DOS IMIGRANTES DE SÃO PAULO — a base do Arquivo Público do
 *    Estado de São Paulo com as listas de desembarque. Para um italiano que
 *    chega a Santos entre 1880 e 1920 é a fonte canónica: regista nome, idade,
 *    nacionalidade, PROVÍNCIA DE ORIGEM, navio, data e o grupo familiar
 *    inteiro. É o documento que liga Pádua a São Paulo numa só linha.
 *
 * Este script mede o que responde e, onde houver busca, experimenta «Ferro».
 */
const H = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept-Language': 'pt-PT,pt;q=0.9,it;q=0.8,en;q=0.7',
};

async function ver(rot, url, init = {}) {
  const t0 = Date.now();
  try {
    const c = new AbortController();
    const to = setTimeout(() => c.abort(), 25000);
    const r = await fetch(url, { headers: H, signal: c.signal, redirect: 'follow', ...init });
    clearTimeout(to);
    const ct = (r.headers.get('content-type') ?? '').split(';')[0];
    const b = await r.text();
    const texto = b.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    console.log(`${rot.padEnd(40)} ${String(r.status).padEnd(4)} ${String(b.length).padStart(8)}b  ${String(texto.length).padStart(6)} car.  ${ct}  ${Date.now() - t0}ms`);
    if (r.ok && /json/.test(ct)) console.log(`    ${b.slice(0, 500).replace(/\s+/g, ' ')}`);
    else if (r.ok && texto.length > 400 && /ferro/i.test(texto)) {
      const i = texto.toLowerCase().indexOf('ferro');
      console.log(`    …${texto.slice(Math.max(0, i - 120), i + 260)}…`);
    }
    return b;
  } catch (e) {
    console.log(`${rot.padEnd(40)} ERRO  ${String(e).slice(0, 70)}`);
    return '';
  }
}

console.log('===== ITÁLIA · Antenati, o registo civil de Pádua =====');
await ver('Antenati raiz', 'https://antenati.cultura.gov.it/');
await ver('Antenati busca «Ferro» Padova', 'https://antenati.cultura.gov.it/search-nominative/?searchTerms=Ferro&provincia=Padova');
await ver('Antenati API busca', 'https://antenati.cultura.gov.it/api/search-nominative?searchTerms=Ferro');
await ver('Antenati Archivio Padova', 'https://antenati.cultura.gov.it/archivio/archivio-di-stato-di-padova/');

console.log('\n===== BRASIL · a Hospedaria dos Imigrantes de São Paulo =====');
await ver('Arq. Público SP raiz', 'https://www.arquivoestado.sp.gov.br/');
await ver('Memorial do Imigrante', 'http://www.arquivoestado.sp.gov.br/site/acervo/repositorio_digital/hospedaria');
await ver('Inventário de imigrantes (busca)', 'https://www.arquivoestado.sp.gov.br/web/acervo/hospedaria');
await ver('Familia.org / listas', 'https://www.inci.org.br/acervodigital/livros.php');

console.log('\n===== outros que podem servir =====');
await ver('Portal Antenati sitemap', 'https://antenati.cultura.gov.it/robots.txt');
await ver('FamilySearch (controlo)', 'https://www.familysearch.org/');
await ver('Arquivo.pt (controlo)', 'https://arquivo.pt/');
