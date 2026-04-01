import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import AppShell from "./AppShell";
import ResponsiveTitle from "./ResponsiveTitle";
import GlobalWhatsAppFab from "@/components/ecosystem/GlobalWhatsAppFab";
import { ecosystemBranding } from "@/lib/ecosystem";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: ecosystemBranding.browser.defaultTitle,
  description: ecosystemBranding.browser.defaultDescription,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} antialiased`}>
        <ResponsiveTitle />
        <AppShell>{children}</AppShell>
        <GlobalWhatsAppFab />
      </body>
    </html>
  );
}
