import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/session";
import { AcceptInviteClient } from "./client";

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; email?: string }>;
}) {
  const sp = await searchParams;
  const id = sp.id;
  const email = sp.email;
  if (!id) redirect("/");

  const session = await getSession();
  if (!session?.user) {
    const qs = new URLSearchParams();
    qs.set("redirect", `/accept-invite?id=${id}${email ? `&email=${encodeURIComponent(email)}` : ""}`);
    if (email) qs.set("email", email);
    redirect(`/login?${qs.toString()}`);
  }

  return <AcceptInviteClient invitationId={id} />;
}
