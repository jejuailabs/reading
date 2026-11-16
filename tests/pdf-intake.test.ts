import test from "node:test";
import assert from "node:assert/strict";
import {extractPdfDocument} from "../src/lib/pdf-intake.ts";
import {textPages} from "../src/lib/book-intake.ts";
import {exportBookPdf} from "../src/lib/pdf-export.ts";

function localPdf() {
  // Three real PDF pages: empty, selectable text, empty. No filesystem, fonts or network fetch.
  const stream="BT /F1 14 Tf 40 700 Td (Middle page text) Tj ET";
  const objects=["<< /Type /Catalog /Pages 2 0 R >>","<< /Type /Pages /Kids [3 0 R 4 0 R 5 0 R] /Count 3 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 7 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >>",`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
  let pdf="%PDF-1.4\n";const offsets=[0];
  objects.forEach((object,i)=>{offsets.push(pdf.length);pdf+=`${i+1} 0 obj\n${object}\nendobj\n`;});
  const start=pdf.length;pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset=>{pdf+=`${String(offset).padStart(10,"0")} 00000 n \n`;});
  pdf+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

test("actual PDF.js extraction preserves empty edge pages through import and a four-page PDF export",async()=>{
  const {getDocument}=await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task=getDocument({data:localPdf(),useSystemFonts:false,useWorkerFetch:false,disableFontFace:true});
  const progress:number[]=[];
  let result;
  try{result=await extractPdfDocument(await task.promise,(page)=>progress.push(page));}finally{await task.destroy();}
  assert.equal(result.total,3);assert.deepEqual(result.blankPages,[1,3]);assert.deepEqual(progress,[1,2,3]);
  const pages=textPages(result.text);assert.deepEqual(pages.map(p=>p.text),["","Middle page text",""]);
  const blob=await exportBookPdf({title:"Imported PDF",locale:"en",pages:pages.map(p=>({text:p.text,blank:!p.text.trim()}))});
  const exported=getDocument({data:new Uint8Array(await blob.arrayBuffer()),useSystemFonts:false,useWorkerFetch:false});
  try{
    const doc=await exported.promise;assert.equal(doc.numPages,4);
    const blank=await (await doc.getPage(2)).getTextContent();
    assert.ok(blank.items.map(item=>"str" in item?item.str:"").join(" ").includes("App note"));
    const middle=await (await doc.getPage(3)).getTextContent();assert.ok(middle.items.map(item=>"str" in item?item.str:"").join(" ").includes("Middle page text"));
  }finally{await exported.destroy();}
});
test("all-scanned and oversized documents fail without claiming OCR or complete text",async()=>{
  let pageReads=0;
  const doc={numPages:2,getPage:async()=>{pageReads++;return {getTextContent:async()=>({items:[]}),cleanup:()=>{}};}};
  await assert.rejects(extractPdfDocument(doc,()=>{}),/OCR/);assert.equal(pageReads,2);
  pageReads=0;await assert.rejects(extractPdfDocument({...doc,numPages:101},()=>{}),/100/);assert.equal(pageReads,0);
});
