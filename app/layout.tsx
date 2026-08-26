import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../src/styles.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://conspiracy.alirezaafshan.com"),
  title: "Conspiracy — A WebMCP Mystery Board",
  description: "A living corkboard where people and agents investigate the same mystery without surrendering human judgment.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Conspiracy",
    description: "Make thought visible. Keep judgment human.",
    type: "website",
    url: "/",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "Conspiracy noir evidence board and robot detective" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Conspiracy",
    description: "Make thought visible. Keep judgment human.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
