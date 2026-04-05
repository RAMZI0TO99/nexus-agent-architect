import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="antialiased bg-gray-950 text-gray-100">
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}