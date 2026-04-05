import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  // This is the safest matcher for Next 15/16. 
  // It ensures static files and Next.js internals (like Server Actions) are ignored by Clerk's strict checks.
  matcher: [
    "/((?!_next/image|_next/static|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    "/",
    "/(api|trpc)(.*)"
  ],
};