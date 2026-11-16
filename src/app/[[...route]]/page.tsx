import { ReadingApp } from "@/components/reading-app";
import { requireLocalPrototype } from "@/lib/firebase-config";

export default async function Page({params, searchParams}: {params: Promise<{route?: string[]}>; searchParams: Promise<Record<string, string | string[] | undefined>>}) {
  requireLocalPrototype();
  const [resolved, query] = await Promise.all([params, searchParams]);
  return <ReadingApp route={resolved.route ?? []} query={Object.fromEntries(Object.entries(query).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value ?? ""]))}/>;
}
