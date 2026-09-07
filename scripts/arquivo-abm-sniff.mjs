#!/usr/bin/env node
/**
 * Diagnóstico de acesso ao arquivo-abm.madeira.gov.pt.
 *
 * O run anterior devolveu uma página "The URL you requested has been blocked",
 * o que indica filtragem no lado do servidor (WAF/lista de IPs) e não falta de
 * rede. Este script distingue as duas hipóteses:
 *   a) bloqueio por cabeçalhos (falta User-Agent/Accept-Language de browser)
 *   b) bloqueio por IP de datacenter (nesse caso nenhum cabeçalho resolve)
 *
 * Uso: node scripts/arquivo-abm-sniff.mjs <url>
 */

const url = process.argv[2];
if (!url) {
  console.error('Informe a URL.');
  process.exit(1);
}

const perfis = {
  'curl simples': {},
  'user-agent de browser': {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  },
  'browser completo (pt-PT)': {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Sec-Ch-Ua': '"Chromium";v="131", "Not_A Brand";v="24"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    Referer: 'https://arquivo-abm.madeira.gov.pt/',
  },
};

console.log('=== IP DE SAÍDA DESTE RUNNER ===');
try {
  console.log((await (await fetch('https://api.ipify.org?format=json')).json()).ip);
} catch (e) {
  console.log('não determinado:', e.message);
}

for (const [nome, headers] of Object.entries(perfis)) {
  console.log(`\n=== PERFIL: ${nome} ===`);
  try {
    const res = await fetch(url, { headers, redirect: 'follow' });
    console.log(`status: ${res.status} ${res.statusText}`);
    console.log(`url final: ${res.url}`);
    for (const [k, v] of res.headers) {
      if (/server|via|x-|cf-|content-type|set-cookie/i.test(k)) console.log(`  ${k}: ${v}`);
    }
    const body = await res.text();
    console.log(`tamanho do corpo: ${body.length}`);
    const titulo = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    console.log(`título: ${titulo ? titulo[1].trim() : '(sem título)'}`);
    console.log('--- início do corpo ---');
    console.log(body.replace(/\s+/g, ' ').slice(0, 700));
  } catch (e) {
    console.log('falhou:', e.message);
  }
}
