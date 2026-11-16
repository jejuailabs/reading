import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth-provider";
import { getAuthSession } from "@/lib/server/auth-session";
import "./globals.css";
import "./pencil-theme.css";
import "./workspace-polish.css";
import "./classics.css";
import "./reading-ai.css";
import "./book-tools.css";
import "./book-workshop.css";
import "./learning-hub.css";
import "./storybook-refresh.css";
import "./storybook-type.css";
import "./auth.css";
import "./demo-tour.css";
import "./landing.css";

export const metadata: Metadata = {title: "온책읽기 — 한 권에서 시작되는 우리들의 이야기", description: "책 읽기와 듣기, 스스로 만드는 질문, 독서 기록지와 책 만들기까지. 한 권에서 이어지는 초등 독서 수업."};

export default async function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  const session=await getAuthSession();
  return <html lang="ko" data-scroll-behavior="smooth" suppressHydrationWarning><body><AuthProvider initialSession={session}>{children}</AuthProvider></body></html>;
}
