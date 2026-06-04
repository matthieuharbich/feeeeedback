import { NextRequest } from "next/server";
import { readScreenshot } from "@/lib/server/uploads";

// Public, unauthenticated read endpoint for attachment images.
// Security model: capability URL — filenames are 21-char nanoids, unguessable.
// Used by the inbox JSON export so the LLM (or any tool) can fetch screenshots
// by URL without juggling an API key.

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const data = await readScreenshot(id);
  if (!data) return new Response("not found", { status: 404 });

  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
