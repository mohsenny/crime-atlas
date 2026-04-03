import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Crime Atlas",
  description: "Interactive official-source crime dashboards for Berlin, Frankfurt, London, Luton, and Paris.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-[var(--surface-0)] text-white antialiased">{children}</body>
    </html>
  );
}
