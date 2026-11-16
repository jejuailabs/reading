import { ReadingApp } from "@/components/reading-app";
import { ReadingProvider } from "@/components/provider";
import { LandingPage } from "@/components/landing-page";
import { LoginPage } from "@/components/login-page";
import { WorkspaceAccess } from "@/components/workspace-access";
import { getAuthSession } from "@/lib/server/auth-session";
import { canAccessReadingRoute,safeAuthNext } from "@/lib/auth-policy";
import { redirect,notFound } from "next/navigation";

const workspaceViews=new Set(["library","reader","learn","inquiry","theater","studio","studio-legacy","my-work","teach","admin","guide"]);

export default async function Page({params, searchParams}: {params: Promise<{route?: string[]}>; searchParams: Promise<Record<string, string | string[] | undefined>>}) {
  const [resolved, query] = await Promise.all([params, searchParams]);
  const route=resolved.route??[];
  const values=Object.fromEntries(Object.entries(query).map(([key,value])=>[key,Array.isArray(value)?value[0]:value??""]));
  if(!route.length)return <ReadingProvider><LandingPage/></ReadingProvider>;
  if(route[0]==="login"&&route.length===1){
    const next=safeAuthNext(values.next);
    if(await getAuthSession())redirect(next);
    return <ReadingProvider><LoginPage next={next} reason={values.reason}/></ReadingProvider>;
  }
  if(route[0]==="demo"){
    if(route[1]&&!workspaceViews.has(route[1]))notFound();
    return <ReadingProvider scope="demo"><ReadingApp route={route.slice(1)} query={values}/></ReadingProvider>;
  }
  if(route[0]==="app"){
    if(route[1]&&!workspaceViews.has(route[1]))notFound();
    const session=await getAuthSession();
    const suffix=new URLSearchParams(values).toString();
    const next=`/app${route.length>1?`/${route.slice(1).map(encodeURIComponent).join("/")}`:""}${suffix?`?${suffix}`:""}`;
    if(!session)redirect(`/login?next=${encodeURIComponent(next)}`);
    if(!canAccessReadingRoute(session.user.role,route[1]??"home"))redirect("/app?notice=role-required");
    const role=session.user.role==="member"?"student":session.user.role;
    return <WorkspaceAccess uid={session.user.uid}><ReadingProvider scope={`user:${session.user.uid}`} role={role}><ReadingApp route={route.slice(1)} query={values}/></ReadingProvider></WorkspaceAccess>;
  }
  // Existing shared demo links stay usable after introducing the landing page.
  if(workspaceViews.has(route[0])){
    const suffix=new URLSearchParams(values).toString();
    redirect(`/demo/${route.map(encodeURIComponent).join("/")}${suffix?`?${suffix}`:""}`);
  }
  notFound();
}
