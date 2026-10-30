/**
 * Account schemas (zod) for runtime validation of API responses.
 *
 * Purpose: Keep frontend resilient to backend response changes.
 * Author: Cursor AI
 * Date: 2025-12-12
 */
import { z } from 'zod'

export const AccountSchema = z.object({
  id: z.number(),
  user_id: z.number().optional(),
  name: z.string(),
  account_type: z.string(),
  balance: z.union([z.number(), z.string().regex(/^-?\d+(\.\d+)?$/).transform(Number)]).pipe(z.number().finite()),
  currency: z.string().default('IRT'),
  description: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
})

export type Account = z.infer<typeof AccountSchema>

export const AccountsSchema = z.array(AccountSchema)
export type Accounts = z.infer<typeof AccountsSchema>

const accountTypeEnum = z.enum(['checking', 'savings', 'credit_card', 'investment', 'loan', 'other'])

export const AccountCreateSchema = z.object({
  business_id: z.number().int().positive('Select a business'),
  name: z.string().min(1, 'Name is required').max(100),
  account_type: accountTypeEnum,
  balance: z.number().default(0),
  currency: z.string().length(3).default('IRT'),
  description: z.string().max(500).optional().nullable(),
})
export type AccountCreate = z.infer<typeof AccountCreateSchema>

export const AccountUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  account_type: accountTypeEnum.optional(),
  balance: z.number().optional(),
  currency: z.string().length(3).optional(), // IRT = Toman
  description: z.string().max(500).optional().nullable(),
  is_active: z.boolean().optional(),
})
export type AccountUpdate = z.infer<typeof AccountUpdateSchema>


