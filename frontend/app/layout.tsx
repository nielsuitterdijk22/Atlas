import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Atlas",
  description: "Atlas — self-service developer portal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
