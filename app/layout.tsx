import { Inter, Montserrat } from 'next/font/google'
import Script from 'next/script'
import '@/app/globals.css'
import { GamificationProvider } from '@/components/gamification/GamificationProvider'
import ErrorBoundary from '@/components/ErrorBoundary'
import { Analytics } from '@vercel/analytics/react'

const inter = Inter({ subsets: ['latin'] })
const mont = Montserrat({
  subsets: ['latin'],
  variable: '--font-mont',
  weight: ['400', '500', '600', '700']
})

export const metadata = {
  title: 'OnQuest',
  description: 'Plan your perfect trip with AI assistance',
  icons: {
    icon: '/oq_logo.svg',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={mont.variable}>
      <body className={inter.className}>
        <ErrorBoundary>
          <GamificationProvider>
            {children}
          </GamificationProvider>
          <Analytics />
        </ErrorBoundary>

        {/* Hotjar Tracking Code */}
        <Script
          id="hotjar-tracking"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(h,o,t,j,a,r){
                h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
                h._hjSettings={hjid:5237315,hjsv:6};
                a=o.getElementsByTagName('head')[0];
                r=o.createElement('script');r.async=1;
                r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
                a.appendChild(r);
              })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
            `
          }}
        />

        {/* ContentSquare Tracking Code */}
        <Script
          src="https://t.contentsquare.net/uxa/3cc102cf1e37a.js"
          strategy="afterInteractive"
        />

        {/* Google Maps Script */}
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}