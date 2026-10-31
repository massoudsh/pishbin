import type { Metadata } from 'next'
import './globals.css'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ClientProviders } from '@/components/ClientProviders'

export const metadata: Metadata = {
  title: { default: 'پیش‌بین', template: '%s | پیش‌بین' },
  description: 'کوپایلوت هوشمند تصمیم‌سازی مالی برای کسب‌وکارهای کوچک و متوسط ایرانی. فاکتور، چک و نقدینگی را کنار هم ببینید و اثر تصمیم امروز را روی ۳۰ روز آینده بسنجید.',
  applicationName: 'پیش‌بین',
  openGraph: {
    title: 'پیش‌بین — کوپایلوت هوشمند تصمیم‌سازی مالی برای SMEهای ایرانی',
    description: 'داده مالی پراکنده را کنار هم بگذارید و پیش از سؤال، تصمیم را جلو بکشید.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#10b981" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link href="https://fonts.cdnfonts.com/css/dana" rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t;try{t=localStorage.getItem('pishbin-theme')}catch(e){};var r=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.add(r?'dark':'light');})();`,
          }}
        />
      </head>
      <body className="font-dana">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:right-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-md"
        >
          پرش به محتوای اصلی
        </a>
        <ErrorBoundary>
          <ClientProviders>{children}</ClientProviders>
        </ErrorBoundary>
      </body>
    </html>
  )
}

