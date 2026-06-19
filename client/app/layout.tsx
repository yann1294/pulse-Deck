import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PulseDesk | AI Support Ticketing",
  description: "AI-powered customer support ticketing with human-approved reply suggestions."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
