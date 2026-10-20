import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { PublicEnvScript } from 'next-runtime-env'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono' })

export const metadata: Metadata = {
  title: 'Verana Visualizer',
  description: 'A 3D observatory of the Verana verifiable trust network',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <PublicEnvScript />
      </head>
      <body className="bg-scene-bg font-sans text-scene-txt">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
