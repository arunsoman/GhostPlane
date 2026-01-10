import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import CopilotChat from '@/components/CopilotChat'

describe('CopilotChat', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        window.fetch = jest.fn()
    })

    it('renders initial bot message', () => {
        render(<CopilotChat />)
        expect(screen.getByText(/Hello! I am your Network Copilot/)).toBeInTheDocument()
    })

    it('allows user to send a message and receive bot response (prediction)', async () => {
        (window.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ result: { prediction: 'High traffic', confidence: 0.95 } })
        })

        render(<CopilotChat />)
        const input = screen.getByPlaceholderText(/Ask the brain/i)
        fireEvent.change(input, { target: { value: 'status' } })
        fireEvent.click(screen.getByRole('button'))

        await waitFor(() => {
            expect(screen.getByText(/Prediction: High traffic/)).toBeInTheDocument()
            expect(screen.getByText(/Confidence: 95%/)).toBeInTheDocument()
        })
    })

    it('receives a migration plan response with Enter key', async () => {
        (window.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ result: { migration: 'Step 1: Move IP' } })
        })

        render(<CopilotChat />)
        const input = screen.getByPlaceholderText(/Ask the brain/i)
        fireEvent.change(input, { target: { value: 'migrate' } })
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

        await waitFor(() => {
            expect(screen.getByText(/Migration Plan:/)).toBeInTheDocument()
            expect(screen.getByText(/Step 1: Move IP/)).toBeInTheDocument()
        })
    })

    it('handles generic JSON response', async () => {
        (window.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ result: { some: 'data' } })
        })

        render(<CopilotChat />)
        const input = screen.getByPlaceholderText(/Ask the brain/i)
        fireEvent.change(input, { target: { value: 'data' } })
        fireEvent.click(screen.getByRole('button'))

        await waitFor(() => {
            expect(screen.getByText(/"some": "data"/)).toBeInTheDocument()
        })
    })

    it('handles API error gracefully', async () => {
        (window.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network failure'))

        render(<CopilotChat />)
        const input = screen.getByPlaceholderText(/Ask the brain/i)
        fireEvent.change(input, { target: { value: 'broken' } })
        fireEvent.click(screen.getByRole('button'))

        await waitFor(() => {
            expect(screen.getByText(/I'm having trouble connecting to the brain/)).toBeInTheDocument()
        })
    })

    it('does not send empty messages', () => {
        render(<CopilotChat />)
        fireEvent.click(screen.getByRole('button'))
        // No user message should appear
        expect(screen.queryByText('user')).not.toBeInTheDocument()
    })
})
