import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "TTS Studio — Coqui XTTS v2",
  description: "Génération audio par clonage vocal depuis un fichier JSON",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${mono.variable} antialiased`}>{children}</body>
    </html>
  );
}
