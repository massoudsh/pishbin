/**
 * Mock data for when API is unavailable (guest mode / demo).
 * Used so all tabs (accounts, payments, budgets, goals, reports, recurring, transactions) still render.
 */

export const MOCK_ACCOUNTS = [
  { id: 1, name: 'حساب جاری', account_type: 'CHECKING', balance: 12_500_000, currency: 'IRT', description: null },
  { id: 2, name: 'پس‌انداز', account_type: 'SAVINGS', balance: 45_000_000, currency: 'IRT', description: null },
  { id: 3, name: 'کارت اعتباری', account_type: 'CREDIT_CARD', balance: -2_300_000, currency: 'IRT', description: null },
]

export const MOCK_PAYMENTS = [
  { id: 1, amount_rials: 500_000, description: 'شارژ ماهانه', authority: null, status: 'completed', ref_id: 'REF-001', gateway: 'zarinpal', created_at: new Date().toISOString() },
  { id: 2, amount_rials: 1_200_000, description: 'خرید آنلاین', authority: null, status: 'pending', ref_id: null, gateway: 'zarinpal', created_at: new Date().toISOString() },
]

const now = new Date()
const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

export const MOCK_BUDGETS = [
  { id: 1, name: 'خوراک', amount: 5_000_000, period: 'monthly', start_date: monthStart, end_date: monthEnd, is_active: true, category_id: null, spent: 3_200_000, remaining: 1_800_000, percentage_used: 64 },
  { id: 2, name: 'حمل‌ونقل', amount: 2_000_000, period: 'monthly', start_date: monthStart, end_date: monthEnd, is_active: true, category_id: null, spent: 1_100_000, remaining: 900_000, percentage_used: 55 },
]

export const MOCK_GOALS = [
  { id: 1, name: 'سفر', goal_type: 'savings', target_amount: 50_000_000, current_amount: 12_000_000, target_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: 'active' },
  { id: 2, name: 'لپ‌تاپ', goal_type: 'purchase', target_amount: 80_000_000, current_amount: 25_000_000, target_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: 'active' },
]

export const MOCK_TRANSACTIONS = [
  { id: 1, account_id: 1, category_id: null, amount: 500_000, transaction_type: 'expense', description: 'خرید از فروشگاه', date: new Date().toISOString() },
  { id: 2, account_id: 1, category_id: null, amount: 15_000_000, transaction_type: 'income', description: 'حقوق', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 3, account_id: 2, category_id: null, amount: 2_000_000, transaction_type: 'expense', description: 'بنزین', date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
]

export const MOCK_RECURRING = [
  { id: 1, account_id: 1, amount: 8_500_000, transaction_type: 'income', description: 'حقوق ماهانه', frequency: 'monthly', next_run_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], is_active: 1 },
  { id: 2, account_id: 1, amount: 3_500_000, transaction_type: 'expense', description: 'اجاره', frequency: 'monthly', next_run_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], is_active: 1 },
]

export const MOCK_CHECKS = [
  { id: 1, account_id: 1, direction: 'received' as const, counterparty_name: 'شرکت الف', amount: 5_000_000, bank_name: 'بانک ملت', check_number: null, sayad_id: null, due_date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: 'pending' as const, description: null },
  { id: 2, account_id: 1, direction: 'issued' as const, counterparty_name: 'تامین‌کننده ب', amount: 2_500_000, bank_name: 'بانک ملی', check_number: null, sayad_id: null, due_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: 'pending' as const, description: null },
]

export const MOCK_CUSTOMERS = [
  { id: 1, name: 'شرکت الف', phone: '09120000000', email: null, national_id: null, notes: null, created_at: new Date().toISOString() },
  { id: 2, name: 'فروشگاه ب', phone: null, email: null, national_id: null, notes: null, created_at: new Date().toISOString() },
]

export const MOCK_INVOICES = [
  { id: 1, customer_id: 1, amount: 8_000_000, issue_date: new Date().toISOString().split('T')[0], due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], paid_date: null, status: 'issued' as const, description: null },
  { id: 2, customer_id: 2, amount: 3_000_000, issue_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], paid_date: null, status: 'overdue' as const, description: null },
]

export const MOCK_EXPENSES_BY_CATEGORY = [
  { category_id: 1, total: 3_200_000, name: 'خوراک' },
  { category_id: 2, total: 1_100_000, name: 'حمل‌ونقل' },
  { category_id: 3, total: 800_000, name: 'سرگرمی' },
]

export const MOCK_INCOME_VS_EXPENSES = {
  income: 15_000_000,
  expenses: 5_100_000,
  net: 9_900_000,
}
