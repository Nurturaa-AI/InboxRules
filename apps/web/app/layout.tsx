// Root layout — wraps every page.
// Sets up the font, theme provider, and base HTML structure.

import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

// Load Plus Jakarta Sans for body text
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  // Load the weights we actually use
  weight: ["400", "500", "600", "700", "800"],
});

// Load JetBrains Mono for scores, domains, and code
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "InboxRules — Email Compliance Dashboard",
  description:
    "Monitor SPF, DKIM, DMARC and deliverability for your sending domains.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // ClerkProvider must wrap everything
    // It provides auth context to all components
    <ClerkProvider>
      <html
        lang="en"
        // suppressHydrationWarning prevents a React warning
        // that fires because next-themes sets the class before hydration
        suppressHydrationWarning
      >
        <body
          className={`${plusJakarta.variable} ${jetbrainsMono.variable} font-sans antialiased`}
        >
          {/* ThemeProvider from next-themes handles light/dark mode */}
          {/* attribute="class" means it adds the "dark" class to <html> */}
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
          >
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
