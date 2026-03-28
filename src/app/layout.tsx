import type { Metadata } from "next";
import "./globals.scss";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: "Your personal photo vault. Upload, organize, and share your memories.",
  keywords: ["photos", "gallery", "album", "storage"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
