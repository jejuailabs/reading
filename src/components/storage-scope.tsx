"use client";

import {createContext, useContext, type ReactNode} from "react";

const StorageScope = createContext("demo");
export function StorageScopeProvider({scope, children}: {scope: string; children: ReactNode}) {
  return <StorageScope.Provider value={scope}>{children}</StorageScope.Provider>;
}
export function useStorageScope() { return useContext(StorageScope); }
