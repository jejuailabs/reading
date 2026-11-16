"use client";

import Link from "next/link";
import {BookArtwork} from "./artwork";
import {LoginButton} from "./login-button";
import {useReading} from "./provider";

export function LoginPage({next,reason}: {next:string;reason?:string}) {
  const {t}=useReading();
  return <main className="login-page">
    <Link className="login-brand" href="/">온책읽기 <span>READ. WONDER. CREATE.</span></Link>
    <section className="login-card">
      <div className="login-art" aria-hidden="true"><BookArtwork variant="mail"/></div>
      <p className="eyebrow">YOUR NEXT CHAPTER</p>
      <h1>{t("우리의 이야기를\n계속해 볼까요?","Ready for your\nnext chapter?")}</h1>
      <p>{t("Google 계정으로 로그인하고,\n읽던 책과 나의 질문을 이어가요.","Sign in with Google and continue\nyour reading, questions and stories.")}</p>
      {reason==="expired"?<p role="status" className="login-notice">{t("로그인 시간이 지났어요. 다시 로그인하면 이어갈 수 있어요.","Your session expired. Sign in again to continue.")}</p>:null}
      <LoginButton next={next} className="button primary login-primary">{t("Google로 로그인","Sign in with Google")}</LoginButton>
      <div className="login-divider"><span>{t("먼저 둘러보고 싶다면","Want to explore first?")}</span></div>
      <Link className="button secondary" href="/demo">{t("로그인 없이 체험하기","Try the demo without signing in")}</Link>
      <p className="login-privacy">{t("로그인에는 Google의 이름과 이메일을 사용해요. 책과 작업은 현재 기기에 계정별로 저장되며, 다른 기기로 옮길 때는 백업 파일을 사용해요.","Sign-in uses your Google name and email. Your books and work are saved separately for your account on this device. Use a backup to move them to another device.")}</p>
      <Link className="text-button" href="/">{t("서비스 소개로 돌아가기","Back to the introduction")}</Link>
    </section>
  </main>;
}
