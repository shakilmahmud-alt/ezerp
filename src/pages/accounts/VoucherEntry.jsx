import React, { useState, useEffect } from 'react';
import { 
  Receipt, Plus, RefreshCw, Search, Printer, 
  FileText, ArrowRightLeft, Check, Calendar, Download, Eye
} from 'lucide-react';
import { accountsService } from '../../lib/accountsService';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const VoucherEntry = () => {
  const [loading, setLoading] = useState(false);
  const [vouchers, setVouchers] = useState([]);
  const [chartOfAccounts, setChartOfAccounts] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);

  // Filter States
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];
  
  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(today);
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Form States
  const [voucherType, setVoucherType] = useState('Debit Voucher (Payment)');
  const [voucherDate, setVoucherDate] = useState(today);
  const [voucherNo, setVoucherNo] = useState('');
  const [debitAccount, setDebitAccount] = useState('');
  const [creditAccount, setCreditAccount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [selectedBank, setSelectedBank] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');
  const [selectedVoucherForView, setSelectedVoucherForView] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    setVoucherNo(accountsService.generateVoucherNo(voucherType));
    // Set smart default accounts based on voucher type
    if (voucherType.includes('Debit')) {
      setCreditAccount('1110 - Cash in Hand');
      setDebitAccount('5220 - Rent & Office Utilities');
    } else if (voucherType.includes('Credit')) {
      setDebitAccount('1110 - Cash in Hand');
      setCreditAccount('4100 - Sales Revenue (POS & Central)');
    } else if (voucherType.includes('Contra')) {
      setDebitAccount('1120 - Cash at Bank');
      setCreditAccount('1110 - Cash in Hand');
    } else {
      setDebitAccount('5100 - Cost of Goods Sold (Purchases)');
      setCreditAccount('2110 - Accounts Payable');
    }
  }, [voucherType]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [coas, banks] = await Promise.all([
        accountsService.getChartOfAccounts(),
        accountsService.getBankAccounts()
      ]);
      setChartOfAccounts(coas);
      setBankAccounts(banks);
      if (banks.length > 0) setSelectedBank(banks[0].account_name);
      await fetchVouchersList();
    } catch (err) {
      console.error(err);
      toast.error('Error loading initial accounts data');
    } finally {
      setLoading(false);
    }
  };

  const fetchVouchersList = async () => {
    setLoading(true);
    try {
      const list = await accountsService.getVouchers({ fromDate, toDate, type: filterType });
      setVouchers(list);
    } catch (err) {
      toast.error('Failed to fetch voucher records');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVoucher = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!debitAccount || !creditAccount) {
      toast.error('Please select both Debit and Credit accounts');
      return;
    }

    try {
      const voucherData = {
        voucher_no: voucherNo,
        voucher_type: voucherType,
        voucher_date: voucherDate,
        debit_account: debitAccount,
        credit_account: creditAccount,
        amount: Number(amount),
        payment_mode: paymentMode,
        bank_account_name: paymentMode !== 'Cash' ? selectedBank : null,
        reference_no: referenceNo,
        narration: narration || `${voucherType} entry on ${voucherDate}`
      };

      await accountsService.saveVoucher(voucherData);
      toast.success(`Voucher ${voucherNo} posted successfully!`);
      
      // Reset form
      setAmount('');
      setNarration('');
      setReferenceNo('');
      setVoucherNo(accountsService.generateVoucherNo(voucherType));
      await fetchVouchersList();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save voucher');
    }
  };

  // Filter vouchers by search
  const filteredVouchers = vouchers.filter(v => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      v.voucher_no?.toLowerCase().includes(q) ||
      v.debit_account?.toLowerCase().includes(q) ||
      v.credit_account?.toLowerCase().includes(q) ||
      v.narration?.toLowerCase().includes(q) ||
      v.reference_no?.toLowerCase().includes(q)
    );
  });

  // Print / PDF Voucher Slip
  const printVoucherPdf = (v) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
    const w = doc.internal.pageSize.getWidth();

    // Top Header Banner
    doc.setFillColor(46, 111, 64); // #2e6f40
    doc.rect(0, 0, w, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('EZ ERP - ACCOUNTS MANAGEMENT', w / 2, 10, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('OFFICIAL ACCOUNTS VOUCHER SLIP', w / 2, 17, { align: 'center' });

    // Voucher Info Box
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    
    doc.setFont('helvetica', 'bold');
    doc.text(`Voucher No: `, 12, 33);
    doc.setFont('helvetica', 'normal');
    doc.text(`${v.voucher_no}`, 36, 33);

    doc.setFont('helvetica', 'bold');
    doc.text(`Voucher Type: `, 12, 40);
    doc.setFont('helvetica', 'normal');
    doc.text(`${v.voucher_type}`, 36, 40);

    doc.setFont('helvetica', 'bold');
    doc.text(`Date: `, w - 50, 33);
    doc.setFont('helvetica', 'normal');
    doc.text(`${v.voucher_date}`, w - 38, 33);

    doc.setFont('helvetica', 'bold');
    doc.text(`Pay Mode: `, w - 50, 40);
    doc.setFont('helvetica', 'normal');
    doc.text(`${v.payment_mode || 'Cash'}`, w - 32, 40);

    // Table of Accounting Particulars
    autoTable(doc, {
      startY: 47,
      theme: 'grid',
      head: [['Particulars / Account Head', 'Debit (Tk)', 'Credit (Tk)']],
      body: [
        [
          `Dr. Account: ${v.debit_account}\nRef: ${v.reference_no || 'N/A'}\nNarration: ${v.narration || '-'}`,
          Number(v.amount).toFixed(2),
          '-'
        ],
        [
          `Cr. Account: ${v.credit_account}\nPayment Channel: ${v.bank_account_name || v.payment_mode || 'Cash'}`,
          '-',
          Number(v.amount).toFixed(2)
        ],
        [
          'TOTAL AMOUNT',
          `Tk ${Number(v.amount).toFixed(2)}`,
          `Tk ${Number(v.amount).toFixed(2)}`
        ]
      ],
      headStyles: { fillColor: [46, 111, 64], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 8.5, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 32, halign: 'right' },
        2: { cellWidth: 32, halign: 'right' }
      }
    });

    const finalY = doc.lastAutoTable.finalY + 25;

    // Signatures
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setDrawColor(150, 150, 150);
    
    // Line 1: Prepared By
    doc.line(14, finalY, 48, finalY);
    doc.text('Prepared By', 20, finalY + 5);

    // Line 2: Checked By
    doc.line(w / 2 - 18, finalY, w / 2 + 18, finalY);
    doc.text('Accounts Manager', w / 2 - 14, finalY + 5);

    // Line 3: Approved By / Received By
    doc.line(w - 48, finalY, w - 14, finalY);
    doc.text('Approved / Received', w - 46, finalY + 5);

    doc.save(`${v.voucher_no}_Voucher.pdf`);
    toast.success(`Downloaded voucher ${v.voucher_no}`);
  };

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
            <Receipt className="text-emerald-700" size={24} />
            Voucher Entry & Posting Portal
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
            Create and post Debit, Credit, Journal, and Bank Contra vouchers directly into general ledger
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: '20px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: VOUCHER CREATION FORM */}
        <div style={{
          background: '#fff',
          borderRadius: '8px',
          padding: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
        }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
            📝 Post New Voucher Entry
          </div>

          <form onSubmit={handleSaveVoucher}>
            
            {/* Voucher Type Selector */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Voucher Type *
              </label>
              <select
                value={voucherType}
                onChange={e => setVoucherType(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#f8fafc', fontWeight: 600, color: '#1e293b' }}
              >
                <option value="Debit Voucher (Payment)">Debit Voucher (Payment / Cash Out)</option>
                <option value="Credit Voucher (Receipt)">Credit Voucher (Receipt / Cash In)</option>
                <option value="Journal Voucher">Journal Voucher (General Adjustment)</option>
                <option value="Contra Voucher (Transfer)">Contra Voucher (Cash ⇄ Bank Transfer)</option>
              </select>
            </div>

            {/* Voucher No & Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                  Voucher No
                </label>
                <input 
                  type="text" 
                  value={voucherNo} 
                  readOnly 
                  style={{ width: '100%', padding: '7px 9px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '4px', background: '#f1f5f9', fontWeight: 700, color: '#2e6f40' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                  Voucher Date *
                </label>
                <input 
                  type="date" 
                  value={voucherDate} 
                  onChange={e => setVoucherDate(e.target.value)}
                  style={{ width: '100%', padding: '7px 9px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </div>
            </div>

            {/* Debit Account */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Debit (Dr.) Account Head *
              </label>
              <select
                value={debitAccount}
                onChange={e => setDebitAccount(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                required
              >
                <option value="">-- Select Debit Account --</option>
                {chartOfAccounts.map(coa => (
                  <option key={coa.code} value={`${coa.code} - ${coa.name}`}>
                    {coa.code} - {coa.name} ({coa.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Credit Account */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Credit (Cr.) Account Head *
              </label>
              <select
                value={creditAccount}
                onChange={e => setCreditAccount(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                required
              >
                <option value="">-- Select Credit Account --</option>
                {chartOfAccounts.map(coa => (
                  <option key={coa.code} value={`${coa.code} - ${coa.name}`}>
                    {coa.code} - {coa.name} ({coa.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Mode & Bank Account */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                  Payment Mode
                </label>
                <select
                  value={paymentMode}
                  onChange={e => setPaymentMode(e.target.value)}
                  style={{ width: '100%', padding: '7px 9px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank">Bank Account</option>
                  <option value="bKash / Mobile">Mobile Banking</option>
                  <option value="Adjusted">Adjustment (Non-Cash)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                  Amount (Tk) *
                </label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="0.00"
                  value={amount} 
                  onChange={e => setAmount(e.target.value)}
                  style={{ width: '100%', padding: '7px 9px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 700, color: '#2e6f40' }}
                  required
                />
              </div>
            </div>

            {paymentMode !== 'Cash' && paymentMode !== 'Adjusted' && (
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                  Select Bank / Wallet Account
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

            {/* Reference No */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                Cheque / Reference / Bill No
              </label>
              <input 
                type="text" 
                placeholder="e.g. CQ-99231 or Bill Ref"
                value={referenceNo} 
                onChange={e => setReferenceNo(e.target.value)}
                style={{ width: '100%', padding: '7px 9px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              />
            </div>

            {/* Narration */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                Narration / Transaction Purpose
              </label>
              <textarea 
                rows="2"
                placeholder="Enter description of voucher entry..."
                value={narration} 
                onChange={e => setNarration(e.target.value)}
                style={{ width: '100%', padding: '7px 9px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', resize: 'vertical' }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="submit"
                className="btn-theme"
                style={{ flex: 1, padding: '9px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Check size={16} /> Post Voucher
              </button>

              <button
                type="button"
                onClick={() => {
                  setAmount('');
                  setNarration('');
                  setReferenceNo('');
                  setVoucherNo(accountsService.generateVoucherNo(voucherType));
                }}
                className="btn-info"
                style={{ padding: '9px 14px', fontSize: '13px' }}
              >
                Reset
              </button>
            </div>

          </form>
        </div>

        {/* RIGHT COLUMN: VOUCHER POSTINGS & HISTORY TABLE */}
        <div style={{
          background: '#fff',
          borderRadius: '8px',
          padding: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
        }}>
          
          {/* Table Header Filter Controls */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
              📋 Posted Vouchers Ledger
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              >
                <option value="ALL">All Voucher Types</option>
                <option value="Debit Voucher (Payment)">Debit Vouchers</option>
                <option value="Credit Voucher (Receipt)">Credit Vouchers</option>
                <option value="Journal Voucher">Journal Vouchers</option>
                <option value="Contra Voucher (Transfer)">Contra Vouchers</option>
              </select>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input 
                  type="date" 
                  value={fromDate} 
                  onChange={e => setFromDate(e.target.value)}
                  style={{ padding: '5px 8px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
                <span style={{ fontSize: '11px', color: '#64748b' }}>to</span>
                <input 
                  type="date" 
                  value={toDate} 
                  onChange={e => setToDate(e.target.value)}
                  style={{ padding: '5px 8px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </div>

              <button
                onClick={fetchVouchersList}
                className="btn-theme"
                style={{ padding: '5px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Filter
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div style={{ marginBottom: '14px', position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Search by Voucher No, Account Head, Narration, Ref..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '7px 10px 7px 30px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }}
            />
          </div>

          {/* Vouchers Table */}
          <div style={{ overflowX: 'auto', maxHeight: '550px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#2e6f40', color: '#fff', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px', border: '1px solid #255a33', width: '40px' }}>SL</th>
                  <th style={{ padding: '8px 10px', border: '1px solid #255a33' }}>Voucher No</th>
                  <th style={{ padding: '8px 10px', border: '1px solid #255a33' }}>Date</th>
                  <th style={{ padding: '8px 10px', border: '1px solid #255a33' }}>Type</th>
                  <th style={{ padding: '8px 10px', border: '1px solid #255a33' }}>Debit (Dr) / Credit (Cr)</th>
                  <th style={{ padding: '8px 10px', border: '1px solid #255a33', textAlign: 'right' }}>Amount (Tk)</th>
                  <th style={{ padding: '8px 10px', border: '1px solid #255a33', textAlign: 'center', width: '70px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredVouchers.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                      No vouchers found for selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredVouchers.map((v, idx) => (
                    <tr 
                      key={v.id || v.voucher_no || idx}
                      style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}
                    >
                      <td style={{ padding: '8px 10px', color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: '#1e293b' }}>
                        {v.voucher_no}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {v.voucher_date}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 700,
                          background: v.voucher_type?.includes('Debit') ? '#fee2e2' : v.voucher_type?.includes('Credit') ? '#dcfce7' : '#e0e7ff',
                          color: v.voucher_type?.includes('Debit') ? '#991b1b' : v.voucher_type?.includes('Credit') ? '#166534' : '#3730a3'
                        }}>
                          {v.voucher_type?.replace(' Voucher', '')}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ fontWeight: 600, color: '#0f766e' }}>Dr: {v.debit_account}</div>
                        <div style={{ color: '#64748b', fontSize: '11px' }}>Cr: {v.credit_account}</div>
                        {v.narration && <div style={{ color: '#94a3b8', fontSize: '10px', fontStyle: 'italic', marginTop: '2px' }}>{v.narration}</div>}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#1e293b' }}>
                        ৳ {Number(v.amount || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <button
                          onClick={() => printVoucherPdf(v)}
                          title="Print / Download Voucher Slip"
                          className="btn-theme"
                          style={{ padding: '4px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                        >
                          <Printer size={12} /> Slip
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>

      </div>

    </div>
  );
};

export default VoucherEntry;
