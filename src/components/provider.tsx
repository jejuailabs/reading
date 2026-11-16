"use client";

import { createContext, useContext, useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { makeInitialState, parsePrototypeState, type PrototypeState } from "@/lib/model";
import {downloadJson,useStoredState} from "@/lib/workspace-store";
import {StorageScopeProvider} from "./storage-scope";
import type {Role} from "@/lib/model";

type ReadingContext = {state: PrototypeState; setState: Dispatch<SetStateAction<PrototypeState>>; ready: boolean; storageOk: boolean; storageError:string; retryStorage:()=>void; emergencyBackup:()=>void; t: (ko: string, en: string) => string; toast: (message: string) => void};
const Context = createContext<ReadingContext | null>(null);

export function ReadingProvider({children,scope="demo",role}: {children: ReactNode; scope?:string; role?:Role}) {
  return <StorageScopeProvider scope={scope}><ReadingStateProvider key={scope} scope={scope} role={role}>{children}</ReadingStateProvider></StorageScopeProvider>;
}

function ReadingStateProvider({children,scope,role}: {children: ReactNode; scope:string; role?:Role}) {
  function initial() {
    const state=makeInitialState();
    if(scope!=="demo") {
      state.role=role??"student";
      state.project={...state.project,id:"my-first-story",title:"나의 새로운 이야기",pages:[{text:"",en:"",art:"coast"}],sourceQuestionId:null};
      state.cast={narrator:"",child:"",wind:""};
    }
    return state;
  }
  const {state:storedState,setState,ready,storageOk,error:storageError,retry:retryStorage}=useStoredState<PrototypeState>("onbook:reading:local:v2",initial,value=>parsePrototypeState(JSON.stringify(value))!==null,{normalize:value=>parsePrototypeState(JSON.stringify(value))!,legacy:()=>{
    const raw=sessionStorage.getItem("onbook:prototype:session:v1");
    if(!raw)return null;const value=parsePrototypeState(raw);if(!value)throw new Error("INVALID_LEGACY_DATA");return value;
  }});
  // Stored/demo roles can never grant permissions to a signed-in account.
  const state=scope!=="demo"?{...storedState,role:role??"student"}:storedState;
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.theme = state.theme;
    document.documentElement.lang = state.locale;
  }, [state, ready]);
  useEffect(() => { if (!message) return; const timer = setTimeout(() => setMessage(""), 4200); return () => clearTimeout(timer); }, [message]);
  const t = (ko: string, en: string) => state.locale === "ko" ? ko : en;
  const emergencyBackup=()=>downloadJson({format:"onbook-device-backup",version:1,createdAt:new Date().toISOString(),stores:{"onbook:reading:local:v2":state}},"onbook-reading-emergency-backup.json");
  return <Context.Provider value={{state, setState, ready, storageOk,storageError,retryStorage,emergencyBackup, t, toast: setMessage}}>{children}{!storageOk?<aside className="storage-rescue" role="alert"><strong>{t("현재 작업을 먼저 보관해 주세요","Save a backup of your work")}</strong><p>{storageError}</p><p>{t("아래 파일은 가져온 책·질문·책갈피·완성본을 포함합니다. 공방 초안과 기록지는 각 화면에서 별도로 백업하세요.","This backup contains imported books, questions, bookmarks and editions. Back up workshop drafts and worksheets from their own screens.")}</p><div className="row"><button className="button primary" onClick={emergencyBackup}>{t("읽기 작업 비상 백업","Emergency reading backup")}</button><button className="button secondary" onClick={retryStorage}>{t("저장 다시 시도","Retry saving")}</button></div></aside>:null}{message ? <div className="toast" role="status">{message}</div> : null}</Context.Provider>;
}

export function useReading() {
  const context = useContext(Context);
  if (!context) throw new Error("ReadingProvider is required");
  return context;
}
