import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/session";
import { LinkExtensionClient } from "./client";

export default async function ExtensionLinkPage() {
  const session = await getSession();
  if (!session?.user) redirect(`/login?redirect=${encodeURIComponent("/extension/link")}`);
  return <LinkExtensionClient user={session.user} />;
}
