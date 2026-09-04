import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Range 4-Ren — Investigative Range Estimator",
  description: "Auditable wind-corrected UAV launch-area estimation for field investigators.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
