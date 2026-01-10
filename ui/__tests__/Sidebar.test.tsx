import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import Sidebar from '@/components/Sidebar'

describe('Sidebar', () => {
    const mockNavigate = jest.fn()

    it('renders all navigation items and handles clicks', () => {
        render(<Sidebar currentView="dashboard" onNavigate={mockNavigate} />)

        const items = ['Dashboard', 'Metrics', 'Security', 'Copilot', 'Settings']
        items.forEach(label => {
            const btn = screen.getByText(label).closest('button')
            expect(btn).toBeInTheDocument()
            fireEvent.click(btn!)
            expect(mockNavigate).toHaveBeenCalledWith(label.toLowerCase())
        })
    })

    it('renders the brand title and handles click', () => {
        render(<Sidebar currentView="metrics" onNavigate={mockNavigate} />)
        const brand = screen.getByText('NLB+')
        fireEvent.click(brand.closest('button')!)
        expect(mockNavigate).toHaveBeenCalledWith('dashboard')
    })
})
