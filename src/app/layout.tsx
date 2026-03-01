import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PathWise | AI-Powered Learning",
  description:
    "PathWise is an AI-powered personalized learning tutor that teaches real-world, industry-relevant skills.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} antialiased bg-[#0d1117] text-slate-100`}
      >
        {children}
      </body>
    </html>
  );
}
