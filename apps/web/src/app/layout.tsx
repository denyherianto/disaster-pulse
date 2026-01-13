import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import clsx from 'clsx';
import Providers from './providers';

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Disaster Pulse",
  description: "Calm, verified disaster intelligence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script src="https://code.iconify.design/3/3.1.0/iconify.min.js"></script>
      </head>
      <body className={clsx(inter.variable, "bg-slate-100 min-h-screen flex items-center justify-center")}>
        <main className="w-full max-w-md bg-slate-50 h-[100dvh] sm:h-[850px] sm:rounded-[2.5rem] sm:border sm:border-slate-200 sm:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] relative overflow-hidden flex flex-col font-sans">
          <Providers>
            {children}
          </Providers>
        </main>
      </body>
    </html>
  );
}
