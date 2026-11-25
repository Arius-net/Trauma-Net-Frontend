import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "TraumaNet — Centro de Apoyo a la Decisión Prehospitalaria",
  description:
    "Sistema de apoyo a la decisión (DSS) para despacho de emergencias y derivación interhospitalaria en el corredor Tuxtla – San Cristóbal – Comitán.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
