import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { readScreenshot } from "@/lib/server/uploads";
import { verifyApiKey } from "@/lib/server/api-keys";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const headerList = await headers();

  // session cookie OR api key
  const session = await auth.api.getSession({ headers: headerList });
  if (!session?.user) {
    const apiKey = headerList.get("x-api-key");
    if (!apiKey) return new Response("unauthorized", { status: 401 });
    const verified = await verifyApiKey(apiKey);
    if (!verified) return new Response("unauthorized", { status: 401 });
  }

  const data = await readScreenshot(id);
  if (!data) return new Response("not found", { status: 404 });

  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
