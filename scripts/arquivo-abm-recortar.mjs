#!/usr/bin/env node
/**
 * Prepara as imagens do arquivo para leitura paleográfica.
 *
 * A cópia que o ABM publica tem 936x1395 px: dá para ler o corpo dos assentos,
 * mas não aguenta ampliação para lá de ~3x. Este script corta cada página em
 * faixas horizontais, aumenta o contraste e amplia, que é o que torna a letra
 * legível; e permite ampliar uma região arbitrária para conferir uma palavra.
 *
 * Uso:
 *   node scripts/arquivo-abm-recortar.mjs faixas <imagem> <destino> [nº faixas]
 *   node scripts/arquivo-abm-recortar.mjs zoom <imagem> <destino.png> x0 y0 x1 y1 [zoom]
 *     (x0..y1 são frações da página, entre 0 e 1)
 *
 * Requer o pacote sharp:  npm i sharp
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [modo, src, dest, ...resto] = process.argv.slice(2);
if (!modo || !src || !dest) {
  console.error('Ver o cabeçalho do ficheiro para o uso.');
  process.exit(1);
}

const { width, height } = await sharp(src).metadata();

if (modo === 'faixas') {
  const faixas = Number(resto[0] ?? 3);
  fs.mkdirSync(dest, { recursive: true });
  // Margens: corta a encadernação sem perder texto junto ao bordo direito.
  const esq = Math.round(width * 0.03);
  const larg = Math.round(width * 0.94);
  const passo = Math.floor(height / faixas);
  const base = path.basename(src, path.extname(src));

  for (let i = 0; i < faixas; i++) {
    const y0 = Math.max(0, i * passo - 30);
    const y1 = Math.min(height, (i + 1) * passo + 30);
    const saida = path.join(dest, `${base}_f${i + 1}.png`);
    await sharp(src)
      .extract({ left: esq, top: y0, width: larg, height: y1 - y0 })
      .greyscale()
      .normalise()
      .resize({ width: larg * 2, kernel: 'lanczos3' })
      .png()
      .toFile(saida);
    console.log(saida);
  }
} else if (modo === 'zoom') {
  const [x0, y0, x1, y1, z = 4] = resto.map(Number);
  const left = Math.round(width * x0);
  const top = Math.round(height * y0);
  const larg = Math.round(width * (x1 - x0));
  const alt = Math.round(height * (y1 - y0));
  await sharp(src)
    .extract({ left, top, width: larg, height: alt })
    .greyscale()
    .normalise()
    .resize({ width: Math.round(larg * z), kernel: 'lanczos3' })
    .png()
    .toFile(dest);
  console.log(dest);
} else {
  console.error(`Modo desconhecido: ${modo}`);
  process.exit(1);
}
