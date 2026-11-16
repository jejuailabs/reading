import type {Book, BookSource, StoryPage} from "./model.ts";
import {isSafeImage} from "./model.ts";

export function safeBookUrl(value: string): string | undefined {
  if (!value.trim()) return undefined;
  const url = new URL(value.trim());
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error("HTTP(S) 링크만 사용할 수 있습니다. / Use an HTTP(S) URL.");
  return url.href;
}

export function textPages(text: string): StoryPage[] {
  if (text.length > 200_000) throw new Error("원고는 20만 자 이내로 나누어 등록하세요. / Split manuscripts longer than 200,000 characters.");
  // Form feeds represent source-PDF page boundaries, including blank first/last pages.
  const normalized = text.replace(/\r\n/g,"\n");
  if (!normalized.trim()) throw new Error("본문을 입력하세요. / Enter the text.");
  const chunks = normalized.includes("\f") ? normalized.split("\f") : normalized.split(/\n\s*---\s*\n/);
  const pages: StoryPage[] = [];
  for (const chunk of chunks) {
    let rest = chunk.trim();
    if (!rest && chunks.length > 1) {pages.push({text:"",en:"",art:"forest"}); continue;}
    while (rest.length > 1600) {
      let split = rest.lastIndexOf("\n",1600); if (split < 600) split = rest.lastIndexOf(" ",1600); if (split < 600) split = 1600;
      pages.push({text:rest.slice(0,split).trim(),en:"",art:"forest"}); rest = rest.slice(split).trim();
    }
    if (rest) pages.push({text:rest,en:"",art:"forest"});
  }
  if (pages.length > 200) throw new Error("한 번에 최대 200개 읽기 장면까지 등록할 수 있습니다. / Maximum 200 reading scenes.");
  return pages;
}

export function createImportedBook(input: {title:string;source:BookSource;pages:StoryPage[]}): Book {
  if (!input.title.trim() || input.title.trim().length > 160) throw new Error("책 제목은 1~160자로 입력하세요. / Enter a title of 1–160 characters.");
  if (!input.pages.length || input.pages.length > 200) throw new Error("책의 장면 수를 확인하세요. / Check the page count.");
  if (input.pages.some(p => p.imageDataUrl && !isSafeImage(p.imageDataUrl))) throw new Error("이미지 형식을 확인하세요. / Invalid image.");
  if (input.source.coverage !== "metadata" && input.source.rights === "reference") throw new Error("본문·이미지는 직접 제작하거나 사용 허락을 확인한 자료만 등록하세요. / Confirm permission to use the text or images.");
  const sourceUrl = safeBookUrl(input.source.url ?? "");
  if (input.source.kind === "link" && !sourceUrl) throw new Error("온라인 책 링크를 입력하세요. / Enter the online book URL.");
  return {id:`import-${crypto.randomUUID()}`,title:input.title.trim(),en:input.title.trim(),subtitle:input.source.author,subtitleEn:input.source.author,
    tag:"가져온 책",tagEn:"My imported book",art:"forest",color:"sage",revision:1,pages:structuredClone(input.pages),
    source:{...input.source,url:sourceUrl}};
}

export async function readImageFile(file: File): Promise<string> {
  if (!["image/png","image/jpeg","image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) throw new Error("PNG·JPG·WebP, 파일당 2MB 이하만 가능합니다. / Use PNG, JPG or WebP under 2MB.");
  const url = await new Promise<string>((resolve,reject) => {const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error("이미지를 읽지 못했습니다. / Could not read the image."));reader.readAsDataURL(file);});
  if (!isSafeImage(url)) throw new Error("잘못된 이미지입니다. / Invalid image.");
  return url;
}
