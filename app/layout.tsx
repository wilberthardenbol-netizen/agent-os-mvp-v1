/**
 * Root layout — wraps every page.
 * The Sidebar is rendered here so it appears on all authenticated pages.
 * The login page has its own layout (no sidebar).
 */

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent OS",
  description: "AI Agent Operating System — local MVP",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
