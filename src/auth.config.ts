import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Edge-compatible auth config (no Node.js APIs like bcryptjs).
 * Used by middleware for route protection.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/signin",
    newUser: "/photos",
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;

      const publicPaths = ["/", "/signin", "/signup"];
      const authPaths = ["/signin", "/signup"];

      const isPublicPath =
        publicPaths.includes(path) || path.startsWith("/share/");
      const isAuthPath = authPaths.includes(path);
      const isApiAuth = path.startsWith("/api/auth");
      const isApiUploadthing = path.startsWith("/api/uploadthing");
      const isApiWebhook = path.startsWith("/api/webhook");

      if (isApiAuth || isApiUploadthing || isApiWebhook) return true;
      if (isAuthPath && isLoggedIn) {
        return Response.redirect(new URL("/photos", nextUrl));
      }
      if (isPublicPath) return true;
      if (!isLoggedIn) return false; // redirects to signIn page

      return true;
    },
  },
} satisfies NextAuthConfig;
