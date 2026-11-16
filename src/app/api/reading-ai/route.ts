export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET never reveals key/configuration state. POST permits only the approved loopback development pilot.
function approvalRequired() {
  return Response.json(
    { code: "AI_APPROVAL_REQUIRED", error: "AI 기능은 비용 승인과 서버 인증 연결 후 사용할 수 있어요." },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET() { return approvalRequired(); }
export async function POST(request: Request) { return handleReadingAiPost(request); }
import { handleReadingAiPost } from "@/lib/server/reading-ai-runtime";
