import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../src/styles.css";

const WEBMCP_ORIGIN_TRIAL_TOKEN =
  "Ah+a/JEJbks1kbcvf41GJqA9OdIVDjt/QzRUJ1RsxRu9bLx3SvJbeBasrQhOkiGuHoaiV63CMdvD/L+/NA8OLg4AAABceyJvcmlnaW4iOiJodHRwczovL2NvbnNwaXJhY3kuYWxpcmV6YWFmc2hhbi5jb206NDQzIiwiZmVhdHVyZSI6IldlYk1DUCIsImV4cGlyeSI6MTc5NDg3MzYwMH0=";

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
      <head>
        <meta httpEquiv="origin-trial" content={WEBMCP_ORIGIN_TRIAL_TOKEN} />
      </head>
      <body>{children}</body>
    </html>
  );
}
