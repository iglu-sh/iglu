import "@/styles/globals.css";

import { type Metadata } from "next";
import localfont from "next/font/local";
import { headers } from "next/headers";

import { TRPCReactProvider } from "@/trpc/react";
import {ThemeProvider} from "@/components/theme-provider";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export const metadata: Metadata = {
  title: "Iglu Controller",
  description: "Iglu - A next gen nix cache!",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = localfont({
  src: "../../public/Geist.ttf",
  variable: "--font-geist-sans"
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`} suppressHydrationWarning>
      <body className="min-h-screen">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TRPCReactProvider>
            {children}
          </TRPCReactProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
