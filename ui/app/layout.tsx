import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'NLB+ Management Console',
    description: 'AI-Powered Load Balancer Control Plane',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body className="antialiased">
                {children}
            </body>
        </html>
    )
}
