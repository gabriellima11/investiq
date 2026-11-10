import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// next/font baixa as fontes no build e serve do nosso domínio (sem chamada
// ao Google no navegador). Cada uma vira uma variável CSS usada pelo Tailwind.
const inter = Inter({ variable: "--font-sans", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["500"] });

export const metadata: Metadata = {
  title: "InvestIQ",
  description: "Gerenciamento de carteira de investimentos",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Tema preto como principal: a classe "dark" ativa os tokens de .dark.
    <html lang="pt-BR" className={`dark ${inter.variable} ${mono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col text-sm">
        {children}
        <Toaster richColors theme="dark" />
      </body>
    </html>
  );
}
