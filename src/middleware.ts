import { auth } from "@/auth";
import { NextResponse } from "next/server";

const publicPaths = ["/", "/signin", "/signup", "/share"];
const authPaths = ["/signin", "/signup"];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const path = nextUrl.pathname;

  const isPublicPath = publicPaths.some(
    (p) => path === p || path.startsWith("/share/")
  );
  const isAuthPath = authPaths.some((p) => path === p);
  const isApiAuth = path.startsWith("/api/auth");
  const isApiUploadthing = path.startsWith("/api/uploadthing");
  const isApiWebhook = path.startsWith("/api/webhook");

  // Always allow auth API, uploadthing, and webhook routes
  if (isApiAuth || isApiUploadthing || isApiWebhook) return NextResponse.next();

  // Redirect logged-in users away from auth pages
  if (isAuthPath && isLoggedIn) {
    return NextResponse.redirect(new URL("/photos", nextUrl));
  }

  // Allow public paths
  if (isPublicPath) return NextResponse.next();

  // Protect everything else
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/signin", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
