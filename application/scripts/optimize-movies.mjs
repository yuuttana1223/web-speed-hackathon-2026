import { execSync } from "node:child_process";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const MOVIES_DIR = join(__dirname, "..", "public", "movies");

async function main() {
  console.log("=== Movie Optimization (GIF → MP4) ===\n");

  const files = await readdir(MOVIES_DIR);
  const gifFiles = files.filter((f) => f.endsWith(".gif"));

  console.log(`Converting ${gifFiles.length} GIF files to MP4...\n`);

  for (const file of gifFiles) {
    const id = file.replace(".gif", "");
    const inputPath = join(MOVIES_DIR, file);
    const outputPath = join(MOVIES_DIR, `${id}.mp4`);

    // GIF → MP4 (H.264, faststart for streaming)
    execSync(
      [
        "ffmpeg",
        "-y",
        "-i",
        inputPath,
        "-movflags",
        "faststart",
        "-pix_fmt",
        "yuv420p",
        "-vf",
        "scale=trunc(iw/2)*2:trunc(ih/2)*2",
        "-c:v",
        "libx264",
        "-crf",
        "23",
        "-preset",
        "medium",
        outputPath,
      ].join(" "),
      { stdio: "pipe" },
    );

    const { statSync } = await import("node:fs");
    const origSize = (statSync(inputPath).size / 1024 / 1024).toFixed(1);
    const newSize = (statSync(outputPath).size / 1024 / 1024).toFixed(1);
    console.log(`  ${file}: ${origSize}MB -> ${newSize}MB`);
  }

  console.log("\nDone!");
}

main().catch(console.error);
