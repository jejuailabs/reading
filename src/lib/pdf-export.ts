import {createElement as h, type ReactElement} from "react";
import type {DocumentProps} from "@react-pdf/renderer";

export type PdfPaper = "A4" | "A5";
export type PdfLocale = "ko" | "en";
export type PdfField = {label: string; value: string; prompt?: string; kind?: "short" | "long" | "drawing" | "table"; rows?: number; imageDataUrl?: string};
export type ReportPdfInput = {title: string; subtitle?: string; fields: PdfField[]; blank?: boolean; paper?: PdfPaper; locale?: PdfLocale; filename?: string};
export type BookPdfInput = {title: string; subtitle?: string; pages: {text: string; imageDataUrl?: string; blank?: boolean}[]; paper?: PdfPaper; locale?: PdfLocale; filename?: string};

const FONT_FAMILY = "OnbookNanumGothic";
const MAX_TEXT = 600_000;
const MAX_IMAGE_LENGTH = 12_000_000;
const MAX_IMAGES_TOTAL = 40_000_000;
let rendererPromise: Promise<typeof import("@react-pdf/renderer")> | undefined;
let renderQueue: Promise<unknown> = Promise.resolve();

function invalid(message: string): never { throw new Error(`PDF 입력을 확인해 주세요 / Check PDF input: ${message}`); }
function text(value: unknown, name: string, maximum: number, required = false): asserts value is string {
  if (typeof value !== "string" || value.length > maximum || (required && !value.trim())) invalid(name);
}
function options(input: {title: string; subtitle?: string; paper?: PdfPaper; locale?: PdfLocale; filename?: string}) {
  text(input.title,"title",500,true);
  if (input.subtitle !== undefined) text(input.subtitle,"subtitle",4000);
  if (input.filename !== undefined) text(input.filename,"filename",300);
  if (input.paper !== undefined && input.paper !== "A4" && input.paper !== "A5") invalid("paper");
  if (input.locale !== undefined && input.locale !== "ko" && input.locale !== "en") invalid("locale");
}
/** Remote URLs, SVG and HTML are deliberately excluded from the document renderer. */
export function isPdfImageDataUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > MAX_IMAGE_LENGTH) return false;
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4 !== 0) return false;
  if (match[1] === "png") return match[2].startsWith("iVBORw0KGgo");
  if (match[1] === "jpeg") return match[2].startsWith("/9j/");
  try {const header=atob(match[2].slice(0,32)); return header.startsWith("RIFF") && header.slice(8,12) === "WEBP";} catch {return false;}
}
async function normalizePdfImage(value: string): Promise<string> {
  if (!value.startsWith("data:image/webp;")) return value;
  if (typeof document === "undefined" || typeof createImageBitmap === "undefined") throw new Error("WebP 그림은 브라우저에서 PDF로 만들거나 PNG/JPEG로 바꿔 주세요 / Convert WebP to PNG/JPEG or export in a supported browser.");
  const decoded=atob(value.slice(value.indexOf(",")+1));
  const bytes=new Uint8Array(decoded.length);
  for(let i=0;i<decoded.length;i++) bytes[i]=decoded.charCodeAt(i);
  const bitmap=await createImageBitmap(new Blob([bytes],{type:"image/webp"}));
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width*bitmap.height>40_000_000) invalid("image dimensions are too large");
    const canvas=document.createElement("canvas");canvas.width=bitmap.width;canvas.height=bitmap.height;
    const context=canvas.getContext("2d");
    if(!context) throw new Error("그림을 PDF로 변환하지 못했어요 / Image conversion is unavailable.");
    context.drawImage(bitmap,0,0);
    const converted=canvas.toDataURL("image/png");
    canvas.width=0;canvas.height=0;
    if(!isPdfImageDataUrl(converted)) invalid("converted image is too large");
    return converted;
  } finally {bitmap.close();}
}
export function validateReportPdfInput(input: ReportPdfInput): void {
  if (!input || typeof input !== "object") invalid("report");
  options(input);
  if (!Array.isArray(input.fields) || input.fields.length === 0 || input.fields.length > 200) invalid("fields (1-200)");
  if (input.blank !== undefined && typeof input.blank !== "boolean") invalid("blank");
  let length = input.title.length + (input.subtitle?.length ?? 0);
  let images = 0;
  for (const field of input.fields) {
    if (!field || typeof field !== "object") invalid("field");
    text(field.label,"field label",500,true);
    text(field.value,"field value",60_000);
    if (field.prompt !== undefined) text(field.prompt,"field prompt",2000);
    if (field.kind !== undefined && !["short","long","drawing","table"].includes(field.kind)) invalid("field kind");
    if (field.rows !== undefined && (!Number.isInteger(field.rows) || field.rows < 1 || field.rows > 12)) invalid("field rows");
    if (!input.blank && field.imageDataUrl !== undefined) {
      if (!isPdfImageDataUrl(field.imageDataUrl)) invalid("drawing must be a local PNG/JPEG/WebP data URL");
      images += field.imageDataUrl.length;
    }
    length += field.label.length + (input.blank ? 0 : field.value.length) + (field.prompt?.length ?? 0);
  }
  if (length > MAX_TEXT || images > MAX_IMAGES_TOTAL) invalid("report is too large; export smaller sections");
}
export function validateBookPdfInput(input: BookPdfInput): void {
  if (!input || typeof input !== "object") invalid("book");
  options(input);
  if (!Array.isArray(input.pages) || !input.pages.length || input.pages.length > 200) invalid("pages (1-200)");
  let length = input.title.length + (input.subtitle?.length ?? 0);
  let images = 0;
  for (const page of input.pages) {
    if (!page || typeof page !== "object") invalid("page");
    text(page.text,"page text",60_000);
    if (page.imageDataUrl !== undefined) {
      if (!isPdfImageDataUrl(page.imageDataUrl)) invalid("image must be a local PNG/JPEG/WebP data URL");
      images += page.imageDataUrl.length;
    }
    if (page.blank !== undefined && typeof page.blank !== "boolean") invalid("blank page flag");
    if (!page.text.trim() && !page.imageDataUrl && page.blank !== true) invalid("empty book page");
    length += page.text.length;
  }
  if (length > MAX_TEXT || images > MAX_IMAGES_TOTAL) invalid("book is too large; export smaller sections");
}

