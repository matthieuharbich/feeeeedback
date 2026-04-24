import { NextRequest } from "next/server";
import { authenticateApi, json, optionsResponse } from "@/lib/server/api-auth";
import { getUserOrgs } from "@/lib/server/session";

export const OPTIONS = () => optionsResponse();

export async function GET(req: NextRequest) {
  const ctx = await authenticateApi(req);
  if (ctx instanceof Response) return ctx;
  const orgs = await getUserOrgs(ctx.user.id);
  return json({ user: ctx.user, orgs });
}
