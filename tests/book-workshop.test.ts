import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_IMAGE_BYTES, addWorkshopDraft, createIllustrationBrief, createWorkshopDraft, createWorkshopEdition,
  forkWorkshopDraft, isAllowedImageDataUrl, isWorkshopState, makeIllustrationPrompt, makeWorkshopState,
  prepareScenePlans, reviseWorkshopPage, workshopPublicationIssues,
} from "../src/lib/book-workshop-model.ts";

const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6rQAAAABJRU5ErkJggg==";

function finishedDraft() {
  const draft = createWorkshopDraft();
  draft.title = "우리가 남긴 편지";
  draft.authorName = "바람 작가";
  draft.pages.forEach((page, i) => { page.text = `${i + 1}장에 직접 쓴 문장입니다.`; });
  draft.review = { text: true, rights: true, privacy: true, facts: true };
  return draft;
}

test("new drafts preserve old work and use independent IDs", () => {
  const state = makeWorkshopState();
  state.drafts[0].pages[0].text = "기존 원고";
  const before = structuredClone(state);
  const draft = createWorkshopDraft("team", "다음 편지는 누가 받을까?");
  const next = addWorkshopDraft(state, draft);
  assert.deepEqual(state, before);
  assert.deepEqual(next.drafts[1], before.drafts[0]);
  assert.equal(next.activeId, draft.id);
  assert.equal(draft.members.length, 2);
  assert.equal(isWorkshopState(next), true);
});

test("resizing makes an independent copy and retains removed pages in the original", () => {
  const original = forkWorkshopDraft(finishedDraft(), 8);
  original.pages.forEach((page, i) => { page.text = `보관할 ${i + 1}장`; });
  original.feedback.push({ id: "last-feedback", memberId: original.members[0].id, pageId: original.pages[7].id, text: "마지막 장 의견", at: new Date().toISOString() });
  const before = structuredClone(original);
  const copy = forkWorkshopDraft(original, 4);
  assert.deepEqual(original, before);
  assert.notEqual(copy.id, original.id);
  assert.equal(copy.pages.length, 4);
  assert.equal(copy.feedback.length, 0);
  copy.pages[0].text = "복사본에서 고친 말";
  assert.equal(original.pages[0].text, "보관할 1장");
  assert.equal(original.pages[7].text, "보관할 8장");
  assert.throws(() => forkWorkshopDraft(original, 3));
  assert.throws(() => forkWorkshopDraft(original, 25));
  assert.throws(() => forkWorkshopDraft(original, 4.5));
});

test("scene planning fills only empty notes and does not fabricate a manuscript", () => {
  const draft = createWorkshopDraft();
  draft.outline.start = "바다에서 편지를 발견한다";
  draft.pages[1].plan = "직접 쓴 중요한 장면 메모";
  draft.pages[2].text = "내가 쓴 본문을 유지합니다.";
  const next = prepareScenePlans(draft);
  assert.match(next.pages[0].plan, /바다에서 편지를 발견한다/);
  assert.equal(next.pages[1].plan, draft.pages[1].plan);
  assert.equal(next.pages[2].text, draft.pages[2].text);
  assert.equal(next.pages[0].text, "");
  assert.equal(draft.pages[0].plan, "");
});

test("editing a page records its writer and reopens review without touching snapshots", () => {
  const draft = finishedDraft();
  draft.pages[0].imageDataUrl = png;
  draft.pages[0].imageCredit = "직접 그린 그림";
  draft.pages[0].sourceNote = "학교 도서관에서 확인한 자료";
  draft.outline.sources = "참고자료 목록";
  const edition = createWorkshopEdition(draft);
  const saved = structuredClone(edition);
  const next = reviseWorkshopPage(draft, draft.pages[0].id, { text: "다시 고친 본문" });
  assert.equal(next.review.text, false);
  assert.equal(next.review.rights, false);
  assert.equal(next.revision, draft.revision + 1);
  assert.deepEqual(next.pages[0].contributors, [draft.activeMemberId]);
  assert.deepEqual(edition, saved);
  assert.equal(edition.pages[0].imageDataUrl, png);
  assert.match(edition.pages[0].text, /그림 출처: 직접 그린 그림/);
  assert.match(edition.pages.at(-1)!.text, /책의 참고자료: 참고자료 목록/);
  assert.notStrictEqual(edition.pages[0], draft.pages[0]);
  assert.equal(createWorkshopEdition(draft).id, edition.id, "same content revision has the same deduplication key");
});

