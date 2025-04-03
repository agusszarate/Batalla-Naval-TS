import type { Metadata } from "next";
import "./globals.css";
import StyledComponentsRegistry from "@/lib/AntdRegistry";
// Import the Ant Design v5 compatibility patch for React 19
import "@ant-design/v5-patch-for-react-19";
import { AntdMessageProvider } from "@/lib/AntdMessageContext";

export const metadata: Metadata = {
  title: "Batalla Naval",
  description:
    "Un juego clásico de Batalla Naval con gráficos 3D y modo multijugador",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <StyledComponentsRegistry>
          <AntdMessageProvider>{children}</AntdMessageProvider>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
