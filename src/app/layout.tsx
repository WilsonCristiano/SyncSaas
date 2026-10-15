import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk } from "next/font/google";
import Shell from "@/components/Shell";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display" });
const body = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = { title: "ReelSync", description: "Central de controle de sincronização de Reels" };
export const viewport: Viewport = { themeColor: "#09070f", viewportFit: "cover", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable}`}>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
