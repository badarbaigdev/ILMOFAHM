import type { Metadata } from "next";

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
      <body className="antialiased">{children}</body>
    </html>
  );
}
