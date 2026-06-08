import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Mark & Guerdithe",
    template: "%s | Mark & Guerdithe",
  },
  description: "Wedding details and RSVP for Mark and Guerdithe",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
