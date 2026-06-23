import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Place on Jentilly",
  description: "Role-based property management dashboard"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
