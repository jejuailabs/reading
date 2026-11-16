import type { Metadata } from "next";
import { ReadingProvider } from "@/components/provider";
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

export const metadata: Metadata = {title: "온책읽기 — 한 권에서 시작되는 우리들의 이야기", description: "읽고, 궁금해하고, 함께 만드는 초등 독서 공간. 로컬 프로토타입."};

export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="ko" data-scroll-behavior="smooth" suppressHydrationWarning><body><ReadingProvider>{children}</ReadingProvider></body></html>;
}
