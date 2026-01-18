import { addMonths, addYears } from 'date-fns'

export function calculateEndDate(
  startDate: Date | string,
  planType: 'Monthly' | 'Quarterly' | 'Yearly'
): Date {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate

  switch (planType) {
    case 'Monthly':
      return addMonths(start, 1)
    case 'Quarterly':
      return addMonths(start, 3)
    case 'Yearly':
      return addYears(start, 1)
    default:
      return addMonths(start, 1)
  }
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount)
}
