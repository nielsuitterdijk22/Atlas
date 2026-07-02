import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Yaly",
  description: "Yaly — self-service developer portal",
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
