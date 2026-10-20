import type { Metadata } from "next";

import { AppShell } from "@/components/shell/AppShell";
import { brand } from "@/lib/brand";

import "./globals.css";

export const metadata: Metadata = {
  title: brand.productName,
  description: brand.descriptor,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
