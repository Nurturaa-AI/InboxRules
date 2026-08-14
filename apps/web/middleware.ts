// Clerk middleware protects routes and handles auth redirects.
// This runs on every request before it hits the pages.

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define which routes are public (no auth required)
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  // Public landing page if you have one
  "/",
  // Informational pages linked from the footer
  "/docs",
  "/documentation",
  "/support",
  "/privacy",
  "/terms",
]);

export default clerkMiddleware(async (auth, request) => {
  // If the route is not public, protect it
  // This redirects unauthenticated users to /sign-in
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Run middleware on all routes except static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
