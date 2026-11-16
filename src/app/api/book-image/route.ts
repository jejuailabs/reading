import {handleBookImagePost} from "@/lib/server/book-image-runtime";
export const runtime="nodejs";
export const dynamic="force-dynamic";
// GET is constant and never reports key/configuration availability.
export async function GET(){return Response.json({code:"IMAGE_APPROVAL_REQUIRED",error:"그림 생성은 별도 비용 승인과 로컬 검증 설정 후 사용할 수 있어요."},{status:503,headers:{"Cache-Control":"no-store"}});}
export async function POST(request:Request){return handleBookImagePost(request);}
