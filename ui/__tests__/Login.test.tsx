import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import Login from '../app/login/page'
import { useRouter } from 'next/navigation'

jest.mock('next/navigation', () => ({
    useRouter: jest.fn()
}))

describe('Login Page', () => {
    const mockPush = jest.fn()
    const mockedUseRouter = useRouter as jest.Mock

    beforeEach(() => {
        mockedUseRouter.mockReturnValue({
            push: mockPush
        })
        document.body.innerHTML = ''
        localStorage.clear()
        window.fetch = jest.fn()
    })

    it('renders login form', () => {
        render(<Login />)
        expect(screen.getByPlaceholderText('admin')).toBeInTheDocument()
    })

    it('handles successful login', async () => {
        (window.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ token: 'mock-token' })
        })

        render(<Login />)
        fireEvent.change(screen.getByPlaceholderText('admin'), { target: { value: 'admin' } })
        fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'admin123' } })
        fireEvent.click(screen.getByText('Sign In'))

        await waitFor(() => {
            expect(localStorage.getItem('token')).toBe('mock-token')
            expect(mockPush).toHaveBeenCalledWith('/')
        })
    })

    it('handles login failure', async () => {
        (window.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false
        })

        render(<Login />)
        fireEvent.change(screen.getByPlaceholderText('admin'), { target: { value: 'admin' } })
        fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'wrong' } })
        fireEvent.click(screen.getByText('Sign In'))

        await waitFor(() => {
            expect(screen.getByText(/Invalid username or password/)).toBeInTheDocument()
        })
    })
})
