import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Archivo, Martian_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-bricolage",
});

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-archivo",
});

const martian = Martian_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-martian",
});

const DESCRIPTION =
  "A leaked deploy key cannot drain this vault instantly. And any attacker who takes the instant bait locks it permanently, in their own transaction. On Monad.";

export const metadata: Metadata = {
  title: {
    default: "Nchedo — a vault whose key you can keep in .env on purpose",
    template: "%s · Nchedo",
  },
  description: DESCRIPTION,
  applicationName: "Nchedo",
  keywords: ["Monad", "vault", "canary key", "honeypot", "key leak", "smart contract", "deploy key", "web3 security"],
  openGraph: {
    title: "Nchedo — a vault whose key you can keep in .env on purpose",
    description: DESCRIPTION,
    siteName: "Nchedo",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "Nchedo — a vault whose key you can keep in .env on purpose",
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#16261e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${archivo.variable} ${martian.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
