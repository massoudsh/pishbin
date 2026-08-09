/**
 * Example API route using Prisma + PostgreSQL (mock/seed data).
 * GET /api/prisma-mock returns a summary of seeded data to verify connection and relations.
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const [userCount, accountCount, categoryCount, transactionCount] = await Promise.all([
      prisma.user.count(),
      prisma.account.count(),
      prisma.category.count(),
      prisma.transaction.count(),
    ])

    const sampleUser = await prisma.user.findFirst({
      include: {
        accounts: { select: { id: true, name: true, balance: true, account_type: true } },
      },
    })

    return NextResponse.json({
      ok: true,
      message: 'Prisma connected to PostgreSQL (mock/seed data).',
      counts: {
        users: userCount,
        accounts: accountCount,
        categories: categoryCount,
        transactions: transactionCount,
      },
      sample_user: sampleUser
        ? {
            id: sampleUser.id,
            email: sampleUser.email,
            username: sampleUser.username,
            full_name: sampleUser.full_name,
            accounts: sampleUser.accounts,
          }
        : null,
    })
  } catch (e) {
    console.error('Prisma API error:', e)
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Database error' },
      { status: 500 }
    )
  }
}
