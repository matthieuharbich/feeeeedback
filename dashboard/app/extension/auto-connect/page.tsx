import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/session";
import { AutoConnectClient } from "./client";

export default async function ExtensionAutoConnectPage() {
  const session = await getSession();
  if (!session?.user) redirect(`/login?redirect=${encodeURIComponent("/extension/auto-connect")}`);
  return <AutoConnectClient user={session.user} />;
}
