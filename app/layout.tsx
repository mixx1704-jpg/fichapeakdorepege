import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://fome-justica-ficha.andrew-junior.chatgpt.site"),
  title: "Fome & Justiça — Ficha de Personagem",
  description: "Crie, calcule e salve localmente fichas completas de Fome & Justiça V 2.0.",
  openGraph: {
    title: "Fome & Justiça — Ficha de Personagem",
    description: "Ficha automática com atributos, testes Rollem, PE, vantagens e Kakuhou.",
    images: [{ url: "https://fome-justica-ficha.andrew-junior.chatgpt.site/og.png", width: 1200, height: 630, alt: "Fome & Justiça — Ficha de Personagem" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fome & Justiça — Ficha de Personagem",
    description: "Ficha automática com atributos, testes Rollem, PE, vantagens e Kakuhou.",
    images: ["https://fome-justica-ficha.andrew-junior.chatgpt.site/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
