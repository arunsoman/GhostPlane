import { render, screen } from '@testing-library/react'
import MetricsChart from '@/components/MetricsChart'

// Mock Recharts
jest.mock('recharts', () => ({
    ResponsiveContainer: ({ children }: any) => <div className="recharts-responsive-container">{children}</div>,
    LineChart: ({ children }: any) => <div className="recharts-line-chart">{children}</div>,
    Line: () => <div className="recharts-line" />,
    XAxis: () => <div className="recharts-x-axis" />,
    YAxis: () => <div className="recharts-y-axis" />,
    CartesianGrid: () => <div className="recharts-cartesian-grid" />,
    Tooltip: () => <div className="recharts-tooltip" />,
}))

describe('MetricsChart', () => {
    it('renders the chart container and title', () => {
        render(<MetricsChart />)
        expect(screen.getByText('Network Performance')).toBeInTheDocument()
        expect(screen.getByText('Latency (ms)')).toBeInTheDocument()
        expect(screen.getByText('RPS')).toBeInTheDocument()
    })
})
