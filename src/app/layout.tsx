import type { Metadata } from "next";
import Link from "next/link";
import {
  Cormorant_Garamond,
  Source_Sans_3,
  Space_Mono,
} from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";

const bodyFont = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
});

const displayFont = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const techFont = Space_Mono({
  variable: "--font-tech",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Poon's ML Notes",
  description:
    "A personal repository of ML paper notes, code snippets, and ML coding problems.",
  icons: {
    icon: "/6611847.png",
    apple: "/6611847.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${bodyFont.variable} ${displayFont.variable} ${techFont.variable} antialiased`}
      >
        <div className="site">
          <header className="site-header">
            <div className="site-title">
              <Link href="/">Poon's ML Repo</Link>
            </div>
            <nav className="site-nav">
              <Link href="/papers">Papers</Link>
              <Link href="/problems">Problems</Link>
            </nav>
          </header>
          <main className="site-main">{children}</main>
          <footer className="site-footer">
            <span>Curated notes and code.</span>
          </footer>
        </div>
      </body>
    </html>
  );
}
