#!/usr/bin/env node
/**
 * As páginas de imigração do Arquivo Público de SP montam-se com JavaScript —
 * dizem-no elas próprias. Lê-las com fetch é ler a casca. Aqui abrem-se com um
 * navegador, extrai-se o que a página realmente tem — formulários, campos,
 * ligações — e, se houver busca, procura-se FERRO.
 *
 * Não há teste de robô nenhum neste sítio: é um arquivo público brasileiro a
 * servir o seu próprio acervo.
 */
import { chromium } from 'playwright';

const nav = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await nav.newContext({ locale: 'pt-BR', viewport: { width: 1400, height: 1000 } });
const pag = await ctx.newPage();

const paginas = [
  ['certidões · imigração', 'https://web.arquivoestado.sp.gov.br/web/acervo/solicitacao_certidoes/imigracao'],
  ['consulta ao acervo', 'https://www.arquivoestado.sp.gov.br/apesp/servicos/cidadao/consulta-acervo'],
  ['repositório digital', 'https://web.arquivoestado.sp.gov.br/web/acervo/repositorio_digital'],
];

for (const [rot, url] of paginas) {
  console.log(`\n\n======== ${rot} ========\n${url}`);
  try {
    const r = await pag.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await pag.waitForTimeout(3000);
    console.log(`HTTP ${r?.status()}`);

    const texto = (await pag.innerText('body').catch(() => '')).replace(/\s+/g, ' ').trim();
    console.log(`\n--- texto (${texto.length} car.) ---\n${texto.slice(0, 1800)}`);

    const forms = await pag.$$eval('form', (fs) => fs.map((f) => ({
      action: f.getAttribute('action'), method: f.getAttribute('method'),
      campos: [...f.querySelectorAll('input,select,textarea')].map((i) => `${i.tagName.toLowerCase()}[${i.getAttribute('type') ?? ''}] name=${i.getAttribute('name')} id=${i.getAttribute('id')}`),
    })));
    console.log(`\n--- ${forms.length} formulário(s) ---`);
    for (const f of forms) { console.log(`  action=${f.action} method=${f.method}`); for (const c of f.campos.slice(0, 12)) console.log(`     ${c}`); }

    const ligs = await pag.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href'))
      .filter((h) => h && /imigra|hosped|passageir|navio|digital|pesquis|busca|consulta/i.test(h)));
    const uniq = [...new Set(ligs)].slice(0, 25);
    console.log(`\n--- ${uniq.length} ligações relevantes ---`);
    for (const l of uniq) console.log(`  ${l}`);
  } catch (e) {
    console.log(`ERRO: ${String(e).slice(0, 120)}`);
  }
}
await nav.close();
