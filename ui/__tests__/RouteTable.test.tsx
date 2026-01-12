import React from 'react'
import * as testingLib from '@testing-library/react'
const { render, screen, fireEvent, waitFor } = testingLib
import '@testing-library/jest-dom'
import RouteTable from '../components/proxy/route-table'

// Use real child component to avoid import mocking issues
// jest.mock('../components/proxy/route-editor', ...)

describe('RouteTable', () => {
    beforeEach(() => {
        global.fetch = jest.fn()
        localStorage.setItem('token', 'test-token')
        const confirmSpy = jest.spyOn(window, 'confirm')
        confirmSpy.mockImplementation(() => true)
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    it('renders loading state initially', async () => {
        (global.fetch as jest.Mock).mockImplementationOnce(() => new Promise(() => { }))
        render(<RouteTable />)
        expect(screen.getByText('Loading routing table...')).toBeTruthy()
    })

    it('renders empty state', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ active_routes: [] })
        })
        render(<RouteTable />)
        await waitFor(() => expect(screen.getByText('No Routes Configured')).toBeTruthy())
    })

    it('renders routes and handles delete', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({
                active_routes: [{ path: '/test', targets: ['t1'] }]
            })
        })

        render(<RouteTable />)
        await waitFor(() => expect(screen.getByText('/test')).toBeTruthy());

        // Setup delete mock
        (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true })

        const buttons = screen.getAllByRole('button')
        const deleteButton = buttons[buttons.length - 1]
        fireEvent.click(deleteButton)

        // Wait for modal and click confirm
        await waitFor(() => expect(screen.getByText('Delete Route')).toBeTruthy())
        const confirmButton = screen.getByText('Delete Item')
        fireEvent.click(confirmButton)

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/v1/config', expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('[]')
            }))
        })
    })

    it('opens editor and saves route', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ active_routes: [] })
        })

        render(<RouteTable />)
        await waitFor(() => expect(screen.getByText('No Routes Configured')).toBeTruthy())

        fireEvent.click(screen.getByText('Create your first route'))

        // Interact with real editor
        await waitFor(() => expect(screen.getByText('Add New Route')).toBeTruthy())

        fireEvent.change(screen.getByPlaceholderText('/api/v1/*'), { target: { value: '/new' } })
        fireEvent.change(screen.getByPlaceholderText('http://localhost:8080'), { target: { value: 't1' } })

        fireEvent.click(screen.getByText('Save Route'))

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/v1/config', expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('/new')
            }))
        })
    })
})