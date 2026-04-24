import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink, organization } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { db } from "./db";
import * as schema from "./db/schema";
import { sendMagicLink, sendInvitation } from "./mail";

const appUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      organization: schema.organization,
      member: schema.member,
      invitation: schema.invitation,
    },
  }),
  baseURL: appUrl,
  secret: process.env.BETTER_AUTH_SECRET,
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLink(email, url);
      },
    }),
    organization({
      allowUserToCreateOrganization: true,
      async sendInvitationEmail(data) {
        const url = `${appUrl}/accept-invite?id=${data.id}&email=${encodeURIComponent(data.email)}`;
        await sendInvitation(
          data.email,
          url,
          data.organization.name,
          data.inviter.user.name || data.inviter.user.email
        );
      },
    }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
