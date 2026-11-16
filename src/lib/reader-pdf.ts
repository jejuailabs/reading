import type {Artwork,Book} from "./model.ts";
import type {BookPdfInput} from "./pdf-export.ts";

/** Preserve every scene and only include illustrations that this edition actually displays. */
export async function readerPdfPages(book:Book,locale:"ko"|"en",loadBuiltin:(art:Artwork)=>Promise<string>,loadUploaded:(dataUrl:string)=>Promise<string>=uploadedPdfImage):Promise<BookPdfInput["pages"]> {
  const snapshot=structuredClone(book);
  const builtin=!snapshot.source&&!snapshot.collection;
  const images=new Map<string,Promise<string>>();
  const pages:BookPdfInput["pages"]=[];
  // Decode one distinct image at a time, rather than keeping 24 full-size canvases alive.
  for(const page of snapshot.pages){
    const text=locale==="ko"?page.text||page.en:page.en||page.text;
    let imageDataUrl=page.imageDataUrl;
    if(imageDataUrl){const key=imageDataUrl;if(!images.has(key))images.set(key,loadUploaded(key));imageDataUrl=await images.get(key);}
    else if(builtin){const key=`builtin:${page.art}`;if(!images.has(key))images.set(key,loadBuiltin(page.art));imageDataUrl=await images.get(key);}
    pages.push({text,...(imageDataUrl?{imageDataUrl}:{}),...(!text.trim()&&!imageDataUrl?{blank:true}:{})});
  }
  return pages;
}

export function pdfImageDimensions(width:number,height:number):{width:number;height:number} {
  if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width*height>40_000_000)throw new Error("Invalid or oversized image dimensions.");
  const scale=Math.min(1,1600/Math.max(width,height));
  return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};
}

/** Produce a PDF-only copy with a white paper background. Never replace the stored source. */
function rasterPdfImage(source:string):Promise<string> {
  return new Promise((resolve,reject)=>{
    const image=new window.Image();
    image.onload=()=>{const canvas=document.createElement("canvas");try{
      const dimensions=pdfImageDimensions(image.naturalWidth,image.naturalHeight);
      canvas.width=dimensions.width;canvas.height=dimensions.height;
      const context=canvas.getContext("2d");if(!context)throw new Error("Canvas unavailable");
      context.fillStyle="#fff";context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
      const result=canvas.toDataURL("image/jpeg",.88);
      if(!result.startsWith("data:image/jpeg;base64,"))throw new Error("Image encoding failed");
      resolve(result);
    }catch{reject(new Error("책의 그림을 PDF로 준비하지 못했어요. 원고는 그대로예요. / Could not prepare book illustrations; your book is unchanged."));}
    finally{canvas.width=0;canvas.height=0;image.onload=null;image.onerror=null;image.src="";}};
    image.onerror=()=>reject(new Error("책의 그림을 읽지 못했어요. / Could not read the book illustration."));
    image.src=source;
  });
}

/** Uploaded PNG/JPEG/WebP remains local, with no remote source accepted. */
export function uploadedPdfImage(dataUrl:string):Promise<string> {
  if(dataUrl.length>2_800_000||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=\r\n]+$/.test(dataUrl))return Promise.reject(new Error("Invalid local image."));
  return rasterPdfImage(dataUrl);
}

/** Read only bundled, same-origin artwork. No image service or external URL. */
export function builtinPdfImage(art:Artwork):Promise<string> {
  if(!["coast","forest","night","mail"].includes(art))return Promise.reject(new Error("Invalid built-in illustration."));
  return rasterPdfImage(`/illustrations/pencil-v2/${art}.webp`);
}
