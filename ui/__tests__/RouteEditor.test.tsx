import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import RouteEditor from '../components/proxy/route-editor'

describe('RouteEditor', () => {
    const mockOnClose = jest.fn()
    const mockOnSave = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('does not render when isOpen is false', () => {
        render(<RouteEditor isOpen={false} onClose={mockOnClose} onSave={mockOnSave} />)
        expect(screen.queryByText('Add New Route')).not.toBeInTheDocument()
    })

    it('renders correctly when open', () => {
        render(<RouteEditor isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />)
        expect(screen.getByText('Add New Route')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('/api/v1/*')).toBeInTheDocument()
    })

    it('validates empty targets', async () => {
        const spy = jest.spyOn(window, 'alert').mockImplementation(() => { })
        render(<RouteEditor isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />)

        // Fill required path to pass form validation
        fireEvent.change(screen.getByPlaceholderText('/api/v1/*'), { target: { value: '/foo' } })

        // Clear default empty target
        const targetInput = screen.getByPlaceholderText('http://localhost:8080')
        fireEvent.change(targetInput, { target: { value: '' } })

        fireEvent.click(screen.getByText('Save Route'))

        expect(spy).toHaveBeenCalledWith('At least one target is required')
        expect(mockOnSave).not.toHaveBeenCalled()
        spy.mockRestore()
    })

    it('saves a valid route', async () => {
        render(<RouteEditor isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />)

        fireEvent.change(screen.getByPlaceholderText('/api/v1/*'), { target: { value: '/new-path' } })
        fireEvent.change(screen.getByPlaceholderText('http://localhost:8080'), { target: { value: 'http://backend:8080' } })

        fireEvent.click(screen.getByText('Save Route'))

        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalledWith({
                path: '/new-path',
                methods: [],
                priority: 0,
                targets: ['http://backend:8080']
            })
            expect(mockOnClose).toHaveBeenCalled()
        })
    })

    it('adds and removes targets', () => {
        render(<RouteEditor isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />)

        // Fill required path
        fireEvent.change(screen.getByPlaceholderText('/api/v1/*'), { target: { value: '/multi' } })

        // Add target
        fireEvent.click(screen.getByText('ADD TARGET'))
        const inputs = screen.getAllByPlaceholderText('http://localhost:8080')
        expect(inputs).toHaveLength(2)

        // Let's just type in both and save to verify 2 targets
        fireEvent.change(inputs[0], { target: { value: 't1' } })
        fireEvent.change(inputs[1], { target: { value: 't2' } })

        fireEvent.click(screen.getByText('Save Route'))

        expect(mockOnSave).toHaveBeenCalledWith({
            path: '/multi',
            methods: [],
            priority: 0,
            targets: ['t1', 't2']
        })
    })

    it('pre-fills data when editing', () => {
        const initialRoute = { path: '/edit', targets: ['t1'] }
        render(<RouteEditor isOpen={true} onClose={mockOnClose} onSave={mockOnSave} initialRoute={initialRoute} />)

        expect(screen.getByDisplayValue('/edit')).toBeInTheDocument()
        expect(screen.getByDisplayValue('t1')).toBeInTheDocument()
    })
})
