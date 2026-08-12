/**
 * API client for backend communication.
 */
import axios, { AxiosInstance, AxiosError } from 'axios';
import { DashboardSummarySchema, type DashboardSummary } from '@/lib/schemas/dashboard'
import { FounderOverviewSchema, type FounderOverview } from '@/lib/schemas/founder'
import { AccountsSchema, type Accounts } from '@/lib/schemas/account'
import {
  ExpensesByCategorySchema,
  IncomeVsExpensesSchema,
  type ExpensesByCategory,
  type IncomeVsExpenses,
} from '@/lib/schemas/reports'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

/** Get a user-friendly error message from an Axios or API error. */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data?.detail) {
      if (typeof data.detail === 'string') return data.detail;
      if (Array.isArray(data.detail)) {
        const first = data.detail[0];
        if (first?.msg) return first.msg;
      }
    }
    if (error.response?.status === 401) return 'Please sign in to continue.';
    if (error.response?.status === 404) return 'The requested item was not found.';
    if (error.response?.status === 422) return 'Please check your input and try again.';
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Handle unauthorized - clear token.
          // NOTE: We intentionally do NOT redirect to /login here to allow "guest mode"
          // and avoid forcing auth UX for users who just want to explore the app.
          this.clearToken();
        }
        return Promise.reject(error);
      }
    );
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }

  private clearToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('access_token', token);
  }

  setRefreshToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('refresh_token', token);
  }

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refresh_token');
  }

  /** Refresh access token using refresh token. Returns new token data or throws. */
  async refreshToken(): Promise<{ access_token: string; refresh_token: string; token_type: string }> {
    const refresh = this.getRefreshToken();
    if (!refresh) throw new Error('No refresh token');
    const response = await this.client.post('/auth/refresh', { refresh_token: refresh });
    const data = response.data;
    if (data.access_token) {
      this.setToken(data.access_token);
      this.setRefreshToken(data.refresh_token);
    }
    return data;
  }

  logout(): void {
    this.clearToken();
  }

  // Auth endpoints
  async register(data: { email: string; username: string; password: string; full_name?: string }) {
    const response = await this.client.post('/auth/register', data);
    return response.data;
  }

  async login(username: string, password: string): Promise<
    | { access_token: string; refresh_token: string; token_type: string }
    | { requires_2fa: true; temp_token: string }
  > {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    const response = await this.client.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const data = response.data;
    if (data.requires_2fa && data.temp_token) {
      return { requires_2fa: true, temp_token: data.temp_token };
    }
    if (data.access_token) {
      this.setToken(data.access_token);
      this.setRefreshToken(data.refresh_token);
    }
    return data;
  }

  async verify2faLogin(tempToken: string, code: string): Promise<{ access_token: string; refresh_token: string; token_type: string }> {
    const response = await this.client.post('/auth/2fa/verify-login', { temp_token: tempToken, code });
    const data = response.data;
    if (data.access_token) {
      this.setToken(data.access_token);
      this.setRefreshToken(data.refresh_token);
    }
    return data;
  }

  async get2faSetup(): Promise<{ secret: string; provisioning_uri: string }> {
    const response = await this.client.get('/auth/2fa/setup');
    return response.data;
  }

  async enable2fa(code: string, secret: string): Promise<void> {
    await this.client.post('/auth/2fa/enable', { code, secret });
  }

  async disable2fa(password: string): Promise<void> {
    await this.client.post('/auth/2fa/disable', { password });
  }

  async getCurrentUser() {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  async forgotPassword(email: string) {
    const response = await this.client.post('/auth/forgot-password', { email });
    return response.data as { message: string };
  }

  async resetPassword(token: string, newPassword: string) {
    const response = await this.client.post('/auth/reset-password', { token, new_password: newPassword });
    return response.data as { message: string };
  }

  async updateProfile(data: { email?: string; username?: string; full_name?: string; dashboard_preferences?: { widget_ids?: string[] } }) {
    const response = await this.client.patch('/auth/me', data);
    return response.data as { email?: string; username?: string; full_name?: string | null; dashboard_preferences?: { widget_ids?: string[] } | null };
  }

  // API keys (programmatic access)
  async listApiKeys(): Promise<Array<{ id: number; name: string; last_used_at: string | null; created_at: string }>> {
    const response = await this.client.get('/api-keys');
    return response.data;
  }

  async createApiKey(name: string): Promise<{ id: number; name: string; key: string; message?: string }> {
    const response = await this.client.post('/api-keys', { name });
    return response.data;
  }

  async revokeApiKey(keyId: number): Promise<void> {
    await this.client.delete(`/api-keys/${keyId}`);
  }

  async getBackup(): Promise<Record<string, unknown>> {
    const response = await this.client.get('/backup');
    return response.data;
  }

  async restoreBackup(file: File, confirm: boolean): Promise<{ message: string }> {
    const form = new FormData();
    form.append('file', file);
    const response = await this.client.post(`/backup/restore?confirm=${confirm}`, form);
    return response.data;
  }

  async getSpendingInsights(): Promise<{
    this_month_income: number;
    this_month_expenses: number;
    last_month_income: number;
    last_month_expenses: number;
    expense_change_pct: number;
    narrative: string;
  }> {
    const response = await this.client.get('/reports/insights');
    return response.data;
  }

  // Account endpoints
  async getAccounts() {
    const response = await this.client.get('/accounts');
    return AccountsSchema.parse(response.data) as Accounts;
  }

  async getAccount(id: number) {
    const response = await this.client.get(`/accounts/${id}`);
    return response.data;
  }

  async createAccount(data: any) {
    const response = await this.client.post('/accounts', data);
    return response.data;
  }

  async updateAccount(id: number, data: any) {
    const response = await this.client.put(`/accounts/${id}`, data);
    return response.data;
  }

  async deleteAccount(id: number) {
    await this.client.delete(`/accounts/${id}`);
  }

  // Category endpoints (for costs and AI suggestion)
  async getCategories() {
    const response = await this.client.get('/categories');
    return response.data as Array<{ id: number; name: string; description?: string; color?: string }>;
  }

  // Transaction endpoints
  async getTransactions(params?: any) {
    const response = await this.client.get('/transactions', { params });
    return response.data;
  }

  async getTransaction(id: number) {
    const response = await this.client.get(`/transactions/${id}`);
    return response.data;
  }

  async createTransaction(data: any, force = false) {
    const response = await this.client.post('/transactions', data, {
      params: force ? { force: 'true' } : undefined,
    });
    return response.data;
  }

  async updateTransaction(id: number, data: any) {
    const response = await this.client.put(`/transactions/${id}`, data);
    return response.data;
  }

  async deleteTransaction(id: number) {
    await this.client.delete(`/transactions/${id}`);
  }

  // Banking messages (parse, suggest category, create transaction)
  async parseBankingMessage(rawText: string) {
    const response = await this.client.post('/banking-messages/parse', { raw_text: rawText });
    return response.data as {
      amount: number | null;
      date: string | null;
      description: string | null;
      transaction_type: string;
      suggested_category_id: number | null;
      suggested_category_name: string | null;
    };
  }

  async createBankingMessage(rawText: string, source?: string) {
    const response = await this.client.post('/banking-messages', { raw_text: rawText, source });
    return response.data;
  }

  async getBankingMessages(limit?: number) {
    const response = await this.client.get('/banking-messages', { params: { limit } });
    return response.data;
  }

  async createTransactionFromMessage(messageId: number, accountId: number, categoryId?: number) {
    const response = await this.client.post(`/banking-messages/${messageId}/create-transaction`, {
      account_id: accountId,
      category_id: categoryId ?? undefined,
    });
    return response.data;
  }

  // Payments (ZarinPal gateway)
  async requestZarinPalPayment(data: {
    amount_rials: number;
    description?: string;
    email?: string;
    mobile?: string;
  }) {
    const response = await this.client.post('/payments/zarinpal/request', data);
    return response.data as { payment_url: string; authority: string; amount_rials: number };
  }

  async getPayments(limit?: number) {
    const response = await this.client.get('/payments', { params: { limit } });
    return response.data as Array<{
      id: number;
      amount_rials: number;
      description: string | null;
      authority: string | null;
      status: string;
      ref_id: string | null;
      gateway: string;
      created_at: string | null;
    }>;
  }

  async recordPaymentAsIncome(paymentId: number, accountId: number) {
    const response = await this.client.post(`/payments/${paymentId}/record-income`, {
      account_id: accountId,
    });
    return response.data;
  }

  // Recurring transactions
  async runRecurringNow(): Promise<{ processed: number; created: number }> {
    const response = await this.client.post('/recurring/run-now');
    return response.data;
  }

  async getRecurring(limit?: number) {
    const response = await this.client.get('/recurring', { params: { limit } });
    return response.data as Array<{
      id: number;
      account_id: number;
      category_id: number | null;
      amount: number;
      transaction_type: string;
      description: string | null;
      frequency: string;
      next_run_date: string;
      is_active: number;
      created_at: string | null;
    }>;
  }

  async createRecurring(data: {
    account_id: number;
    category_id?: number;
    amount: number;
    transaction_type: 'income' | 'expense';
    description?: string;
    frequency: 'weekly' | 'monthly' | 'yearly';
    next_run_date: string;
  }) {
    const response = await this.client.post('/recurring', data);
    return response.data;
  }

  async updateRecurring(id: number, data: Partial<{ account_id: number; category_id: number; amount: number; transaction_type: string; description: string; frequency: string; next_run_date: string; is_active: number }>) {
    const response = await this.client.patch(`/recurring/${id}`, data);
    return response.data;
  }

  async deleteRecurring(id: number) {
    await this.client.delete(`/recurring/${id}`);
  }

  // Checks (cheques)
  async getChecks(params?: { status_filter?: string; account_id?: number }) {
    const response = await this.client.get('/checks', { params });
    return response.data as Array<{
      id: number;
      account_id: number;
      direction: 'issued' | 'received';
      counterparty_name: string;
      amount: number;
      bank_name: string | null;
      check_number: string | null;
      sayad_id: string | null;
      due_date: string;
      status: 'pending' | 'cleared' | 'bounced' | 'voided';
      description: string | null;
      created_at: string | null;
    }>;
  }

  async createCheck(data: {
    account_id: number;
    direction: 'issued' | 'received';
    counterparty_name: string;
    amount: number;
    bank_name?: string;
    check_number?: string;
    sayad_id?: string;
    due_date: string;
    description?: string;
  }) {
    const response = await this.client.post('/checks', data);
    return response.data;
  }

  async updateCheck(id: number, data: Partial<{ status: string; direction: string; counterparty_name: string; amount: number; bank_name: string; check_number: string; sayad_id: string; due_date: string; description: string }>) {
    const response = await this.client.put(`/checks/${id}`, data);
    return response.data;
  }

  async deleteCheck(id: number) {
    await this.client.delete(`/checks/${id}`);
  }

  async getCheckCashFlowForecast(days = 30) {
    const response = await this.client.get('/checks/cash-flow-forecast', { params: { days } });
    return response.data as {
      days: number;
      events: Array<{ check_id: number; due_date: string; direction: string; amount: number; counterparty_name: string }>;
      total_inflow: number;
      total_outflow: number;
      net: number;
    };
  }

  // Customers
  async getCustomers() {
    const response = await this.client.get('/customers');
    return response.data as Array<{
      id: number;
      name: string;
      phone: string | null;
      email: string | null;
      national_id: string | null;
      notes: string | null;
      created_at: string | null;
    }>;
  }

  async createCustomer(data: { name: string; phone?: string; email?: string; national_id?: string; notes?: string }) {
    const response = await this.client.post('/customers', data);
    return response.data;
  }

  async updateCustomer(id: number, data: Partial<{ name: string; phone: string; email: string; national_id: string; notes: string }>) {
    const response = await this.client.put(`/customers/${id}`, data);
    return response.data;
  }

  async deleteCustomer(id: number) {
    await this.client.delete(`/customers/${id}`);
  }

  async getCustomerScore(id: number) {
    const response = await this.client.get(`/customers/${id}/score`);
    return response.data as {
      customer_id: number;
      total_invoices: number;
      paid_invoices: number;
      avg_days_late: number;
      total_checks: number;
      bounced_checks: number;
      bounced_check_rate: number;
    };
  }

  // Invoices
  async getInvoices(params?: { customer_id?: number }) {
    const response = await this.client.get('/invoices', { params });
    return response.data as Array<{
      id: number;
      customer_id: number;
      amount: number;
      issue_date: string;
      due_date: string;
      paid_date: string | null;
      status: 'issued' | 'paid' | 'overdue' | 'cancelled';
      description: string | null;
      created_at: string | null;
    }>;
  }

  async createInvoice(data: { customer_id: number; amount: number; issue_date: string; due_date: string; description?: string }) {
    const response = await this.client.post('/invoices', data);
    return response.data;
  }

  async updateInvoice(id: number, data: Partial<{ customer_id: number; amount: number; issue_date: string; due_date: string; paid_date: string; status: string; description: string }>) {
    const response = await this.client.put(`/invoices/${id}`, data);
    return response.data;
  }

  async deleteInvoice(id: number) {
    await this.client.delete(`/invoices/${id}`);
  }

  // Combined cash-flow forecast (checks + invoices + historical trend)
  async getCashFlowForecast(days = 30) {
    const response = await this.client.get('/dashboard/cash-flow-forecast', { params: { days } });
    return response.data as {
      days: number;
      current_balance: number;
      known_events_net: number;
      trend_net: number;
      projected_net: number;
      projected_balance: number;
      check_events: Array<{ check_id: number; due_date: string; direction: string; amount: number; counterparty_name: string }>;
      invoice_events: Array<{ invoice_id: number; customer_id: number; due_date: string; amount: number; overdue: boolean }>;
    };
  }

  async getCashFlowAlerts(days = 30) {
    const response = await this.client.get('/alerts/cash-flow', { params: { days } });
    return response.data as Array<{
      type: string;
      days: number;
      current_balance: number;
      projected_balance: number;
      threshold: number;
      alert_type: 'warning' | 'critical';
    }>;
  }

  // Budget endpoints
  async getBudgets() {
    const response = await this.client.get('/budgets');
    return response.data;
  }

  async getBudget(id: number) {
    const response = await this.client.get(`/budgets/${id}`);
    return response.data;
  }

  async createBudget(data: any) {
    const response = await this.client.post('/budgets', data);
    return response.data;
  }

  async updateBudget(id: number, data: any) {
    const response = await this.client.put(`/budgets/${id}`, data);
    return response.data;
  }

  async deleteBudget(id: number) {
    await this.client.delete(`/budgets/${id}`);
  }

  // Goal endpoints
  async getGoals() {
    const response = await this.client.get('/goals');
    return response.data;
  }

  async getGoal(id: number) {
    const response = await this.client.get(`/goals/${id}`);
    return response.data;
  }

  async createGoal(data: any) {
    const response = await this.client.post('/goals', data);
    return response.data;
  }

  async updateGoal(id: number, data: any) {
    const response = await this.client.put(`/goals/${id}`, data);
    return response.data;
  }

  async deleteGoal(id: number) {
    await this.client.delete(`/goals/${id}`);
  }

  // Dashboard endpoints
  async getDashboardSummary() {
    const response = await this.client.get('/dashboard/summary');
    return DashboardSummarySchema.parse(response.data) as DashboardSummary;
  }

  /** Founder Financial Command Center: KPIs, sparklines, burn intelligence. */
  async getFounderOverview(): Promise<FounderOverview> {
    const response = await this.client.get('/dashboard/founder-overview');
    return FounderOverviewSchema.parse(response.data) as FounderOverview;
  }

  // Report endpoints
  async getExpensesByCategory(startDate?: string, endDate?: string) {
    const response = await this.client.get('/reports/expenses-by-category', {
      params: { start_date: startDate, end_date: endDate },
    });
    return ExpensesByCategorySchema.parse(response.data) as ExpensesByCategory;
  }

  async getIncomeVsExpenses(startDate?: string, endDate?: string) {
    const response = await this.client.get('/reports/income-vs-expenses', {
      params: { start_date: startDate, end_date: endDate },
    });
    return IncomeVsExpensesSchema.parse(response.data) as IncomeVsExpenses;
  }

  /** Export transactions as CSV blob (for download). */
  async exportTransactions(startDate?: string, endDate?: string): Promise<Blob> {
    const params: Record<string, string> = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const response = await this.client.get('/transactions/export', {
      params,
      responseType: 'blob',
    });
    return response.data as Blob;
  }

  /** Import transactions from CSV. Returns { created, errors, total_rows }. */
  async importTransactions(file: File, accountId: number): Promise<{ created: number; errors: string[]; total_rows: number }> {
    const form = new FormData();
    form.append('file', file);
    const response = await this.client.post(
      `/transactions/import?account_id=${accountId}`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  }

  /** Get budget alerts (e.g. budgets at or over 80% spent). */
  async getAlerts(): Promise<Array<{ budget_id: number; budget_name: string; spent: number; budget_amount: number; percentage: number; alert_type: string }>> {
    const response = await this.client.get('/alerts');
    return response.data;
  }

  /** Reconcile a bank statement CSV against existing transactions for an account. */
  async reconcileBankStatement(file: File, accountId: number, windowDays = 3): Promise<{
    account_id: number;
    total_rows: number;
    matched_count: number;
    unmatched_count: number;
    matches: Array<{
      row_index: number;
      statement_date: string;
      statement_amount: string;
      statement_description: string | null;
      transaction_id: number;
      transaction_date: string;
    }>;
    unmatched: Array<{
      row_index: number;
      statement_date: string;
      statement_amount: string;
      statement_type: string;
      statement_description: string | null;
      reason: string;
    }>;
    row_errors: string[];
  }> {
    const form = new FormData();
    form.append('file', file);
    const response = await this.client.post(
      `/reconciliation/bank-statement?account_id=${accountId}&window_days=${windowDays}`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  }

}

export const apiClient = new ApiClient();

