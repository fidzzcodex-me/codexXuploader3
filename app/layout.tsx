import type { Metadata } from "next";
import { Sora, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700", "800"]
});

const body = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"]
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"]
});

export const metadata: Metadata = {
  title: "Harbor — GitHub Upload & Management",
  description:
    "Kelola repository GitHub kamu: upload file, kelola repo, dan chat dengan AI agent dalam satu tempat."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body
        className={`${display.variable} ${body.variable} ${mono.variable} font-body bg-cloud text-ink antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
