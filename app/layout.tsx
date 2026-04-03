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
  metadataBase: new URL('https://onquest.in'),
  title: {
    default: 'OnQuest | Plan your perfect trip with AI',
    template: '%s | OnQuest'
  },
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

        {/* Contentsquare Tracking Code */}
        <Script
          src="https://t.contentsquare.net/uxa/ddd28c2d10a19.js"
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