test("publication requires actual prose, rights review, image credit and information sources", () => {
  assert.throws(() => createWorkshopEdition(createWorkshopDraft()));
  const draft = finishedDraft();
  draft.pages[0].imageDataUrl = png;
  assert.ok(workshopPublicationIssues(draft).some(issue => issue.includes("그림")));
  draft.pages[0].imageCredit = "나의 그림";
  draft.type = "information";
  assert.ok(workshopPublicationIssues(draft).some(issue => issue.includes("참고한 자료")));
  draft.outline.sources = "공식 기관 자료의 제목과 URL";
  draft.review.facts = false;
  assert.ok(workshopPublicationIssues(draft).some(issue => issue.includes("검토")));
  draft.review.facts = true;
  assert.deepEqual(workshopPublicationIssues(draft), []);
});

test("local images reject remote URLs, SVG, MIME spoofing and oversized data", () => {
  assert.equal(isAllowedImageDataUrl(png), true);
  assert.equal(isAllowedImageDataUrl("https://example.com/picture.png"), false);
  assert.equal(isAllowedImageDataUrl("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="), false);
  assert.equal(isAllowedImageDataUrl(png.replace("image/png", "image/jpeg")), false);
  assert.equal(isAllowedImageDataUrl("data:image/png;base64,bm90LWEtcG5n"), false);
  const oversized = `data:image/png;base64,${Buffer.concat([Buffer.from("\x89PNG\r\n\x1a\n", "binary"), Buffer.alloc(MAX_IMAGE_BYTES)]).toString("base64")}`;
  assert.equal(isAllowedImageDataUrl(oversized), false);
});

test("restoration validates nested data and cross references before displaying a saved draft", () => {
  const state = makeWorkshopState();
  assert.equal(isWorkshopState(JSON.parse(JSON.stringify(state))), true);
  const corruptions = [
    { ...state, schemaVersion: 2 }, { ...state, activeId: "missing" }, { ...state, drafts: [state.drafts[0], state.drafts[0]] },
    { ...state, drafts: [{ ...state.drafts[0], activePage: 99 }] },
    { ...state, drafts: [{ ...state.drafts[0], pages: [] }] },
    { ...state, drafts: [{ ...state.drafts[0], activeMemberId: "missing-member" }] },
    { ...state, drafts: [{ ...state.drafts[0], review: null }] },
    { ...state, drafts: [{ ...state.drafts[0], pages: state.drafts[0].pages.map(page => ({ ...page, imageDataUrl: "javascript:alert(1)" })) }] },
    { ...state, drafts: [{ ...state.drafts[0], feedback: [{ id: "bad", memberId: "missing", pageId: state.drafts[0].pages[0].id, text: "의견", at: new Date().toISOString() }] }] },
  ];
  for (const value of corruptions) assert.equal(isWorkshopState(value), false);
});

test("illustration brief is explicitly ungenerated and contains consistent settings without sending images", () => {
  const draft = finishedDraft();
  draft.topic = "제주 애월"; draft.outline.characters = "노란 모자를 쓴 아이";
  draft.pages[0].imageDataUrl = png;
  draft.pages[1].imagePrompt = "내가 직접 수정한 그림 요청";
  const prompt = makeIllustrationPrompt(draft, draft.pages[0]);
  assert.match(prompt, /제주 애월/);
  assert.match(prompt, /노란 모자를 쓴 아이/);
  const brief = createIllustrationBrief(draft);
  assert.equal(brief.status, "prepared_not_generated");
  assert.equal(brief.generationExecuted, false);
  assert.equal(brief.pages.length, 4);
  assert.equal(brief.pages[0].imageStatus, "user_supplied");
  assert.equal(brief.pages[1].prompt, "내가 직접 수정한 그림 요청");
  assert.equal(JSON.stringify(brief).includes(png), false);
});
