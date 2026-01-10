import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import Page from '../app/page'
import { useRouter } from 'next/navigation'

jest.mock('next/navigation', () => ({
    useRouter: jest.fn()
}))

// Robust Recharts Mock
jest.mock('recharts', () => {
    return {
        ResponsiveContainer: ({ children }: any) => <div className="responsive-container">{children}</div>,
        AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
        Area: () => <div />,
        XAxis: () => <div />,
        YAxis: () => <div />,
        CartesianGrid: () => <div />,
        Tooltip: () => <div />,
        ReferenceLine: () => <div />,
    };
});

describe('Dashboard Page', () => {
    const mockPush = jest.fn()
    const mockedUseRouter = useRouter as jest.Mock

    beforeEach(() => {
        jest.clearAllMocks()
        mockedUseRouter.mockReturnValue({
            push: mockPush
        })
        localStorage.setItem('token', 'mock-token')

        // Default smart mock
        window.fetch = jest.fn().mockImplementation(async (url) => {
            if (url.includes('/setup/check')) {
                return {
                    ok: true,
                    json: async () => ({ setup_complete: true })
                }
            }
            if (url.includes('/metrics')) {
                return {
                    ok: true,
                    json: async () => ({
                        total_requests: 0,
                        active_connections: 0,
                        system_health: 'optimal'
                    })
                }
            }
            if (url.includes('/config')) {
                return {
                    ok: true,
                    json: async () => ({
                        active_routes: [
                            { path: '/api', targets: ['http://localhost:8081'] }
                        ]
                    })
                }
            }
            return { ok: false }
        })
    })

    it('handles setup incomplete redirect', async () => {
        (window.fetch as jest.Mock).mockImplementation(async (url) => {
            if (url.includes('/setup/check')) {
                return {
                    ok: true,
                    json: async () => ({ setup_complete: false })
                }
            }
            return { ok: true, json: async () => ({}) }
        })

        render(<Page />)
        await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/setup'));
    })

    it('handles fetch metrics failure', async () => {
        const spy = jest.spyOn(console, 'error').mockImplementation(() => { });
        (window.fetch as jest.Mock).mockImplementation(async (url) => {
            if (url.includes('/metrics')) {
                throw new Error('fail')
            }
            return { ok: true, json: async () => ({ setup_complete: true }) }
        })

        render(<Page />)
        await waitFor(() => expect(spy).toHaveBeenCalled())
        spy.mockRestore()
    })

    it('handles no token redirect', async () => {
        localStorage.removeItem('token')
        render(<Page />)
        expect(mockPush).toHaveBeenCalledWith('/login')
    })

    it('covers all interactions and views', async () => {
        // Use default mock from beforeEach
        render(<Page />)
        await screen.findByText(/Network Control/i)

        // Provision Flow
        fireEvent.click(screen.getByText(/Provision Gateway/i))
        fireEvent.click(await screen.findByText(/Initialize Flux/i))
        await screen.findByText(/Network Control/i)

        // Settings View
        fireEvent.click(screen.getByText('Settings'))
        fireEvent.click(screen.getByText(/Launch Setup Wizard/i))
        expect(mockPush).toHaveBeenCalledWith('/setup')
        fireEvent.click(await screen.findByText(/Return to control plane/i))
        await screen.findByText(/Network Control/i)

        // Cards
        fireEvent.click(screen.getByText(/Active Connections/i).closest('button')!)
        fireEvent.click(await screen.findByText('Dashboard'))
        fireEvent.click(screen.getByText(/Node Latency/i).closest('button')!)
        fireEvent.click(await screen.findByText('Dashboard'))
        fireEvent.click(screen.getByText(/Total Packets/i).closest('button')!)
        fireEvent.click(await screen.findByText('Dashboard'))

        // Nav
        fireEvent.click(screen.getByText('Security'))
        fireEvent.click(screen.getByText('Metrics'))
        fireEvent.click(screen.getByText('Copilot'))
        await screen.findByText(/Network Brain/i)

        // Proxy Rules
        fireEvent.click(screen.getByText('Proxy Rules'))
        await screen.findByText('Active Routes')

        // Test Add Route Modal
        fireEvent.click(screen.getByText('Add Route'))
        await screen.findByText(/Add New Route/i)

        // Close modal
        fireEvent.click(screen.getByText('Cancel'))
        await waitFor(() => {
            expect(screen.queryByText(/Add New Route/i)).not.toBeInTheDocument()
        })
    })

    it('covers non-optimal health view', async () => {
        (window.fetch as jest.Mock).mockImplementation(async (url) => {
            if (url.includes('/setup/check')) return { ok: true, json: async () => ({ setup_complete: true }) };
            if (url.includes('/metrics')) {
                return {
                    ok: true,
                    json: async () => ({
                        total_requests: 10,
                        active_connections: 5,
                        system_health: 'warning'
                    })
                }
            }
            return { ok: false }
        })
        render(<Page />)
        await waitFor(() => {
            const warnings = screen.getAllByText(/warning/i)
            expect(warnings.length).toBeGreaterThan(0)
        })
    })
})