/** Formatting-only break opportunities keep long URLs/words inside narrow pages. */
export function wrapPdfText(value: string): string {
  return value.normalize("NFC").replace(/\r\n?/g,"\n").replace(/[^\s\u200b]{32,}/gu, token => Array.from(token).reduce<string[]>((parts,character,index) => {
    const chunk = Math.floor(index / 20);
    parts[chunk] = (parts[chunk] ?? "") + character;
    return parts;
  },[]).join("\u200b"));
}
export function pdfFilename(value = "온책읽기"): string {
  const name = value.replace(/[\u0000-\u001f<>:"/\\|?*]/g,"-").replace(/[. ]+$/g,"").replace(/\.pdf$/i,"").trim().slice(0,140);
  return `${/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(name) ? `onbook-${name}` : name || "onbook"}.pdf`;
}

async function renderer() {
  if (!rendererPromise) rendererPromise = import("@react-pdf/renderer").then(module => {
    // Browser: bundled same-origin fonts. Node: local files for offline regression tests.
    const fontRoot = typeof window === "undefined" ? `${process.cwd().replace(/\\/g,"/")}/public/fonts` : "/fonts";
    module.Font.register({family:FONT_FAMILY,fonts:[
      {src:`${fontRoot}/NanumGothic-Regular.ttf`,fontWeight:400},
      {src:`${fontRoot}/NanumGothic-Bold.ttf`,fontWeight:700},
    ]});
    module.Font.registerHyphenationCallback(word => [word]);
    return module;
  }).catch(error => { rendererPromise = undefined; throw error; });
  return rendererPromise;
}

async function render(document: (module: typeof import("@react-pdf/renderer")) => ReactElement<DocumentProps>): Promise<Blob> {
  // The renderer/font registry is shared. Serialize work to avoid overlapping layout jobs.
  const next = renderQueue.catch(() => undefined).then(async () => {
    const module = await renderer();
    const blob = await module.pdf(document(module)).toBlob();
    if (!blob.size) throw new Error("PDF 파일이 비어 있어요 / The PDF file is empty.");
    return blob.type === "application/pdf" ? blob : new Blob([blob],{type:"application/pdf"});
  });
  renderQueue = next;
  return next;
}

function pageStyle(paper: PdfPaper) {
  // Do not inherit relative lineHeight from Page: the dynamic footer is relaid out
  // multiple times and react-pdf can multiply an inherited resolved value again.
  return {fontFamily:FONT_FAMILY,fontSize:paper === "A5" ? 11 : 12,color:"#20251f",backgroundColor:"#ffffff",paddingTop:40,paddingBottom:54,paddingHorizontal:paper === "A5" ? 32 : 46};
}
function footer(module: typeof import("@react-pdf/renderer"), _locale: PdfLocale) {
  return h(module.Text,{fixed:true,style:{position:"absolute",bottom:24,left:32,right:32,textAlign:"center",fontFamily:"Helvetica",fontSize:8,color:"#647060"},render:({pageNumber,totalPages}:{pageNumber:number;totalPages:number}) => `${pageNumber} / ${totalPages}`});
}

/** Returns a real PDF Blob. Does not print, download, upload, or call a generation API. */
export async function exportReportPdf(input: ReportPdfInput): Promise<Blob> {
  validateReportPdfInput(input);
  // Capture at invocation: edits during asynchronous font loading cannot change this export.
  const snapshot: ReportPdfInput = { ...input, fields:input.fields.map(field => ({...field,value:input.blank ? "" : field.value,imageDataUrl:input.blank ? undefined : field.imageDataUrl})) };
  for (const field of snapshot.fields) if(field.imageDataUrl) field.imageDataUrl=await normalizePdfImage(field.imageDataUrl);
  const paper = snapshot.paper ?? "A4";
  const locale = snapshot.locale ?? "ko";
  return render(module => {
    const {Document,Page,View,Text} = module;
    const fields = snapshot.fields.map((field,index) => {
      const empty = !field.value.trim() && !field.imageDataUrl;
      const blankHeight = field.kind === "drawing" ? Math.min(210,(field.rows ?? 5)*28) : (field.rows ?? (field.kind === "short" ? 1 : 3))*25;
      const keepAhead = empty ? blankHeight + 24 : field.imageDataUrl ? (paper === "A5" ? 204 : 254) : 36;
      const label = h(Text,{style:{fontSize:12,fontWeight:700,lineHeight:1.4,marginBottom:5},minPresenceAhead:keepAhead},`${index+1}. ${wrapPdfText(field.label)}`);
      const prompt = field.prompt ? h(Text,{style:{fontSize:9,lineHeight:1.5,color:"#596454",marginBottom:7},minPresenceAhead:empty ? blankHeight : 24},wrapPdfText(field.prompt)) : null;
      const answer = empty
        ? field.kind === "drawing"
          ? h(View,{wrap:false,style:{height:Math.min(210,(field.rows ?? 5)*28),borderWidth:0.7,borderColor:"#a5ada1",marginBottom:8}})
          : h(View,null,...Array.from({length:field.rows ?? (field.kind === "short" ? 1 : 3)},(_,row) => h(View,{key:row,wrap:false,style:{height:25,borderBottomWidth:0.5,borderBottomColor:"#b9c0b5"}})))
        : h(View,null,
          field.imageDataUrl ? h(module.Image,{src:field.imageDataUrl,style:{width:"100%",height:paper === "A5" ? 180 : 230,objectFit:"contain",marginBottom:8}}) : null,
          field.value.trim() ? h(Text,{orphans:2,widows:2,style:{marginBottom:5,lineHeight:1.75}},wrapPdfText(field.value)) : null);
      const keepBlankTogether = empty && field.label.length <= 140 && (field.prompt?.length ?? 0) <= 240 && blankHeight <= 300;
      return h(View,{key:index,wrap:!keepBlankTogether,style:{marginBottom:20}},label,prompt,answer);
    });
    return h(Document,{title:snapshot.title,author:"Onbook",subject:snapshot.blank ? "Blank worksheet" : "Reading record",language:locale},
      h(Page,{size:paper,wrap:true,style:pageStyle(paper)},
        h(Text,{style:{fontSize:9,color:"#63745c",marginBottom:7}},snapshot.blank ? (locale === "ko" ? "빈 양식 · 필요한 부분만 골라 써요" : "Blank worksheet · Choose the parts you need") : (locale === "ko" ? "읽기 기록" : "Reading record")),
        h(Text,{style:{fontSize:22,fontWeight:700,lineHeight:1.35,marginBottom:12},minPresenceAhead:55},wrapPdfText(snapshot.title)),
        snapshot.subtitle ? h(Text,{style:{fontSize:10,color:"#596454",marginBottom:22}},wrapPdfText(snapshot.subtitle)) : null,
        ...fields,footer(module,locale)));
  });
}

/** Every supplied scene is exported; a long scene continues onto additional physical pages. */
export async function exportBookPdf(input: BookPdfInput): Promise<Blob> {
  validateBookPdfInput(input);
  const snapshot: BookPdfInput = {...input,pages:input.pages.map(page => ({...page}))};
  for (const page of snapshot.pages) if(page.imageDataUrl) page.imageDataUrl=await normalizePdfImage(page.imageDataUrl);
  const paper = snapshot.paper ?? "A5";
  const locale = snapshot.locale ?? "ko";
  return render(module => {
    const {Document,Page,View,Text,Image} = module;
    const pages = snapshot.pages.map((scene,index) => h(Page,{key:index,size:paper,wrap:true,style:pageStyle(paper)},
      h(Text,{style:{fontSize:9,color:"#63745c",marginBottom:12}},locale === "ko" ? `${index+1}장면 / ${snapshot.pages.length}장면` : `Scene ${index+1} / ${snapshot.pages.length}`),
      scene.imageDataUrl ? h(Image,{src:scene.imageDataUrl,style:{width:"100%",height:paper === "A5" ? 205 : 280,objectFit:"contain",marginBottom:18}}) : null,
      scene.blank && !scene.text.trim() && !scene.imageDataUrl ? h(Text,{style:{fontSize:10,color:"#6e746c",lineHeight:1.8}},locale === "ko" ? "앱 안내 · 등록된 본문이나 그림이 없는 장면입니다. 빈 위치를 보존했습니다. 이 문장은 원문이 아닙니다." : "App note · No text or image was registered for this scene. Its empty position is preserved. This note is not source text.") : null,
      h(Text,{orphans:2,widows:2,style:{fontSize:paper === "A5" ? 14 : 16,lineHeight:1.85}},wrapPdfText(scene.text)),
      footer(module,locale)));
    return h(Document,{title:snapshot.title,author:"Onbook",subject:"Complete book",language:locale},
      h(Page,{size:paper,style:{...pageStyle(paper),justifyContent:"center"}},
        h(View,{style:{borderTopWidth:1,borderBottomWidth:1,borderColor:"#bbc5b4",paddingVertical:35}},
          h(Text,{style:{fontSize:10,color:"#63745c",marginBottom:20}},locale === "ko" ? "온책읽기 · 함께 읽는 한 권" : "Onbook · A book to read together"),
          h(Text,{style:{fontSize:28,fontWeight:700,lineHeight:1.5,marginBottom:18}},wrapPdfText(snapshot.title)),
          snapshot.subtitle ? h(Text,{style:{fontSize:11,color:"#596454"}},wrapPdfText(snapshot.subtitle)) : null),
        footer(module,locale)),...pages);
  });
}

/** Call after the user selects Download. Opening a print dialog is a separate UI action. */
export function downloadPdf(blob: Blob, filename = "온책읽기.pdf"): void {
  if (typeof document === "undefined") throw new Error("다운로드는 브라우저에서 열어 주세요 / Download in a browser.");
  if (!(blob instanceof Blob) || blob.type !== "application/pdf" || !blob.size) invalid("PDF Blob");
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = pdfFilename(filename); anchor.style.display = "none";
  document.body.appendChild(anchor);
  try { anchor.click(); } finally { anchor.remove(); setTimeout(() => URL.revokeObjectURL(url),60_000); }
}
