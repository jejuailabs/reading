"use client";

import {useEffect, type ReactNode} from "react";
import {usePathname, useRouter} from "next/navigation";
import {useAuth} from "./auth-provider";

/** Immediately remove account work after a logout in another browser tab. */
export function WorkspaceAccess({uid,children}: {uid:string;children:ReactNode}) {
  const {user,loading}=useAuth();
  const pathname=usePathname();
  const router=useRouter();
  const valid=user?.uid===uid;
  useEffect(()=>{
    if(!loading&&!valid)router.replace(`/login?next=${encodeURIComponent(pathname)}&reason=expired`);
  },[loading,valid,pathname,router]);
  if(loading||!valid)return <div className="loading" role="status">로그인을 확인하고 있어요…</div>;
  return children;
}
