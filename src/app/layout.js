import "./globals.css";

export const metadata = {
  title: "LatYar Ledger & KPay Automation",
  description: "KPay webhook automation and customer ledger dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="my">
      <body>{children}</body>
    </html>
  );
}
