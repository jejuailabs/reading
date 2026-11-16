import { createHash } from "node:crypto";
import { classicBooks } from "../classic-catalog.ts";

/** Pure preparation only: no key access, network, file writes, or paid execution. */
export const narrationModelMetadata = {
  provider: "OpenAI",
  model: "tts-1-hd",
  checkedAt: "2026-11-16",
  apiPath: "/v1/audio/speech",
  voice: "nova",
  locale: "ko",
  responseFormat: "mp3",
  speed: 0.95,
  maximumInputCharacters: 4096,
  usdPerMillionCharacters: 30,
  shutdownDate: "2027-01-06",
  purpose: "one_time_classic_sample_files",
  executionConnected: false,
  requiresExplicitPaidApproval: true,
  sources: {
    model: "https://developers.openai.com/api/docs/models/tts-1-hd",
    speech: "https://developers.openai.com/api/reference/resources/audio/subresources/speech/methods/create",
    guide: "https://developers.openai.com/api/docs/guides/text-to-speech",
  },
} as const;

/**
 * Accepts only a known classic book ID and prepares its complete Korean text.
 * No client-provided text, locale, model, voice, URL, or instructions are accepted.
 * A future executor must separately verify current server-side billing approval,
 * source hash, cache, call allowance, remaining budget, and model availability.
 * This builder and its metadata never grant billing authorization.
 */
export function buildNarrationRequest(bookId: unknown) {
  if (typeof bookId !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(bookId)) {
    throw new Error("유효한 고전 샘플 책 ID가 필요합니다.");
  }
  const book = classicBooks.find((candidate) => candidate.id === bookId);
  if (!book || !book.retelling || book.pages.length === 0) {
    throw new Error("낭독 대상인 고전 샘플을 찾을 수 없습니다.");
  }
  // Preserve the fixed Korean wording, including existing and inter-page newlines.
  const text = book.title + "\n\n" + book.pages.map((page) => page.text).join("\n\n");
  const characterCount = [...text].length;
  if (!text.trim() || !/[가-힣]/u.test(text)) {
    throw new Error("한국어 낭독 원고가 없거나 비어 있습니다.");
  }
  if (characterCount > narrationModelMetadata.maximumInputCharacters) {
    throw new Error("원고가 4,096자를 넘습니다. 분할과 호출 범위를 다시 검토해야 합니다.");
  }

  const sourceHash = createHash("sha256").update(text, "utf8").digest("hex");
  const cacheKey = createHash("sha256")
    .update(
      JSON.stringify({
        sourceId: book.id,
        revision: book.revision,
        sourceHash,
        locale: narrationModelMetadata.locale,
        model: narrationModelMetadata.model,
        voice: narrationModelMetadata.voice,
        responseFormat: narrationModelMetadata.responseFormat,
        speed: narrationModelMetadata.speed,
      }),
      "utf8",
    )
    .digest("hex");

  return {
    metadata: {
      ...narrationModelMetadata,
      sourceId: book.id,
      revision: book.revision,
      sourceHash,
      cacheKey,
      pageCount: book.pages.length,
      characterCount,
      estimatedCostUsd: (characterCount * narrationModelMetadata.usdPerMillionCharacters) / 1_000_000,
      automaticRetries: 0,
      disclosure: "AI가 만든 낭독 음성입니다.",
      granularity: "whole_book",
    },
    body: {
      model: narrationModelMetadata.model,
      input: text,
      voice: narrationModelMetadata.voice,
      response_format: narrationModelMetadata.responseFormat,
      speed: narrationModelMetadata.speed,
    },
  } as const;
}
