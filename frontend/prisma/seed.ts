/**
 * Seed script: mock data for all Prisma models and relations.
 * Run: npx prisma db seed
 * No duplicate emails, usernames, or redundant rows.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.bankingMessage.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.recurringTransaction.deleteMany()
  await prisma.transaction.deleteMany()
  await prisma.budget.deleteMany()
  await prisma.goal.deleteMany()
  await prisma.account.deleteMany()
  await prisma.category.deleteMany()
  await prisma.user.deleteMany()

  const user1 = await prisma.user.create({
    data: {
      email: 'mock.parent@pishbin.demo',
      username: 'mock_parent',
      hashed_password: '$2b$10$mock.hashed.password.placeholder',
      full_name: 'والد نمونه',
      is_active: true,
      is_superuser: false,
    },
  })

  const user2 = await prisma.user.create({
    data: {
      email: 'demo.user@pishbin.demo',
      username: 'demo_user',
      hashed_password: '$2b$10$mock.hashed.password.placeholder',
      full_name: 'کاربر دمو',
      is_active: true,
      is_superuser: false,
    },
  })

  const cat1 = await prisma.category.create({
    data: { name: 'خوراک', description: 'خوراک و رستوران', color: '#22c55e', icon: 'food' },
  })
  const cat2 = await prisma.category.create({
    data: { name: 'حمل‌ونقل', description: 'سوخت و تاکسی', color: '#3b82f6', icon: 'car' },
  })
  const cat3 = await prisma.category.create({
    data: { name: 'حقوق', description: 'درآمد ماهانه', color: '#10b981', icon: 'salary' },
  })

  const acc1 = await prisma.account.create({
    data: {
      user_id: user1.id,
      name: 'حساب جاری اصلی',
      account_type: 'checking',
      balance: 15000.5,
      currency: 'USD',
      description: 'حساب نمونه برای تراکنش‌ها',
      is_active: true,
    },
  })
  const acc2 = await prisma.account.create({
    data: {
      user_id: user1.id,
      name: 'پس‌انداز',
      account_type: 'savings',
      balance: 5000,
      currency: 'USD',
      description: null,
      is_active: true,
    },
  })
  const acc3 = await prisma.account.create({
    data: {
      user_id: user2.id,
      name: 'کارت اعتباری',
      account_type: 'credit_card',
      balance: -200,
      currency: 'USD',
      is_active: true,
    },
  })

  await prisma.transaction.create({
    data: {
      user_id: user1.id,
      account_id: acc1.id,
      category_id: cat3.id,
      amount: 3200,
      transaction_type: 'income',
      description: 'حقوق آبان',
      date: new Date('2025-11-01T10:00:00Z'),
      notes: 'ماه نوامبر',
    },
  })
  const txExpense = await prisma.transaction.create({
    data: {
      user_id: user1.id,
      account_id: acc1.id,
      category_id: cat1.id,
      amount: 45.75,
      transaction_type: 'expense',
      description: 'شام رستوران',
      date: new Date('2025-11-05T19:30:00Z'),
    },
  })
  await prisma.transaction.create({
    data: {
      user_id: user1.id,
      account_id: acc1.id,
      category_id: cat2.id,
      amount: 30,
      transaction_type: 'expense',
      description: 'سوخت',
      date: new Date('2025-11-10T08:00:00Z'),
    },
  })

  await prisma.budget.create({
    data: {
      user_id: user1.id,
      category_id: cat1.id,
      name: 'بودجه خوراک ماهانه',
      amount: 400,
      period: 'monthly',
      start_date: new Date('2025-11-01'),
      end_date: new Date('2025-11-30'),
      is_active: true,
    },
  })
  await prisma.budget.create({
    data: {
      user_id: user1.id,
      category_id: null,
      name: 'بودجه کلی',
      amount: 2000,
      period: 'monthly',
      start_date: new Date('2025-11-01'),
      is_active: true,
    },
  })

  await prisma.goal.create({
    data: {
      user_id: user1.id,
      name: 'صندوق اضطراری',
      description: 'سه ماه هزینه',
      goal_type: 'emergency_fund',
      target_amount: 9000,
      current_amount: 2100,
      target_date: new Date('2026-06-01'),
      status: 'active',
    },
  })
  await prisma.goal.create({
    data: {
      user_id: user2.id,
      name: 'خرید لپ‌تاپ',
      goal_type: 'purchase',
      target_amount: 1200,
      current_amount: 400,
      status: 'active',
    },
  })

  await prisma.bankingMessage.create({
    data: {
      user_id: user1.id,
      raw_text: 'برداشت ۴۵.۷۵ از کارت به مبلغ ۴۵.۷۵ در رستوران نمونه',
      source: 'sms',
      parsed_amount: 45.75,
      parsed_date: new Date('2025-11-05T19:30:00Z'),
      parsed_description: 'رستوران نمونه',
      parsed_type: 'expense',
      suggested_category_id: cat1.id,
      transaction_id: txExpense.id,
    },
  })
  await prisma.bankingMessage.create({
    data: {
      user_id: user1.id,
      raw_text: 'واریز ۳۲۰۰ حقوق',
      source: 'sms',
      parsed_amount: 3200,
      parsed_type: 'income',
    },
  })

  await prisma.payment.create({
    data: {
      user_id: user1.id,
      amount_rials: 500000,
      description: 'شارژ ماهانه',
      authority: 'mock_authority_abc',
      status: 'completed',
      ref_id: 'mock_ref_123',
      gateway: 'zarinpal',
    },
  })
  await prisma.payment.create({
    data: {
      user_id: user2.id,
      amount_rials: 100000,
      description: 'پرداخت تست',
      status: 'pending',
      gateway: 'zarinpal',
    },
  })

  await prisma.recurringTransaction.create({
    data: {
      user_id: user1.id,
      account_id: acc1.id,
      category_id: cat3.id,
      amount: 3200,
      transaction_type: 'income',
      description: 'حقوق ماهانه',
      frequency: 'monthly',
      next_run_date: new Date('2025-12-01'),
      is_active: 1,
    },
  })
  await prisma.recurringTransaction.create({
    data: {
      user_id: user1.id,
      account_id: acc1.id,
      category_id: cat1.id,
      amount: 350,
      transaction_type: 'expense',
      description: 'اجاره',
      frequency: 'monthly',
      next_run_date: new Date('2025-12-01'),
      is_active: 1,
    },
  })

  console.log('Seed completed: users, categories, accounts, transactions, budgets, goals, banking_messages, payments, recurring_transactions.')
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })
