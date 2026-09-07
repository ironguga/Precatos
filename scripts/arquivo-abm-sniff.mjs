#!/usr/bin/env node
/**
 * Descobre a API do Archeevo que serve as imagens do visualizador.
 *
 * O visualizador é uma SPA Archeevo 7 (window.env.ARCHEEVO_API_BASE_URL = "/api").
 * Em vez de adivinhar endpoints, este script baixa os bundles JavaScript da
 * própria aplicação e extrai deles as rotas da API; depois experimenta as mais
 * promissoras contra o documento pedido e mostra as respostas.
 *
 * Uso: node scripts/arquivo-abm-sniff.mjs <url-do-visualizador>
 */

const alvo = process.argv[2];
if (!alvo) {
  console.error('Informe a URL do visualizador.');
  process.exit(1);
}

const origem = new URL(alvo).origin;
const [, descricaoId, representacaoId] =
  new URL(alvo).pathname.match(/\/descriptions\/(\d+)\/(\d+)/) || [];

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
};

async function texto(url, extra = {}) {
  const res = await fetch(url, { headers: { ...HEADERS, ...extra } });
  return { status: res.status, tipo: res.headers.get('content-type') || '', corpo: await res.text() };
}

console.log(`descrição=${descricaoId} representação=${representacaoId} origem=${origem}\n`);

// 1. Bundles da aplicação
const pagina = await texto(alvo);
const assets = [...pagina.corpo.matchAll(/(?:src|href)="([^"]+\.js)"/g)].map((m) =>
  new URL(m[1], origem).toString()
);
console.log('=== BUNDLES ENCONTRADOS ===');
assets.forEach((a) => console.log(a));

// 2. Rotas da API extraídas dos bundles
const rotas = new Set();
for (const asset of assets) {
  let js;
  try {
    js = (await texto(asset)).corpo;
  } catch (e) {
    console.log(`(falhou ${asset}: ${e.message})`);
    continue;
  }
  // Literais de string que contenham caminhos de API, incluindo templates.
  for (const m of js.matchAll(/["'`](\/?api\/[^"'`\s]{2,120})["'`]/g)) rotas.add(m[1]);
  for (const m of js.matchAll(/["'`]([^"'`\s]{0,60}\/(?:viewer|representations?|digitalobjects?|images?|thumbnails?|files?|iiif)\/[^"'`\s]{0,80})["'`]/gi))
    rotas.add(m[1]);
}
console.log('\n=== ROTAS CANDIDATAS NOS BUNDLES ===');
[...rotas].sort().forEach((r) => console.log(r));

// 3. Experimenta endpoints prováveis contra este documento
const tentativas = [
  `/api/descriptions/${descricaoId}`,
  `/api/descriptions/${descricaoId}/representations`,
  `/api/representations/${representacaoId}`,
  `/api/representations/${representacaoId}/files`,
  `/api/representations/${representacaoId}/images`,
  `/api/viewer/descriptions/${descricaoId}/${representacaoId}`,
  `/api/viewer/representations/${representacaoId}`,
  `/api/digitalobjects/${representacaoId}`,
];
console.log('\n=== TENTATIVAS DE ENDPOINT ===');
for (const caminho of tentativas) {
  const url = origem + caminho;
  try {
    const r = await texto(url, { Accept: 'application/json' });
    console.log(`\n--- ${caminho} -> ${r.status} (${r.tipo})`);
    if (r.status === 200) console.log(r.corpo.replace(/\s+/g, ' ').slice(0, 1200));
  } catch (e) {
    console.log(`\n--- ${caminho} -> erro: ${e.message}`);
  }
}
