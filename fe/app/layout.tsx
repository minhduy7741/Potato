import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Potato - Internal Developer Platform',
  description: 'Mash your deployments, fry up new apps in seconds. The friendly internal developer platform.',
  generator: 'v0.app',
  icons: {
    icon: '/potato-icon.svg',
    apple: '/potato-icon.svg',
  },
}

import { ChatWidget } from "@/components/chat-widget"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        {children}
        <ChatWidget />
      </body>
    </html>
  )
}
