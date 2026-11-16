import assert from "node:assert/strict";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {exportBookPdf,exportReportPdf,isPdfImageDataUrl,pdfFilename,validateBookPdfInput,validateReportPdfInput,wrapPdfText} from "../src/lib/pdf-export.ts";

async function inspect(blob: Blob) {
  assert.equal(blob.type,"application/pdf");
  const data = new Uint8Array(await blob.arrayBuffer());
  assert.equal(new TextDecoder().decode(data.slice(0,5)),"%PDF-");
  const {getDocument} = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({data,useSystemFonts:false,useWorkerFetch:false,standardFontDataUrl:fileURLToPath(new URL("../node_modules/pdfjs-dist/standard_fonts/",import.meta.url)).replace(/\\/g,"/")});
  const pdf = await task.promise;
  const pages: string[] = [];
  const sizes: number[][] = [];
  for (let n=1;n<=pdf.numPages;n++) {
    const page = await pdf.getPage(n);
    const content = await page.getTextContent();
    pages.push(content.items.map(item => "str" in item ? item.str : "").join("").replace(/\u200b/g,"").normalize("NFC"));
    sizes.push([...page.view]);
  }
  await task.destroy();
  return {pages,sizes,text:pages.join("\n")};
}

test("PDF validation refuses remote assets, invalid sizes, empty books, and oversized content",() => {
  assert.equal(isPdfImageDataUrl("https://example.com/image.png"),false);
  assert.equal(isPdfImageDataUrl("data:image/svg+xml;base64,PHN2Zz4="),false);
  assert.throws(() => validateBookPdfInput({title:"책",pages:[]}));
  assert.throws(() => validateBookPdfInput({title:"책",pages:[{text:"a",imageDataUrl:"https://example.com/image.png"}]}));
  assert.throws(() => validateReportPdfInput({title:"기록",fields:[{label:"생각",value:"a".repeat(60_001)}]}));
  assert.throws(() => validateReportPdfInput({title:"기록",paper:"A3" as "A4",fields:[{label:"생각",value:""}]}));
  assert.throws(() => validateReportPdfInput({title:"기록",fields:[{label:"그림",value:"",imageDataUrl:"file:///secret.png"}]}));
});

test("filename and line-break normalization preserve content without unsafe file paths",() => {
  assert.equal(pdfFilename("../책:질문.pdf"),"..-책-질문.pdf");
  assert.equal(pdfFilename("CON"),"onbook-CON.pdf");
  assert.equal(pdfFilename(""),"onbook.pdf");
  const long = "https://example.com/"+"가나다라마바사".repeat(20);
  assert.equal(wrapPdfText(long).replace(/\u200b/g,""),long);
});

test("a long Korean/English A4 record is an actual multipage PDF with no lost ending and fixed input snapshot",async () => {
  const beginning = "첫 질문: 왜 인물의 마음이 바뀌었을까요? 겹받침 읽기 앉다 읽다 값이";
  const ending = "FINAL_EVIDENCE 마지막 근거를 온전히 남겼습니다.";
  const input = {title:"질문·근거·생각 보고서",fields:[{label:"나의 생각",value:`${beginning}\n${"본문의 단서를 다시 읽고 서로 다른 생각을 비교합니다. We compare evidence and revise our ideas. ".repeat(80)}\n${ending}`}],paper:"A4" as const};
  const pending = exportReportPdf(input);
  input.fields[0].value = "MUTATED_AFTER_EXPORT";
  const result = await inspect(await pending);
  assert.ok(result.pages.length > 1);
  assert.ok(result.text.includes("첫 질문"));
  assert.ok(result.text.includes("겹받침"));
  assert.ok(result.text.includes("FINAL_EVIDENCE"));
  assert.ok(result.text.includes("마지막 근거를 온전히 남겼습니다."));
  assert.ok(!result.text.includes("MUTATED_AFTER_EXPORT"));
  result.pages.forEach((page,index) => assert.ok(page.replace(/\s+/g," ").includes(`${index+1} / ${result.pages.length}`),`missing page number on page ${index+1}`));
  assert.ok(Math.abs(result.sizes[0][2]-595.28)<1 && Math.abs(result.sizes[0][3]-841.89)<1);
});

test("blank A5 worksheets exclude submitted text and drawings",async () => {
  const result = await inspect(await exportReportPdf({title:"나의 질문",blank:true,paper:"A5",fields:[
    {label:"질문",value:"SECRET_LEARNER_TEXT",rows:2},
    {label:"그림",value:"PRIVATE_IMAGE_CAPTION",kind:"drawing",rows:4,imageDataUrl:"invalid prior drawing is ignored in blank mode"},
  ]}));
  assert.ok(!result.text.includes("SECRET_LEARNER_TEXT") && !result.text.includes("PRIVATE_IMAGE_CAPTION"));
  assert.ok(result.text.includes("빈 양식"));
  assert.ok(Math.abs(result.sizes[0][2]-419.53)<1 && Math.abs(result.sizes[0][3]-595.28)<1);
});

test("whole-book export includes a cover and every scene, with long scenes flowing to more pages",async () => {
  const result = await inspect(await exportBookPdf({title:"우리가 쓴 책",pages:[
    {text:"FIRST_SCENE 바닷가에서 편지를 발견했어요."},
    {text:"MIDDLE_SCENE "+"우리는 편지의 주인을 찾아 천천히 마을을 걸었습니다. ".repeat(55)},
    {text:"LAST_SCENE 마지막에는 모두 함께 답장을 썼어요."},
  ]}));
  assert.ok(result.pages.length >= 5);
  for (const marker of ["FIRST_SCENE","MIDDLE_SCENE","LAST_SCENE"]) assert.ok(result.text.includes(marker));
  assert.ok(result.text.includes("마지막에는 모두 함께 답장을 썼어요."));
});
