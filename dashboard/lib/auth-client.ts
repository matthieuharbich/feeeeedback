import { createAuthClient } from "better-auth/react";
import { organizationClient, magicLinkClient } from "better-auth/client/plugins";

// No baseURL on purpose — the client uses window.location.origin, which
// means a single Docker image works for any host (localhost, staging, prod)
// without rebuilding. Server code uses the `auth` instance directly.
export const authClient = createAuthClient({
  plugins: [organizationClient(), magicLinkClient()],
});

export const { signIn, signUp, signOut, useSession, organization } = authClient;
