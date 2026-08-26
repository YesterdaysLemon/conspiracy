import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../src/styles.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://conspiracy.alirezaafshan.com"),
  title: "Loose Thread — A WebMCP Mystery Board",
  description: "A living corkboard where people and agents investigate the same mystery without surrendering human judgment.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Loose Thread",
    description: "Make thought visible. Keep judgment human.",
    type: "website",
    url: "/",
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
