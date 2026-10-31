import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { LanguageProvider } from '@/components/LanguageProvider';

export const metadata = {
  title: 'Hyderabad Saaf AI — Municipal Complaint Reporting',
  description:
    'Report garbage, potholes, water leaks and broken streetlights in Hyderabad, Sindh. AI verifies your photo and routes the complaint to HMC, WASA or HESCO.',
  keywords: ['Hyderabad', 'Sindh', 'municipal complaint', 'garbage', 'HMC', 'WASA', 'HESCO', 'AI'],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#059669',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Noto+Nastaliq+Urdu:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <LanguageProvider>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
