import React, { useState, useEffect } from 'react';
import { 
  Landmark, Plus, Search, RefreshCw, 
  FileSpreadsheet, Printer, Download, Building, 
  Wallet, Layers, Check, X, CreditCard
} from 'lucide-react';
import { accountsService } from '../../lib/accountsService';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const ChartOfAccounts = () => {
  const [activeTab, setActiveTab] = useState('bank_accounts'); // 'bank_accounts' or 'coa_tree'
  const [loading, setLoading] = useState(true);
  const [chartOfAccounts, setChartOfAccounts] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Add Bank Modal
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState('Bank');
  const [bankName, setBankName] = useState('');
  const [accNo, setAccNo] = useState('');
  const [branch, setBranch] = useState('');
  const [initBalance, setInitBalance] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [coas, banks] = await Promise.all([
        accountsService.getChartOfAccounts(),
        accountsService.getBankAccounts()
      ]);
      setChartOfAccounts(coas);
      setBankAccounts(banks);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load accounts data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBank = async (e) => {
    e.preventDefault();
    if (!accName.trim() || !accNo.trim()) {
      toast.error('Please enter Account Name and Number');
      return;
    }

    try {
      const balance = Number(initBalance || 0);
      await accountsService.saveBankAccount({
        account_name: accName.trim(),
        account_type: accType,
        bank_name: bankName.trim() || accName.trim(),
        account_number: accNo.trim(),
        branch: branch.trim() || 'Main Branch',
        initial_balance: balance,
        current_balance: balance
      });

      toast.success('Bank / Cash account saved successfully!');
      setBankModalOpen(false);
      setAccName('');
      setBankName('');
      setAccNo('');
      setBranch('');
      setInitBalance('');
      await loadData();
    } catch (err) {
      toast.error('Failed to save bank account');
    }
  };

  const filteredCOA = chartOfAccounts.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.code?.toLowerCase().includes(q) ||
      c.name?.toLowerCase().includes(q) ||
      c.type?.toLowerCase().includes(q)
    );
  });

  const formatCurrency = (val) => '৳ ' + Number(val || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 });

  return (
    <div style={{ padding: '4px', maxWidth: '1600px', margin: '0 auto' }}>
      
      {/* Top Header */}
      <div style={{
        background: '#fff',
        borderRadius: '8px',
        padding: '16px 20px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
        border: '1px solid #e2e8f0',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '15px'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Landmark className="text-emerald-700" size={24} />
            Chart of Accounts & Bank / Cash Setup
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
            Configure 4-tier Chart of Accounts tree structure, Bank accounts, Cash drawers, and mobile wallets
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {activeTab === 'bank_accounts' && (
            <button 
              onClick={() => setBankModalOpen(true)}
              className="btn-theme"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '12px' }}
            >
              <Plus size={15} /> + Add Bank / Cash Account
            </button>
          )}
          <button 
            onClick={loadData}
            className="btn-info"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '12px' }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Tabs Selector */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
        <button
          onClick={() => setActiveTab('bank_accounts')}
          style={{
            padding: '10px 18px',
            borderRadius: '6px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: activeTab === 'bank_accounts' ? '#2e6f40' : '#fff',
            color: activeTab === 'bank_accounts' ? '#fff' : '#475569',
            boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
            border: activeTab === 'bank_accounts' ? 'none' : '1px solid #e2e8f0'
          }}
        >
          <Building size={16} /> Cash & Bank Accounts ({bankAccounts.length})
        </button>

        <button
          onClick={() => setActiveTab('coa_tree')}
          style={{
            padding: '10px 18px',
            borderRadius: '6px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: activeTab === 'coa_tree' ? '#2e6f40' : '#fff',
            color: activeTab === 'coa_tree' ? '#fff' : '#475569',
            boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
            border: activeTab === 'coa_tree' ? 'none' : '1px solid #e2e8f0'
          }}
        >
          <Layers size={16} /> Chart of Accounts Hierarchy ({chartOfAccounts.length})
        </button>
      </div>

      {/* TAB 1: BANK & CASH ACCOUNTS */}
      {activeTab === 'bank_accounts' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {bankAccounts.map((b, idx) => (
            <div 
              key={b.id || idx}
              style={{
                background: '#fff',
                borderRadius: '8px',
                padding: '20px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    background: b.account_type === 'Cash' ? '#ecfdf5' : b.account_type === 'Mobile Banking' ? '#fdf2f8' : '#eff6ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {b.account_type === 'Cash' ? <Wallet size={20} color="#059669" /> : b.account_type === 'Mobile Banking' ? <CreditCard size={20} color="#db2777" /> : <Building size={20} color="#2563eb" />}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>{b.account_name}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{b.bank_name} &bull; {b.branch}</div>
                  </div>
                </div>

                <span style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: '#f1f5f9',
                  color: '#475569'
                }}>
                  {b.account_type}
                </span>
              </div>

              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #f1f5f9', marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Account Number</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', fontFamily: 'monospace' }}>{b.account_number}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Current Balance</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#2e6f40' }}>{formatCurrency(b.current_balance)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>Initial: {formatCurrency(b.initial_balance)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: CHART OF ACCOUNTS TREE */}
      {activeTab === 'coa_tree' && (
        <div style={{
          background: '#fff',
          borderRadius: '8px',
          padding: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
        }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ position: 'relative', width: '320px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: '#94a3b8' }} />
              <input 
                type="text" 
                placeholder="Search Account code, name, category..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '7px 10px 7px 30px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }}
              />
            </div>

            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Showing <b>{filteredCOA.length}</b> accounting ledger heads
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#2e6f40', color: '#fff', textAlign: 'left' }}>
                  <th style={{ padding: '10px', border: '1px solid #255a33', width: '120px' }}>Account Code</th>
                  <th style={{ padding: '10px', border: '1px solid #255a33' }}>Account Title / Name</th>
                  <th style={{ padding: '10px', border: '1px solid #255a33', width: '140px' }}>Classification Type</th>
                  <th style={{ padding: '10px', border: '1px solid #255a33', width: '120px' }}>Parent Code</th>
                </tr>
              </thead>
              <tbody>
                {filteredCOA.map((c, idx) => {
                  const isTopLevel = !c.parent_code;
                  return (
                    <tr 
                      key={c.code || idx}
                      style={{ 
                        borderBottom: '1px solid #f1f5f9', 
                        background: isTopLevel ? '#f8fafc' : '#fff',
                        fontWeight: isTopLevel ? 700 : 400
                      }}
                    >
                      <td style={{ padding: '10px', color: isTopLevel ? '#2e6f40' : '#475569', fontFamily: 'monospace' }}>
                        {c.code}
                      </td>
                      <td style={{ padding: '10px', color: isTopLevel ? '#1e293b' : '#334155', paddingLeft: isTopLevel ? '10px' : '30px' }}>
                        {isTopLevel ? '📂 ' : '↳ '} {c.name}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 700,
                          background: 
                            c.type === 'Asset' ? '#ecfdf5' : 
                            c.type === 'Liability' ? '#fef2f2' : 
                            c.type === 'Equity' ? '#eff6ff' : 
                            c.type === 'Income' ? '#f0fdf4' : '#fffbeb',
                          color: 
                            c.type === 'Asset' ? '#059669' : 
                            c.type === 'Liability' ? '#dc2626' : 
                            c.type === 'Equity' ? '#2563eb' : 
                            c.type === 'Income' ? '#16a34a' : '#d97706'
                        }}>
                          {c.type}
                        </span>
                      </td>
                      <td style={{ padding: '10px', color: '#64748b' }}>
                        {c.parent_code || 'Root Head'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ADD BANK MODAL */}
      {bankModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '15px'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            overflow: 'hidden'
          }}>
            <div style={{
              background: '#2e6f40',
              padding: '14px 20px',
              color: '#fff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ fontSize: '15px', fontWeight: 700 }}>
                🏦 Setup Bank / Cash Account
              </div>
              <button 
                onClick={() => setBankModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveBank} style={{ padding: '20px' }}>
              
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Account Title / Display Name *
                </label>
                <input 
                  type="text"
                  placeholder="e.g. Islami Bank - Principal Branch"
                  value={accName}
                  onChange={e => setAccName(e.target.value)}
                  style={{ width: '100%', padding: '7px 9px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Account Type
                  </label>
                  <select
                    value={accType}
                    onChange={e => setAccType(e.target.value)}
                    style={{ width: '100%', padding: '7px 9px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  >
                    <option value="Bank">Bank Account</option>
                    <option value="Cash">Cash Drawer</option>
                    <option value="Mobile Banking">Mobile Wallet (bKash/Nagad)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Bank / Institution Name
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. IBBL, DBBL, bKash"
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    style={{ width: '100%', padding: '7px 9px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Account Number *
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. 20501450200..."
                    value={accNo}
                    onChange={e => setAccNo(e.target.value)}
                    style={{ width: '100%', padding: '7px 9px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Branch Location
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. Dhanmondi Branch"
                    value={branch}
                    onChange={e => setBranch(e.target.value)}
                    style={{ width: '100%', padding: '7px 9px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Initial Opening Balance (Tk)
                </label>
                <input 
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={initBalance}
                  onChange={e => setInitBalance(e.target.value)}
                  style={{ width: '100%', padding: '7px 9px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 700, color: '#2e6f40' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setBankModalOpen(false)}
                  className="btn-info"
                  style={{ padding: '8px 16px', fontSize: '12px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-theme"
                  style={{ padding: '8px 18px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <Check size={15} /> Save Account
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ChartOfAccounts;
