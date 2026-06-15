import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import MainAppLayout from "@/components/MainAppLayout";

export const metadata = {
  title: "Purnima Construction - Hisab Book",
  description: "A professional accounting and attendance book for construction contractors.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="light">
      <body>
        <AuthProvider>
          <MainAppLayout>{children}</MainAppLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
