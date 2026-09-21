import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, TrendingDown, DollarSign, Wallet, 
  CreditCard, HandCoins, Users, Receipt, 
  ArrowUpRight, ArrowDownRight, RefreshCw, Plus, 
  Building, Calendar, FileText, CheckCircle2, ChevronRight
} from 'lucide-react';
import { accountsService } from '../../lib/accountsService';
import toast from 'react-hot-toast';

const AccountsDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  
  // Date filters
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];
  
  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(today);
  const [quickRange, setQuickRange] = useState('this_month');

  useEffect(() => {
    loadDashboardData();
  }, [fromDate, toDate]);

  const loadDashboardData = async (force = false) => {
    setLoading(true);
    try {
      const data = await accountsService.getFinancialOverview(fromDate, toDate, force);
      setOverview(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load accounts overview');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRange = (range) => {
    setQuickRange(range);
    const curr = new Date();
    if (range === 'today') {
      const d = curr.toISOString().split('T')[0];
      setFromDate(d);
      setToDate(d);
    } else if (range === 'this_month') {
      const f = new Date(curr.getFullYear(), curr.getMonth(), 1).toISOString().split('T')[0];
      setFromDate(f);
      setToDate(curr.toISOString().split('T')[0]);
    } else if (range === 'this_year') {
      const f = new Date(curr.getFullYear(), 0, 1).toISOString().split('T')[0];
      setFromDate(f);
      setToDate(curr.toISOString().split('T')[0]);
    }
  };

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return '৳ ' + num.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div style={{ padding: '4px', maxWidth: '1600px', margin: '0 auto' }}>
      
      {/* Top Header & Filter Bar */}
      <div style={{
        background: '#fff',
        borderRadius: '8px',
        padding: '16px 20px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
        border: '1px solid #e2e8f0',
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '15px'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wallet className="text-emerald-700" size={24} />
            Accounts & Financial Executive Overview
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
            Real-time financial status, profit & loss, cash/bank liquidity, and liability tracking
          </p>
        </div>

        {/* Date Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '6px' }}>
            {['today', 'this_month', 'this_year'].map(r => (
              <button
                key={r}
                onClick={() => handleQuickRange(r)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: quickRange === r ? '#2e6f40' : 'transparent',
                  color: quickRange === r ? '#fff' : '#64748b',
                  transition: 'all 0.2s'
                }}
              >
                {r === 'today' ? 'Today' : r === 'this_month' ? 'This Month' : 'This Year'}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input 
              type="date" 
              value={fromDate} 
              onChange={e => { setFromDate(e.target.value); setQuickRange('custom'); }}
              style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }}
            />
            <span style={{ fontSize: '12px', color: '#64748b' }}>to</span>
            <input 
              type="date" 
              value={toDate} 
              onChange={e => { setToDate(e.target.value); setQuickRange('custom'); }}
              style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }}
            />
          </div>

          <button 
            onClick={() => loadDashboardData(true)}
            className="btn-theme"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '12px' }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Card 1: POS Sales Revenue */}
        <div style={{
          background: '#fff',
          borderRadius: '8px',
          padding: '18px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Net Revenue (POS Sales)</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>
              {formatCurrency(overview?.totalSales)}
            </div>
            <div style={{ fontSize: '11px', color: '#059669', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <TrendingUp size={12} /> Gross: {formatCurrency(overview?.grossSales)} | Returns: -{formatCurrency(overview?.salesReturns)}
            </div>
          </div>
          <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={22} color="#10b981" />
          </div>
        </div>

        {/* Card 2: Cost of Goods Sold (Central Store Purchases - Returns) */}
        <div style={{
          background: '#fff',
          borderRadius: '8px',
          padding: '18px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Cost of Goods Sold (COGS)</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#f59e0b', marginTop: '4px' }}>
              {formatCurrency(overview?.totalCOGS)}
            </div>
            <div style={{ fontSize: '11px', color: '#b45309', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <ArrowDownRight size={12} /> Purchases: {formatCurrency(overview?.grossPurchases)} | Returns: -{formatCurrency(overview?.totalPurchaseReturns)}
            </div>
          </div>
          <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CreditCard size={22} color="#f59e0b" />
          </div>
        </div>

        {/* Card 3: Operating Expenses & Salaries */}
        <div style={{
          background: '#fff',
          borderRadius: '8px',
          padding: '18px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Operating Cost & Salaries</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#ef4444', marginTop: '4px' }}>
              {formatCurrency(overview?.totalOperatingCost)}
            </div>
            <div style={{ fontSize: '11px', color: '#b91c1c', marginTop: '2px' }}>
              Exp: {formatCurrency(overview?.totalExpenses)} | Sal: {formatCurrency(overview?.totalSalaries)}
            </div>
          </div>
          <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingDown size={22} color="#ef4444" />
          </div>
        </div>

        {/* Card 4: Net Profit */}
        <div style={{
          background: overview?.netProfit >= 0 ? 'linear-gradient(135deg, #065f46, #047857)' : 'linear-gradient(135deg, #991b1b, #b91c1c)',
          borderRadius: '8px',
          padding: '18px 20px',
          color: '#fff',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, opacity: 0.9, textTransform: 'uppercase' }}>Net Profit / (Loss)</div>
            <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>
              {formatCurrency(overview?.netProfit)}
            </div>
            <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '2px' }}>
              Gross Profit: {formatCurrency(overview?.grossProfit)}
            </div>
          </div>
          <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={24} color="#fff" />
          </div>
        </div>
      </div>

      {/* Second Row: Dues & Balances (Payable vs Receivable vs Bank Balance) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px',
        marginBottom: '24px'
      }}>
        
        {/* Total Accounts Payable */}
        <div style={{
          background: '#fff',
          borderRadius: '8px',
          padding: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Accounts Payable (Vendor Dues)
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Outstanding payments to suppliers for goods received</div>
            </div>
            <button 
              onClick={() => navigate('/accounts/payables')}
              className="btn-danger"
              style={{ fontSize: '11px', padding: '4px 10px' }}
            >
              Pay Dues
            </button>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#dc2626', marginBottom: '12px' }}>
            {formatCurrency(overview?.totalPayable)}
          </div>
          <div style={{ fontSize: '12px', color: '#475569', background: '#fff1f2', padding: '8px 12px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Total supplier liabilities requiring settlement</span>
            <span style={{ fontWeight: 600, color: '#be123c', cursor: 'pointer' }} onClick={() => navigate('/accounts/payables')}>View Ledger &rarr;</span>
          </div>
        </div>

        {/* Total Accounts Receivable */}
        <div style={{
          background: '#fff',
          borderRadius: '8px',
          padding: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Accounts Receivable (Customer Dues)
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Pending receivables from customers on invoice dues</div>
            </div>
            <button 
              onClick={() => navigate('/accounts/receivables')}
              className="btn-info"
              style={{ fontSize: '11px', padding: '4px 10px' }}
            >
              Collect Due
            </button>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0284c7', marginBottom: '12px' }}>
            {formatCurrency(overview?.totalReceivable)}
          </div>
          <div style={{ fontSize: '12px', color: '#475569', background: '#f0f9ff', padding: '8px 12px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Total money to collect from customers</span>
            <span style={{ fontWeight: 600, color: '#0369a1', cursor: 'pointer' }} onClick={() => navigate('/accounts/receivables')}>View Customers &rarr;</span>
          </div>
        </div>

        {/* Cash & Bank Total Liquidity */}
        <div style={{
          background: '#fff',
          borderRadius: '8px',
          padding: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#2e6f40', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Total Liquid Cash & Bank
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Combined balance across Cash drawer & Bank accounts</div>
            </div>
            <button 
              onClick={() => navigate('/accounts/chart-of-accounts')}
              className="btn-theme"
              style={{ fontSize: '11px', padding: '4px 10px' }}
            >
              Manage Banks
            </button>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#2e6f40', marginBottom: '12px' }}>
            {formatCurrency(overview?.totalBankCash)}
          </div>
          <div style={{ fontSize: '12px', color: '#475569', background: '#f0fdf4', padding: '8px 12px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Available funds for operational expenses</span>
            <span style={{ fontWeight: 600, color: '#166534', cursor: 'pointer' }} onClick={() => navigate('/accounts/chart-of-accounts')}>Details &rarr;</span>
          </div>
        </div>

      </div>

      {/* Quick Action Navigation Grid */}
      <div style={{
        background: '#fff',
        borderRadius: '8px',
        padding: '18px 20px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
        marginBottom: '24px'
      }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '14px' }}>
          ⚡ Accounts Quick Shortcuts & Operations
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px'
        }}>
          <button 
            onClick={() => navigate('/accounts/vouchers')}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.borderColor = '#2e6f40'}
            onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}
          >
            <div style={{ width: '34px', height: '34px', borderRadius: '6px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Receipt size={18} color="#2e6f40" />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>New Voucher</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Debit / Credit / Journal</div>
            </div>
          </button>

          <button 
            onClick={() => navigate('/accounts/expenses')}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.borderColor = '#ef4444'}
            onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}
          >
            <div style={{ width: '34px', height: '34px', borderRadius: '6px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingDown size={18} color="#ef4444" />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>Record Expense</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Office, Rent, Utilities</div>
            </div>
          </button>

          <button 
            onClick={() => navigate('/accounts/payables')}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.borderColor = '#dc2626'}
            onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}
          >
            <div style={{ width: '34px', height: '34px', borderRadius: '6px', background: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard size={18} color="#dc2626" />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>Vendor Payment</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Clear supplier dues</div>
            </div>
          </button>

          <button 
            onClick={() => navigate('/accounts/receivables')}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.borderColor = '#0284c7'}
            onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}
          >
            <div style={{ width: '34px', height: '34px', borderRadius: '6px', background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HandCoins size={18} color="#0284c7" />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>Customer Collection</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Receive customer due</div>
            </div>
          </button>

          <button 
            onClick={() => navigate('/accounts/payroll')}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.borderColor = '#8b5cf6'}
            onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}
          >
            <div style={{ width: '34px', height: '34px', borderRadius: '6px', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={18} color="#8b5cf6" />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>Staff Salary</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Monthly payroll list</div>
            </div>
          </button>

          <button 
            onClick={() => navigate('/accounts/reports')}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.borderColor = '#059669'}
            onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}
          >
            <div style={{ width: '34px', height: '34px', borderRadius: '6px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={18} color="#059669" />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>Financial Reports</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>P&L, Balance Sheet, Daybook</div>
            </div>
          </button>
        </div>
      </div>

      {/* Bottom Section: Bank Accounts & Recent Vouchers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '20px'
      }}>
        
        {/* Bank & Cash Balances Table */}
        <div style={{
          background: '#fff',
          borderRadius: '8px',
          padding: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building size={18} className="text-slate-600" />
              Cash & Bank Account Balances
            </div>
            <button 
              onClick={() => navigate('/accounts/chart-of-accounts')}
              className="btn-theme"
              style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Plus size={12} /> Add / Edit
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(overview?.bankAccounts || []).map(b => (
              <div 
                key={b.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  background: '#f8fafc',
                  border: '1px solid #f1f5f9'
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{b.account_name}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{b.bank_name} &bull; A/C: {b.account_number} ({b.account_type})</div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#2e6f40' }}>
                  {formatCurrency(b.current_balance)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Vouchers List */}
        <div style={{
          background: '#fff',
          borderRadius: '8px',
          padding: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Receipt size={18} className="text-slate-600" />
              Recent Accounts Vouchers
            </div>
            <button 
              onClick={() => navigate('/accounts/vouchers')}
              className="btn-info"
              style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              View All Vouchers &rarr;
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(overview?.recentVouchers || []).length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                No vouchers created yet. Click "New Voucher" above to post accounting entries.
              </div>
            ) : (
              (overview?.recentVouchers || []).map(v => (
                <div 
                  key={v.id || v.voucher_no}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                    fontSize: '12px'
                  }}
                >
                  <div>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 700,
                      marginRight: '8px',
                      background: v.voucher_type?.includes('Debit') ? '#fee2e2' : v.voucher_type?.includes('Credit') ? '#dcfce7' : '#e0e7ff',
                      color: v.voucher_type?.includes('Debit') ? '#991b1b' : v.voucher_type?.includes('Credit') ? '#166534' : '#3730a3'
                    }}>
                      {v.voucher_no}
                    </span>
                    <span style={{ fontWeight: 600, color: '#334155' }}>{v.voucher_type}</span>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{v.narration}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: '#1e293b' }}>{formatCurrency(v.amount)}</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>{v.voucher_date}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default AccountsDashboard;
