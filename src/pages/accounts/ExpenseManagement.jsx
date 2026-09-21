import React, { useState, useEffect } from 'react';
import { 
  TrendingDown, Plus, Search, RefreshCw, 
  FileSpreadsheet, Printer, Download, Filter, 
  Tag, Calendar, Check, X, Building
} from 'lucide-react';
import { accountsService } from '../../lib/accountsService';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const ExpenseManagement = () => {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);

  // Date filters
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];

  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(today);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // New Expense Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [expDate, setExpDate] = useState(today);
  const [categoryInput, setCategoryInput] = useState('');
  const [payee, setPayee] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [selectedBank, setSelectedBank] = useState('');
  const [refNo, setRefNo] = useState('');
  const [note, setNote] = useState('');

  // Add Category Modal
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [cats, banks] = await Promise.all([
        accountsService.getExpenseCategories(),
        accountsService.getBankAccounts()
      ]);
      setCategories(cats);
      setBankAccounts(banks);
      if (cats.length > 0) setCategoryInput(cats[0].name);
      if (banks.length > 0) setSelectedBank(banks[0].account_name);
      await fetchExpenses();
    } catch (err) {
      console.error(err);
      toast.error('Error loading expense data');
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const list = await accountsService.getExpenses({ fromDate, toDate, category: selectedCategory });
      setExpenses(list);
    } catch (err) {
      toast.error('Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      toast.error('Please enter a valid expense amount');
      return;
    }
    if (!categoryInput) {
      toast.error('Please select an expense category');
      return;
    }

    try {
      await accountsService.saveExpense({
        expense_date: expDate,
        category: categoryInput,
        payee: payee || 'General',
        amount: Number(amount),
        payment_mode: paymentMode,
        bank_account_name: paymentMode !== 'Cash' ? selectedBank : null,
        reference_no: refNo,
        note: note
      });

      toast.success(`Expense of ৳ ${Number(amount).toLocaleString()} recorded successfully!`);
      setModalOpen(false);
      setAmount('');
      setPayee('');
      setRefNo('');
      setNote('');
      await fetchExpenses();
    } catch (err) {
      toast.error('Failed to save expense entry');
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      const created = await accountsService.addExpenseCategory({
        code: `EXP-${String(categories.length + 1).padStart(3, '0')}`,
        name: newCatName.trim()
      });
      setCategories([...categories, created]);
      setCategoryInput(created.name);
      setCategoryModalOpen(false);
      setNewCatName('');
      toast.success('New expense category added!');
    } catch (err) {
      toast.error('Failed to add category');
    }
  };

  const filteredExpenses = expenses.filter(e => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.category?.toLowerCase().includes(q) ||
      e.payee?.toLowerCase().includes(q) ||
      e.voucher_no?.toLowerCase().includes(q) ||
      e.note?.toLowerCase().includes(q)
    );
  });

  const totalExpenseAmount = filteredExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);

  // Export to Excel
  const exportToExcel = () => {
    if (!filteredExpenses.length) {
      toast.error('No expense records to export');
      return;
    }
    const rows = filteredExpenses.map((e, i) => ({
      'SL': i + 1,
      'Date': e.expense_date,
      'Voucher No': e.voucher_no || '-',
      'Category': e.category,
      'Payee / Recipient': e.payee || '-',
      'Payment Mode': e.payment_mode,
      'Bank / Account': e.bank_account_name || 'Cash',
      'Bill / Ref No': e.reference_no || '-',
      'Amount (Tk)': e.amount,
      'Note': e.note || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expense_Report');
    XLSX.writeFile(wb, `Expense_Report_${fromDate}_to_${toDate}.xlsx`);
    toast.success('Expense report exported to Excel');
  };

  // Export to PDF (MIS Landscape Green Banner)
  const exportToPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const w = doc.internal.pageSize.getWidth();

    doc.setFillColor(46, 111, 64);
    doc.rect(0, 0, w, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('EZ ERP - ACCOUNTS MANAGEMENT', w / 2, 10, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`COMPANY EXPENSE REPORT (${fromDate} to ${toDate})`, w / 2, 17, { align: 'center' });

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Expense: Tk ${totalExpenseAmount.toLocaleString('en-BD', { minimumFractionDigits: 2 })} | Total Entries: ${filteredExpenses.length}`, 14, 32);

    const rows = filteredExpenses.map((e, i) => [
      i + 1,
      e.expense_date,
      e.voucher_no || '-',
      e.category,
      e.payee || '-',
      e.payment_mode || 'Cash',
      e.reference_no || '-',
      Number(e.amount || 0).toFixed(2),
      e.note || '-'
    ]);

    autoTable(doc, {
      startY: 37,
      theme: 'grid',
      head: [['SL', 'Date', 'Voucher No', 'Category Head', 'Payee / Recipient', 'Mode', 'Ref No', 'Amount (Tk)', 'Note']],
      body: rows,
      headStyles: { fillColor: [46, 111, 64], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        7: { halign: 'right' }
      }
    });

    const finalY = doc.lastAutoTable.finalY + 25;
    doc.setFontSize(8);
    doc.text('Prepared By', 20, finalY);
    doc.text('Accounts Manager', w / 2 - 15, finalY);
    doc.text('Managing Director', w - 50, finalY);

    doc.save(`Expense_Report_${fromDate}_to_${toDate}.pdf`);
    toast.success('Expense report PDF downloaded');
  };

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
            <TrendingDown className="text-emerald-700" size={24} />
            Company Expense Management & Cost Control
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
            Record office rent, utilities, conveyance, marketing, and operational expenses with auto-debit vouchers
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setModalOpen(true)}
            className="btn-theme"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '12px' }}
          >
            <Plus size={15} /> + Add Expense Entry
          </button>
          <button 
            onClick={exportToExcel}
            className="btn-info"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '12px' }}
          >
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button 
            onClick={exportToPdf}
            className="btn-info"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '12px' }}
          >
            <Printer size={14} /> PDF
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '8px', border: '1px solid #fee2e2', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' }}>Total Expenses (Period)</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>
            {formatCurrency(totalExpenseAmount)}
          </div>
          <div style={{ fontSize: '11px', color: '#b91c1c', marginTop: '2px' }}>{filteredExpenses.length} transactions recorded</div>
        </div>

        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Active Expense Heads</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#1e293b', marginTop: '4px' }}>
            {categories.length} Categories
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            <span style={{ color: '#2e6f40', cursor: 'pointer', fontWeight: 600 }} onClick={() => setCategoryModalOpen(true)}>+ Add New Category</span>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '8px', border: '1px solid #dcfce7', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Avg Transaction Size</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>
            {formatCurrency(filteredExpenses.length ? totalExpenseAmount / filteredExpenses.length : 0)}
          </div>
          <div style={{ fontSize: '11px', color: '#15803d', marginTop: '2px' }}>Cost per recorded bill</div>
        </div>
      </div>

      {/* Main Expenses Table Card */}
      <div style={{
        background: '#fff',
        borderRadius: '8px',
        padding: '20px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
      }}>
        
        {/* Table Filters */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            
            <div style={{ position: 'relative', width: '260px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: '#94a3b8' }} />
              <input 
                type="text" 
                placeholder="Search category, payee, voucher..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '7px 10px 7px 30px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }}
              />
            </div>

            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              style={{ padding: '7px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            >
              <option value="ALL">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input 
                type="date" 
                value={fromDate} 
                onChange={e => setFromDate(e.target.value)}
                style={{ padding: '6px 8px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              />
              <span style={{ fontSize: '11px', color: '#64748b' }}>to</span>
              <input 
                type="date" 
                value={toDate} 
                onChange={e => setToDate(e.target.value)}
                style={{ padding: '6px 8px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              />
            </div>

            <button
              onClick={fetchExpenses}
              className="btn-theme"
              style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Filter
            </button>
          </div>

          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Total: <b>{formatCurrency(totalExpenseAmount)}</b>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#2e6f40', color: '#fff', textAlign: 'left' }}>
                <th style={{ padding: '10px', border: '1px solid #255a33', width: '40px' }}>SL</th>
                <th style={{ padding: '10px', border: '1px solid #255a33' }}>Date</th>
                <th style={{ padding: '10px', border: '1px solid #255a33' }}>Voucher No</th>
                <th style={{ padding: '10px', border: '1px solid #255a33' }}>Expense Category Head</th>
                <th style={{ padding: '10px', border: '1px solid #255a33' }}>Payee / Beneficiary</th>
                <th style={{ padding: '10px', border: '1px solid #255a33' }}>Payment Channel</th>
                <th style={{ padding: '10px', border: '1px solid #255a33' }}>Ref / Bill No</th>
                <th style={{ padding: '10px', border: '1px solid #255a33', textAlign: 'right' }}>Amount (Tk)</th>
                <th style={{ padding: '10px', border: '1px solid #255a33' }}>Purpose / Remarks</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                    No expense entries found for selected criteria.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((e, idx) => (
                  <tr 
                    key={e.id || idx}
                    style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}
                  >
                    <td style={{ padding: '10px', color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ padding: '10px', color: '#475569', whiteSpace: 'nowrap' }}>{e.expense_date}</td>
                    <td style={{ padding: '10px', fontWeight: 700, color: '#991b1b' }}>{e.voucher_no || '-'}</td>
                    <td style={{ padding: '10px', fontWeight: 600, color: '#1e293b' }}>
                      <span style={{ background: '#fef2f2', color: '#991b1b', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                        {e.category}
                      </span>
                    </td>
                    <td style={{ padding: '10px', color: '#334155' }}>{e.payee || '-'}</td>
                    <td style={{ padding: '10px', color: '#64748b', fontSize: '11px' }}>
                      {e.payment_mode} {e.bank_account_name ? `(${e.bank_account_name})` : ''}
                    </td>
                    <td style={{ padding: '10px', color: '#64748b' }}>{e.reference_no || '-'}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 800, color: '#ef4444' }}>
                      {formatCurrency(e.amount)}
                    </td>
                    <td style={{ padding: '10px', color: '#64748b', fontSize: '11px' }}>{e.note || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* RECORD EXPENSE MODAL */}
      {modalOpen && (
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
            maxWidth: '520px',
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
                💸 Record New Operating Expense
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} style={{ padding: '20px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Expense Date *
                  </label>
                  <input 
                    type="date"
                    value={expDate}
                    onChange={e => setExpDate(e.target.value)}
                    style={{ width: '100%', padding: '7px 9px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Amount (Tk) *
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    style={{ width: '100%', padding: '7px 9px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 700, color: '#ef4444' }}
                    required
                  />
                </div>
              </div>

              {/* Category */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                    Expense Category Head *
                  </label>
                  <span 
                    onClick={() => setCategoryModalOpen(true)}
                    style={{ fontSize: '10px', color: '#2e6f40', fontWeight: 600, cursor: 'pointer' }}
                  >
                    + Add New Category
                  </span>
                </div>
                <select
                  value={categoryInput}
                  onChange={e => setCategoryInput(e.target.value)}
                  style={{ width: '100%', padding: '7px 9px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  required
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Payee */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Payee / Vendor / Recipient Name
                </label>
                <input 
                  type="text"
                  placeholder="e.g. Building Landlord, DPDC, Driver..."
                  value={payee}
                  onChange={e => setPayee(e.target.value)}
                  style={{ width: '100%', padding: '7px 9px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </div>

              {/* Mode & Bank */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={e => setPaymentMode(e.target.value)}
                    style={{ width: '100%', padding: '7px 9px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  >
                    <option value="Cash">Cash in Hand</option>
                    <option value="Bank">Bank Account</option>
                    <option value="bKash / Mobile">Mobile Banking</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Bill / Voucher Ref No
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. Bill # 589"
                    value={refNo}
                    onChange={e => setRefNo(e.target.value)}
                    style={{ width: '100%', padding: '7px 9px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  />
                </div>
              </div>

              {paymentMode !== 'Cash' && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Disbursing Bank Account
                  </label>
                  <select
                    value={selectedBank}
                    onChange={e => setSelectedBank(e.target.value)}
                    style={{ width: '100%', padding: '7px 9px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  >
                    {bankAccounts.map(b => (
                      <option key={b.id} value={b.account_name}>
                        {b.account_name} ({b.account_number})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Note */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Expense Purpose / Note
                </label>
                <textarea 
                  rows="2"
                  placeholder="Details of the expenditure..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  style={{ width: '100%', padding: '7px 9px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
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
                  <Check size={15} /> Save & Post Debit Voucher
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* CREATE CATEGORY MODAL */}
      {categoryModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 110,
          padding: '15px'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            overflow: 'hidden'
          }}>
            <div style={{
              background: '#2e6f40',
              padding: '12px 18px',
              color: '#fff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ fontSize: '14px', fontWeight: 700 }}>+ Add Expense Head</div>
              <button 
                onClick={() => setCategoryModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} style={{ padding: '18px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Category Name *
                </label>
                <input 
                  type="text"
                  placeholder="e.g. Generator Fuel & Maintenance"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  style={{ width: '100%', padding: '7px 9px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setCategoryModalOpen(false)}
                  className="btn-info"
                  style={{ padding: '6px 12px', fontSize: '11px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-theme"
                  style={{ padding: '6px 14px', fontSize: '11px' }}
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ExpenseManagement;
