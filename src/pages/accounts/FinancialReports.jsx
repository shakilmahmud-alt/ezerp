import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Search, RefreshCw, FileSpreadsheet, 
  Printer, Download, Filter, Calendar, TrendingUp, 
  TrendingDown, Check, DollarSign, BookOpen
} from 'lucide-react';
import { accountsService } from '../../lib/accountsService';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const FinancialReports = () => {
  const [activeReport, setActiveReport] = useState('pl'); // 'pl', 'bs', 'tb', 'daybook'
  const [loading, setLoading] = useState(false);

  // Date filters
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];

  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(today);

  // Generated Report Data
  const [reportResult, setReportResult] = useState(null);

  useEffect(() => {
    generateReport();
  }, [activeReport]);

  const generateReport = async () => {
    setLoading(true);
    try {
      if (activeReport === 'pl') {
        const data = await accountsService.getFinancialOverview(fromDate, toDate);
        setReportResult({ type: 'pl', ...data });
      } else if (activeReport === 'bs') {
        const overview = await accountsService.getFinancialOverview(fromDate, toDate);
        setReportResult({
          type: 'bs',
          overview,
          banks: overview.bankAccounts,
          payables: { totalPayable: overview.totalPayable },
          receivables: { totalReceivable: overview.totalReceivable }
        });
      } else if (activeReport === 'tb') {
        const [coas, overview] = await Promise.all([
          accountsService.getChartOfAccounts(),
          accountsService.getFinancialOverview(fromDate, toDate)
        ]);
        setReportResult({
          type: 'tb',
          coas,
          overview,
          payables: { totalPayable: overview.totalPayable },
          receivables: { totalReceivable: overview.totalReceivable },
          banks: overview.bankAccounts
        });
      } else if (activeReport === 'daybook') {
        const [vouchers, expenses] = await Promise.all([
          accountsService.getVouchers({ fromDate, toDate }),
          accountsService.getExpenses({ fromDate, toDate })
        ]);
        setReportResult({
          type: 'daybook',
          vouchers,
          expenses
        });
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => '৳ ' + Number(val || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 });

  // PDF Export Function (MIS Green Banner)
  const exportReportToPdf = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const w = doc.internal.pageSize.getWidth();

    doc.setFillColor(46, 111, 64);
    doc.rect(0, 0, w, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('EZ ERP - MANAGEMENT FINANCIAL REPORT', w / 2, 10, { align: 'center' });

    const reportTitle = 
      activeReport === 'pl' ? 'STATEMENT OF PROFIT & LOSS (INCOME STATEMENT)' :
      activeReport === 'bs' ? 'STATEMENT OF FINANCIAL POSITION (BALANCE SHEET)' :
      activeReport === 'tb' ? 'TRIAL BALANCE STATEMENT' : 'ACCOUNTS DAY BOOK JOURNAL';

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`${reportTitle} (${fromDate} to ${toDate})`, w / 2, 17, { align: 'center' });

    if (activeReport === 'pl') {
      autoTable(doc, {
        startY: 32,
        theme: 'grid',
        head: [['Financial Heads / Particulars', 'Amount (Tk)']],
        body: [
          ['1. Gross Sales Revenue (Point of Sale & Invoices)', Number(reportResult?.grossSales || 0).toFixed(2)],
          ['Less: POS Sales Returns & Refunds', `(-) ${Number(reportResult?.salesReturns || 0).toFixed(2)}`],
          ['NET SALES TURNOVER', Number(reportResult?.totalSales || 0).toFixed(2)],
          ['2. Gross Purchase Receives (Central Store)', Number(reportResult?.grossPurchases || 0).toFixed(2)],
          ['Less: Vendor Purchase Returns (Central Store)', `(-) ${Number(reportResult?.totalPurchaseReturns || 0).toFixed(2)}`],
          ['Add: Store Damage & Inventory Loss Expense', Number(reportResult?.totalDamageLoss || 0).toFixed(2)],
          ['NET COST OF GOODS SOLD (COGS)', `(-) ${Number(reportResult?.totalCOGS || 0).toFixed(2)}`],
          ['GROSS PROFIT / (LOSS)', Number(reportResult?.grossProfit || 0).toFixed(2)],
          ['3. General Operating Expenses (Rent, Utilities, Conveyance, etc.)', `(-) ${Number(reportResult?.totalExpenses || 0).toFixed(2)}`],
          ['Less: Staff Salary & Payroll Costs', `(-) ${Number(reportResult?.totalSalaries || 0).toFixed(2)}`],
          ['TOTAL OPERATING EXPENDITURE', `(-) ${Number(reportResult?.totalOperatingCost || 0).toFixed(2)}`],
          ['NET OPERATING PROFIT / (LOSS)', Number(reportResult?.netProfit || 0).toFixed(2)]
        ],
        headStyles: { fillColor: [46, 111, 64], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8.5, cellPadding: 3.5 },
        columnStyles: {
          1: { halign: 'right', fontStyle: 'bold' }
        }
      });
    } else if (activeReport === 'bs') {
      autoTable(doc, {
        startY: 32,
        theme: 'grid',
        head: [['Balance Sheet Head / Classification', 'Category', 'Amount (Tk)']],
        body: [
          ['Cash in Hand & Bank Balances', 'Current Asset', Number(reportResult?.overview?.totalBankCash || 0).toFixed(2)],
          ['Accounts Receivable (Customer Dues)', 'Current Asset', Number(reportResult?.receivables?.totalReceivable || 0).toFixed(2)],
          ['TOTAL ASSETS', 'ASSET TOTAL', Number((reportResult?.overview?.totalBankCash || 0) + (reportResult?.receivables?.totalReceivable || 0)).toFixed(2)],
          ['Accounts Payable (Vendor Dues)', 'Current Liability', Number(reportResult?.payables?.totalPayable || 0).toFixed(2)],
          ['Owner Equity & Retained Earnings', 'Equity & Reserves', Number(reportResult?.overview?.netProfit || 0).toFixed(2)],
          ['TOTAL LIABILITIES & EQUITY', 'TOTAL', Number((reportResult?.payables?.totalPayable || 0) + (reportResult?.overview?.netProfit || 0)).toFixed(2)]
        ],
        headStyles: { fillColor: [46, 111, 64], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: {
          2: { halign: 'right', fontStyle: 'bold' }
        }
      });
    }

    const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 25 : 150;
    doc.setFontSize(8);
    doc.text('Prepared By', 20, finalY);
    doc.text('Accounts Manager', w / 2 - 15, finalY);
    doc.text('Managing Director', w - 50, finalY);

    doc.save(`${activeReport.toUpperCase()}_Report_${fromDate}_to_${toDate}.pdf`);
    toast.success('Report PDF exported successfully');
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
            <BarChart3 className="text-emerald-700" size={24} />
            Financial Statements & Management Reports
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
            Audited Profit & Loss Statements, Balance Sheets, Trial Balances, and Day Book Journals
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={exportReportToPdf}
            className="btn-theme"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '12px' }}
          >
            <Printer size={14} /> Export PDF Report
          </button>
        </div>
      </div>

      {/* Filter & Submenu Bar */}
      <div style={{
        background: '#fff',
        borderRadius: '8px',
        padding: '14px 20px',
        border: '1px solid #e2e8f0',
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '15px'
      }}>
        
        {/* Report Selector Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'pl', name: 'Profit & Loss Statement' },
            { id: 'bs', name: 'Balance Sheet' },
            { id: 'tb', name: 'Trial Balance' },
            { id: 'daybook', name: 'Day Book Journal' }
          ].map(r => (
            <button
              key={r.id}
              onClick={() => setActiveReport(r.id)}
              style={{
                padding: '7px 14px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                background: activeReport === r.id ? '#2e6f40' : '#f1f5f9',
                color: activeReport === r.id ? '#fff' : '#475569',
                transition: 'all 0.2s'
              }}
            >
              {r.name}
            </button>
          ))}
        </div>

        {/* Date Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input 
            type="date" 
            value={fromDate} 
            onChange={e => setFromDate(e.target.value)}
            style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
          />
          <span style={{ fontSize: '12px', color: '#64748b' }}>to</span>
          <input 
            type="date" 
            value={toDate} 
            onChange={e => setToDate(e.target.value)}
            style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
          />
          <button
            onClick={generateReport}
            className="btn-theme"
            style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Show Report
          </button>
        </div>
      </div>

      {/* REPORT CONTENT RENDER */}
      <div style={{
        background: '#fff',
        borderRadius: '8px',
        padding: '24px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
        maxWidth: '1000px',
        margin: '0 auto'
      }}>
        
        {/* Report Official Title Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '2px solid #2e6f40', paddingBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>
            EZ ERP &bull; FINANCIAL ACCOUNTS MANAGEMENT
          </h3>
          <h4 style={{ margin: '6px 0 0 0', fontSize: '15px', fontWeight: 700, color: '#2e6f40' }}>
            {activeReport === 'pl' && 'STATEMENT OF PROFIT & LOSS (INCOME STATEMENT)'}
            {activeReport === 'bs' && 'STATEMENT OF FINANCIAL POSITION (BALANCE SHEET)'}
            {activeReport === 'tb' && 'TRIAL BALANCE STATEMENT'}
            {activeReport === 'daybook' && 'ACCOUNTS DAY BOOK & VOUCHER JOURNAL'}
          </h4>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            Reporting Period: <b>{fromDate}</b> to <b>{toDate}</b>
          </div>
        </div>

        {/* 1. PROFIT & LOSS STATEMENT */}
        {activeReport === 'pl' && reportResult && (
          <div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <tbody>
                {/* Revenue Section */}
                <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', color: '#1e293b' }}>
                    1. OPERATING REVENUE (POS & INVOICES)
                  </td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', color: '#10b981' }}>
                    {formatCurrency(reportResult.totalSales)}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 24px', color: '#475569' }}>Gross POS Sales & Invoices</td>
                  <td style={{ padding: '6px 14px', textAlign: 'right', color: '#475569' }}>{formatCurrency(reportResult.grossSales)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 24px', color: '#dc2626' }}>Less: POS Sales Returns / Customer Refunds</td>
                  <td style={{ padding: '6px 14px', textAlign: 'right', color: '#dc2626' }}>(-) {formatCurrency(reportResult.salesReturns)}</td>
                </tr>
                <tr style={{ background: '#f1f5f9', fontWeight: 600 }}>
                  <td style={{ padding: '6px 24px', color: '#0f172a' }}>Net Sales Turnover</td>
                  <td style={{ padding: '6px 14px', textAlign: 'right', color: '#0f172a', fontWeight: 700 }}>{formatCurrency(reportResult.totalSales)}</td>
                </tr>

                {/* COGS Section */}
                <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', color: '#1e293b' }}>
                    2. COST OF GOODS SOLD (COGS - CENTRAL STORE)
                  </td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', color: '#ef4444' }}>
                    (-) {formatCurrency(reportResult.totalCOGS)}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 24px', color: '#475569' }}>Gross Purchase Receives (Cash, Credit, AfterSale)</td>
                  <td style={{ padding: '6px 14px', textAlign: 'right', color: '#475569' }}>{formatCurrency(reportResult.grossPurchases)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 24px', color: '#16a34a' }}>Less: Vendor Purchase Returns (Central Store Goods Return)</td>
                  <td style={{ padding: '6px 14px', textAlign: 'right', color: '#16a34a' }}>(-) {formatCurrency(reportResult.totalPurchaseReturns)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 24px', color: '#d97706' }}>Add: Store Damage & Inventory Loss Cost</td>
                  <td style={{ padding: '6px 14px', textAlign: 'right', color: '#d97706' }}>(+) {formatCurrency(reportResult.totalDamageLoss)}</td>
                </tr>
                <tr style={{ background: '#f1f5f9', fontWeight: 600 }}>
                  <td style={{ padding: '6px 24px', color: '#0f172a' }}>Net Cost of Goods Sold</td>
                  <td style={{ padding: '6px 14px', textAlign: 'right', color: '#ef4444', fontWeight: 700 }}>(-) {formatCurrency(reportResult.totalCOGS)}</td>
                </tr>

                {/* GROSS PROFIT */}
                <tr style={{ background: '#ecfdf5', fontWeight: 800 }}>
                  <td style={{ padding: '12px 14px', borderTop: '2px solid #10b981', borderBottom: '2px solid #10b981', color: '#065f46', fontSize: '14px' }}>
                    GROSS PROFIT / (LOSS)
                  </td>
                  <td style={{ padding: '12px 14px', borderTop: '2px solid #10b981', borderBottom: '2px solid #10b981', textAlign: 'right', color: '#065f46', fontSize: '15px' }}>
                    {formatCurrency(reportResult.grossProfit)}
                  </td>
                </tr>

                {/* Operating Expenses */}
                <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', color: '#1e293b' }}>
                    3. OPERATING EXPENDITURES
                  </td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', color: '#ef4444' }}>
                    (-) {formatCurrency(reportResult.totalOperatingCost)}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 24px', color: '#475569' }}>General Operating Expenses (Rent, Utilities, Stationery, Logistics)</td>
                  <td style={{ padding: '6px 14px', textAlign: 'right', color: '#475569' }}>{formatCurrency(reportResult.totalExpenses)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 24px', color: '#475569' }}>Staff Salaries & Benefits Disbursed</td>
                  <td style={{ padding: '6px 14px', textAlign: 'right', color: '#475569' }}>{formatCurrency(reportResult.totalSalaries)}</td>
                </tr>

                {/* NET PROFIT */}
                <tr style={{ 
                  background: reportResult.netProfit >= 0 ? '#dcfce7' : '#fee2e2', 
                  fontWeight: 900 
                }}>
                  <td style={{ padding: '14px 14px', borderTop: '3px double #2e6f40', borderBottom: '3px double #2e6f40', color: reportResult.netProfit >= 0 ? '#166534' : '#991b1b', fontSize: '15px' }}>
                    NET PROFIT / (LOSS) FOR THE PERIOD
                  </td>
                  <td style={{ padding: '14px 14px', borderTop: '3px double #2e6f40', borderBottom: '3px double #2e6f40', textAlign: 'right', color: reportResult.netProfit >= 0 ? '#166534' : '#991b1b', fontSize: '17px' }}>
                    {formatCurrency(reportResult.netProfit)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* 2. BALANCE SHEET */}
        {activeReport === 'bs' && reportResult && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              
              {/* ASSETS COLUMN */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ background: '#2e6f40', color: '#fff', padding: '10px 14px', fontWeight: 700, fontSize: '13px' }}>
                  ASSETS
                </div>
                <div style={{ padding: '12px' }}>
                  <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>Current Assets:</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span>Liquid Cash & Bank Balances</span>
                    <span style={{ fontWeight: 700 }}>{formatCurrency(reportResult.overview?.totalBankCash)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span>Accounts Receivable</span>
                    <span style={{ fontWeight: 700 }}>{formatCurrency(reportResult.receivables?.totalReceivable)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '2px solid #2e6f40', marginTop: '14px', fontWeight: 800, color: '#2e6f40', fontSize: '14px' }}>
                    <span>TOTAL ASSETS</span>
                    <span>{formatCurrency((reportResult.overview?.totalBankCash || 0) + (reportResult.receivables?.totalReceivable || 0))}</span>
                  </div>
                </div>
              </div>

              {/* LIABILITIES & EQUITY COLUMN */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ background: '#991b1b', color: '#fff', padding: '10px 14px', fontWeight: 700, fontSize: '13px' }}>
                  LIABILITIES & EQUITY
                </div>
                <div style={{ padding: '12px' }}>
                  <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>Current Liabilities:</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span>Accounts Payable</span>
                    <span style={{ fontWeight: 700, color: '#dc2626' }}>{formatCurrency(reportResult.payables?.totalPayable)}</span>
                  </div>

                  <div style={{ fontWeight: 600, color: '#1e293b', margin: '14px 0 8px 0' }}>Equity & Retained Earnings:</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span>Current Period Net Earnings / Profit</span>
                    <span style={{ fontWeight: 700, color: '#16a34a' }}>{formatCurrency(reportResult.overview?.netProfit)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '2px solid #991b1b', marginTop: '14px', fontWeight: 800, color: '#991b1b', fontSize: '14px' }}>
                    <span>TOTAL LIABILITIES & EQUITY</span>
                    <span>{formatCurrency((reportResult.payables?.totalPayable || 0) + (reportResult.overview?.netProfit || 0))}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 3. TRIAL BALANCE */}
        {activeReport === 'tb' && reportResult && (
          <div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#2e6f40', color: '#fff', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px', border: '1px solid #255a33' }}>Account Code & Head</th>
                  <th style={{ padding: '8px 10px', border: '1px solid #255a33' }}>Account Type</th>
                  <th style={{ padding: '8px 10px', border: '1px solid #255a33', textAlign: 'right' }}>Debit (Tk)</th>
                  <th style={{ padding: '8px 10px', border: '1px solid #255a33', textAlign: 'right' }}>Credit (Tk)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 600 }}>1110 - Cash & Bank Liquidity</td>
                  <td style={{ padding: '8px 10px', color: '#059669' }}>Asset</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(reportResult.overview?.totalBankCash)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>-</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 600 }}>1130 - Accounts Receivable</td>
                  <td style={{ padding: '8px 10px', color: '#059669' }}>Asset</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(reportResult.receivables?.totalReceivable)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>-</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 600 }}>2110 - Accounts Payable</td>
                  <td style={{ padding: '8px 10px', color: '#dc2626' }}>Liability</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>-</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>{formatCurrency(reportResult.payables?.totalPayable)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 600 }}>4100 - Sales Revenue</td>
                  <td style={{ padding: '8px 10px', color: '#16a34a' }}>Income</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>-</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>{formatCurrency(reportResult.overview?.totalSales)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 600 }}>5100 - Purchases (COGS)</td>
                  <td style={{ padding: '8px 10px', color: '#d97706' }}>Expense</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(reportResult.overview?.totalPurchases)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>-</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 600 }}>5200 - Operating Expenses & Salaries</td>
                  <td style={{ padding: '8px 10px', color: '#d97706' }}>Expense</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(reportResult.overview?.totalOperatingCost)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>-</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* 4. DAY BOOK JOURNAL */}
        {activeReport === 'daybook' && reportResult && (
          <div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#2e6f40', color: '#fff', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px', border: '1px solid #255a33' }}>Date</th>
                  <th style={{ padding: '8px 10px', border: '1px solid #255a33' }}>Voucher No</th>
                  <th style={{ padding: '8px 10px', border: '1px solid #255a33' }}>Voucher Type</th>
                  <th style={{ padding: '8px 10px', border: '1px solid #255a33' }}>Particulars / Narration</th>
                  <th style={{ padding: '8px 10px', border: '1px solid #255a33', textAlign: 'right' }}>Amount (Tk)</th>
                </tr>
              </thead>
              <tbody>
                {(reportResult.vouchers || []).length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                      No vouchers posted in this period.
                    </td>
                  </tr>
                ) : (
                  (reportResult.vouchers || []).map((v, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 10px', color: '#475569' }}>{v.voucher_date}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: '#1e293b' }}>{v.voucher_no}</td>
                      <td style={{ padding: '8px 10px' }}>{v.voucher_type}</td>
                      <td style={{ padding: '8px 10px', color: '#334155' }}>
                        <div>Dr: {v.debit_account} | Cr: {v.credit_account}</div>
                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>{v.narration}</div>
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>
                        {formatCurrency(v.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
};

export default FinancialReports;
