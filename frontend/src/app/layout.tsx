import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  title: '元征 · 合伙人赋能平台',
  description: '记录协作、量化贡献、可视化项目与平台价值的内部基础设施',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Inter:wght@300;400;500;600&family=Noto+Serif+SC:wght@300;400;500;600&family=Playfair+Display:wght@300;400&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body style={{ background: '#000000', color: '#faf9f6' }}>
        {children}
        <Toaster 
          theme="dark" 
          position="top-center"
          toastOptions={{
            style: {
              background: 'rgba(30, 30, 30, 0.98)',
              border: '1px solid #333',
              color: '#faf9f6',
            },
          }}
        />
      </body>
    </html>
  )
}
