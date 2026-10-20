import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ILMOFAHM",
  description:
    "Centralized school and academy management, designed for complete institutional visibility.",
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
