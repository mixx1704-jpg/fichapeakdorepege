import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://fome-justica-ficha.andrew-junior.chatgpt.site"),
  title: "Ficha Tokyo Guru - Kakuja",
  description: "Ficha automática de Fome & Justiça V 2.0 com construção modular completa de Kakuja para personagens de Grau 6+.",
  openGraph: {
    title: "Ficha Tokyo Guru - Kakuja",
    description: "Ficha automática com atributos, PE, Kakuhou e sistema modular completo de Kakuja.",
    images: [{ url: "https://fome-justica-ficha.andrew-junior.chatgpt.site/og.png", width: 1200, height: 630, alt: "Fome & Justiça — Ficha de Personagem" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ficha Tokyo Guru - Kakuja",
    description: "Ficha automática com atributos, PE, Kakuhou e sistema modular completo de Kakuja.",
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
