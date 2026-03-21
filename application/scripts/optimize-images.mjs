import { readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PUBLIC_DIR = join(__dirname, "..", "public");

const CONTENT_MAX_WIDTH = 1280;
const PROFILE_MAX_WIDTH = 128;
const WEBP_QUALITY = 80;

/**
 * EXIF バッファから ImageDescription (tag 0x010E) を抽出する。
 * sharp の metadata().exif は "Exif\0\0" + TIFF ヘッダの形式。
 */
function parseExifDescription(buf) {
  if (!buf || buf.length < 14) return "";
  try {
    const tiffStart = 6;
    const isLE = buf[tiffStart] === 0x49; // 'I' = little-endian
    const r16 = isLE
      ? (b, o) => b.readUInt16LE(tiffStart + o)
      : (b, o) => b.readUInt16BE(tiffStart + o);
    const r32 = isLE
      ? (b, o) => b.readUInt32LE(tiffStart + o)
      : (b, o) => b.readUInt32BE(tiffStart + o);

    const ifd0Off = r32(buf, 4);
    const numEntries = r16(buf, ifd0Off);

    for (let i = 0; i < numEntries; i++) {
      const entryOff = ifd0Off + 2 + i * 12;
      const tag = r16(buf, entryOff);
      if (tag === 0x010e) {
        const count = r32(buf, entryOff + 4);
        const valueOff = count <= 4 ? entryOff + 8 : r32(buf, entryOff + 8);
        const str = buf.slice(tiffStart + valueOff, tiffStart + valueOff + count - 1);
        return new TextDecoder("utf-8").decode(str);
      }
    }
  } catch {
    // Ignore EXIF parsing errors
  }
  return "";
}

async function optimizeContentImages() {
  const imagesDir = join(PUBLIC_DIR, "images");
  const files = await readdir(imagesDir);
  const jpgFiles = files.filter((f) => f.endsWith(".jpg"));

  const manifest = {};

  console.log(`Optimizing ${jpgFiles.length} content images...`);

  await Promise.all(
    jpgFiles.map(async (file) => {
      const id = file.replace(".jpg", "");
      const inputPath = join(imagesDir, file);
      const outputPath = join(imagesDir, `${id}.webp`);

      const image = sharp(inputPath);
      const metadata = await image.metadata();
      const alt = parseExifDescription(metadata.exif);

      // Resize and convert to WebP
      const info = await sharp(inputPath)
        .resize({ width: CONTENT_MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toFile(outputPath);

      manifest[id] = {
        width: info.width,
        height: info.height,
        alt,
      };

      const origSize = (metadata.size / 1024).toFixed(0);
      const newSize = (info.size / 1024).toFixed(0);
      console.log(`  ${file}: ${origSize}KB -> ${newSize}KB`);
    }),
  );

  return manifest;
}

async function optimizeProfileImages() {
  const profilesDir = join(PUBLIC_DIR, "images", "profiles");
  const files = await readdir(profilesDir);
  const jpgFiles = files.filter((f) => f.endsWith(".jpg"));

  console.log(`Optimizing ${jpgFiles.length} profile images...`);

  await Promise.all(
    jpgFiles.map(async (file) => {
      const id = file.replace(".jpg", "");
      const inputPath = join(profilesDir, file);
      const outputPath = join(profilesDir, `${id}.webp`);

      const metadata = await sharp(inputPath).metadata();

      const info = await sharp(inputPath)
        .resize({ width: PROFILE_MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toFile(outputPath);

      const origSize = (metadata.size / 1024).toFixed(0);
      const newSize = (info.size / 1024).toFixed(0);
      console.log(`  ${file}: ${origSize}KB -> ${newSize}KB`);
    }),
  );
}

async function main() {
  console.log("=== Image Optimization ===\n");

  const manifest = await optimizeContentImages();
  console.log();
  await optimizeProfileImages();

  // Write manifest
  const manifestPath = join(PUBLIC_DIR, "images", "manifest.json");
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\nManifest written to ${manifestPath}`);
}

main().catch(console.error);
