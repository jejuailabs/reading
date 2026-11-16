/** Device-only IndexedDB. No Firebase, network, or paid storage. */
type StoredRecord = {key:string; revision:number; value:unknown};
let connection: Promise<IDBDatabase> | undefined;
function database() {
  if(!connection) connection=new Promise<IDBDatabase>((resolve,reject)=>{
    const request=indexedDB.open("onbook-device-workspace",1);
    request.onupgradeneeded=()=>request.result.createObjectStore("records",{keyPath:"key"});
    request.onsuccess=()=>{request.result.onversionchange=()=>{request.result.close();connection=undefined;};resolve(request.result);};
    request.onerror=()=>{connection=undefined;reject(request.error);};
    request.onblocked=()=>{connection=undefined;reject(new Error("STORAGE_BLOCKED"));};
  });
  return connection;
}
export async function readDeviceRecord(key:string):Promise<StoredRecord|null> {
  const db=await database();
  return new Promise((resolve,reject)=>{const request=db.transaction("records","readonly").objectStore("records").get(key);request.onsuccess=()=>resolve(request.result??null);request.onerror=()=>reject(request.error);});
}
export async function writeDeviceRecord(key:string,value:unknown,expectedRevision:number):Promise<number> {
  const db=await database();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction("records","readwrite");const store=tx.objectStore("records");const get=store.get(key);let failure:Error|null=null;
    get.onsuccess=()=>{
      if((get.result?.revision??0)!==expectedRevision){failure=new Error("STORAGE_CONFLICT");tx.abort();return;}
      store.put({key,value,revision:expectedRevision+1});
    };
    tx.oncomplete=()=>{window.dispatchEvent(new CustomEvent("onbook-saved",{detail:{key,revision:expectedRevision+1}}));resolve(expectedRevision+1);};
    tx.onabort=()=>reject(failure??tx.error??new Error("STORAGE_FAILED"));tx.onerror=()=>reject(tx.error);
  });
}
/** All restored stores succeed or fail together. Caller validates and obtains confirmation first. */
export async function restoreDeviceRecords(values:Record<string,unknown>):Promise<void> {
  const db=await database();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction("records","readwrite");const store=tx.objectStore("records");
    for(const [key,value] of Object.entries(values)){const get=store.get(key);get.onsuccess=()=>store.put({key,value,revision:(get.result?.revision??0)+1});}
    tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error);tx.onerror=()=>reject(tx.error);
  });
}
