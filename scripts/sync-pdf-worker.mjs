import {copyFile,mkdir} from "node:fs/promises";
await mkdir("public/vendor",{recursive:true});
await copyFile("node_modules/pdfjs-dist/build/pdf.worker.min.mjs","public/pdf.worker.min.mjs");
await copyFile("node_modules/pdfjs-dist/LICENSE","public/vendor/pdfjs-LICENSE.txt");
console.log("Bundled PDF.js worker and licence synchronized.");
