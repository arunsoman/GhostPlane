import { render, screen } from '@testing-library/react'
import RootLayout from '@/app/layout'

// Mock Inter font
jest.mock('next/font/google', () => ({
    Inter: () => ({
        className: 'inter-font',
    }),
}))

describe('RootLayout', () => {
    it('renders children correctly', () => {
        // Suppress console.error for validateDOMNesting
        const spy = jest.spyOn(console, 'error').mockImplementation(() => { })

        render(
            <RootLayout>
                <div data-testid="child">Content</div>
            </RootLayout>
        )
        expect(screen.getByTestId('child')).toBeInTheDocument()

        spy.mockRestore()
    })

    it('has metadata defined', () => {
        // metadata is an export, we can't easily check it via render 
        // but the fact it was imported and used by Next.js is usually enough
        // however for coverage we need to "execute" the line
        const { metadata } = require('@/app/layout')
        expect(metadata.title).toBe('NLB+ Management Console')
    })
})
