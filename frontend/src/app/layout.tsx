import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Wallet AI",
  description: "Personal finance dashboard with AI-assisted analysis"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

