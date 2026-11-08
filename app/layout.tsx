import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./theme.css";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { SITE } from "@/lib/site";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: SITE.name, template: `%s | ${SITE.name}` },
  description: SITE.description,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} min-h-screen bg-background text-foreground antialiased`}
      >
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
