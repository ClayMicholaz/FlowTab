import { SupabaseProvider } from "../src/components/SupabaseProvider";
import "./globals.css";

export const metadata = {
  title: "FlowTab",
  description: "Simple expense tracking with Supabase",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-50 text-zinc-900 antialiased">
        <SupabaseProvider>{children}</SupabaseProvider>
      </body>
    </html>
  );
}
