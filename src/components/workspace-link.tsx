"use client";

import NextLink from "next/link";
import {usePathname, useRouter} from "next/navigation";
import type {ComponentProps} from "react";
import {workspaceHref, workspaceMode} from "@/lib/workspace-routing";

export default function WorkspaceLink({href, ...props}: ComponentProps<typeof NextLink>) {
  const mode = workspaceMode(usePathname());
  const target = typeof href === "string" ? workspaceHref(href, mode)
    : {...href, pathname: href.pathname ? workspaceHref(href.pathname, mode) : href.pathname};
  return <NextLink {...props} href={target}/>;
}

export function useWorkspaceRouter() {
  const router = useRouter();
  const mode = workspaceMode(usePathname());
  return {...router,
    push: (href: string, options?: Parameters<typeof router.push>[1]) => router.push(workspaceHref(href, mode), options),
    replace: (href: string, options?: Parameters<typeof router.replace>[1]) => router.replace(workspaceHref(href, mode), options),
  };
}
