#!/usr/bin/env node
/**
 * Duas frentes, com os nomes reais da família.
 *
 * 1. A HOSPEDARIA DOS IMIGRANTES, no Arquivo Público do Estado de São Paulo —
 *    a única das fontes italianas/brasileiras que responde daqui (200, 314 KB).
 *    Procura-se PIETRO FERRO, não «Pedro»: nas listas de desembarque o nome vem
 *    na forma italiana. O bisavô de Luiz Gustavo chama-se Pedro Ferro, e o avô,
 *    Melchiades Delson Ferro, tem nomes brasileiros — logo nasceu cá, e quem
 *    atravessou foi o pai ou o avô dele.
 *
 * 2. O FAMILYSEARCH, que nas medições de há dias devolvia 403 com 891 bytes e
 *    agora devolveu 200 com 19 650. Se o bloqueio caiu, mudam os dois assentos
 *    que estavam à espera — 1616 na Ponta do Sol e 1641 nos Canhas.
 */
const H = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
};

async function ver(rot, url, init = {}) {
  try {
    const c = new AbortController();
    const to = setTimeout(() => c.abort(), 25000);
    const r = await fetch(url, { headers: H, signal: c.signal, redirect: 'follow', ...init });
    clearTimeout(to);
    const b = await r.text();
    const txt = b.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
                 .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    console.log(`${rot.padEnd(44)} ${String(r.status).padEnd(4)} ${String(b.length).padStart(8)}b  ${String(txt.length).padStart(6)} car.`);
    return { r, b, txt };
  } catch (e) {
    console.log(`${rot.padEnd(44)} ERRO  ${String(e).slice(0, 60)}`);
    return { b: '', txt: '' };
  }
}

console.log('===== 1 · ARQUIVO PÚBLICO DE SÃO PAULO: onde está a busca =====');
const { b: home } = await ver('página inicial', 'https://www.arquivoestado.sp.gov.br/');
const ligacoes = new Set();
for (const m of home.matchAll(/href=["']([^"']+)["']/gi)) {
  const h = m[1];
  if (/imigra|hospedaria|acervo|pesquis|busca|digital/i.test(h)) ligacoes.add(h);
}
console.log(`\nligações relevantes encontradas: ${ligacoes.size}`);
for (const l of [...ligacoes].slice(0, 30)) console.log(`  ${l}`);

console.log('\n===== 2 · tentar a busca de imigrantes por FERRO =====');
const bases = [
  'http://www.arquivoestado.sp.gov.br/site/acervo/repositorio_digital/hospedaria_imigrantes',
  'https://www.arquivoestado.sp.gov.br/web/acervo/repositorio_digital',
  'http://www.arquivoestado.sp.gov.br/uploads/acervo/textual/hospedaria/',
  'https://inci.org.br/acervodigital/livros.php',
  'https://www.inci.org.br/',
];
for (const u of bases) await ver(u.replace(/^https?:\/\//, '').slice(0, 42), u);

console.log('\n===== 3 · FAMILYSEARCH: caiu o bloqueio? =====');
for (const [rot, u] of [
  ['raiz', 'https://www.familysearch.org/'],
  ['wiki Madeira', 'https://www.familysearch.org/en/wiki/Madeira,_Portugal_Genealogy'],
  ['catálogo por lugar', 'https://www.familysearch.org/search/catalog/results?q.place=Ponta%20do%20Sol'],
  ['ark exemplo', 'https://www.familysearch.org/ark:/61903/3:1:3Q9M-CSMQ-XSVZ'],
  ['api catálogo', 'https://www.familysearch.org/service/search/catalog/places?text=Ponta+do+Sol'],
]) {
  const { txt } = await ver(`FS · ${rot}`, u);
  if (txt.length > 400) console.log(`      «${txt.slice(0, 300)}»`);
}
