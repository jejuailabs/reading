/** Text extraction stays on the device. No OCR or remote upload. */
export async function extractPdfText(file: File, progress: (current:number,total:number)=>void): Promise<{text:string;blankPages:number[];total:number}> {
  if (file.size > 20 * 1024 * 1024) throw new Error("PDF는 20MB 이하로 준비해 주세요. / Maximum PDF size is 20MB.");
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const task = pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),useSystemFonts:true,disableFontFace:true});
  try {
    const doc = await task.promise;
    return await extractPdfDocument(doc,progress);
  } finally {await task.destroy();}
}

/** Testable document extraction; callers own document/worker cleanup. */
export async function extractPdfDocument(doc:{numPages:number;getPage:(index:number)=>Promise<{getTextContent:()=>Promise<{items:unknown[]}>;cleanup:()=>unknown}>},progress:(current:number,total:number)=>void):Promise<{text:string;blankPages:number[];total:number}> {
    if (doc.numPages > 100) throw new Error("PDF는 100쪽 이하로 나누어 주세요. / Split PDFs longer than 100 pages.");
    const pages: string[]=[]; const blankPages:number[]=[];
    let size=0;
    for(let index=1;index<=doc.numPages;index++) {
      progress(index,doc.numPages);
      const page=await doc.getPage(index); const content=await page.getTextContent();
      const text=content.items.map(item=>item && typeof item==="object" && "str" in item && typeof item.str==="string" ? item.str+("hasEOL" in item && item.hasEOL?"\n":" ") : "").join("").trim();
      if (!text) blankPages.push(index);
      size+=text.length; if(size>200_000) throw new Error("추출된 본문이 20만 자를 넘습니다. 파일을 나누어 주세요. / Extracted text exceeds 200,000 characters.");
      pages.push(text); page.cleanup();
    }
    if (blankPages.length===doc.numPages) throw new Error("읽을 수 있는 글자가 없는 스캔 PDF입니다. 사진 페이지를 올리거나 본문을 직접 입력해 주세요. OCR은 실행하지 않았습니다. / This scanned PDF has no extractable text. Add page images or type the text; no OCR was run.");
    return {text:pages.join("\f"),blankPages,total:doc.numPages};
}
