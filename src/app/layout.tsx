import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

import { QueryProvider } from "@/components/query-provider";
import { NextAuthProvider } from "@/components/providers/session-provider";

const inter = Inter({
  subsets: ["latin"],
  display: 'swap', // Prevents FOIT (Flash of Invisible Text)
  preload: true,
});

export const metadata: Metadata = {
  title: "Task Management",
  description: "Develop By Xy",
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '512x512', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' }
    ],
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
  // Performance optimizations
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Task Management',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={cn(inter.className, "antialiased min-h-screen")}
      >
        <NextAuthProvider>
          <QueryProvider>
            <Toaster position="top-center" />
            {children}
          </QueryProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}
