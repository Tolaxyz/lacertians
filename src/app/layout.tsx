import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lost and Found",
  description: "CREATED BY 0x",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Favicon */}
        <link rel="icon" href="/logo.jpeg" />
        {/* Optional: multiple sizes */}
        <link rel="icon" type="image/jpeg" sizes="32x32" href="/logo.jpeg" />
        <link rel="icon" type="image/jpeg" sizes="16x16" href="/logo.jpeg" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
