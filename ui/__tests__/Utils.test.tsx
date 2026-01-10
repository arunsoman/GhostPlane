import { cn } from '@/lib/utils'

describe('cn utility', () => {
    it('merges tailwind classes correctly', () => {
        expect(cn('p-4', 'p-2')).toBe('p-2')
        expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500')
    })

    it('handles conditional classes', () => {
        expect(cn('p-4', true && 'm-2', false && 'hidden')).toBe('p-4 m-2')
    })

    it('handles array and object inputs', () => {
        expect(cn(['p-4', 'm-2'])).toBe('p-4 m-2')
        expect(cn({ 'bg-red-500': true, 'hidden': false })).toBe('bg-red-500')
    })
})
