import React, { useState, useEffect } from 'react';
import { 
  Users, Search, RefreshCw, DollarSign, 
  FileSpreadsheet, Printer, Download, Eye, 
  CheckCircle2, AlertCircle, X, Check, Calendar
} from 'lucide-react';
import { accountsService } from '../../lib/accountsService';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const PayrollManagement = () => {
  const [loading, setLoading] = useState(true);
  const [payrollData, setPayrollData] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);
  
  // Month selector (Default: current month YYYY-MM)
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, Pending, Paid
  const [searchQuery, setSearchQuery] = useState('');

  // Pay Salary Modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [basicSalary, setBasicSalary] = useState(0);
  const [bonusAmount, setBonusAmount] = useState(0);
  const [deductionAmount, setDeductionAmount] = useState(0);
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMode, setPayMode] = useState('Cash');
  const [selectedBank, setSelectedBank] = useState('');
  const [payNote, setPayNote] = useState('');

  useEffect(() => {
    loadPayroll();
  }, [selectedMonth]);

  const loadPayroll = async () => {
    setLoading(true);
    try {
      const [pData, banks] = await Promise.all([
        accountsService.getPayrollData(selectedMonth),
        accountsService.getBankAccounts()
      ]);
      setPayrollData(pData);
      setBankAccounts(banks);
      if (banks.length > 0) setSelectedBank(banks[0].account_name);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load payroll records');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPayModal = (emp) => {
    setSelectedEmp(emp);
    setBasicSalary(emp.basic_salary || 0);
    setBonusAmount(emp.bonus_amount || 0);
    setDeductionAmount(emp.deduction_amount || 0);
    setPayDate(emp.payment_date || new Date().toISOString().split('T')[0]);
    setPayMode(emp.payment_mode || 'Cash');
    setPayNote('');
    setPayModalOpen(true);
  };

  const calculatedNetSalary = Number(basicSalary || 0) + Number(bonusAmount || 0) - Number(deductionAmount || 0);

  const handleSubmitSalary = async (e) => {
    e.preventDefault();
    if (calculatedNetSalary <= 0) {
      toast.error('Net salary must be greater than 0');
      return;
    }

    try {
      await accountsService.paySalary({
        id: selectedEmp.id,
        employee_id: selectedEmp.employee_id,
        employee_name: selectedEmp.employee_name,
        month_year: selectedMonth,
        basic_salary: Number(basicSalary),
        bonus_amount: Number(bonusAmount),
        deduction_amount: Number(deductionAmount),
        net_salary: calculatedNetSalary,
        payment_date: payDate,
        payment_mode: payMode,
        bank_account_name: payMode !== 'Cash' ? selectedBank : null
      });

      toast.success(`Salary for ${selectedEmp.employee_name} posted successfully!`);
      setPayModalOpen(false);
      await loadPayroll();
    } catch (err) {
      toast.error('Failed to process salary payment');
    }
  };

  // Filter staff
  const filteredList = (payrollData?.payrollList || []).filter(p => {
    if (statusFilter !== 'ALL' && p.payment_status !== statusFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.employee_name?.toLowerCase().includes(q) ||
      p.employee_code?.toLowerCase().includes(q) ||
      p.designation?.toLowerCase().includes(q)
    );
  });

  // Export Payroll to Excel
  const exportPayrollToExcel = () => {
    if (!filteredList.length) {
      toast.error('No payroll records to export');
      return;
    }
    const rows = filteredList.map((p, i) => ({
      'SL': i + 1,
      'Month': selectedMonth,
      'Employee Code': p.employee_code,
      'Employee Name': p.employee_name,
      'Designation': p.designation,
      'Basic Salary (Tk)': p.basic_salary,
      'Bonus / Allowance (Tk)': p.bonus_amount,
      'Deductions (Tk)': p.deduction_amount,
      'Net Salary (Tk)': p.net_salary,
      'Status': p.payment_status,
      'Payment Date': p.payment_date || '-',
      'Payment Channel': p.payment_mode || '-',
      'Voucher No': p.voucher_no || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Staff_Payroll');
    XLSX.writeFile(wb, `Staff_Payroll_Sheet_${selectedMonth}.xlsx`);
    toast.success('Payroll sheet exported to Excel');
  };

  // Download Employee Pay Slip PDF
  const downloadPaySlipPdf = (emp) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
    const w = doc.internal.pageSize.getWidth();

    // Green Header
    doc.setFillColor(46, 111, 64);
    doc.rect(0, 0, w, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('EZ ERP - ACCOUNTS MANAGEMENT', w / 2, 10, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`STAFF SALARY PAY SLIP - ${selectedMonth}`, w / 2, 17, { align: 'center' });

    // Info Box
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(8.5);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Employee Name:', 12, 32);
    doc.setFont('helvetica', 'normal');
    doc.text(`${emp.employee_name} (${emp.employee_code})`, 38, 32);

    doc.setFont('helvetica', 'bold');
    doc.text('Designation:', 12, 38);
    doc.setFont('helvetica', 'normal');
    doc.text(`${emp.designation}`, 38, 38);

    doc.setFont('helvetica', 'bold');
    doc.text('Pay Date:', w - 48, 32);
    doc.setFont('helvetica', 'normal');
    doc.text(`${emp.payment_date || 'Pending'}`, w - 30, 32);

    doc.setFont('helvetica', 'bold');
    doc.text('Voucher No:', w - 48, 38);
    doc.setFont('helvetica', 'normal');
    doc.text(`${emp.voucher_no || '-'}`, w - 30, 38);

    // Earnings & Deductions Breakdown
    autoTable(doc, {
      startY: 44,
      theme: 'grid',
      head: [['Salary Head / Description', 'Type', 'Amount (Tk)']],
      body: [
        ['Basic Salary', 'Earning', Number(emp.basic_salary).toFixed(2)],
        ['Incentive / Bonus / Allowances', 'Earning', Number(emp.bonus_amount).toFixed(2)],
        ['Absence / Advance Deductions', 'Deduction', `(-) ${Number(emp.deduction_amount).toFixed(2)}`],
        ['NET TAKE-HOME SALARY', 'NET PAYABLE', `Tk ${Number(emp.net_salary).toFixed(2)}`]
      ],
      headStyles: { fillColor: [46, 111, 64], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 3.5 },
      columnStyles: {
        2: { halign: 'right', fontStyle: 'bold' }
      }
    });

    const finalY = doc.lastAutoTable.finalY + 25;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.line(14, finalY, 44, finalY);
    doc.text('Staff Signature', 18, finalY + 5);

    doc.line(w - 44, finalY, w - 14, finalY);
    doc.text('Authorized Signatory', w - 42, finalY + 5);

    doc.save(`${emp.employee_name}_PaySlip_${selectedMonth}.pdf`);
    toast.success('Pay slip downloaded successfully');
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
            <Users className="text-emerald-700" size={24} />
            Staff Salary & Monthly Payroll Management
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
            Manage monthly employee payroll sheets, bonuses, deductions, disbursements, and generate pay slips
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input 
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 600, color: '#1e293b' }}
          />

          <button 
            onClick={exportPayrollToExcel}
            className="btn-info"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '12px' }}
          >
            <FileSpreadsheet size={14} /> Export Sheet
          </button>
          <button 
            onClick={loadPayroll}
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
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Payroll ({selectedMonth})</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#1e293b', marginTop: '4px' }}>
            {formatCurrency(payrollData?.totalNetPayroll)}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Basic: {formatCurrency(payrollData?.totalBasic)}</div>
        </div>

        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '8px', border: '1px solid #dcfce7', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Total Salary Paid</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>
            {formatCurrency(payrollData?.totalPaid)}
          </div>
          <div style={{ fontSize: '11px', color: '#15803d', marginTop: '2px' }}>Disbursed to employees</div>
        </div>

        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '8px', border: '1px solid #fee2e2', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>Pending Salary Payable</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>
            {formatCurrency(payrollData?.totalPending)}
          </div>
          <div style={{ fontSize: '11px', color: '#991b1b', marginTop: '2px' }}>Awaiting disbursement</div>
        </div>

        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '8px', border: '1px solid #fef3c7', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>Bonus / Deductions</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>
            +{formatCurrency(payrollData?.totalBonus)} / -{formatCurrency(payrollData?.totalDeduction)}
          </div>
          <div style={{ fontSize: '11px', color: '#b45309', marginTop: '2px' }}>Net adjustments</div>
        </div>
      </div>

      {/* Main Staff Payroll Table */}
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
            <div style={{ position: 'relative', width: '300px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: '#94a3b8' }} />
              <input 
                type="text" 
                placeholder="Search staff name, code, designation..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '7px 10px 7px 30px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }}
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ padding: '7px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            >
              <option value="ALL">All Status ({payrollData?.payrollList?.length || 0})</option>
              <option value="Pending">Pending Only</option>
              <option value="Paid">Paid Only</option>
            </select>
          </div>

          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Showing <b>{filteredList.length}</b> staff payroll records for {selectedMonth}
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#2e6f40', color: '#fff', textAlign: 'left' }}>
                <th style={{ padding: '10px', border: '1px solid #255a33', width: '40px' }}>SL</th>
                <th style={{ padding: '10px', border: '1px solid #255a33' }}>Staff Name & Code</th>
                <th style={{ padding: '10px', border: '1px solid #255a33' }}>Designation</th>
                <th style={{ padding: '10px', border: '1px solid #255a33', textAlign: 'right' }}>Basic Salary</th>
                <th style={{ padding: '10px', border: '1px solid #255a33', textAlign: 'right' }}>Bonus (+)</th>
                <th style={{ padding: '10px', border: '1px solid #255a33', textAlign: 'right' }}>Deduction (-)</th>
                <th style={{ padding: '10px', border: '1px solid #255a33', textAlign: 'right', background: '#1e3a8a' }}>Net Salary</th>
                <th style={{ padding: '10px', border: '1px solid #255a33', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '10px', border: '1px solid #255a33', textAlign: 'center', width: '160px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                    No employee records found. Check Employee List in central store to add staff.
                  </td>
                </tr>
              ) : (
                filteredList.map((p, idx) => (
                  <tr 
                    key={p.employee_id || idx}
                    style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}
                  >
                    <td style={{ padding: '10px', color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ padding: '10px', fontWeight: 600, color: '#1e293b' }}>
                      {p.employee_name}
                      <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 400 }}>Code: {p.employee_code}</div>
                    </td>
                    <td style={{ padding: '10px', color: '#475569' }}>{p.designation}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600 }}>
                      {formatCurrency(p.basic_salary)}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#16a34a' }}>
                      +{formatCurrency(p.bonus_amount)}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#dc2626' }}>
                      -{formatCurrency(p.deduction_amount)}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 800, color: '#1e3a8a' }}>
                      {formatCurrency(p.net_salary)}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: p.payment_status === 'Paid' ? '#dcfce7' : '#fee2e2',
                        color: p.payment_status === 'Paid' ? '#166534' : '#991b1b'
                      }}>
                        {p.payment_status}
                      </span>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleOpenPayModal(p)}
                          className={p.payment_status === 'Paid' ? 'btn-info' : 'btn-theme'}
                          style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}
                          title="Disburse / Update salary"
                        >
                          <DollarSign size={12} /> {p.payment_status === 'Paid' ? 'Update' : 'Pay'}
                        </button>
                        {p.payment_status === 'Paid' && (
                          <button
                            onClick={() => downloadPaySlipPdf(p)}
                            className="btn-theme"
                            style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}
                            title="Download Pay Slip PDF"
                          >
                            <Printer size={12} /> Slip
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* PAY SALARY MODAL */}
      {payModalOpen && selectedEmp && (
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
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700 }}>
                  💵 Pay Salary: {selectedEmp.employee_name}
                </div>
                <div style={{ fontSize: '11px', opacity: 0.9 }}>
                  Designation: {selectedEmp.designation} &bull; Month: {selectedMonth}
                </div>
              </div>
              <button 
                onClick={() => setPayModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitSalary} style={{ padding: '20px' }}>
              
              {/* Earnings & Deductions Form */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Basic Salary (Tk) *
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    value={basicSalary}
                    onChange={e => setBasicSalary(e.target.value)}
                    style={{ width: '100%', padding: '7px 9px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 600 }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#16a34a', marginBottom: '4px' }}>
                    Bonus (+)
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    value={bonusAmount}
                    onChange={e => setBonusAmount(e.target.value)}
                    placeholder="0.00"
                    style={{ width: '100%', padding: '7px 9px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#dc2626', marginBottom: '4px' }}>
                    Deduction (-)
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    value={deductionAmount}
                    onChange={e => setDeductionAmount(e.target.value)}
                    placeholder="0.00"
                    style={{ width: '100%', padding: '7px 9px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  />
                </div>
              </div>

              {/* Net Payable Highlight Card */}
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '6px',
                padding: '12px 16px',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#166534', fontWeight: 600 }}>TOTAL NET PAYABLE</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803d' }}>
                    {formatCurrency(calculatedNetSalary)}
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: '#166534' }}>
                  Auto-generates Debit Voucher
                </div>
              </div>

              {/* Payment Details */}
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
                    Payment Channel
                  </label>
                  <select
                    value={payMode}
                    onChange={e => setPayMode(e.target.value)}
                    style={{ width: '100%', padding: '7px 9px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  >
                    <option value="Cash">Cash in Hand</option>
                    <option value="Bank">Bank Transfer</option>
                    <option value="bKash / Mobile">Mobile Banking</option>
                  </select>
                </div>
              </div>

              {payMode !== 'Cash' && (
                <div style={{ marginBottom: '16px' }}>
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
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
                  <Check size={15} /> Confirm & Post Salary Voucher
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default PayrollManagement;
