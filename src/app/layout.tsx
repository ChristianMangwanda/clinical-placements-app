import type { Metadata } from "next";
import { Playfair_Display, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Clinical Placements Database | Clarkson University",
  description:
    "Centralized clinical placements database for PT, OT, and PA programs with interactive map, AI-powered search, and demographic analysis.",
  keywords: [
    "clinical placements",
    "physical therapy",
    "occupational therapy",
    "physician assistant",
    "Clarkson University",
    "clinical education",
    "healthcare facilities",
    "HRSA sites",
  ],
  authors: [{ name: "Clarkson University" }],
  icons: {
    icon: "/Clarkson-logo-full.png",
    apple: "/Clarkson-logo-full.png",
  },
  openGraph: {
    title: "Clinical Placements Database | Clarkson University",
    description:
      "Interactive map with 90K+ healthcare facilities, AI-powered queries, and demographic analysis for clinical education coordinators.",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${playfair.variable} ${sourceSans.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
