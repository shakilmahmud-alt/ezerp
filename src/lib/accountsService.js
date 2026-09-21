import { supabase } from './supabaseClient';

// Helper for local persistent fallback storage
const getLocal = (key, defaultVal) => {
  try {
    const raw = localStorage.getItem(`erp_acc_${key}`);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
};

const setLocal = (key, val) => {
  try {
    localStorage.setItem(`erp_acc_${key}`, JSON.stringify(val));
  } catch (e) {
    console.error('Storage error:', e);
  }
};

// System Expense Categories
const DEFAULT_EXPENSE_CATEGORIES = [
  { id: '1', code: 'EXP-001', name: 'Showroom & Office Rent' },
  { id: '2', code: 'EXP-002', name: 'Electricity & Utility Bills' },
  { id: '3', code: 'EXP-003', name: 'Transportation & Conveyance' },
  { id: '4', code: 'EXP-004', name: 'Entertainment & Refreshment' },
  { id: '5', code: 'EXP-005', name: 'Marketing & Promotions' },
  { id: '6', code: 'EXP-006', name: 'Office Supplies & Stationery' },
  { id: '7', code: 'EXP-007', name: 'Maintenance & Repairs' },
  { id: '8', code: 'EXP-008', name: 'Internet & Telephone' },
  { id: '9', code: 'EXP-009', name: 'Staff Welfare & Medical' },
  { id: '10', code: 'EXP-010', name: 'Government Taxes & Fees' }
];

// Standard Cash & Bank Account heads initialized with 0 balance
const DEFAULT_BANK_ACCOUNTS = [
  { id: 'bank-1', account_name: 'Cash in Hand (Main Drawer)', account_type: 'Cash', bank_name: 'Main Cash', account_number: 'CASH-001', branch: 'Head Office', initial_balance: 0, current_balance: 0 },
  { id: 'bank-2', account_name: 'Islami Bank Bangladesh Ltd (CD)', account_type: 'Bank', bank_name: 'IBBL', account_number: '20501450200345678', branch: 'Dhanmondi Branch', initial_balance: 0, current_balance: 0 },
  { id: 'bank-3', account_name: 'Dutch-Bangla Bank Ltd (Current)', account_type: 'Bank', bank_name: 'DBBL', account_number: '1171100098765', branch: 'Banani Branch', initial_balance: 0, current_balance: 0 },
  { id: 'bank-4', account_name: 'bKash Merchant Account', account_type: 'Mobile Banking', bank_name: 'bKash', account_number: '01711000000', branch: 'Corporate Wallet', initial_balance: 0, current_balance: 0 }
];

const DEFAULT_CHART_OF_ACCOUNTS = [
  // 1000 - Assets
  { id: '1000', code: '1000', name: 'ASSETS', type: 'Asset', parent_code: null },
  { id: '1100', code: '1100', name: 'Current Assets', type: 'Asset', parent_code: '1000' },
  { id: '1110', code: '1110', name: 'Cash in Hand', type: 'Asset', parent_code: '1100' },
  { id: '1120', code: '1120', name: 'Cash at Bank', type: 'Asset', parent_code: '1100' },
  { id: '1130', code: '1130', name: 'Accounts Receivable', type: 'Asset', parent_code: '1100' },
  { id: '1140', code: '1140', name: 'Inventory / Merchandise Stock', type: 'Asset', parent_code: '1100' },
  { id: '1200', code: '1200', name: 'Fixed Assets (Showroom, IT & Furniture)', type: 'Asset', parent_code: '1000' },

  // 2000 - Liabilities
  { id: '2000', code: '2000', name: 'LIABILITIES', type: 'Liability', parent_code: null },
  { id: '2100', code: '2100', name: 'Current Liabilities', type: 'Liability', parent_code: '2000' },
  { id: '2110', code: '2110', name: 'Accounts Payable', type: 'Liability', parent_code: '2100' },
  { id: '2120', code: '2120', name: 'After-Sale Consignment Payable', type: 'Liability', parent_code: '2100' },
  { id: '2130', code: '2130', name: 'Salaries & Wages Payable', type: 'Liability', parent_code: '2100' },
  { id: '2140', code: '2140', name: 'VAT & Tax Payable', type: 'Liability', parent_code: '2100' },

  // 3000 - Equity
  { id: '3000', code: '3000', name: 'EQUITY', type: 'Equity', parent_code: null },
  { id: '3100', code: '3100', name: 'Owner Capital', type: 'Equity', parent_code: '3000' },
  { id: '3200', code: '3200', name: 'Retained Earnings', type: 'Equity', parent_code: '3000' },

  // 4000 - Income / Revenue
  { id: '4000', code: '4000', name: 'INCOME / REVENUE', type: 'Income', parent_code: null },
  { id: '4100', code: '4100', name: 'Sales Revenue (POS)', type: 'Income', parent_code: '4000' },
  { id: '4200', code: '4200', name: 'Discount Received from Vendors', type: 'Income', parent_code: '4000' },
  { id: '4300', code: '4300', name: 'Other Operating Income', type: 'Income', parent_code: '4000' },

  // 5000 - Expenses
  { id: '5000', code: '5000', name: 'EXPENSES', type: 'Expense', parent_code: null },
  { id: '5100', code: '5100', name: 'Cost of Goods Sold (Purchases - Central Store)', type: 'Expense', parent_code: '5000' },
  { id: '5150', code: '5150', name: 'Store Damage & Lost Expense', type: 'Expense', parent_code: '5000' },
  { id: '5200', code: '5200', name: 'Operating Expenses', type: 'Expense', parent_code: '5000' },
  { id: '5210', code: '5210', name: 'Salaries & Staff Benefits', type: 'Expense', parent_code: '5200' },
  { id: '5220', code: '5220', name: 'Rent & Office Utilities', type: 'Expense', parent_code: '5200' },
  { id: '5230', code: '5230', name: 'Transport & Logistics', type: 'Expense', parent_code: '5200' },
  { id: '5240', code: '5240', name: 'Marketing & Promotions', type: 'Expense', parent_code: '5200' },
  { id: '5250', code: '5250', name: 'Office Stationery & Entertainment', type: 'Expense', parent_code: '5200' },
  { id: '5260', code: '5260', name: 'Depreciation & Amortization', type: 'Expense', parent_code: '5200' }
];

export const accountsService = {
  // -------------------------------------------------------------
  // 1. BANK & CASH ACCOUNTS (WITH DYNAMIC BALANCE CALCULATION)
  // -------------------------------------------------------------
  async getBankAccounts() {
    let rawAccounts = [];
    try {
      const { data, error } = await supabase.from('accounts_bank_accounts').select('*').order('account_name');
      if (!error && data && data.length > 0) {
        rawAccounts = data;
      }
    } catch (e) {}

    if (rawAccounts.length === 0) {
      rawAccounts = DEFAULT_BANK_ACCOUNTS;
      setLocal('bank_accounts', DEFAULT_BANK_ACCOUNTS);
    } else {
      // Auto-clean legacy demo initial balances cached from previous sessions
      let needsResave = false;
      rawAccounts = rawAccounts.map(a => {
        if ([150000, 850000, 420000, 65000].includes(Number(a.initial_balance))) {
          needsResave = true;
          return { ...a, initial_balance: 0 };
        }
        return a;
      });
      if (needsResave) setLocal('bank_accounts', rawAccounts);
    }

    // Now compute real dynamic balances for Cash and Banks from transactions:
    try {
      const [salesRes, colRes, expRes, vpRes, prsRes, salRes] = await Promise.all([
        supabase.from('sales').select('net_amount, total_amount, paid_amount, payment_type, status'),
        this.getCustomerCollections(),
        this.getExpenses(),
        this.getVendorPayments(),
        supabase.from('purchase_receives').select('net_amount, total_value, supplier_payment_type, payment_type'),
        this.getSalaries()
      ]);

      const sales = salesRes.data || [];
      const collections = colRes || [];
      const expenses = expRes || [];
      const vendorPayments = vpRes || [];
      const purchaseReceives = prsRes.data || [];
      const salaries = (salRes || []).filter(s => s.payment_status === 'Paid');

      // Cash Inflows:
      // 1. POS Cash Sales
      const posCashSales = sales
        .filter(s => !s.payment_type || s.payment_type === 'Cash' || s.payment_type === 'cash')
        .reduce((sum, s) => sum + Number(s.paid_amount || 0), 0);

      // 2. POS Digital/Bank Sales
      const posBankSales = sales
        .filter(s => s.payment_type && s.payment_type !== 'Cash' && s.payment_type !== 'cash')
        .reduce((sum, s) => sum + Number(s.paid_amount || 0), 0);

      // Cash Outflows:
      // Cash Purchases from Central Store
      const cashPurchasesOut = purchaseReceives
        .filter(pr => pr.supplier_payment_type === 'CashPurchase' || (!pr.supplier_payment_type && pr.payment_type === 'Cash'))
        .reduce((sum, pr) => sum + Number(pr.net_amount || pr.total_value || 0), 0);

      // Compute dynamic balance for each configured account:
      return rawAccounts.map(acc => {
        const init = Number(acc.initial_balance || 0);
        let dynamicBalance = init;

        if (acc.account_type === 'Cash') {
          // Cash Inflows
          const cashCollections = collections
            .filter(c => !c.payment_mode || c.payment_mode === 'Cash')
            .reduce((sum, c) => sum + Number(c.amount || 0), 0);

          // Cash Outflows
          const cashExpenses = expenses
            .filter(e => !e.payment_mode || e.payment_mode === 'Cash')
            .reduce((sum, e) => sum + Number(e.amount || 0), 0);

          const cashVp = vendorPayments
            .filter(vp => !vp.payment_mode || vp.payment_mode === 'Cash')
            .reduce((sum, vp) => sum + Number(vp.amount || 0), 0);

          const cashSal = salaries
            .filter(s => !s.payment_mode || s.payment_mode === 'Cash')
            .reduce((sum, s) => sum + Number(s.net_salary || 0), 0);

          dynamicBalance = init + posCashSales + cashCollections - (cashExpenses + cashVp + cashPurchasesOut + cashSal);
        } else {
          // Bank / Mobile account
          const bankName = acc.account_name;
          const bankCollections = collections
            .filter(c => c.payment_mode !== 'Cash' && (c.bank_account_name === bankName || (!c.bank_account_name && acc.account_type === 'Bank')))
            .reduce((sum, c) => sum + Number(c.amount || 0), 0);

          const bankExpenses = expenses
            .filter(e => e.payment_mode !== 'Cash' && (e.bank_account_name === bankName || (!e.bank_account_name && acc.account_type === 'Bank')))
            .reduce((sum, e) => sum + Number(e.amount || 0), 0);

          const bankVp = vendorPayments
            .filter(vp => vp.payment_mode !== 'Cash' && (vp.bank_account_name === bankName || (!vp.bank_account_name && acc.account_type === 'Bank')))
            .reduce((sum, vp) => sum + Number(vp.amount || 0), 0);

          const bankSal = salaries
            .filter(s => s.payment_mode !== 'Cash' && (s.bank_account_name === bankName || (!s.bank_account_name && acc.account_type === 'Bank')))
            .reduce((sum, s) => sum + Number(s.net_salary || 0), 0);

          // If it's a primary bank account, also include POS digital receipts
          const digitalReceipts = (acc.account_type === 'Bank' && acc.id === 'bank-2') ? posBankSales : 0;

          dynamicBalance = init + digitalReceipts + bankCollections - (bankExpenses + bankVp + bankSal);
        }

        return {
          ...acc,
          current_balance: Number(dynamicBalance.toFixed(2))
        };
      });
    } catch (err) {
      console.warn('Dynamic balance calculation fallback:', err);
      return rawAccounts;
    }
  },

  async saveBankAccount(account) {
    try {
      if (account.id && !account.id.startsWith('bank-')) {
        const { data, error } = await supabase.from('accounts_bank_accounts').upsert(account).select().single();
        if (!error && data) return data;
      }
    } catch (e) {}
    const list = getLocal('bank_accounts', DEFAULT_BANK_ACCOUNTS);
    const id = account.id || `bank-${Date.now()}`;
    const updated = { ...account, id, current_balance: Number(account.current_balance || account.initial_balance || 0) };
    const idx = list.findIndex(a => a.id === id);
    if (idx >= 0) list[idx] = updated;
    else list.push(updated);
    setLocal('bank_accounts', list);
    return updated;
  },

  // -------------------------------------------------------------
  // 2. EXPENSE CATEGORIES & EXPENSES
  // -------------------------------------------------------------
  async getExpenseCategories() {
    try {
      const { data, error } = await supabase.from('accounts_expense_categories').select('*').order('name');
      if (!error && data && data.length > 0) return data;
    } catch (e) {}
    return getLocal('expense_categories', DEFAULT_EXPENSE_CATEGORIES);
  },

  async addExpenseCategory(cat) {
    try {
      const { data, error } = await supabase.from('accounts_expense_categories').insert(cat).select().single();
      if (!error && data) return data;
    } catch (e) {}
    const list = getLocal('expense_categories', DEFAULT_EXPENSE_CATEGORIES);
    const newCat = { ...cat, id: `cat-${Date.now()}` };
    list.push(newCat);
    setLocal('expense_categories', list);
    return newCat;
  },

  async getExpenses(filters = {}) {
    try {
      let query = supabase.from('accounts_expenses').select('*').order('expense_date', { ascending: false });
      if (filters.fromDate) query = query.gte('expense_date', filters.fromDate);
      if (filters.toDate) query = query.lte('expense_date', filters.toDate);
      if (filters.category && filters.category !== 'ALL') query = query.eq('category', filters.category);
      const { data, error } = await query;
      if (!error && data) return data;
    } catch (e) {}
    let list = getLocal('expenses', []);
    if (filters.fromDate) list = list.filter(e => e.expense_date >= filters.fromDate);
    if (filters.toDate) list = list.filter(e => e.expense_date <= filters.toDate);
    if (filters.category && filters.category !== 'ALL') list = list.filter(e => e.category === filters.category);
    return list;
  },

  async saveExpense(expense) {
    const voucherNo = expense.voucher_no || this.generateVoucherNo('Debit Voucher (Payment)');
    const record = {
      ...expense,
      voucher_no: voucherNo,
      amount: Number(expense.amount || 0),
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase.from('accounts_expenses').insert(record).select().single();
      if (!error && data) {
        await this.saveVoucher({
          voucher_no: voucherNo,
          voucher_type: 'Debit Voucher (Payment)',
          voucher_date: expense.expense_date,
          debit_account: `Expense: ${expense.category}`,
          credit_account: expense.payment_mode === 'Cash' ? 'Cash in Hand' : `Bank (${expense.bank_account_name || 'Bank Account'})`,
          amount: record.amount,
          payment_mode: expense.payment_mode,
          reference_no: expense.reference_no,
          narration: `Expense payment for ${expense.category}. Payee: ${expense.payee || 'N/A'}. Note: ${expense.note || ''}`
        });
        return data;
      }
    } catch (e) {}

    const list = getLocal('expenses', []);
    const newExp = { ...record, id: `exp-${Date.now()}` };
    list.unshift(newExp);
    setLocal('expenses', list);

    await this.saveVoucher({
      voucher_no: voucherNo,
      voucher_type: 'Debit Voucher (Payment)',
      voucher_date: expense.expense_date,
      debit_account: `Expense: ${expense.category}`,
      credit_account: expense.payment_mode === 'Cash' ? 'Cash in Hand' : `Bank (${expense.bank_account_name || 'Bank Account'})`,
      amount: record.amount,
      payment_mode: expense.payment_mode,
      reference_no: expense.reference_no,
      narration: `Expense payment for ${expense.category}. Payee: ${expense.payee || 'N/A'}. Note: ${expense.note || ''}`
    });

    return newExp;
  },

  // -------------------------------------------------------------
  // 3. VOUCHERS (Debit, Credit, Journal, Contra)
  // -------------------------------------------------------------
  generateVoucherNo(voucherType) {
    const prefix = 
      voucherType.includes('Debit') ? 'DV' :
      voucherType.includes('Credit') ? 'CV' :
      voucherType.includes('Contra') ? 'TV' : 'JV';
    const now = new Date();
    const yr = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${yr}${mo}-${rand}`;
  },

  async getVouchers(filters = {}) {
    try {
      let query = supabase.from('accounts_vouchers').select('*').order('voucher_date', { ascending: false });
      if (filters.fromDate) query = query.gte('voucher_date', filters.fromDate);
      if (filters.toDate) query = query.lte('voucher_date', filters.toDate);
      if (filters.type && filters.type !== 'ALL') query = query.eq('voucher_type', filters.type);
      const { data, error } = await query;
      if (!error && data) return data;
    } catch (e) {}
    let list = getLocal('vouchers', []);
    if (filters.fromDate) list = list.filter(v => v.voucher_date >= filters.fromDate);
    if (filters.toDate) list = list.filter(v => v.voucher_date <= filters.toDate);
    if (filters.type && filters.type !== 'ALL') list = list.filter(v => v.voucher_type === filters.type);
    return list;
  },

  async saveVoucher(voucher) {
    const voucherNo = voucher.voucher_no || this.generateVoucherNo(voucher.voucher_type || 'Journal Voucher');
    const record = {
      ...voucher,
      voucher_no: voucherNo,
      amount: Number(voucher.amount || 0),
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase.from('accounts_vouchers').insert(record).select().single();
      if (!error && data) return data;
    } catch (e) {}

    const list = getLocal('vouchers', []);
    const newVoucher = { ...record, id: `vch-${Date.now()}` };
    list.unshift(newVoucher);
    setLocal('vouchers', list);
    return newVoucher;
  },

  // -------------------------------------------------------------
  // 4. ACCOUNTS PAYABLE (VENDOR DUES & PURCHASE RETURNS)
  // -------------------------------------------------------------
  async getPayableData() {
    // 1. Fetch Vendors, Purchase Receives, and Central Store Purchase Returns
    const [vendorsRes, prsRes, pretRes] = await Promise.all([
      supabase.from('vendors').select('*').order('name'),
      supabase.from('purchase_receives').select('*').order('purchase_date', { ascending: false }),
      supabase.from('purchase_returns').select('*').order('return_date', { ascending: false })
    ]);

    const vendors = vendorsRes.data || [];
    const purchaseReceives = prsRes.data || [];
    const purchaseReturns = pretRes.data || [];

    // 2. Fetch Payments made to vendors
    const vendorPayments = await this.getVendorPayments();

    // 3. Compute breakdown per vendor
    const vendorSummaries = vendors.map(v => {
      const vPrs = purchaseReceives.filter(pr => pr.vendor_id === v.id);
      const vPrets = purchaseReturns.filter(pr => pr.vendor_id === v.id);
      
      // Breakdown by Purchase Type
      const cashPurchases = vPrs.filter(pr => pr.supplier_payment_type === 'CashPurchase' || (!pr.supplier_payment_type && pr.payment_type === 'Cash'));
      const creditPurchases = vPrs.filter(pr => pr.supplier_payment_type === 'CreditPurchase' || (!pr.supplier_payment_type && pr.payment_type !== 'Cash'));
      const afterSalePurchases = vPrs.filter(pr => pr.supplier_payment_type === 'AfterSale');

      const totalCashValue = cashPurchases.reduce((s, pr) => s + (Number(pr.net_amount || pr.total_value || 0)), 0);
      const totalCreditValue = creditPurchases.reduce((s, pr) => s + (Number(pr.net_amount || pr.total_value || 0)), 0);
      const totalAfterSaleValue = afterSalePurchases.reduce((s, pr) => s + (Number(pr.net_amount || pr.total_value || 0)), 0);
      const totalPurchases = totalCashValue + totalCreditValue + totalAfterSaleValue;

      // Purchase Returns to this vendor (Central Store goods return)
      const totalReturned = vPrets.reduce((s, pr) => s + (Number(pr.total_amount || 0)), 0);

      // Payments made towards this vendor
      const vPayments = vendorPayments.filter(vp => vp.vendor_id === v.id);
      const totalPaid = vPayments.reduce((s, vp) => s + (Number(vp.amount || 0)), 0);

      // Net due = (Credit Purchases + AfterSale Purchases) - Purchase Returns - Payments Paid
      const netDue = Math.max(0, (totalCreditValue + totalAfterSaleValue) - totalReturned - totalPaid);

      return {
        id: v.id,
        code: v.code || '-',
        name: v.name,
        contact_no: v.contact_no || 'N/A',
        address: v.address || 'N/A',
        total_bills_count: vPrs.length,
        total_returns_count: vPrets.length,
        total_purchases: totalPurchases,
        cash_purchases: totalCashValue,
        credit_purchases: totalCreditValue,
        after_sale_purchases: totalAfterSaleValue,
        total_returned: totalReturned,
        total_paid: totalPaid,
        net_due: netDue,
        bills: vPrs,
        returns: vPrets,
        payments: vPayments
      };
    });

    return {
      vendorSummaries,
      purchaseReceives,
      purchaseReturns,
      totalPayable: vendorSummaries.reduce((s, v) => s + v.net_due, 0),
      totalCreditPurchases: vendorSummaries.reduce((s, v) => s + v.credit_purchases, 0),
      totalAfterSalePurchases: vendorSummaries.reduce((s, v) => s + v.after_sale_purchases, 0),
      totalReturned: vendorSummaries.reduce((s, v) => s + v.total_returned, 0),
      totalPaid: vendorSummaries.reduce((s, v) => s + v.total_paid, 0)
    };
  },

  async getVendorPayments(filters = {}) {
    try {
      const { data, error } = await supabase.from('accounts_vendor_payments').select('*').order('payment_date', { ascending: false });
      if (!error && data) return data;
    } catch (e) {}
    return getLocal('vendor_payments', []);
  },

  async saveVendorPayment(payment) {
    const voucherNo = this.generateVoucherNo('Debit Voucher (Payment)');
    const record = {
      ...payment,
      voucher_no: voucherNo,
      amount: Number(payment.amount || 0),
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase.from('accounts_vendor_payments').insert(record).select().single();
      if (!error && data) {
        await this.saveVoucher({
          voucher_no: voucherNo,
          voucher_type: 'Debit Voucher (Payment)',
          voucher_date: payment.payment_date,
          debit_account: `Accounts Payable: ${payment.vendor_name}`,
          credit_account: payment.payment_mode === 'Cash' ? 'Cash in Hand' : `Bank (${payment.bank_account_name || 'Bank Account'})`,
          amount: record.amount,
          payment_mode: payment.payment_mode,
          reference_no: payment.reference_no,
          narration: `Supplier payment to ${payment.vendor_name} for Purchase Receive / Due Clearance. Note: ${payment.note || ''}`
        });
        return data;
      }
    } catch (e) {}

    const list = getLocal('vendor_payments', []);
    const newPayment = { ...record, id: `vp-${Date.now()}` };
    list.unshift(newPayment);
    setLocal('vendor_payments', list);

    await this.saveVoucher({
      voucher_no: voucherNo,
      voucher_type: 'Debit Voucher (Payment)',
      voucher_date: payment.payment_date,
      debit_account: `Accounts Payable: ${payment.vendor_name}`,
      credit_account: payment.payment_mode === 'Cash' ? 'Cash in Hand' : `Bank (${payment.bank_account_name || 'Bank Account'})`,
      amount: record.amount,
      payment_mode: payment.payment_mode,
      reference_no: payment.reference_no,
      narration: `Supplier payment to ${payment.vendor_name} for Purchase Receive / Due Clearance. Note: ${payment.note || ''}`
    });

    return newPayment;
  },

  // -------------------------------------------------------------
  // 5. ACCOUNTS RECEIVABLE (CUSTOMER DUES FROM POS) & COLLECTIONS
  // -------------------------------------------------------------
  async getReceivableData() {
    const [customersRes, salesRes] = await Promise.all([
      supabase.from('customers').select('*').order('first_name'),
      supabase.from('sales').select('*').order('created_at', { ascending: false })
    ]);

    const customers = customersRes.data || [];
    const sales = salesRes.data || [];
    const collections = await this.getCustomerCollections();

    const customerSummaries = customers.map(c => {
      const fullName = [c.first_name, c.middle_name, c.last_name].filter(Boolean).join(' ') || c.name || 'Customer';
      const cSales = sales.filter(s => s.customer_id === c.id || (s.customer_mobile && s.customer_mobile === c.contact_no));
      
      const totalInvoiced = cSales.reduce((sum, s) => sum + (Number(s.net_amount || s.total_amount || 0)), 0);
      const paidInSales = cSales.reduce((sum, s) => sum + (Number(s.paid_amount || 0)), 0);
      
      // Collections made separately in accounts
      const cCollections = collections.filter(col => col.customer_id === c.id || col.customer_name === fullName);
      const totalCollectedLater = cCollections.reduce((sum, col) => sum + (Number(col.amount || 0)), 0);

      const netDue = Math.max(0, totalInvoiced - (paidInSales + totalCollectedLater));

      return {
        id: c.id,
        code: c.code || '-',
        name: fullName,
        contact_no: c.contact_no || 'N/A',
        address: c.address || 'N/A',
        invoices_count: cSales.length,
        total_invoiced: totalInvoiced,
        paid_amount: paidInSales + totalCollectedLater,
        net_due: netDue,
        invoices: cSales
      };
    }).filter(c => c.total_invoiced > 0 || c.net_due > 0);

    return {
      customerSummaries,
      totalReceivable: customerSummaries.reduce((s, c) => s + c.net_due, 0),
      totalInvoiced: customerSummaries.reduce((s, c) => s + c.total_invoiced, 0),
      totalCollected: customerSummaries.reduce((s, c) => s + c.paid_amount, 0)
    };
  },

  async getCustomerCollections(filters = {}) {
    try {
      const { data, error } = await supabase.from('accounts_customer_collections').select('*').order('collection_date', { ascending: false });
      if (!error && data) return data;
    } catch (e) {}
    return getLocal('customer_collections', []);
  },

  async saveCustomerCollection(col) {
    const voucherNo = this.generateVoucherNo('Credit Voucher (Receipt)');
    const record = {
      ...col,
      voucher_no: voucherNo,
      amount: Number(col.amount || 0),
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase.from('accounts_customer_collections').insert(record).select().single();
      if (!error && data) {
        await this.saveVoucher({
          voucher_no: voucherNo,
          voucher_type: 'Credit Voucher (Receipt)',
          voucher_date: col.collection_date,
          debit_account: col.payment_mode === 'Cash' ? 'Cash in Hand' : `Bank (${col.bank_account_name || 'Bank Account'})`,
          credit_account: `Accounts Receivable: ${col.customer_name}`,
          amount: record.amount,
          payment_mode: col.payment_mode,
          reference_no: col.reference_no,
          narration: `Customer due collection from ${col.customer_name}. Note: ${col.note || ''}`
        });
        return data;
      }
    } catch (e) {}

    const list = getLocal('customer_collections', []);
    const newCol = { ...record, id: `col-${Date.now()}` };
    list.unshift(newCol);
    setLocal('customer_collections', list);

    await this.saveVoucher({
      voucher_no: voucherNo,
      voucher_type: 'Credit Voucher (Receipt)',
      voucher_date: col.collection_date,
      debit_account: col.payment_mode === 'Cash' ? 'Cash in Hand' : `Bank (${col.bank_account_name || 'Bank Account'})`,
      credit_account: `Accounts Receivable: ${col.customer_name}`,
      amount: record.amount,
      payment_mode: col.payment_mode,
      reference_no: col.reference_no,
      narration: `Customer due collection from ${col.customer_name}. Note: ${col.note || ''}`
    });

    return newCol;
  },

  // -------------------------------------------------------------
  // 6. STAFF SALARY & PAYROLL MANAGEMENT
  // -------------------------------------------------------------
  async getPayrollData(monthYear = new Date().toISOString().slice(0, 7)) {
    const { data: employees } = await supabase.from('employees').select('*').order('name');
    const empList = employees || [];
    const salaries = await this.getSalaries(monthYear);

    const payrollList = empList.map(emp => {
      const existing = salaries.find(s => s.employee_id === emp.id && s.month_year === monthYear);
      const basic = Number(emp.salary || 0);
      const bonus = existing ? Number(existing.bonus_amount || 0) : 0;
      const deduction = existing ? Number(existing.deduction_amount || 0) : 0;
      const net = basic + bonus - deduction;

      return {
        employee_id: emp.id,
        employee_code: emp.code || '-',
        employee_name: emp.name,
        designation: emp.designation || 'Staff',
        basic_salary: basic,
        bonus_amount: bonus,
        deduction_amount: deduction,
        net_salary: net,
        payment_status: existing ? existing.payment_status : 'Pending',
        payment_date: existing ? existing.payment_date : null,
        payment_mode: existing ? existing.payment_mode : 'Cash',
        voucher_no: existing ? existing.voucher_no : null,
        id: existing ? existing.id : null
      };
    });

    return {
      monthYear,
      payrollList,
      totalBasic: payrollList.reduce((s, p) => s + p.basic_salary, 0),
      totalBonus: payrollList.reduce((s, p) => s + p.bonus_amount, 0),
      totalDeduction: payrollList.reduce((s, p) => s + p.deduction_amount, 0),
      totalNetPayroll: payrollList.reduce((s, p) => s + p.net_salary, 0),
      totalPaid: payrollList.filter(p => p.payment_status === 'Paid').reduce((s, p) => s + p.net_salary, 0),
      totalPending: payrollList.filter(p => p.payment_status === 'Pending').reduce((s, p) => s + p.net_salary, 0)
    };
  },

  async getSalaries(monthYear) {
    try {
      let query = supabase.from('accounts_salaries').select('*');
      if (monthYear) query = query.eq('month_year', monthYear);
      const { data, error } = await query;
      if (!error && data) return data;
    } catch (e) {}
    let list = getLocal('salaries', []);
    if (monthYear) list = list.filter(s => s.month_year === monthYear);
    return list;
  },

  async paySalary(salaryData) {
    const voucherNo = this.generateVoucherNo('Debit Voucher (Payment)');
    const record = {
      ...salaryData,
      payment_status: 'Paid',
      payment_date: salaryData.payment_date || new Date().toISOString().split('T')[0],
      voucher_no: voucherNo,
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase.from('accounts_salaries').upsert(record).select().single();
      if (!error && data) {
        await this.saveVoucher({
          voucher_no: voucherNo,
          voucher_type: 'Debit Voucher (Payment)',
          voucher_date: record.payment_date,
          debit_account: `Staff Salary: ${record.employee_name}`,
          credit_account: record.payment_mode === 'Cash' ? 'Cash in Hand' : `Bank (${record.bank_account_name || 'Bank Account'})`,
          amount: record.net_salary,
          payment_mode: record.payment_mode,
          narration: `Monthly staff salary payment to ${record.employee_name} (${record.designation}) for month ${record.month_year}`
        });
        return data;
      }
    } catch (e) {}

    const list = getLocal('salaries', []);
    const idx = list.findIndex(s => s.employee_id === record.employee_id && s.month_year === record.month_year);
    const saved = { ...record, id: record.id || `sal-${Date.now()}` };
    if (idx >= 0) list[idx] = saved;
    else list.push(saved);
    setLocal('salaries', list);

    await this.saveVoucher({
      voucher_no: voucherNo,
      voucher_type: 'Debit Voucher (Payment)',
      voucher_date: record.payment_date,
      debit_account: `Staff Salary: ${record.employee_name}`,
      credit_account: record.payment_mode === 'Cash' ? 'Cash in Hand' : `Bank (${record.bank_account_name || 'Bank Account'})`,
      amount: record.net_salary,
      payment_mode: record.payment_mode,
      narration: `Monthly staff salary payment to ${record.employee_name} (${record.designation}) for month ${record.month_year}`
    });

    return saved;
  },

  // -------------------------------------------------------------
  // 7. CHART OF ACCOUNTS
  // -------------------------------------------------------------
  async getChartOfAccounts() {
    try {
      const { data, error } = await supabase.from('accounts_chart').select('*').order('code');
      if (!error && data && data.length > 0) return data;
    } catch (e) {}
    return getLocal('chart_of_accounts', DEFAULT_CHART_OF_ACCOUNTS);
  },

  // -------------------------------------------------------------
  // 8. FINANCIAL OVERVIEW & REAL-TIME DYNAMIC STATEMENTS
  // -------------------------------------------------------------
  async getFinancialOverview(fromDate, toDate) {
    const now = new Date();
    const fDate = fromDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const tDate = toDate || now.toISOString().split('T')[0];

    // 1. POS Sales Revenue (Gross Sales & Returns)
    let salesQuery = supabase.from('sales').select('net_amount, total_amount, paid_amount, created_at, return_amount, payment_type');
    if (fDate) salesQuery = salesQuery.gte('created_at', `${fDate}T00:00:00.000Z`);
    if (tDate) salesQuery = salesQuery.lte('created_at', `${tDate}T23:59:59.999Z`);
    const { data: salesData } = await salesQuery;
    const salesList = salesData || [];

    const grossSales = salesList.reduce((sum, s) => sum + (Number(s.net_amount || s.total_amount || 0)), 0);
    const salesReturns = salesList.reduce((sum, s) => sum + (Number(s.return_amount || 0)), 0);
    const totalSales = Math.max(0, grossSales - salesReturns);

    // 2. Central Store Purchases & Purchase Returns (COGS)
    let prQuery = supabase.from('purchase_receives').select('net_amount, total_value, purchase_date, supplier_payment_type');
    if (fDate) prQuery = prQuery.gte('purchase_date', fDate);
    if (tDate) prQuery = prQuery.lte('purchase_date', tDate);
    const { data: prData } = await prQuery;
    const grossPurchases = (prData || []).reduce((sum, pr) => sum + (Number(pr.net_amount || pr.total_value || 0)), 0);

    // Central Store Purchase Returns to Vendor
    let pretQuery = supabase.from('purchase_returns').select('total_amount, return_date');
    if (fDate) pretQuery = pretQuery.gte('return_date', fDate);
    if (tDate) pretQuery = pretQuery.lte('return_date', tDate);
    const { data: pretData } = await pretQuery;
    const totalPurchaseReturns = (pretData || []).reduce((sum, pr) => sum + (Number(pr.total_amount || 0)), 0);

    // Central Store Damage & Lost
    let dmlQuery = supabase.from('damage_and_lost').select('total_cost, total_amount, date, damage_date');
    if (fDate) dmlQuery = dmlQuery.gte('date', fDate);
    if (tDate) dmlQuery = dmlQuery.lte('date', tDate);
    const { data: dmlData } = await dmlQuery;
    const totalDamageLoss = (dmlData || []).reduce((sum, d) => sum + (Number(d.total_cost || d.total_amount || 0)), 0);

    // Net Cost of Goods Sold (COGS)
    const netPurchases = Math.max(0, grossPurchases - totalPurchaseReturns);
    const totalCOGS = netPurchases + totalDamageLoss;

    // 3. Operating Expenses
    const expenses = await this.getExpenses({ fromDate: fDate, toDate: tDate });
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

    // 4. Staff Salaries Paid in period
    const currentMonth = fDate.slice(0, 7);
    const salaries = await this.getSalaries(currentMonth);
    const totalSalaries = salaries.filter(s => s.payment_status === 'Paid').reduce((sum, s) => sum + Number(s.net_salary || 0), 0);

    // 5. Vendor Payables & Customer Receivables
    const payableData = await this.getPayableData();
    const receivableData = await this.getReceivableData();

    // 6. Dynamic Bank & Cash Liquidity Balances
    const bankAccounts = await this.getBankAccounts();
    const totalBankCash = bankAccounts.reduce((sum, b) => sum + Number(b.current_balance || 0), 0);

    // 7. Gross & Net Profit Calculation
    const grossProfit = totalSales - totalCOGS;
    const totalOperatingCost = totalExpenses + totalSalaries;
    const netProfit = grossProfit - totalOperatingCost;

    return {
      fromDate: fDate,
      toDate: tDate,
      grossSales,
      salesReturns,
      totalSales, // Net Sales Revenue
      grossPurchases,
      totalPurchaseReturns, // Central store returns
      netPurchases,
      totalDamageLoss, // Central store inventory loss
      totalCOGS, // Net COGS
      totalPurchases: totalCOGS,
      grossProfit,
      totalExpenses,
      totalSalaries,
      totalOperatingCost,
      netProfit,
      totalPayable: payableData.totalPayable,
      totalReceivable: receivableData.totalReceivable,
      totalBankCash,
      bankAccounts,
      recentExpenses: expenses.slice(0, 5),
      recentVouchers: (await this.getVouchers()).slice(0, 5)
    };
  }
};
