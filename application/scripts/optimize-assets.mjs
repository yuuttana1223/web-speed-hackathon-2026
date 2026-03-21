/**
 * アセット最適化オーケストレータ
 *
 * ビルド前に実行し、以下を最適化する:
 * - 画像: JPG → WebP (リサイズ + 圧縮)
 * - 動画: GIF → MP4 (H.264)
 *
 * フォントはビルド時ではなく事前にサブセット済み (WOFF2) をgitにコミットしている。
 *
 * 使い方: node scripts/optimize-assets.mjs
 */

import { existsSync, statSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PUBLIC_DIR = join(__dirname, "..", "public");

async function needsOptimization(inputPath, outputPath) {
  if (!existsSync(outputPath)) return true;
  return statSync(inputPath).mtimeMs > statSync(outputPath).mtimeMs;
}

async function runImages() {
  // Check if any WebP files need to be generated
  const imagesDir = join(PUBLIC_DIR, "images");
  const files = await readdir(imagesDir);
  const jpgFiles = files.filter((f) => f.endsWith(".jpg"));
  const needsUpdate = jpgFiles.some((f) => needsOptimization(join(imagesDir, f), join(imagesDir, f.replace(".jpg", ".webp"))));

  if (!needsUpdate) {
    console.log("Images: already optimized, skipping.\n");
    return;
  }

  await import("./optimize-images.mjs");
}

async function runMovies() {
  const moviesDir = join(PUBLIC_DIR, "movies");
  const files = await readdir(moviesDir);
  const gifFiles = files.filter((f) => f.endsWith(".gif"));
  const needsUpdate = gifFiles.some((f) => needsOptimization(join(moviesDir, f), join(moviesDir, f.replace(".gif", ".mp4"))));

  if (!needsUpdate) {
    console.log("Movies: already optimized, skipping.\n");
    return;
  }

  await import("./optimize-movies.mjs");
}

async function main() {
  console.log("========================================");
  console.log("  Asset Optimization");
  console.log("========================================\n");

  await runImages();
  await runMovies();

  console.log("\n========================================");
  console.log("  All optimizations complete!");
  console.log("========================================");
}

main().catch(console.error);
