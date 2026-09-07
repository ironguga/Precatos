#!/usr/bin/env node
/**
 * Baixa imagens em alta resolução do visualizador do Arquivo Regional e
 * Biblioteca Pública da Madeira (arquivo-abm.madeira.gov.pt).
 *
 * Uso:
 *   node scripts/arquivo-abm-download.mjs <url-do-visualizador> [páginas] [--out DIR]
 *
 * Exemplos:
 *   # lista quantas imagens o documento tem (e as etiquetas de cada uma)
 *   node scripts/arquivo-abm-download.mjs https://arquivo-abm.madeira.gov.pt/viewer/descriptions/41778/247955 --list
 *
 *   # baixa as imagens 145-149 e 151-155 na maior resolução disponível
 *   node scripts/arquivo-abm-download.mjs https://arquivo-abm.madeira.gov.pt/viewer/descriptions/41778/247955 145-149,151-155
 *
 * Requer Node 18+ (usa fetch nativo). Sem dependências.
 */

import fs from 'node:fs';
import path from 'node:path';

const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

function parsePages(spec) {
  const out = [];
  for (const part of spec.split(',')) {
    const chunk = part.trim();
    if (!chunk) continue;
    const range = chunk.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const [a, b] = [Number(range[1]), Number(range[2])];
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) out.push(i);
    } else if (/^\d+$/.test(chunk)) {
      out.push(Number(chunk));
    } else {
      throw new Error(`Trecho inválido em páginas: "${chunk}"`);
    }
  }
  return [...new Set(out)].sort((x, y) => x - y);
}

