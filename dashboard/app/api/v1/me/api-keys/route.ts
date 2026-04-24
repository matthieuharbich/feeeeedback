import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { json, optionsResponse } from "@/lib/server/api-auth";
import { createApiKey } from "@/lib/server/api-keys";
import { getUserOrgs } from "@/lib/server/session";

export const OPTIONS = () => optionsResponse();

export async function POST(_req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return json({ error: "unauthorized" }, 401);

  const { key } = await createApiKey(session.user.id, "feeeeedback-extension");
  const orgs = await getUserOrgs(session.user.id);

  return json({
    key,
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image ?? null,
    },
    orgs,
  });
}
