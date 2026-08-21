import type { Metadata } from "next";
import "./globals.css";
import "./home.css";

export const metadata: Metadata = {
  title: "zhajinbang",
  description: "The official zhajinbang visual experience.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="motion-forced">
      <body>{children}</body>
    </html>
  );
}
