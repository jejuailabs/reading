// Local, synthetic verification artifacts. No API or external asset requests.
// Run: node --experimental-strip-types scripts/verify-pdf-output.mjs
import {mkdir,readFile,writeFile} from "node:fs/promises";
import path from "node:path";
import {exportBookPdf,exportReportPdf} from "../src/lib/pdf-export.ts";
import {getReportTemplate,reportFields} from "../src/lib/report-templates.ts";

const out=path.resolve("output/pdf");
await mkdir(out,{recursive:true});
const image=await readFile("artifacts/illustration-concepts/pencil-selected/coast.png");
const imageDataUrl=`data:image/png;base64,${image.toString("base64")}`;
const question=getReportTemplate("FORM-09");
const first=getReportTemplate("FORM-03");
const long="인물은 같은 편지를 읽고도 다른 생각을 했습니다. 본문에 나온 말과 행동을 연결해서 그 까닭을 생각해 봅니다. We compare evidence and keep room for another interpretation. ";
const cases=[
  ["qa-record-a4.pdf",()=>exportReportPdf({title:question.title.ko,subtitle:"FORM-09 · 샘플 판본 v1 · 한영 혼합·긴 답변 검증",fields:reportFields(question,{book:"바람이 전해 준 편지 · 새로 쓴 샘플",readingRange:"1-3장면",question:"소라는 왜 바로 답장을 쓰지 않았을까요?",initialThought:"편지의 주인을 더 알고 싶었을 것 같습니다.",evidence:long.repeat(16)+" 끝까지 남긴 마지막 근거입니다.",currentThought:"다른 사람의 마음을 짐작하려면 말과 행동을 함께 읽어야 합니다."}),paper:"A4"})],
  ["qa-blank-a4.pdf",()=>exportReportPdf({title:first.title.ko,subtitle:"FORM-03 · 빈 양식 · 학생 이름과 응답 없음",fields:reportFields(first,{question:"THIS_MUST_NOT_APPEAR"}),blank:true,paper:"A4"})],
  ["qa-book-a5.pdf",()=>exportBookPdf({title:"바닷가에서 찾은 편지",subtitle:"전권 PDF 검증용 창작 샘플 · 삽화와 본문",pages:[{text:"첫 장면. 소라는 바닷가 우체통에서 편지를 발견했어요. 작은 봉투에는 아직 만나지 못한 친구에게 보내는 말이 적혀 있었지요.",imageDataUrl},{text:"둘째 장면. 소라는 혼자 답을 정하지 않았어요. 친구들이 생각한 여러 이야기를 듣고, 편지의 단서를 다시 살펴보았어요."},{text:"마지막 장면. 우리는 편지의 주인이 어떤 마음일지 생각하며 함께 답장을 썼어요. 서로 다른 생각이 한 권의 이야기가 되었어요."}],paper:"A5"})],
  ["qa-long-a5.pdf",()=>exportReportPdf({title:"긴 글과 그림 응답",subtitle:"A5 · 긴 URL·겹받침·그림 크기 검증",fields:[{label:"그림으로 표현한 생각",value:"그림 응답 예시",kind:"drawing",imageDataUrl},{label:"긴 근거와 생각",value:long.repeat(22)+"\nhttps://example.com/"+"long-reference-".repeat(12)+"\n마지막 확인: 앉다, 읽다, 값이, 넓다. END_OF_RECORD"}],paper:"A5"})],
];
for(const [name,create] of cases){const blob=await create();await writeFile(path.join(out,name),new Uint8Array(await blob.arrayBuffer()));console.log(JSON.stringify({file:name,bytes:blob.size,type:blob.type}));}