async function get(url, init = {}) {
  const res = await fetch(url, {
    redirect: 'follow',
    ...init,
    headers: { 'User-Agent': UA, ...(init.headers || {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
  return res;
}

/** Procura no HTML/JS da página o manifesto IIIF ou endpoints de imagem. */
function discoverCandidates(html, baseUrl) {
  const abs = (u) => new URL(u, baseUrl).toString();
  const found = new Set();
  // JSON embebido em <script> costuma vir com barras escapadas ("http:\\/\\/...").
  const text = html.replace(/\\\//g, '/');

  const patterns = [
    /https?:\/\/[^\s"'<>\\]+?\/manifest(?:\.json)?/gi,
    /["'](\/[^"'\s<>]*?manifest(?:\.json)?)["']/gi,
    /https?:\/\/[^\s"'<>\\]+?\/info\.json/gi,
    /["'](\/[^"'\s<>]*?\/info\.json)["']/gi,
    /https?:\/\/[^\s"'<>\\]*?\/iiif\/[^\s"'<>\\]*/gi,
    /["'](\/iiif\/[^"'\s<>]*)["']/gi,
  ];

  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      const raw = m[1] || m[0];
      try {
        found.add(abs(raw));
      } catch {
        /* ignora URL malformada */
      }
    }
  }
  return [...found];
}

/** Normaliza um manifesto IIIF (Presentation v2 ou v3) numa lista de páginas. */
function canvasesFromManifest(manifest) {
  const pages = [];

  const pushService = (label, service, fallbackImage) => {
    let serviceId = null;
    const svc = Array.isArray(service) ? service[0] : service;
    if (svc) serviceId = svc['@id'] || svc.id || null;
    pages.push({ label, serviceId, fallbackImage });
  };

  // IIIF Presentation 2.x
  const seqs = manifest.sequences || [];
  for (const seq of seqs) {
    for (const canvas of seq.canvases || []) {
      const img = (canvas.images || [])[0];
      const res = img && img.resource;
      pushService(canvas.label || canvas['@id'], res && res.service, res && res['@id']);
    }
  }
  if (pages.length) return pages;

  // IIIF Presentation 3.x
  for (const canvas of manifest.items || []) {
    for (const page of canvas.items || []) {
      for (const anno of page.items || []) {
        const body = anno.body;
        if (!body) continue;
        const label =
          (canvas.label && (canvas.label.pt || canvas.label.none || Object.values(canvas.label)[0])) ||
          canvas.id;
        pushService(Array.isArray(label) ? label[0] : label, body.service, body.id);
      }
    }
  }
  return pages;
}

/** Descobre a maior resolução servida pelo IIIF Image API. */
async function bestImageUrl(serviceId, fallbackImage) {
  if (!serviceId) return fallbackImage;

  let info = null;
  try {
    info = await (await get(`${serviceId.replace(/\/$/, '')}/info.json`)).json();
  } catch {
    /* alguns servidores não expõem info.json publicamente */
  }

  const base = serviceId.replace(/\/$/, '');
  const candidates = [];

  if (info) {
    const w = info.width;
    const h = info.height;
    const maxW = info.maxWidth || (info.profile && info.profile.maxWidth);
    // Se o servidor limita a largura, pede exatamente o limite; senão, o tamanho nativo.
    if (maxW && w && maxW < w) {
      candidates.push(`${base}/full/${maxW},/0/default.jpg`);
    }
    if (w && h) {
      candidates.push(`${base}/full/${w},${h}/0/default.jpg`);
      candidates.push(`${base}/full/${w},/0/default.jpg`);
    }
  }
  candidates.push(`${base}/full/max/0/default.jpg`);
  candidates.push(`${base}/full/full/0/default.jpg`);
  if (fallbackImage) candidates.push(fallbackImage);

  for (const url of candidates) {
    try {
      const res = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': UA } });
      if (res.ok) return url;
    } catch {
      /* tenta o próximo */
    }
  }
  return candidates[0];
}

async function download(url, dest) {
  const res = await get(url);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return buf.length;
}

async function main() {
  const argv = process.argv.slice(2);
  const viewerUrl = argv.find((a) => a.startsWith('http'));
  if (!viewerUrl) {
    console.error('Informe a URL do visualizador. Veja o cabeçalho do ficheiro para exemplos.');
    process.exit(1);
  }
  const listOnly = argv.includes('--list');
  const outIdx = argv.indexOf('--out');
  const outDir = outIdx >= 0 ? argv[outIdx + 1] : 'imagens';
  const pageSpec = argv.find((a) => /^[\d,\-\s]+$/.test(a) && a.trim());

  console.log(`A abrir ${viewerUrl} ...`);
  const html = await (await get(viewerUrl)).text();

  const candidates = discoverCandidates(html, viewerUrl);
  const manifestUrls = candidates.filter((u) => /manifest/i.test(u));

  let manifest = null;
  let manifestUrl = null;
  for (const u of manifestUrls) {
    try {
      manifest = await (await get(u)).json();
      manifestUrl = u;
      break;
    } catch {
      /* tenta o próximo */
    }
  }

  if (!manifest) {
    console.error('\nNão encontrei um manifesto IIIF nesta página.');
    console.error('URLs candidatas descobertas no HTML (envie esta lista para eu ajustar o script):');
    for (const c of candidates.slice(0, 40)) console.error('  ' + c);
    if (!candidates.length) {
      console.error('  (nenhuma — a página provavelmente carrega as imagens por JavaScript;');
      console.error('   abra o separador Rede do browser, filtre por "json" e envie os pedidos)');
    }
    process.exit(2);
  }

  console.log(`Manifesto: ${manifestUrl}`);
  const pages = canvasesFromManifest(manifest);
  console.log(`Total de imagens: ${pages.length}`);

  if (listOnly || !pageSpec) {
    pages.forEach((p, i) => console.log(`  ${i + 1}\t${p.label ?? ''}`));
    return;
  }

  const wanted = parsePages(pageSpec);
  fs.mkdirSync(outDir, { recursive: true });

  for (const n of wanted) {
    const page = pages[n - 1];
    if (!page) {
      console.warn(`  imagem ${n}: fora do intervalo (documento tem ${pages.length})`);
      continue;
    }
    const url = await bestImageUrl(page.serviceId, page.fallbackImage);
    const dest = path.join(outDir, `${String(n).padStart(4, '0')}.jpg`);
    try {
      const bytes = await download(url, dest);
      console.log(`  imagem ${n} (${page.label ?? ''}) -> ${dest} (${(bytes / 1048576).toFixed(1)} MB)`);
    } catch (err) {
      console.error(`  imagem ${n}: falhou — ${err.message}`);
      console.error(`    URL tentada: ${url}`);
    }
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
