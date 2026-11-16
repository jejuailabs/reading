import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { classicBooks } from "../src/lib/classic-catalog.ts";

type AudioLocale = "ko" | "en";
type AudioEntry = { src: string; duration: number; sha256: string };
type AudioManifest = {
  version: number;
  engine: string;
  voices: Record<AudioLocale, string>;
  books: Record<string, Record<AudioLocale, AudioEntry[]>>;
};

const root = fileURLToPath(new URL("../", import.meta.url));
const publicRoot = path.join(root, "public");
const audioRoot = path.join(publicRoot, "audio", "classics");
const locales: AudioLocale[] = ["ko", "en"];

function loadManifest(): AudioManifest {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "src/lib/classic-audio.json"), "utf8")) as AudioManifest;
  assert.equal(manifest.version, 1, "The audio manifest must use the supported schema.");
  assert.ok(manifest.engine?.trim(), "The rendering engine must be identified.");
  assert.ok(manifest.books && typeof manifest.books === "object", "The manifest must contain book entries.");
  for (const locale of locales) assert.ok(manifest.voices?.[locale]?.trim(), `Missing ${locale} voice provenance.`);
  return manifest;
}

function audioPath(src: string): string {
  assert.match(src, /^\/audio\/classics\/[a-z0-9-]+\/(ko|en)-\d{2}\.mp3$/, "Audio URLs must name local, book-scoped MP3 files.");
  const file = path.resolve(publicRoot, src.slice(1));
  assert.ok(file.startsWith(audioRoot + path.sep), "Audio must remain inside the classic audio directory.");
  return file;
}

function collectMp3Files(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectMp3Files(file);
    return entry.isFile() && entry.name.endsWith(".mp3") ? [file] : [];
  });
}

test("the classic collection admits five Korean tales and five Aesop fables with unique IDs", () => {
  assert.equal(classicBooks.length, 10);
  assert.equal(classicBooks.filter(book => book.collection === "korean").length, 5);
  assert.equal(classicBooks.filter(book => book.collection === "aesop").length, 5);
  assert.equal(new Set(classicBooks.map(book => book.id)).size, classicBooks.length);
  assert.equal(classicBooks.reduce((total, book) => total + book.pages.length, 0), 50);

  for (const book of classicBooks) {
    assert.match(book.id, /^[a-z0-9-]+$/);
    assert.ok(book.title.trim() && book.en.trim(), `${book.id} needs both display titles.`);
    assert.equal(book.retelling, true, `${book.id} must disclose its retelling status.`);
    assert.ok(book.gradeBand?.trim(), `${book.id} needs a reading-band label.`);
    assert.equal(book.pages.length, book.collection === "korean" ? 6 : 4, `${book.id} has an incomplete scene sequence.`);
  }
});

test("every classic scene is bilingual and each guide begins with students' own questions", () => {
  for (const book of classicBooks) {
    for (const [index, page] of book.pages.entries()) {
      assert.ok(page.text.trim(), `${book.id}/${index + 1} is missing Korean text.`);
      assert.ok(page.en.trim(), `${book.id}/${index + 1} is missing English text.`);
    }
    assert.ok(book.guide, `${book.id} is missing its inquiry guide.`);
    assert.equal(book.guide.length, 3);
    assert.deepEqual(new Set(book.guide.map(item => item.kind)), new Set(["notice", "infer", "wonder"]));
    assert.equal(book.guide[0].kind, "wonder", "Student question-making must precede supplied prompts.");
    for (const item of book.guide) assert.ok(item.text.trim() && item.en.trim(), `${book.id}/${item.kind} must be bilingual.`);
  }
});

test("the audio manifest covers every scene and matches the current manuscript byte for byte", () => {
  const manifest = loadManifest();
  assert.deepEqual(Object.keys(manifest.books).sort(), classicBooks.map(book => book.id).sort());
  const referencedFiles = new Set<string>();

  for (const book of classicBooks) {
    assert.deepEqual(Object.keys(manifest.books[book.id]).sort(), [...locales].sort());
    for (const locale of locales) {
      const entries = manifest.books[book.id][locale];
      assert.ok(Array.isArray(entries));
      assert.equal(entries.length, book.pages.length, `${book.id}/${locale} must cover every scene.`);
      for (const [index, entry] of entries.entries()) {
        const manuscript = locale === "ko" ? book.pages[index].text : book.pages[index].en;
        const expectedHash = createHash("sha256").update(manuscript, "utf8").digest("hex");
        assert.equal(entry.sha256, expectedHash, `${book.id}/${locale}/${index + 1}: regenerate audio after manuscript changes.`);
        const expectedUrl = `/audio/classics/${book.id}/${locale}-${String(index + 1).padStart(2, "0")}.mp3`;
        assert.equal(entry.src, expectedUrl, "Scene order and language must point to their own audio file.");
        const file = audioPath(entry.src);
        assert.ok(fs.statSync(file).isFile() && fs.statSync(file).size > 0, `Missing or empty MP3: ${entry.src}`);
        assert.ok(Number.isFinite(entry.duration) && entry.duration > 0, `Invalid duration: ${entry.src}`);
        assert.ok(!referencedFiles.has(file), `Two scenes cannot silently reuse the same audio: ${entry.src}`);
        referencedFiles.add(file);
      }
    }
  }

  assert.equal(referencedFiles.size, 100);
  assert.deepEqual(new Set(collectMp3Files(audioRoot)), referencedFiles, "The audio folder must have no missing or orphaned MP3 files.");
});

test("all classic MP3 files contain audio with positive duration consistent with the manifest", () => {
  // Installed local ffprobe checks real files; no server or network is used.
  const manifest = loadManifest();
  const ffprobe = process.platform === "win32" ? "ffprobe.exe" : "ffprobe";
  for (const book of classicBooks) {
    for (const locale of locales) {
      for (const entry of manifest.books[book.id][locale]) {
        const result = execFileSync(ffprobe, [
          "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=codec_name,codec_type:format=duration", "-of", "json", audioPath(entry.src),
        ], { encoding: "utf8", timeout: 10000, windowsHide: true });
        const probe = JSON.parse(result) as { streams?: { codec_type: string; codec_name: string }[]; format?: { duration: string } };
        assert.equal(probe.streams?.[0]?.codec_type, "audio", `${entry.src} must contain an audio stream.`);
        assert.equal(probe.streams?.[0]?.codec_name, "mp3", `${entry.src} must contain MP3-encoded audio.`);
        const actualDuration = Number(probe.format?.duration);
        assert.ok(Number.isFinite(actualDuration) && actualDuration > 0, `${entry.src} must have positive playback duration.`);
        assert.ok(Math.abs(actualDuration - entry.duration) < 0.05, `${entry.src} duration must match its manifest entry.`);
      }
    }
  }
});
