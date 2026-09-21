import React, { useState, useEffect } from 'react';
import { 
  HandCoins, Search, RefreshCw, DollarSign, 
  FileSpreadsheet, Printer, Download, Eye, 
  CheckCircle2, X, Check, Users
} from 'lucide-react';
import { accountsService } from '../../lib/accountsService';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const AccountsReceivable = () => {
  const [loading, setLoading] = useState(true);
  const [receivableData, setReceivableData] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dueFilter, setDueFilter] = useState('ALL'); // ALL, DUE_ONLY, PAID_ONLY

  // Due Collection Modal
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [selectedCustomerForCol, setSelectedCustomerForCol] = useState(null);
  const [colAmount, setColAmount] = useState('');
  const [colDate, setColDate] = useState(new Date().toISOString().split('T')[0]);
  const [colMode, setColMode] = useState('Cash');
  const [selectedBank, setSelectedBank] = useState('');
  const [refNo, setRefNo] = useState('');
  const [colNote, setColNote] = useState('');

  // Customer Ledger Modal
  const [ledgerModalOpen, setLedgerModalOpen] = useState(false);
  const [selectedCustomerForLedger, setSelectedCustomerForLedger] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rData, banks] = await Promise.all([
        accountsService.getReceivableData(),
        accountsService.getBankAccounts()
      ]);
      setReceivableData(rData);
      setBankAccounts(banks);
      if (banks.length > 0) setSelectedBank(banks[0].account_name);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load accounts receivable data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCollection = (customer) => {
    setSelectedCustomerForCol(customer);
    setColAmount(customer.net_due > 0 ? customer.net_due : '');
    setColDate(new Date().toISOString().split('T')[0]);
    setColMode('Cash');
    setRefNo('');
    setColNote('');
    setCollectionModalOpen(true);
  };

  const handleSubmitCollection = async (e) => {
    e.preventDefault();
    if (!colAmount || Number(colAmount) <= 0) {
      toast.error('Please enter a valid collection amount');
      return;
    }

    try {
      await accountsService.saveCustomerCollection({
        customer_id: selectedCustomerForCol.id,
        customer_name: selectedCustomerForCol.name,
        collection_date: colDate,
        amount: Number(colAmount),
        payment_mode: colMode,
        bank_account_name: colMode !== 'Cash' ? selectedBank : null,
        reference_no: refNo,
        note: colNote
      });

      toast.success(`Due collection of ৳ ${Number(colAmount).toLocaleString()} recorded successfully!`);
      setCollectionModalOpen(false);
      await loadData();
    } catch (err) {
      toast.error('Failed to record customer collection');
    }
  };

  const handleOpenLedger = (customer) => {
    setSelectedCustomerForLedger(customer);
    setLedgerModalOpen(true);
  };

  // Filtered customer list
  const filteredCustomers = (receivableData?.customerSummaries || []).filter(c => {
    if (dueFilter === 'DUE_ONLY' && c.net_due <= 0) return false;
    if (dueFilter === 'PAID_ONLY' && c.net_due > 0) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.contact_no?.toLowerCase().includes(q) ||
      c.code?.toLowerCase().includes(q)
    );
  });

  // Export Customer Receivables to Excel
  const exportSummaryToExcel = () => {
    if (!filteredCustomers.length) {
      toast.error('No data to export');
      return;
    }
    const rows = filteredCustomers.map((c, i) => ({
      'SL': i + 1,
      'Customer Code': c.code,
      'Customer Name': c.name,
      'Mobile No': c.contact_no,
      'Address': c.address,
      'Total Invoices': c.invoices_count,
      'Total Invoiced (Tk)': c.total_invoiced,
      'Total Received / Paid (Tk)': c.paid_amount,
      'Net Outstanding Due (Tk)': c.net_due
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Accounts_Receivable');
    XLSX.writeFile(wb, `Customer_Receivables_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Receivables summary exported to Excel');
  };

  // Export Customer Statement to PDF
  const exportCustomerStatementPdf = (customer) => {
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
    doc.text(`CUSTOMER ACCOUNT STATEMENT - ${customer.name.toUpperCase()}`, w / 2, 17, { align: 'center' });

    // Info Bar
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Customer: ${customer.name} (Code: ${customer.code})`, 14, 32);
    doc.text(`Mobile: ${customer.contact_no} | Address: ${customer.address}`, 14, 37);
    doc.text(`Total Invoiced: Tk ${customer.total_invoiced.toLocaleString()} | Paid: Tk ${customer.paid_amount.toLocaleString()} | Net Due: Tk ${customer.net_due.toLocaleString()}`, 14, 42);

    const rows = (customer.invoices || []).map((inv, i) => [
      i + 1,
      inv.created_at ? inv.created_at.slice(0, 10) : '-',
      inv.invoice_no || inv.id || '-',
      inv.payment_type || 'Cash',
      Number(inv.net_amount || inv.total_amount || 0).toFixed(2),
      Number(inv.paid_amount || 0).toFixed(2),
      Number((inv.net_amount || inv.total_amount || 0) - (inv.paid_amount || 0)).toFixed(2)
    ]);

    autoTable(doc, {
      startY: 47,
      theme: 'grid',
      head: [['SL', 'Date', 'Invoice No', 'Payment Type', 'Total (Tk)', 'Paid (Tk)', 'Due (Tk)']],
      body: rows,
      headStyles: { fillColor: [46, 111, 64], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' }
      }
    });

    const finalY = doc.lastAutoTable.finalY + 25;
    doc.setFontSize(8);
    doc.text('Prepared By', 20, finalY);
    doc.text('Accounts Manager', w / 2 - 15, finalY);
    doc.text('Customer Signature', w - 50, finalY);

    doc.save(`${customer.name}_Receivable_Statement.pdf`);
    toast.success('Customer statement downloaded');
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
            <HandCoins className="text-emerald-700" size={24} />
            Accounts Receivable & Customer Due Collections
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
            Track customer receivables, monitor invoice dues, and record collections
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
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '8px', border: '1px solid #bae6fd', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>Total Customer Receivables (Due)</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#0284c7', marginTop: '4px' }}>
            {formatCurrency(receivableData?.totalReceivable)}
          </div>
          <div style={{ fontSize: '11px', color: '#0369a1', marginTop: '2px' }}>Outstanding receivables</div>
        </div>

        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Sales Invoiced</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#1e293b', marginTop: '4px' }}>
            {formatCurrency(receivableData?.totalInvoiced)}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Total bill value</div>
        </div>

        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '8px', border: '1px solid #dcfce7', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Total Collected Amount</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>
            {formatCurrency(receivableData?.totalCollected)}
          </div>
          <div style={{ fontSize: '11px', color: '#15803d', marginTop: '2px' }}>Received from customers</div>
        </div>

        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '8px', border: '1px solid #fef3c7', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>Due Customers Count</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>
            {(receivableData?.customerSummaries || []).filter(c => c.net_due > 0).length}
          </div>
          <div style={{ fontSize: '11px', color: '#b45309', marginTop: '2px' }}>Accounts with pending balance</div>
        </div>
      </div>

      {/* Main Customers Receivable Table */}
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
                placeholder="Search customer name, phone, code..."
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
              <option value="ALL">All Customers ({receivableData?.customerSummaries?.length || 0})</option>
              <option value="DUE_ONLY">With Outstanding Due</option>
              <option value="PAID_ONLY">Cleared Accounts (0 Due)</option>
            </select>
          </div>

          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Showing <b>{filteredCustomers.length}</b> customer balances
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#2e6f40', color: '#fff', textAlign: 'left' }}>
                <th style={{ padding: '10px', border: '1px solid #255a33', width: '40px' }}>SL</th>
                <th style={{ padding: '10px', border: '1px solid #255a33' }}>Customer Name & Code</th>
                <th style={{ padding: '10px', border: '1px solid #255a33' }}>Mobile Number</th>
                <th style={{ padding: '10px', border: '1px solid #255a33', textAlign: 'center' }}>Invoices</th>
                <th style={{ padding: '10px', border: '1px solid #255a33', textAlign: 'right' }}>Total Invoiced</th>
                <th style={{ padding: '10px', border: '1px solid #255a33', textAlign: 'right' }}>Total Received</th>
                <th style={{ padding: '10px', border: '1px solid #255a33', textAlign: 'right', background: '#0369a1' }}>Net Receivable (Due)</th>
                <th style={{ padding: '10px', border: '1px solid #255a33', textAlign: 'center', width: '160px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                    No customer receivable records found.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c, idx) => (
                  <tr 
                    key={c.id || idx}
                    style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}
                  >
                    <td style={{ padding: '10px', color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ padding: '10px', fontWeight: 600, color: '#1e293b' }}>
                      {c.name}
                      <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 400 }}>Code: {c.code}</div>
                    </td>
                    <td style={{ padding: '10px', color: '#475569' }}>{c.contact_no}</td>
                    <td style={{ padding: '10px', textAlign: 'center', fontWeight: 600 }}>{c.invoices_count}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600 }}>
                      {formatCurrency(c.total_invoiced)}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>
                      {formatCurrency(c.paid_amount)}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 800, color: c.net_due > 0 ? '#0284c7' : '#16a34a' }}>
                      {formatCurrency(c.net_due)}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleOpenCollection(c)}
                          className="btn-info"
                          style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}
                          title="Collect due money from customer"
                        >
                          <DollarSign size={12} /> Collect
                        </button>
                        <button
                          onClick={() => handleOpenLedger(c)}
                          className="btn-theme"
                          style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}
                          title="View Customer Statement"
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

      {/* DUE COLLECTION MODAL */}
      {collectionModalOpen && selectedCustomerForCol && (
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
            maxWidth: '500px',
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
                💰 Collect Customer Due: {selectedCustomerForCol.name}
              </div>
              <button 
                onClick={() => setCollectionModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitCollection} style={{ padding: '20px' }}>
              
              {/* Due Summary Card */}
              <div style={{
                background: '#f0f9ff',
                borderRadius: '6px',
                padding: '12px 14px',
                border: '1px solid #bae6fd',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#0369a1', fontWeight: 600 }}>CURRENT OUTSTANDING RECEIVABLE (DUE)</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#0284c7' }}>
                    {formatCurrency(selectedCustomerForCol.net_due)}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '11px', color: '#075985' }}>
                  Mobile: {selectedCustomerForCol.contact_no}<br/>
                  Invoices: {selectedCustomerForCol.invoices_count}
                </div>
              </div>

              {/* Form Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Collection Date *
                  </label>
                  <input 
                    type="date"
                    value={colDate}
                    onChange={e => setColDate(e.target.value)}
                    style={{ width: '100%', padding: '7px 9px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Collected Amount (Tk) *
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    value={colAmount}
                    onChange={e => setColAmount(e.target.value)}
                    placeholder="0.00"
                    style={{ width: '100%', padding: '7px 9px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 700, color: '#0284c7' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Payment Channel
                  </label>
                  <select
                    value={colMode}
                    onChange={e => setColMode(e.target.value)}
                    style={{ width: '100%', padding: '7px 9px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  >
                    <option value="Cash">Cash in Hand</option>
                    <option value="Bank">Bank Deposit</option>
                    <option value="bKash / Mobile">bKash / Nagad</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Reference / Trx ID
                  </label>
                  <input 
                    type="text"
                    value={refNo}
                    onChange={e => setRefNo(e.target.value)}
                    placeholder="e.g. Trx-998811"
                    style={{ width: '100%', padding: '7px 9px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  />
                </div>
              </div>

              {colMode !== 'Cash' && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Receiving Bank Account
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
                  Remarks / Note
                </label>
                <textarea 
                  rows="2"
                  value={colNote}
                  onChange={e => setColNote(e.target.value)}
                  placeholder="e.g. Collected partial payment on cash desk..."
                  style={{ width: '100%', padding: '7px 9px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setCollectionModalOpen(false)}
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
                  <Check size={15} /> Confirm & Post Credit Voucher
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* CUSTOMER LEDGER STATEMENT MODAL */}
      {ledgerModalOpen && selectedCustomerForLedger && (
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
                  📄 Customer Due Statement: {selectedCustomerForLedger.name}
                </div>
                <div style={{ fontSize: '11px', opacity: 0.9 }}>
                  Code: {selectedCustomerForLedger.code} &bull; Mobile: {selectedCustomerForLedger.contact_no}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button 
                  onClick={() => exportCustomerStatementPdf(selectedCustomerForLedger)}
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
              
              {/* Badges */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>TOTAL INVOICED</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>{formatCurrency(selectedCustomerForLedger.total_invoiced)}</div>
                </div>
                <div style={{ background: '#f0fdf4', padding: '10px', borderRadius: '6px', border: '1px solid #dcfce7', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#15803d', fontWeight: 600 }}>TOTAL COLLECTED</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#16a34a' }}>{formatCurrency(selectedCustomerForLedger.paid_amount)}</div>
                </div>
                <div style={{ background: '#f0f9ff', padding: '10px', borderRadius: '6px', border: '1px solid #bae6fd', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#0369a1', fontWeight: 600 }}>OUTSTANDING RECEIVABLES</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0284c7' }}>{formatCurrency(selectedCustomerForLedger.net_due)}</div>
                </div>
              </div>

              {/* Invoices List */}
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '10px' }}>
                Customer Sales Invoices Breakdown
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', color: '#334155', textAlign: 'left' }}>
                    <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Date</th>
                    <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Invoice No</th>
                    <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Pay Type</th>
                    <th style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'right' }}>Total Bill</th>
                    <th style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'right' }}>Paid</th>
                    <th style={{ padding: '8px', border: '1px solid #cbd5e1', textAlign: 'right' }}>Due</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedCustomerForLedger.invoices || []).length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                        No invoice records found for this customer.
                      </td>
                    </tr>
                  ) : (
                    (selectedCustomerForLedger.invoices || []).map((inv, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px', color: '#475569' }}>{inv.created_at ? inv.created_at.slice(0, 10) : '-'}</td>
                        <td style={{ padding: '8px', fontWeight: 600, color: '#1e293b' }}>{inv.invoice_no || inv.id || '-'}</td>
                        <td style={{ padding: '8px', color: '#64748b' }}>{inv.payment_type || 'Cash'}</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>
                          {formatCurrency(inv.net_amount || inv.total_amount)}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#16a34a' }}>
                          {formatCurrency(inv.paid_amount)}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#0284c7', fontWeight: 700 }}>
                          {formatCurrency((inv.net_amount || inv.total_amount || 0) - (inv.paid_amount || 0))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

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

export default AccountsReceivable;
