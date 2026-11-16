import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const sourceDirectory = path.join(projectRoot, "artifacts", "illustration-concepts", "pencil-selected");
const outputDirectory = path.join(projectRoot, "public", "illustrations", "pencil-v2");
const variants = ["journey", "coast", "forest", "night", "mail"];

async function prepareIllustrations() {
  // Validate the complete selection before creating or replacing any output.
  const sources = [];
  for (const variant of variants) {
    const source = path.join(sourceDirectory, `${variant}.png`);
    let sourceStat;
    try {
      sourceStat = await stat(source);
    } catch (error) {
      if (error.code === "ENOENT") {
        throw new Error(`Missing selected illustration: ${variant}.png`);
      }
      throw error;
    }
    const metadata = await sharp(source).metadata();
    if (metadata.format !== "png" || !metadata.width || !metadata.height || (metadata.pages ?? 1) !== 1) {
      throw new Error(`Expected one PNG image: ${variant}.png`);
    }
    sources.push({ variant, source, width: metadata.width, height: metadata.height, sourceBytes: sourceStat.size });
  }

  await mkdir(outputDirectory, { recursive: true });
  const report = [];
  for (const { variant, source, width, height, sourceBytes } of sources) {
    const output = path.join(outputDirectory, `${variant}.webp`);
    // Preserve the original canvas and ICC profile: no resize, crop, or recoloring.
    await sharp(source).keepIccProfile().webp({ quality: 88 }).toFile(output);
    const outputMetadata = await sharp(output).metadata();
    if (outputMetadata.width !== width || outputMetadata.height !== height) {
      throw new Error(`Illustration dimensions changed unexpectedly: ${variant}.webp`);
    }
    const outputStat = await stat(output);
    report.push({ variant, width, height, pngBytes: sourceBytes, webpBytes: outputStat.size });
  }

  console.log(JSON.stringify(report, null, 2));
}

prepareIllustrations().catch((error) => {
  console.error(error instanceof Error ? error.message : "Could not prepare the selected illustrations.");
  process.exitCode = 1;
});
