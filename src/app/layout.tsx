import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/app/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.crime-atlas.com"),
  title: "Crime Atlas",
  description: "Interactive dashboards built from officially published police-recorded crime data.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-[var(--surface-0)] text-white antialiased">{children}</body>
    </html>
  );
}
