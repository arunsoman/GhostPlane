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
                targets: ['http://backend:8080'],
                algorithm: 'round_robin',
                weights: undefined,
                rules: undefined
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
            targets: ['t1', 't2'],
            algorithm: 'round_robin',
            weights: undefined,
            rules: undefined
        })
    })

    it('pre-fills data when editing', () => {
        const initialRoute = { path: '/edit', targets: ['t1'] }
        render(<RouteEditor isOpen={true} onClose={mockOnClose} onSave={mockOnSave} initialRoute={initialRoute as any} />)

        expect(screen.getByDisplayValue('/edit')).toBeInTheDocument()
        expect(screen.getByDisplayValue('t1')).toBeInTheDocument()
    })

    it('handles algorithm change and weights', async () => {
        render(<RouteEditor isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />)

        fireEvent.change(screen.getByPlaceholderText('/api/v1/*'), { target: { value: '/weighted' } })
        fireEvent.change(screen.getByPlaceholderText('http://localhost:8080'), { target: { value: 'target1' } })

        const algoSelect = screen.getByLabelText('Load Balancing Algorithm')
        fireEvent.change(algoSelect, { target: { value: 'weighted' } })

        // Check if weight slider appears
        expect(screen.getByText('Weight:')).toBeInTheDocument()

        fireEvent.click(screen.getByText('Save Route'))

        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
                path: '/weighted',
                algorithm: 'weighted'
            }))
        })
    })

    it('handles advanced rules', async () => {
        render(<RouteEditor isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />)

        fireEvent.change(screen.getByPlaceholderText('/api/v1/*'), { target: { value: '/rules' } })
        fireEvent.change(screen.getByPlaceholderText('http://localhost:8080'), { target: { value: 't1' } })

        fireEvent.click(screen.getByText('SHOW ADVANCED SETTINGS'))
        fireEvent.click(screen.getByText('ADD CONDITION'))

        // Select type and enter key/value
        const typeSelect = screen.getByDisplayValue('Header')
        fireEvent.change(typeSelect, { target: { value: 'query' } })

        const keyInput = screen.getByPlaceholderText('version')
        fireEvent.change(keyInput, { target: { value: 'v' } })

        const valueInput = screen.getByPlaceholderText('Value')
        fireEvent.change(valueInput, { target: { value: '2' } })

        fireEvent.click(screen.getByText('Save Route'))

        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
                path: '/rules',
                rules: expect.objectContaining({
                    conditions: [
                        { type: 'query', key: 'v', operator: 'equals', value: '2' }
                    ]
                })
            }))
        })
    })

    it('handles traffic splitting (canary)', async () => {
        render(<RouteEditor isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />)

        fireEvent.click(screen.getByText('SHOW ADVANCED SETTINGS'))

        const slider = screen.getByLabelText('Canary Percentage')
        fireEvent.change(slider, { target: { value: '25' } })

        fireEvent.click(screen.getByText('+ ADD CANARY TARGET'))
        fireEvent.change(screen.getByPlaceholderText('Canary backend URL'), { target: { value: 'http://canary:8080' } })

        fireEvent.change(screen.getByPlaceholderText('/api/v1/*'), { target: { value: '/canary' } })
        fireEvent.change(screen.getByPlaceholderText('http://localhost:8080'), { target: { value: 'target1' } })

        fireEvent.click(screen.getByText('Save Route'))

        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
                canary: {
                    weight: 25,
                    targets: ['http://canary:8080']
                }
            }))
        })
    })

    it('handles session affinity', async () => {
        render(<RouteEditor isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />)

        fireEvent.click(screen.getByText('SHOW ADVANCED SETTINGS'))

        fireEvent.change(screen.getByLabelText('Affinity Type'), { target: { value: 'cookie' } })
        fireEvent.change(screen.getByPlaceholderText('GP_SESSION'), { target: { value: 'MY_COOKIE' } })

        fireEvent.change(screen.getByPlaceholderText('/api/v1/*'), { target: { value: '/sticky' } })
        fireEvent.change(screen.getByPlaceholderText('http://localhost:8080'), { target: { value: 'target1' } })

        fireEvent.click(screen.getByText('Save Route'))

        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
                affinity: {
                    type: 'cookie',
                    cookie_name: 'MY_COOKIE'
                }
            }))
        })
    })

    it('handles resilience (timeouts and retries)', async () => {
        render(<RouteEditor isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />)

        fireEvent.click(screen.getByText('SHOW ADVANCED SETTINGS'))

        fireEvent.change(screen.getByLabelText('Timeout (ms)'), { target: { value: '5000' } })
        fireEvent.change(screen.getByLabelText('Max Retries'), { target: { value: '3' } })

        fireEvent.change(screen.getByPlaceholderText('/api/v1/*'), { target: { value: '/resilient' } })
        fireEvent.change(screen.getByPlaceholderText('http://localhost:8080'), { target: { value: 'target1' } })

        fireEvent.click(screen.getByText('Save Route'))

        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
                resilience: {
                    timeout_ms: 5000,
                    max_retries: 3
                }
            }))
        })
    })

    it('handles circuit breaker', async () => {
        render(<RouteEditor isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />)

        fireEvent.click(screen.getByText('SHOW ADVANCED SETTINGS'))

        fireEvent.change(screen.getByLabelText('Err Threshold'), { target: { value: '10' } })
        fireEvent.change(screen.getByLabelText('Succ Threshold'), { target: { value: '5' } })

        fireEvent.change(screen.getByPlaceholderText('/api/v1/*'), { target: { value: '/cb' } })
        fireEvent.change(screen.getByPlaceholderText('http://localhost:8080'), { target: { value: 'target1' } })

        fireEvent.click(screen.getByText('Save Route'))

        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
                circuit_breaker: expect.objectContaining({
                    error_threshold: 10,
                    success_threshold: 5
                })
            }))
        })
    })

    it('handles rate limiting', async () => {
        render(<RouteEditor isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />)

        fireEvent.click(screen.getByText('SHOW ADVANCED SETTINGS'))

        fireEvent.change(screen.getByLabelText('Req / Sec'), { target: { value: '50' } })
        fireEvent.change(screen.getByLabelText('Burst'), { target: { value: '75' } })

        fireEvent.change(screen.getByPlaceholderText('/api/v1/*'), { target: { value: '/rl' } })
        fireEvent.change(screen.getByPlaceholderText('http://localhost:8080'), { target: { value: 'target1' } })

        fireEvent.click(screen.getByText('Save Route'))

        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
                rate_limit: {
                    requests_per_second: 50,
                    burst: 75
                }
            }))
        })
    })

    it('handles authentication (API Key)', async () => {
        render(<RouteEditor isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />)

        fireEvent.click(screen.getByText('SHOW ADVANCED SETTINGS'))

        fireEvent.change(screen.getByLabelText('Auth Type'), { target: { value: 'api_key' } })
        fireEvent.click(screen.getByText('+ ADD CREDENTIAL'))

        const inputs = screen.getAllByPlaceholderText('API Key')
        fireEvent.change(inputs[0], { target: { value: 'secret-key' } })

        const labels = screen.getAllByPlaceholderText('Label (e.g. Admin)')
        fireEvent.change(labels[0], { target: { value: 'Admin' } })

        fireEvent.change(screen.getByPlaceholderText('/api/v1/*'), { target: { value: '/auth' } })
        fireEvent.change(screen.getByPlaceholderText('http://localhost:8080'), { target: { value: 'target1' } })

        fireEvent.click(screen.getByText('Save Route'))

        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
                auth: {
                    type: 'api_key',
                    keys: { 'secret-key': 'Admin' }
                }
            }))
        })
    })
    it('handles response caching', async () => {
        render(<RouteEditor isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />)

        fireEvent.click(screen.getByText('SHOW ADVANCED SETTINGS'))

        fireEvent.click(screen.getByText('DISABLED')) // Toggle to ENABLED
        fireEvent.change(screen.getByLabelText('TTL (Seconds)'), { target: { value: '300' } })

        fireEvent.change(screen.getByPlaceholderText('/api/v1/*'), { target: { value: '/cached' } })
        fireEvent.change(screen.getByPlaceholderText('http://localhost:8080'), { target: { value: 'target1' } })

        fireEvent.click(screen.getByText('Save Route'))

        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
                cache: {
                    enabled: true,
                    ttl_seconds: 300
                }
            }))
        })
    })

    it('handles header manipulation', async () => {
        render(<RouteEditor isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />)

        fireEvent.click(screen.getByText('SHOW ADVANCED SETTINGS'))

        // Add Request Header (First "+ ADD HEADER" button)
        const addButtons = screen.getAllByText('+ ADD HEADER')
        fireEvent.click(addButtons[0])

        const nameInputs = screen.getAllByPlaceholderText('Name')
        const valueInputs = screen.getAllByPlaceholderText('Value')
        fireEvent.change(nameInputs[0], { target: { value: 'X-Custom-Req' } })
        fireEvent.change(valueInputs[0], { target: { value: 'req-val' } })

        // Add Response Header (Second "+ ADD HEADER" button)
        fireEvent.click(addButtons[1])
        // Now there are 2 sets of inputs. Index 0 is Req, Index 1 is Res.
        const updatedNameInputs = screen.getAllByPlaceholderText('Name')
        const updatedValueInputs = screen.getAllByPlaceholderText('Value')
        fireEvent.change(updatedNameInputs[1], { target: { value: 'X-Custom-Res' } })
        fireEvent.change(updatedValueInputs[1], { target: { value: 'res-val' } })

        fireEvent.change(screen.getByPlaceholderText('/api/v1/*'), { target: { value: '/headers' } })
        fireEvent.change(screen.getByPlaceholderText('http://localhost:8080'), { target: { value: 'target1' } })

        fireEvent.click(screen.getByText('Save Route'))

        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
                headers: {
                    add_request: { 'X-Custom-Req': 'req-val' },
                    remove_request: [],
                    add_response: { 'X-Custom-Res': 'res-val' },
                    remove_response: []
                }
            }))
        })
    })
})
