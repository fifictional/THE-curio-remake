import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono, Lexend } from "next/font/google";
import localFont from "next/font/local";
import "@radix-ui/themes/styles.css";
import '@aws-amplify/ui-react/styles.css';
import "./globals.css";
import { Providers } from "@/providers/providers";
import { FixedWrapper } from "@/components/layout/fixed-wrapper";

const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

const rocaBold = localFont({
  src: "./fonts/Roca-Font/Roca Bold.ttf",
  variable: "--font-roca-bold",
});

export const metadata: Metadata = {
  title: "Curio - Your Personal Learning Assistant",
  description: "Upload documents, analyze videos, and create personalized learning spaces with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isProduction = process.env.NODE_ENV === 'production';

  const gtmScript = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','GTM-KL242M3Q');`

  const gtmNoscript = `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-KL242M3Q" height="0" width="0" style={{display: 'none', visibility: 'hidden'}}></iframe></noscript>`

  return (
    <html lang="en" className="h-dvh bg-white">
      <head>
        {/* Google Tag Manager */}
        {isProduction && <script dangerouslySetInnerHTML={{ __html: gtmScript }} />}
        {/* End Google Tag Manager */}
      </head>
      <body className={`${lexend.variable} ${jetBrainsMono.variable} font-sans antialiased bg-white h-dvh`}>
        {/* Google Tag Manager (noscript) */}
        {isProduction && <noscript dangerouslySetInnerHTML={{ __html: gtmNoscript }} />}
        {/* End Google Tag Manager (noscript) */}
        <Providers>
          <FixedWrapper>
            {children}
          </FixedWrapper>
        </Providers>
      </body>
    </html>
  );
}
