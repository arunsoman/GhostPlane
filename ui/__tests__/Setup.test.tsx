import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import Setup from '../app/setup/page'
import { useRouter } from 'next/navigation'

jest.mock('next/navigation', () => ({
    useRouter: jest.fn()
}))

describe('Setup Page', () => {
    const mockPush = jest.fn()
    const mockedUseRouter = useRouter as jest.Mock

    beforeEach(() => {
        jest.clearAllMocks()
        mockedUseRouter.mockReturnValue({
            push: mockPush
        })
        window.fetch = jest.fn()
        localStorage.clear()
        localStorage.setItem('token', 'test-token')
    })

    it('redirects to login if unauthenticated', () => {
        localStorage.clear()
        render(<Setup />)
        expect(mockPush).toHaveBeenCalledWith('/login')
    })

    it('shows error when backend is unreachable', async () => {
        // Mock fetch failure
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        (window.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network Error'))

        render(<Setup />)

        expect(await screen.findByText(/Connection Failed/i)).toBeTruthy();
        expect(screen.getByText(/Could not connect/i)).toBeTruthy();

        // Test Retry
        (window.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                caps: {
                    kernel_version: '6.5.0',
                    privileged: true
                }
            })
        })

        fireEvent.click(screen.getByText(/Retry Connection/i))
        expect(await screen.findByText(/Capability Audit/i)).toBeTruthy()

        consoleSpy.mockRestore()
    })

    it('handles non-ok backend response', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        (window.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 500
        })

        render(<Setup />)

        expect(await screen.findByText(/Connection Failed/i)).toBeTruthy()
        consoleSpy.mockRestore()
    })

    it('blocks continuation if eBPF privilege is missing', async () => {
        (window.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                caps: {
                    kernel_version: '6.5.0',
                    privileged: false
                }
            })
        })

        render(<Setup />)

        const btn = await screen.findByText(/System Requirements Not Met/i)
        expect(btn).toBeTruthy()
        expect(btn.closest('button')).toBeDisabled()
    })

    it('starts with capability audit and progresses', async () => {
        (window.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                caps: {
                    kernel_version: '6.5.0',
                    privileged: true,
                    xdp_support: true,
                    dockerized: true
                }
            })
        })

        render(<Setup />)

        expect(await screen.findByText(/Capability Audit/i)).toBeTruthy()

        fireEvent.click(screen.getByText(/Continue/i))
        expect(await screen.findByText(/Node Identity/i)).toBeTruthy()

        fireEvent.change(screen.getByPlaceholderText(/e.g. nlb/i), { target: { value: 'test-node' } })
        fireEvent.click(screen.getByText(/Review & Activate/i))
        expect(await screen.findByText(/Ready for Activation/i)).toBeTruthy();

        (window.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ status: 'initialized' })
        })

        fireEvent.click(screen.getByText(/Activate System/i))

        await waitFor(() => {
            expect(localStorage.getItem('nlb_setup_complete')).toBe('true')
            expect(mockPush).toHaveBeenCalledWith('/')
        })
    })

    it('handles initialization error', async () => {
        (window.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                caps: {
                    kernel_version: '6.5.0',
                    privileged: true
                }
            })
        })

        render(<Setup />)
        fireEvent.click(await screen.findByText(/Continue/i))
        fireEvent.change(screen.getByPlaceholderText(/e.g. nlb/i), { target: { value: 'node' } })
        fireEvent.click(screen.getByText(/Review & Activate/i))

        // First test network error
        const spy = jest.spyOn(console, 'error').mockImplementation(() => { });
        (window.fetch as jest.Mock).mockRejectedValueOnce(new Error('init failed'))

        fireEvent.click(screen.getByText(/Activate System/i));
        await waitFor(() => {
            expect(spy).toHaveBeenCalled()
        });

        // Recover from first error (Retry requires mocking capability check)
        (window.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                caps: {
                    kernel_version: '6.5.0',
                    privileged: true
                }
            })
        })
        fireEvent.click(screen.getByText(/Retry Connection/i));
        expect(await screen.findByText(/Activate System/i)).toBeTruthy();

        // Now test backend error (500) where JSON parsing fails
        (window.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 503,
            json: async () => { throw new Error('Invalid JSON') }
        })

        const activateBtn = await screen.findByText(/Activate System/i)
        fireEvent.click(activateBtn)
        expect(await screen.findByText(/Initialization failed: 503/i)).toBeTruthy();

        spy.mockRestore()
    })

    it('handles generic error object', async () => {
        (window.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                caps: { kernel_version: '6.5.0', privileged: true }
            })
        })

        render(<Setup />)
        fireEvent.click(await screen.findByText(/Continue/i))
        fireEvent.change(screen.getByPlaceholderText(/e.g. nlb/i), { target: { value: 'node' } })
        fireEvent.click(screen.getByText(/Review & Activate/i))

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        (window.fetch as jest.Mock).mockRejectedValueOnce({}) // Throw empty object

        fireEvent.click(screen.getByText(/Activate System/i))
        expect(await screen.findByText(/Failed to initialize system/i)).toBeTruthy()

        consoleSpy.mockRestore()
    })

    it('handles token expiry during setup', async () => {
        (window.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({
                caps: { kernel_version: '6.5.0', privileged: true }
            })
        })

        render(<Setup />)
        fireEvent.click(await screen.findByText(/Continue/i))
        fireEvent.change(screen.getByPlaceholderText(/e.g. nlb/i), { target: { value: 'node' } })
        fireEvent.click(screen.getByText(/Review & Activate/i))

        // Simulate token loss
        localStorage.removeItem('token')

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        fireEvent.click(screen.getByText(/Activate System/i))

        expect(await screen.findByText(/Authentication required/i)).toBeTruthy()
        consoleSpy.mockRestore()
    })

    it('allows going back from step 2 to 1', async () => {
        (window.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                caps: {
                    kernel_version: '6.5.0',
                    privileged: true
                }
            })
        })

        render(<Setup />)
        fireEvent.click(await screen.findByText(/Continue/i))
        const backBtn = await screen.findByText(/Back/i)
        fireEvent.click(backBtn)
        expect(screen.getByText(/Capability Audit/i)).toBeTruthy()
    })
})
