"use client";

import {useCallback, useEffect, useRef, useState} from "react";
import {readDeviceRecord,writeDeviceRecord} from "./device-storage";

const pendingStores = new Set<() => Promise<void>>();
/** Wait for queued writes before taking a cross-workspace backup or restoring. */
export async function flushWorkspaceStores() {
  await Promise.all([...pendingStores].map(flush => flush()));
}

export function downloadJson(value: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], {type:"application/json;charset=utf-8"}));
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Browser-local drafts only. A stale tab never silently overwrites a newer saved value. */
export function useStoredState<T>(key: string, initial: () => T, validate: (value: unknown) => boolean, options?: {normalize?:(value:unknown)=>T; legacy?:()=>T|null}) {
  const [state, setState] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  const [storageOk, setStorageOk] = useState(true);
  const [error, setError] = useState("");
  const expected = useRef(0);
  const blocked = useRef(false);
  const failed = useRef(false);
  const initialRef = useRef(initial); const validateRef = useRef(validate);
  const optionsRef=useRef(options); const sequence=useRef(Promise.resolve()); const currentRef=useRef(state);currentRef.current=state;
  useEffect(() => {
    let active=true;
    void (async()=>{
      try {
        const saved=await readDeviceRecord(key); if(!active)return;
        expected.current=saved?.revision??0;
        const legacy=localStorage.getItem(key);
        const value:unknown=saved?saved.value:legacy?JSON.parse(legacy):optionsRef.current?.legacy?.()??null;
        if(value!==null) {
          if(!validateRef.current(value))throw new Error("INVALID_SAVED_DATA");
          setState(optionsRef.current?.normalize?optionsRef.current.normalize(value):value as T);
        } else setState(initialRef.current());
      }catch {if(active){blocked.current=true;failed.current=true;setStorageOk(false);setError("저장된 자료를 읽지 못했습니다. 원본은 유지했습니다. / Could not read saved data; the original is preserved.");}}
      finally{if(active)setReady(true);}
    })();
    return ()=>{active=false;};
  }, [key]);
  useEffect(() => {
    const flush = async () => { await sequence.current; if(failed.current)throw new Error("UNSAVED_WORK"); };
    pendingStores.add(flush);
    return () => {void sequence.current.finally(() => pendingStores.delete(flush));};
  }, [key]);
  const persist = useCallback(() => {
    if (!ready || blocked.current) return;
    const value=structuredClone(currentRef.current);
    sequence.current=sequence.current.then(async()=>{
      if(blocked.current)return;
      try {expected.current=await writeDeviceRecord(key,value,expected.current);failed.current=false;setStorageOk(true);setError("");}
      catch(cause) {failed.current=true;const conflict=cause instanceof Error&&cause.message==="STORAGE_CONFLICT";if(conflict)blocked.current=true;setStorageOk(false);setError(conflict?"다른 화면에서 자료가 바뀌었습니다. 현재 작업을 백업한 뒤 새로고침하세요. / Another tab changed this work. Back up and reload.":"기기에 저장하지 못했습니다. 화면의 작업을 백업해 주세요. / Could not save locally. Back up your current work.");}
    });
  }, [key, ready]);
  useEffect(() => {if(ready)persist();}, [persist, ready, state]);
  const backup = () => downloadJson(state, `${key.replace(/[^a-z0-9-]/gi,"-")}-backup.json`);
  return {state, setState, ready, storageOk, error, backup, retry: persist};
}
