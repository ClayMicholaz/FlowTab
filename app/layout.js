export const metadata = {
  title: "FlowTab",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui,Arial,Helvetica", padding: 24 }}>
        {children}
      </body>
    </html>
  );
}
