import {parsePrototypeState} from "./model.ts";
import {isWorkshopState,WORKSHOP_STORAGE_KEY} from "./book-workshop-model.ts";
import {validateLearningNotebook,LEARNING_NOTEBOOK_KEY} from "./learning-notebook.ts";
export const READING_STORAGE_KEY="onbook:reading:local:v2";
export const backupKeys=[READING_STORAGE_KEY,WORKSHOP_STORAGE_KEY,LEARNING_NOTEBOOK_KEY];
export type WorkspaceBackup={format:"onbook-device-backup";version:1;createdAt:string;stores:Record<string,unknown>};
/** Unopened pre-IndexedDB workspaces are still part of a full backup. Never delete legacy data. */
export async function collectWorkspaceBackup(readingState:unknown,readRecord:(key:string)=>Promise<{value:unknown}|null>,readLegacy:(key:string)=>string|null):Promise<WorkspaceBackup> {
  const stores:Record<string,unknown>={[READING_STORAGE_KEY]:readingState};
  for(const key of backupKeys.filter(key=>key!==READING_STORAGE_KEY)) {
    const saved=await readRecord(key);
    if(saved)stores[key]=saved.value;
    else {
      const legacy=readLegacy(key);
      if(legacy!==null)stores[key]=JSON.parse(legacy);
    }
  }
  const backup:WorkspaceBackup={format:"onbook-device-backup",version:1,createdAt:new Date().toISOString(),stores};
  if(!validateWorkspaceBackup(backup))throw new Error("INVALID_WORKSPACE_DATA");
  return backup;
}
export function validateWorkspaceBackup(value:unknown):value is WorkspaceBackup {
  if(!value||typeof value!=="object")return false;
  const data=value as Record<string,unknown>;
  if(data.format!=="onbook-device-backup"||data.version!==1||typeof data.createdAt!=="string"||!data.stores||typeof data.stores!=="object"||Array.isArray(data.stores))return false;
  const entries=Object.entries(data.stores);if(!entries.length||entries.length>backupKeys.length)return false;
  return entries.every(([key,item])=>key===READING_STORAGE_KEY?parsePrototypeState(JSON.stringify(item))!==null:key===WORKSHOP_STORAGE_KEY?isWorkshopState(item):key===LEARNING_NOTEBOOK_KEY?validateLearningNotebook(item):false);
}
