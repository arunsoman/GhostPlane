import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import HealthCheckConfig from '../components/proxy/health-check-config'

describe('HealthCheckConfig', () => {
    const mockConfig = {
        path: '/health',
        interval: 10,
        timeout: 2,
        healthyThreshold: 2,
        unhealthyThreshold: 3
    }
    const mockOnChange = jest.fn()

    it('renders with initial config', () => {
        render(<HealthCheckConfig config={mockConfig} onChange={mockOnChange} />)
        expect(screen.getByDisplayValue('/health')).toBeInTheDocument()
        expect(screen.getByDisplayValue('10')).toBeInTheDocument()
        expect(screen.getByDisplayValue('2')).toBeInTheDocument()
        expect(screen.getByDisplayValue('3')).toBeInTheDocument()
    })

    it('handles path change', () => {
        render(<HealthCheckConfig config={mockConfig} onChange={mockOnChange} />)
        fireEvent.change(screen.getByDisplayValue('/health'), { target: { value: '/status' } })
        expect(mockOnChange).toHaveBeenCalledWith({ ...mockConfig, path: '/status' })
    })

    it('handles interval change and shows warning for low values', () => {
        const { rerender } = render(<HealthCheckConfig config={mockConfig} onChange={mockOnChange} />)

        fireEvent.change(screen.getByDisplayValue('10'), { target: { value: '3' } })
        expect(mockOnChange).toHaveBeenCalledWith({ ...mockConfig, interval: 3 })

        // Rerender with low interval to see warning
        rerender(<HealthCheckConfig config={{ ...mockConfig, interval: 3 }} onChange={mockOnChange} />)
        expect(screen.getByText(/Low interval may cause high CPU usage/i)).toBeInTheDocument()
    })

    it('handles threshold changes', () => {
        render(<HealthCheckConfig config={mockConfig} onChange={mockOnChange} />)

        const inputs = screen.getAllByRole('spinbutton')
        // Order: Interval, Healthy, Unhealthy (based on render order)

        fireEvent.change(inputs[1], { target: { value: '5' } })
        expect(mockOnChange).toHaveBeenCalledWith({ ...mockConfig, healthyThreshold: 5 })

        fireEvent.change(inputs[2], { target: { value: '10' } })
        expect(mockOnChange).toHaveBeenCalledWith({ ...mockConfig, unhealthyThreshold: 10 })
    })
})
