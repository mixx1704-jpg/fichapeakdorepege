import type { Metadata } from "next";
import "./globals.css";
import "./tokyo.css";
import "./minimal.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://mixx1704-jpg.github.io/fichapeakdorepege"),
  title: "Fome & Justiça — Ficha de personagem",
  description: "Ficha de Tokyo Ghoul com LEVEL 1 a 20, sistema d20, perks e Kakuja autoral.",
  openGraph: {
    title: "Fome & Justiça — Ficha de personagem",
    description: "Ficha automática com atributos, PE, Kakuhou e sistema modular completo de Kakuja.",
    images: [{ url: "https://mixx1704-jpg.github.io/fichapeakdorepege/og.png", width: 1200, height: 630, alt: "Fome & Justiça — Ficha de Personagem" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fome & Justiça — Ficha de personagem",
    description: "Ficha automática com atributos, PE, Kakuhou e sistema modular completo de Kakuja.",
    images: ["https://mixx1704-jpg.github.io/fichapeakdorepege/og.png"],
  },
  icons: {
    icon: "https://mixx1704-jpg.github.io/fichapeakdorepege/favicon.svg",
    shortcut: "https://mixx1704-jpg.github.io/fichapeakdorepege/favicon.svg",
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

