import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import clsx from 'clsx';
import Providers from './providers';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Disaster Pulse",
  description: "Calm, verified disaster intelligence.",
};

export const viewport = {
  themeColor: "#3b82f6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
        <link rel="apple-touch-startup-image" href="/splash_screen.png" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" />
      </head>
      {/* Removed "flex items-center justify-center" to allow full-width admin pages. 
          Mobile simulation logic is now in (mobile)/layout.tsx */}
      <body className={clsx(inter.variable, "bg-slate-100 min-h-screen")}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
