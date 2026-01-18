import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gym Management System",
  description: "Complete gym management solution for managing members, invoices, and services",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
