import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Search, RefreshCw, DollarSign, 
  FileSpreadsheet, Printer, Download, Eye, 
  CheckCircle2, AlertCircle, X, Check, Building
} from 'lucide-react';
import { accountsService } from '../../lib/accountsService';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const AccountsPayable = () => {
  const [loading, setLoading] = useState(true);
  const [payableData, setPayableData] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dueFilter, setDueFilter] = useState('ALL'); // ALL, DUE_ONLY, PAID_ONLY

  // Payment Modal States
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedVendorForPayment, setSelectedVendorForPayment] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMode, setPayMode] = useState('Cash');
  const [selectedBank, setSelectedBank] = useState('');
  const [refNo, setRefNo] = useState('');
  const [payNote, setPayNote] = useState('');

  // Vendor Ledger Modal
  const [ledgerModalOpen, setLedgerModalOpen] = useState(false);
  const [selectedVendorForLedger, setSelectedVendorForLedger] = useState(null);
  const [ledgerTab, setLedgerTab] = useState('bills'); // 'bills', 'returns', 'payments'

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pData, banks] = await Promise.all([
        accountsService.getPayableData(),
        accountsService.getBankAccounts()
      ]);
      setPayableData(pData);
      setBankAccounts(banks);
      if (banks.length > 0) setSelectedBank(banks[0].account_name);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load accounts payable data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPayment = (vendor) => {
    setSelectedVendorForPayment(vendor);
    setPayAmount(vendor.net_due > 0 ? vendor.net_due : '');
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayMode('Cash');
    setRefNo('');
    setPayNote('');
    setPaymentModalOpen(true);
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!payAmount || Number(payAmount) <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    if (Number(payAmount) > selectedVendorForPayment.net_due && selectedVendorForPayment.net_due > 0) {
      if (!window.confirm('Entered payment amount exceeds current outstanding due. Proceed with advance payment?')) {
        return;
      }
    }

    try {
      await accountsService.saveVendorPayment({
        vendor_id: selectedVendorForPayment.id,
        vendor_name: selectedVendorForPayment.name,
        payment_date: payDate,
        amount: Number(payAmount),
        payment_mode: payMode,
        bank_account_name: payMode !== 'Cash' ? selectedBank : null,
        reference_no: refNo,
        note: payNote
      });

      toast.success(`Payment of ৳ ${Number(payAmount).toLocaleString()} recorded successfully!`);
      setPaymentModalOpen(false);
      await loadData();
    } catch (err) {
      toast.error('Failed to submit vendor payment');
    }
  };

  const handleOpenLedger = (vendor) => {
    setSelectedVendorForLedger(vendor);
    setLedgerModalOpen(true);
  };

  // Filter vendors
  const filteredVendors = (payableData?.vendorSummaries || []).filter(v => {
    if (dueFilter === 'DUE_ONLY' && v.net_due <= 0) return false;
    if (dueFilter === 'PAID_ONLY' && v.net_due > 0) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      v.name?.toLowerCase().includes(q) ||
      v.contact_no?.toLowerCase().includes(q) ||
      v.code?.toLowerCase().includes(q)
    );
  });

  // Export Full Payables Summary to Excel
  const exportSummaryToExcel = () => {
    if (!filteredVendors.length) {
      toast.error('No data to export');
      return;
    }
    const rows = filteredVendors.map((v, i) => ({
      'SL': i + 1,
      'Vendor Code': v.code,
      'Vendor Name': v.name,
      'Contact No': v.contact_no,
      'Total Bills': v.total_bills_count,
      'Total Returns': v.total_returns_count || 0,
      'Total Purchases (Tk)': v.total_purchases,
      'Cash Purchases (Tk)': v.cash_purchases,
      'Credit Purchases (Tk)': v.credit_purchases,
      'After-Sale Purchases (Tk)': v.after_sale_purchases,
      'Purchase Returns (Tk)': v.total_returned || 0,
      'Total Paid (Tk)': v.total_paid,
      'Net Outstanding Due (Tk)': v.net_due
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Accounts_Payable_Summary');
    XLSX.writeFile(wb, `Accounts_Payable_Summary_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Payables summary exported to Excel');
  };

  // Export Vendor Statement to PDF
  const exportVendorStatementPdf = (vendor) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const w = doc.internal.pageSize.getWidth();

    // Green Header Banner
    doc.setFillColor(46, 111, 64);
    doc.rect(0, 0, w, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('EZ ERP - ACCOUNTS MANAGEMENT', w / 2, 10, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`VENDOR STATEMENT & LEDGER - ${vendor.name.toUpperCase()}`, w / 2, 17, { align: 'center' });

    // Vendor Info Bar
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Vendor: ${vendor.name} (Code: ${vendor.code})`, 14, 32);
    doc.text(`Contact: ${vendor.contact_no} | Address: ${vendor.address}`, 14, 37);
    doc.text(`Purchases: Tk ${vendor.total_purchases.toLocaleString()} | Returns: Tk ${(vendor.total_returned || 0).toLocaleString()} | Paid: Tk ${vendor.total_paid.toLocaleString()} | Net Payable: Tk ${vendor.net_due.toLocaleString()}`, 14, 42);

    const billRows = (vendor.bills || []).map((b, i) => [
      i + 1,
      'Purchase',
      b.purchase_date || '-',
      b.receive_no || b.challan_no || '-',
      b.supplier_payment_type || b.payment_type || 'CashPurchase',
      b.net_amount || b.total_value ? Number(b.net_amount || b.total_value).toFixed(2) : '0.00',
      b.supplier_payment_type === 'CashPurchase' ? 'Paid at Delivery' : 'Credit / Outstanding'
    ]);

    const returnRows = (vendor.returns || []).map((r, i) => [
      billRows.length + i + 1,
      'Store Return',
      r.return_date || '-',
      r.challan_no || r.reference_no || '-',
      'Vendor Return',
      `(-) ${Number(r.total_amount || 0).toFixed(2)}`,
      'Deducted from Due'
    ]);

    const paymentRows = (vendor.payments || []).map((p, i) => [
      billRows.length + returnRows.length + i + 1,
      'Payment',
      p.payment_date || '-',
      p.voucher_no || p.reference_no || '-',
      p.payment_mode || 'Cash',
      `(-) ${Number(p.amount || 0).toFixed(2)}`,
      'Disbursed'
    ]);

    const allLedgerRows = [...billRows, ...returnRows, ...paymentRows];

    autoTable(doc, {
      startY: 47,
      theme: 'grid',
      head: [['SL', 'Type', 'Date', 'Voucher / Challan No', 'Payment Terms / Mode', 'Amount (Tk)', 'Balance Effect']],
      body: allLedgerRows,
      headStyles: { fillColor: [46, 111, 64], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        5: { halign: 'right' }
      }
    });

    const finalY = doc.lastAutoTable.finalY + 25;
    doc.setFontSize(8);
    doc.text('Prepared By', 20, finalY);
    doc.text('Accounts Manager', w / 2 - 15, finalY);
    doc.text('Vendor Acknowledgment', w - 55, finalY);

    doc.save(`${vendor.name}_Payable_Ledger.pdf`);
    toast.success('Vendor ledger statement downloaded');
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
            <CreditCard className="text-emerald-700" size={24} />
            Accounts Payable & Vendor Dues Management
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
            Track Cash Purchases, Credit Purchases (Baki), After-Sale Consignments, and record supplier disbursements
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={exportSummaryToExcel}
            className="btn-info"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '12px' }}
          >
            <FileSpreadsheet size={14} /> Export Excel
          </button>
          <button 
            onClick={loadData}
            className="btn-theme"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '12px' }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '14px',
        marginBottom: '20px'
      }}>
        <div style={{ background: '#fff', padding: '16px 18px', borderRadius: '8px', border: '1px solid #fee2e2', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>Total Net Payable</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>
            {formatCurrency(payableData?.totalPayable)}
          </div>
          <div style={{ fontSize: '11px', color: '#991b1b', marginTop: '2px' }}>Total net supplier liabilities</div>
        </div>

        <div style={{ background: '#fff', padding: '16px 18px', borderRadius: '8px', border: '1px solid #fef3c7', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>Credit Purchases (Baki)</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>
            {formatCurrency(payableData?.totalCreditPurchases)}
          </div>
          <div style={{ fontSize: '11px', color: '#b45309', marginTop: '2px' }}>Bought on credit terms</div>
        </div>

        <div style={{ background: '#fff', padding: '16px 18px', borderRadius: '8px', border: '1px solid #e0e7ff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase' }}>After-Sale Consignment</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#4f46e5', marginTop: '4px' }}>
            {formatCurrency(payableData?.totalAfterSalePurchases)}
          </div>
          <div style={{ fontSize: '11px', color: '#3730a3', marginTop: '2px' }}>Payable post customer sales</div>
        </div>

        <div style={{ background: '#fff', padding: '16px 18px', borderRadius: '8px', border: '1px solid #fed7aa', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#c2410c', textTransform: 'uppercase' }}>Purchase Returns</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#c2410c', marginTop: '4px' }}>
            (-) {formatCurrency(payableData?.totalReturned)}
          </div>
          <div style={{ fontSize: '11px', color: '#9a3412', marginTop: '2px' }}>Central Store returns to vendor</div>
        </div>

        <div style={{ background: '#fff', padding: '16px 18px', borderRadius: '8px', border: '1px solid #dcfce7', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Total Settled / Paid</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>
            {formatCurrency(payableData?.totalPaid)}
          </div>
          <div style={{ fontSize: '11px', color: '#15803d', marginTop: '2px' }}>Payments made to date</div>
        </div>
      </div>

      {/* Main Vendor Payables Table Card */}
      <div style={{
        background: '#fff',
        borderRadius: '8px',
        padding: '20px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
      }}>
        
        {/* Table Filters */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative', width: '320px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: '#94a3b8' }} />
              <input 
                type="text" 
                placeholder="Search vendor name, code, phone..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '7px 10px 7px 30px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }}
              />
            </div>

            <select
              value={dueFilter}
              onChange={e => setDueFilter(e.target.value)}
              style={{ padding: '7px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            >
              <option value="ALL">All Vendors ({payableData?.vendorSummaries?.length || 0})</option>
              <option value="DUE_ONLY">With Outstanding Due</option>
              <option value="PAID_ONLY">Fully Cleared (0 Due)</option>
            </select>
          </div>

          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Showing <b>{filteredVendors.length}</b> vendor ledger summaries
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#2e6f40', color: '#fff', textAlign: 'left' }}>
                <th style={{ padding: '10px', border: '1px solid #255a33', width: '35px' }}>SL</th>
                <th style={{ padding: '10px', border: '1px solid #255a33' }}>Vendor Name & Code</th>
                <th style={{ padding: '10px', border: '1px solid #255a33' }}>Contact No</th>
                <th style={{ padding: '10px', border: '1px solid #255a33', textAlign: 'center' }}>Bills</th>
                <th style={{ padding: '10px', border: '1px solid #255a33', textAlign: 'right' }}>Total Purchases</th>
                <th style={{ padding: '10px', border: '1px solid #255a33', textAlign: 'right' }}>Cash Purchase</th>
                <th style={{ padding: '10px', border: '1px solid #255a33', textAlign: 'right' }}>Credit (Baki)</th>
                <th style={{ padding: '10px', border: '1px solid #255a33', textAlign: 'right' }}>After-Sale</th>
                <th style={{ padding: '10px', border: '1px solid #255a33', textAlign: 'right', color: '#ffedd5' }}>Returns (Store)</th>
                <th style={{ padding: '10px', border: '1px solid #255a33', textAlign: 'right' }}>Total Paid</th>
                <th style={{ padding: '10px', border: '1px solid #255a33', textAlign: 'right', background: '#991b1b' }}>Net Due (Payable)</th>
                <th style={{ padding: '10px', border: '1px solid #255a33', textAlign: 'center', width: '160px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan="12" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                    No vendor records found.
                  </td>
                </tr>
              ) : (
                filteredVendors.map((v, idx) => (
                  <tr 
                    key={v.id || idx}
                    style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}
                  >
                    <td style={{ padding: '10px', color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ padding: '10px', fontWeight: 600, color: '#1e293b' }}>
                      {v.name}
                      <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 400 }}>Code: {v.code}</div>
                    </td>
                    <td style={{ padding: '10px', color: '#475569' }}>{v.contact_no}</td>
                    <td style={{ padding: '10px', textAlign: 'center', fontWeight: 600 }}>{v.total_bills_count}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600 }}>
                      {formatCurrency(v.total_purchases)}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#059669' }}>
                      {formatCurrency(v.cash_purchases)}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#d97706', fontWeight: 600 }}>
                      {formatCurrency(v.credit_purchases)}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#4f46e5' }}>
                      {formatCurrency(v.after_sale_purchases)}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#c2410c', fontWeight: 600 }}>
                      {v.total_returned > 0 ? `(-) ${formatCurrency(v.total_returned)}` : '৳ 0.00'}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>
                      {formatCurrency(v.total_paid)}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 800, color: v.net_due > 0 ? '#dc2626' : '#16a34a' }}>
                      {formatCurrency(v.net_due)}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleOpenPayment(v)}
                          className="btn-danger"
                          style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}
                          title="Record payment to supplier"
                        >
                          <DollarSign size={12} /> Pay
                        </button>
                        <button
                          onClick={() => handleOpenLedger(v)}
                          className="btn-theme"
                          style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}
                          title="View Vendor Statement"
                        >
                          <Eye size={12} /> Statement
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* MAKE PAYMENT MODAL */}
      {paymentModalOpen && selectedVendorForPayment && (
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
                💳 Record Payment to Vendor: {selectedVendorForPayment.name}
              </div>
              <button 
                onClick={() => setPaymentModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} style={{ padding: '20px' }}>
              
              {/* Due Summary Card */}
              <div style={{
                background: '#fff1f2',
                borderRadius: '6px',
                padding: '12px 14px',
                border: '1px solid #fecdd3',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#991b1b', fontWeight: 600 }}>CURRENT OUTSTANDING PAYABLE (DUE)</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#be123c' }}>
                    {formatCurrency(selectedVendorForPayment.net_due)}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '11px', color: '#881337' }}>
                  Credit Purchases: {formatCurrency(selectedVendorForPayment.credit_purchases)}<br/>
                  After Sale: {formatCurrency(selectedVendorForPayment.after_sale_purchases)}
                </div>
              </div>

              {/* Form Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Payment Date *
                  </label>
                  <input 
                    type="date"
                    value={payDate}
                    onChange={e => setPayDate(e.target.value)}
                    style={{ width: '100%', padding: '7px 9px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Payment Amount (Tk) *
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    placeholder="0.00"
                    style={{ width: '100%', padding: '7px 9px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 700, color: '#dc2626' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Payment Mode
                  </label>
                  <select
                    value={payMode}
                    onChange={e => setPayMode(e.target.value)}
                    style={{ width: '100%', padding: '7px 9px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  >
                    <option value="Cash">Cash in Hand</option>
                    <option value="Bank">Bank Account</option>
                    <option value="bKash / Mobile">Mobile Banking</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Cheque / Ref No
                  </label>
                  <input 
                    type="text"
                    value={refNo}
                    onChange={e => setRefNo(e.target.value)}
                    placeholder="e.g. CQ-12003"
                    style={{ width: '100%', padding: '7px 9px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  />
                </div>
              </div>

              {payMode !== 'Cash' && (
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

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Payment Note / Narration
                </label>
                <textarea 
                  rows="2"
                  value={payNote}
                  onChange={e => setPayNote(e.target.value)}
                  placeholder="e.g. Cleared bill for September consignment..."
                  style={{ width: '100%', padding: '7px 9px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
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
                  <Check size={15} /> Confirm & Post Voucher
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* VENDOR LEDGER STATEMENT MODAL */}
      {ledgerModalOpen && selectedVendorForLedger && (
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
            maxWidth: '850px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
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
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700 }}>
                  📄 Vendor Purchase & Due Ledger: {selectedVendorForLedger.name}
                </div>
                <div style={{ fontSize: '11px', opacity: 0.9 }}>
                  Code: {selectedVendorForLedger.code} &bull; Phone: {selectedVendorForLedger.contact_no}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button 
                  onClick={() => exportVendorStatementPdf(selectedVendorForLedger)}
                  className="btn-info"
                  style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Printer size={12} /> Download PDF
                </button>
                <button 
                  onClick={() => setLedgerModalOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              
              {/* Summary Badges (5 Cards) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginBottom: '16px' }}>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>TOTAL PURCHASES</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{formatCurrency(selectedVendorForLedger.total_purchases)}</div>
                </div>
                <div style={{ background: '#fffbeb', padding: '10px', borderRadius: '6px', border: '1px solid #fef3c7', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#b45309', fontWeight: 600 }}>CREDIT PURCHASES</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#d97706' }}>{formatCurrency(selectedVendorForLedger.credit_purchases)}</div>
                </div>
                <div style={{ background: '#fff7ed', padding: '10px', borderRadius: '6px', border: '1px solid #ffedd5', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#c2410c', fontWeight: 600 }}>PURCHASE RETURNS</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#c2410c' }}>(-) {formatCurrency(selectedVendorForLedger.total_returned)}</div>
                </div>
                <div style={{ background: '#f0fdf4', padding: '10px', borderRadius: '6px', border: '1px solid #dcfce7', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#15803d', fontWeight: 600 }}>SETTLED / PAID</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#16a34a' }}>(-) {formatCurrency(selectedVendorForLedger.total_paid)}</div>
                </div>
                <div style={{ background: '#fff1f2', padding: '10px', borderRadius: '6px', border: '1px solid #fecdd3', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#991b1b', fontWeight: 600 }}>NET OUTSTANDING DUE</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#dc2626' }}>{formatCurrency(selectedVendorForLedger.net_due)}</div>
                </div>
              </div>

              {/* Sub Tabs inside Modal */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                <button
                  type="button"
                  onClick={() => setLedgerTab('bills')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '4px',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: ledgerTab === 'bills' ? '#2e6f40' : '#f1f5f9',
                    color: ledgerTab === 'bills' ? '#fff' : '#475569'
                  }}
                >
                  📦 Purchase Receives ({(selectedVendorForLedger.bills || []).length})
                </button>
                <button
                  type="button"
                  onClick={() => setLedgerTab('returns')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '4px',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: ledgerTab === 'returns' ? '#c2410c' : '#f1f5f9',
                    color: ledgerTab === 'returns' ? '#fff' : '#475569'
                  }}
                >
                  🔄 Central Store Returns ({(selectedVendorForLedger.returns || []).length})
                </button>
                <button
                  type="button"
                  onClick={() => setLedgerTab('payments')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '4px',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: ledgerTab === 'payments' ? '#15803d' : '#f1f5f9',
                    color: ledgerTab === 'payments' ? '#fff' : '#475569'
                  }}
                >
                  💳 Payments Disbursed ({(selectedVendorForLedger.payments || []).length})
                </button>
              </div>

              {/* TAB 1: PURCHASE INVOICES */}
              {ledgerTab === 'bills' && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', color: '#334155', textAlign: 'left' }}>
                      <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Date</th>
                      <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Invoice / Challan</th>
                      <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Payment Type</th>
                      <th style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'right' }}>Total Value</th>
                      <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedVendorForLedger.bills || []).length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                          No purchase bills recorded for this vendor.
                        </td>
                      </tr>
                    ) : (
                      (selectedVendorForLedger.bills || []).map((b, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px', color: '#475569' }}>{b.purchase_date}</td>
                          <td style={{ padding: '8px', fontWeight: 600, color: '#1e293b' }}>{b.receive_no || b.challan_no || '-'}</td>
                          <td style={{ padding: '8px' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 600,
                              background: b.supplier_payment_type === 'CashPurchase' ? '#dcfce7' : b.supplier_payment_type === 'CreditPurchase' ? '#fef3c7' : '#e0e7ff',
                              color: b.supplier_payment_type === 'CashPurchase' ? '#166534' : b.supplier_payment_type === 'CreditPurchase' ? '#b45309' : '#3730a3'
                            }}>
                              {b.supplier_payment_type || b.payment_type || 'CashPurchase'}
                            </span>
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>
                            {formatCurrency(b.net_amount || b.total_value)}
                          </td>
                          <td style={{ padding: '8px', color: b.supplier_payment_type === 'CashPurchase' ? '#16a34a' : '#d97706', fontWeight: 600 }}>
                            {b.supplier_payment_type === 'CashPurchase' ? 'Paid at Delivery' : 'Credit Outstanding'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {/* TAB 2: PURCHASE RETURNS */}
              {ledgerTab === 'returns' && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ background: '#fff7ed', color: '#9a3412', textAlign: 'left' }}>
                      <th style={{ padding: '8px', border: '1px solid #fed7aa' }}>Return Date</th>
                      <th style={{ padding: '8px', border: '1px solid #fed7aa' }}>Challan / Ref No</th>
                      <th style={{ padding: '8px', border: '1px solid #fed7aa' }}>Reason</th>
                      <th style={{ padding: '8px', border: '1px solid #fed7aa', textAlign: 'right' }}>Returned Amount</th>
                      <th style={{ padding: '8px', border: '1px solid #fed7aa' }}>Effect</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedVendorForLedger.returns || []).length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                          No purchase returns recorded for this vendor.
                        </td>
                      </tr>
                    ) : (
                      (selectedVendorForLedger.returns || []).map((r, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #ffedd5' }}>
                          <td style={{ padding: '8px', color: '#475569' }}>{r.return_date}</td>
                          <td style={{ padding: '8px', fontWeight: 600, color: '#9a3412' }}>{r.challan_no || r.reference_no || '-'}</td>
                          <td style={{ padding: '8px', color: '#64748b' }}>{r.return_reason || r.reason || 'Store goods return to supplier'}</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: '#c2410c' }}>
                            (-) {formatCurrency(r.total_amount)}
                          </td>
                          <td style={{ padding: '8px', color: '#059669', fontWeight: 600 }}>
                            Deducted from payable due
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {/* TAB 3: PAYMENTS DISBURSED */}
              {ledgerTab === 'payments' && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ background: '#f0fdf4', color: '#166534', textAlign: 'left' }}>
                      <th style={{ padding: '8px', border: '1px solid #bbf7d0' }}>Payment Date</th>
                      <th style={{ padding: '8px', border: '1px solid #bbf7d0' }}>Voucher No</th>
                      <th style={{ padding: '8px', border: '1px solid #bbf7d0' }}>Payment Mode</th>
                      <th style={{ padding: '8px', border: '1px solid #bbf7d0' }}>Ref / Cheque No</th>
                      <th style={{ padding: '8px', border: '1px solid #bbf7d0', textAlign: 'right' }}>Amount Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedVendorForLedger.payments || []).length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                          No payment vouchers recorded for this vendor.
                        </td>
                      </tr>
                    ) : (
                      (selectedVendorForLedger.payments || []).map((p, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #dcfce7' }}>
                          <td style={{ padding: '8px', color: '#475569' }}>{p.payment_date}</td>
                          <td style={{ padding: '8px', fontWeight: 700, color: '#166534' }}>{p.voucher_no || '-'}</td>
                          <td style={{ padding: '8px' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 600,
                              background: p.payment_mode === 'Cash' ? '#dcfce7' : '#e0e7ff',
                              color: p.payment_mode === 'Cash' ? '#166534' : '#3730a3'
                            }}>
                              {p.payment_mode || 'Cash'} {p.bank_account_name ? `(${p.bank_account_name})` : ''}
                            </span>
                          </td>
                          <td style={{ padding: '8px', color: '#64748b' }}>{p.reference_no || '-'}</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                            (-) {formatCurrency(p.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setLedgerModalOpen(false)}
                className="btn-info"
                style={{ padding: '6px 14px', fontSize: '12px' }}
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default AccountsPayable;
