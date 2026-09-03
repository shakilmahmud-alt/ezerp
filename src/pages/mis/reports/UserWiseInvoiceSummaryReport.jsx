import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { 
  Download, RefreshCw, Printer, Search, FileSpreadsheet, 
  UserCheck, Monitor, ShoppingBag, Clock, DollarSign, Layers 
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const UserWiseInvoiceSummaryReport = () => {
  const { user } = useAuth();

  // Date Range Defaults
  const [fromDate, setFromDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Store, User, Terminal filter states
  const [selectedStore, setSelectedStore] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState('ALL');
  const [selectedTerminal, setSelectedTerminal] = useState('ALL');

  // Time Filter States (Hour: 0-23, Minute: 0-59, Second: 0-59)
  const [fromHour, setFromHour] = useState(0);
  const [fromMinute, setFromMinute] = useState(0);
  const [fromSecond, setFromSecond] = useState(0);
  const [toHour, setToHour] = useState(23);
  const [toMinute, setToMinute] = useState(59);
  const [toSecond, setToSecond] = useState(59);

  // Report Type (Single choice radio)
  const [reportType, setReportType] = useState('User Wise Invoice Summary');

  // Master Data
  const [stores, setStores] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [terminals, setTerminals] = useState([]);

  // Raw fetched items for instant switching
  const [rawSales, setRawSales] = useState(null);

  // Execution & UI State
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [tableSearch, setTableSearch] = useState('');

  // Initial Master Data Load
  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      const [storesRes, empRes, termRes] = await Promise.all([
        supabase.from('stores').select('id, name').order('name'),
        supabase.from('employees').select('id, name, designation').order('name'),
        supabase.from('terminals').select('id, counter_id, store_id, mac_address').order('counter_id')
      ]);

      setStores(storesRes.data || []);
      setEmployees(empRes.data || []);
      setTerminals(termRes.data || []);
    } catch (err) {
      console.error('Error fetching master data:', err);
      toast.error('Failed to load filter dropdowns');
    }
  };

  // Pure function to compute report structure based on reportType
  const computeReportData = (targetType, salesList) => {
    if (!salesList || salesList.length === 0) {
      return {
        reportType: targetType,
        rows: [],
        totals: {
          total_invoices: 0,
          total_qty: 0,
          total_gross: 0,
          total_discount: 0,
          total_vat: 0,
          total_net: 0,
          avg_invoice_value: 0
        }
      };
    }

    let rows = [];

    if (targetType === 'User Wise Invoice Summary') {
      // List of all invoices sorted by User then Date
      rows = salesList.map((s, idx) => ({
        sl: idx + 1,
        date_time: s.formatted_date_time,
        invoice_no: s.invoice_no,
        store_name: s.store_name,
        cashier_name: s.cashier_name,
        sales_executive_name: s.sales_executive_name,
        terminal_name: s.terminal_name,
        total_qty: Number(s.total_qty || 0),
        gross_amount: Number(s.total_amount || 0),
        discount_amount: Number(s.discount_amount || 0),
        vat_amount: Number(s.vat_amount || 0),
        net_amount: Number(s.net_amount || 0),
        pay_mode: s.pay_mode || 'Cash'
      }));
    } else if (targetType === 'User Wise Summary') {
      // Aggregated by Cashier / User
      const group = {};
      salesList.forEach(s => {
        const key = s.cashier_name || 'Unassigned';
        if (!group[key]) {
          group[key] = {
            user_name: key,
            store_name: s.store_name,
            total_invoices: 0,
            total_qty: 0,
            gross_amount: 0,
            discount_amount: 0,
            vat_amount: 0,
            net_amount: 0
          };
        }
        group[key].total_invoices += 1;
        group[key].total_qty += Number(s.total_qty || 0);
        group[key].gross_amount += Number(s.total_amount || 0);
        group[key].discount_amount += Number(s.discount_amount || 0);
        group[key].vat_amount += Number(s.vat_amount || 0);
        group[key].net_amount += Number(s.net_amount || 0);
      });

      rows = Object.values(group).map((g, idx) => ({
        sl: idx + 1,
        ...g,
        avg_invoice_value: g.total_invoices > 0 ? (g.net_amount / g.total_invoices) : 0
      }));
    } else if (targetType === 'Terminal Wise Invoice Summary') {
      // List of all invoices sorted by Terminal then Date
      rows = [...salesList]
        .sort((a, b) => a.terminal_name.localeCompare(b.terminal_name))
        .map((s, idx) => ({
          sl: idx + 1,
          date_time: s.formatted_date_time,
          invoice_no: s.invoice_no,
          terminal_name: s.terminal_name,
          store_name: s.store_name,
          cashier_name: s.cashier_name,
          sales_executive_name: s.sales_executive_name,
          total_qty: Number(s.total_qty || 0),
          gross_amount: Number(s.total_amount || 0),
          discount_amount: Number(s.discount_amount || 0),
          vat_amount: Number(s.vat_amount || 0),
          net_amount: Number(s.net_amount || 0),
          pay_mode: s.pay_mode || 'Cash'
        }));
    } else if (targetType === 'Terminal Wise Summary') {
      // Aggregated by Terminal / Counter
      const group = {};
      salesList.forEach(s => {
        const key = s.terminal_name || 'Counter 01';
        if (!group[key]) {
          group[key] = {
            terminal_name: key,
            store_name: s.store_name,
            total_invoices: 0,
            total_qty: 0,
            gross_amount: 0,
            discount_amount: 0,
            vat_amount: 0,
            net_amount: 0
          };
        }
        group[key].total_invoices += 1;
        group[key].total_qty += Number(s.total_qty || 0);
        group[key].gross_amount += Number(s.total_amount || 0);
        group[key].discount_amount += Number(s.discount_amount || 0);
        group[key].vat_amount += Number(s.vat_amount || 0);
        group[key].net_amount += Number(s.net_amount || 0);
      });

      rows = Object.values(group).map((g, idx) => ({
        sl: idx + 1,
        ...g,
        avg_invoice_value: g.total_invoices > 0 ? (g.net_amount / g.total_invoices) : 0
      }));
    }

    const totalInvoices = salesList.length;
    const totalQty = salesList.reduce((s, r) => s + Number(r.total_qty || 0), 0);
    const totalGross = salesList.reduce((s, r) => s + Number(r.total_amount || 0), 0);
    const totalDiscount = salesList.reduce((s, r) => s + Number(r.discount_amount || 0), 0);
    const totalVat = salesList.reduce((s, r) => s + Number(r.vat_amount || 0), 0);
    const totalNet = salesList.reduce((s, r) => s + Number(r.net_amount || 0), 0);
    const avgInvoiceValue = totalInvoices > 0 ? (totalNet / totalInvoices) : 0;

    return {
      reportType: targetType,
      rows,
      totals: {
        total_invoices: totalInvoices,
        total_qty: totalQty,
        total_gross: totalGross,
        total_discount: totalDiscount,
        total_vat: totalVat,
        total_net: totalNet,
        avg_invoice_value: avgInvoiceValue
      }
    };
  };

  // Update filter state on radio changes (report output changes only on Show button click)
  const handleReportTypeChange = (newType) => {
    setReportType(newType);
  };

  // Reset Filters Handler
  const handleReload = () => {
    const today = new Date().toISOString().split('T')[0];
    setFromDate(today);
    setToDate(today);
    setSelectedStore('ALL');
    setSelectedUser('ALL');
    setSelectedTerminal('ALL');
    setFromHour(0);
    setFromMinute(0);
    setFromSecond(0);
    setToHour(23);
    setToMinute(59);
    setToSecond(59);
    setReportType('User Wise Invoice Summary');
    setRawSales(null);
    setReportData(null);
    setTableSearch('');
    toast.success('Filters reset');
  };

  // Main Report Fetch & Execution Logic
  const handleShowReport = async () => {
    setLoading(true);

    try {
      const salesRes = await supabase
        .from('sales')
        .select('*')
        .order('sale_date', { ascending: false });

      const allSales = salesRes.data || [];

      // Maps for fast lookups
      const storeMap = new Map();
      stores.forEach(s => storeMap.set(s.id, s.name));

      const empMap = new Map();
      employees.forEach(e => empMap.set(e.id, e.name));

      // Build time bounds (in seconds from 00:00:00)
      const fromTimeSec = (Number(fromHour) || 0) * 3600 + (Number(fromMinute) || 0) * 60 + (Number(fromSecond) || 0);
      const toTimeSec = (Number(toHour) || 23) * 3600 + (Number(toMinute) || 59) * 60 + (Number(toSecond) || 59);

      // Filter sales by Date, Time, Store, User, and Terminal
      const filtered = [];

      allSales.forEach(s => {
        const saleDateRaw = s.sale_date || s.created_at;
        if (!saleDateRaw) return;

        const d = new Date(saleDateRaw);
        const dateStr = d.toISOString().split('T')[0];

        // 1. Date Range Check
        if (dateStr < fromDate || dateStr > toDate) return;

        // 2. Exact Time of Day Filter (Hour, Minute, Second)
        const saleSec = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
        if (saleSec < fromTimeSec || saleSec > toTimeSec) return;

        // Resolve Entities
        const storeName = storeMap.get(s.store_id) || 'Store';
        const cashierName = empMap.get(s.created_by) || s.sales_executive_name || 'Admin';
        const terminalName = s.counter_no ? `Counter ${s.counter_no}` : 'Counter 01';

        // 3. Store Filter
        if (selectedStore !== 'ALL' && selectedStore !== '') {
          if (s.store_id !== selectedStore && storeName.toLowerCase() !== selectedStore.toLowerCase()) return;
        }

        // 4. User Filter
        if (selectedUser !== 'ALL' && selectedUser !== '') {
          if (s.created_by !== selectedUser && cashierName.toLowerCase() !== selectedUser.toLowerCase()) return;
        }

        // 5. Terminal Filter
        if (selectedTerminal !== 'ALL' && selectedTerminal !== '') {
          const matchTerm = terminalName.toLowerCase() === selectedTerminal.toLowerCase() ||
                            s.counter_no === selectedTerminal ||
                            s.terminal_id === selectedTerminal;
          if (!matchTerm) return;
        }

        // Format Date Time
        const pad = (n) => String(n).padStart(2, '0');
        const formattedDateTime = `${dateStr} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

        // Parse payment mode
        let payMode = 'Cash';
        if (s.invoice_note && s.invoice_note.includes('[Payment:')) {
          const match = s.invoice_note.match(/\[Payment:\s*([^\]]+)\]/);
          if (match && match[1]) payMode = match[1].trim();
        }

        filtered.push({
          ...s,
          date_str: dateStr,
          formatted_date_time: formattedDateTime,
          store_name: storeName,
          cashier_name: cashierName,
          sales_executive_name: s.sales_executive_name || '-',
          terminal_name: terminalName,
          pay_mode: payMode
        });
      });

      setRawSales(filtered);

      const computed = computeReportData(reportType, filtered);
      setReportData(computed);

      if (filtered.length === 0) {
        toast('No sales records match the selected criteria.', { icon: 'ℹ️' });
      } else {
        toast.success(`Loaded ${filtered.length} invoice records`);
      }
    } catch (err) {
      console.error('Error generating report:', err);
      toast.error('Failed to fetch sales data');
    } finally {
      setLoading(false);
    }
  };

  // Search filter inside table
  const displayedRows = useMemo(() => {
    if (!reportData || !reportData.rows) return [];
    if (!tableSearch.trim()) return reportData.rows;
    const q = tableSearch.toLowerCase().trim();
    return reportData.rows.filter(r => 
      Object.values(r).some(val => String(val).toLowerCase().includes(q))
    );
  }, [reportData, tableSearch]);

  // Standardized PDF Export (Landscape with Signatures)
  const handlePrintPDF = () => {
    if (!reportData || reportData.rows.length === 0) {
      toast.error("Please click 'Show' first to generate report");
      return;
    }

    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // 1. Centered Company Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(46, 111, 64);
    doc.text("EZ ERP", pageWidth / 2, 13, { align: 'center' });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(70, 70, 70);
    doc.text("House: 352, Lane: 05, 2nd floor, Baridhara DOHS, Dhaka-1212, Bangladesh", pageWidth / 2, 18, { align: 'center' });

    // 2. Top Right Information
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(46, 111, 64);
    doc.text(reportData.reportType.toUpperCase(), pageWidth - 14, 13, { align: 'right' });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 30, 30);
    doc.text(`Period: ${fromDate} to ${toDate}`, pageWidth - 14, 18.5, { align: 'right' });
    doc.text(`Time: ${String(fromHour).padStart(2, '0')}:${String(fromMinute).padStart(2, '0')}:${String(fromSecond).padStart(2, '0')} - ${String(toHour).padStart(2, '0')}:${String(toMinute).padStart(2, '0')}:${String(toSecond).padStart(2, '0')}`, pageWidth - 14, 23, { align: 'right' });

    // 3. Top Left Details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 30, 30);
    doc.text("Store:", 14, 18.5);
    doc.setFont("helvetica", "normal");
    doc.text(selectedStore === 'ALL' || !selectedStore ? 'ALL' : (stores.find(s => s.id === selectedStore)?.name || selectedStore), 34, 18.5);

    doc.setFont("helvetica", "bold");
    doc.text("User:", 14, 23);
    doc.setFont("helvetica", "normal");
    doc.text(selectedUser === 'ALL' || !selectedUser ? 'ALL' : (employees.find(e => e.id === selectedUser)?.name || selectedUser), 34, 23);

    doc.setFont("helvetica", "bold");
    doc.text("Terminal:", 14, 27.5);
    doc.setFont("helvetica", "normal");
    doc.text(selectedTerminal === 'ALL' || !selectedTerminal ? 'ALL' : selectedTerminal, 34, 27.5);

    // 4. Build Table
    let head = [];
    let body = [];

    if (reportData.reportType.includes('Summary') && !reportData.reportType.includes('Invoice')) {
      // Summary Group
      const isTerminal = reportData.reportType.includes('Terminal');
      head = [[
        'SL',
        isTerminal ? 'Terminal / Counter' : 'User / Cashier',
        'Store',
        'Invoices',
        'Total Qty',
        'Gross Sale',
        'Discount',
        'VAT',
        'Net Amount',
        'Avg Invoice Value'
      ]];

      displayedRows.forEach((r, idx) => {
        body.push([
          idx + 1,
          isTerminal ? r.terminal_name : r.user_name,
          r.store_name,
          r.total_invoices,
          r.total_qty,
          Number(r.gross_amount).toFixed(2),
          Number(r.discount_amount).toFixed(2),
          Number(r.vat_amount).toFixed(2),
          Number(r.net_amount).toFixed(2),
          Number(r.avg_invoice_value).toFixed(2)
        ]);
      });

      // Total Row
      body.push([
        'Total',
        `${reportData.rows.length} Groups`,
        '',
        reportData.totals.total_invoices,
        reportData.totals.total_qty,
        Number(reportData.totals.total_gross).toFixed(2),
        Number(reportData.totals.total_discount).toFixed(2),
        Number(reportData.totals.total_vat).toFixed(2),
        Number(reportData.totals.total_net).toFixed(2),
        Number(reportData.totals.avg_invoice_value).toFixed(2)
      ]);
    } else {
      // Invoice Details
      head = [[
        'SL', 'Date & Time', 'Invoice No', 'Store', 'Cashier', 
        'Executive', 'Terminal', 'Qty', 'Gross', 'Discount', 
        'VAT', 'Net Amount', 'Pay Mode'
      ]];

      displayedRows.forEach((r, idx) => {
        body.push([
          idx + 1,
          r.date_time,
          r.invoice_no,
          r.store_name,
          r.cashier_name,
          r.sales_executive_name,
          r.terminal_name,
          r.total_qty,
          Number(r.gross_amount).toFixed(2),
          Number(r.discount_amount).toFixed(2),
          Number(r.vat_amount).toFixed(2),
          Number(r.net_amount).toFixed(2),
          r.pay_mode
        ]);
      });

      // Total Row
      body.push([
        'Total',
        '',
        `${reportData.rows.length} Invoices`,
        '',
        '',
        '',
        '',
        reportData.totals.total_qty,
        Number(reportData.totals.total_gross).toFixed(2),
        Number(reportData.totals.total_discount).toFixed(2),
        Number(reportData.totals.total_vat).toFixed(2),
        Number(reportData.totals.total_net).toFixed(2),
        ''
      ]);
    }

    autoTable(doc, {
      startY: 33,
      head: head,
      body: body,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 1.8, textColor: [30, 30, 30] },
      headStyles: { fillColor: [46, 111, 64], fontStyle: 'bold', textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      didParseCell: function (data) {
        if (data.section === 'head' && data.column.index === 0) {
          data.cell.styles.halign = 'center';
        }
        if (data.row.index === body.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 245, 240];
          data.cell.styles.textColor = [10, 60, 20];
        }
      },
      margin: { top: 10, left: 14, right: 14 }
    });

    const finalY = doc.lastAutoTable.finalY || 150;

    // 5. Signatures Block
    const sigY = Math.max(finalY + 24, pageHeight - 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setLineWidth(0.4);

    const currentUserName = user?.name || user?.username || (localStorage.getItem('erp_user') ? JSON.parse(localStorage.getItem('erp_user'))?.name || JSON.parse(localStorage.getItem('erp_user'))?.username : '') || 'Admin';
    const displayName = (currentUserName === 'msmraqeeb@gmail.com' || currentUserName === 'admin@email.com') ? 'Admin' : currentUserName;

    // Posted By
    doc.line(20, sigY, 70, sigY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(2, 132, 199);
    doc.text(displayName, 45, sigY - 2, { align: 'center' });

    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 40, 40);
    doc.text('Posted By', 45, sigY + 5, { align: 'center' });

    // Checked By
    doc.setFont("helvetica", "bold");
    doc.line(pageWidth / 2 - 25, sigY, pageWidth / 2 + 25, sigY);
    doc.text('Checked By', pageWidth / 2, sigY + 5, { align: 'center' });

    // Authorized Signature
    doc.setFont("helvetica", "bold");
    doc.line(pageWidth - 70, sigY, pageWidth - 20, sigY);
    doc.text('Authorized Signature', pageWidth - 45, sigY + 5, { align: 'center' });

    doc.save(`User_Terminal_Sales_Report_${fromDate}_to_${toDate}.pdf`);
    toast.success("PDF Downloaded");
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (!reportData || reportData.rows.length === 0) {
      toast.error("Please click 'Show' first to generate report");
      return;
    }

    let exportData = [];

    if (reportData.reportType.includes('Summary') && !reportData.reportType.includes('Invoice')) {
      const isTerminal = reportData.reportType.includes('Terminal');
      exportData = reportData.rows.map((r, idx) => ({
        'SL': idx + 1,
        [isTerminal ? 'Terminal / Counter' : 'User / Cashier']: isTerminal ? r.terminal_name : r.user_name,
        'Store': r.store_name,
        'Total Invoices': r.total_invoices,
        'Total Qty Sold': r.total_qty,
        'Gross Sales (৳)': Number(r.gross_amount).toFixed(2),
        'Discount (৳)': Number(r.discount_amount).toFixed(2),
        'VAT (৳)': Number(r.vat_amount).toFixed(2),
        'Net Amount (৳)': Number(r.net_amount).toFixed(2),
        'Avg Invoice Value (৳)': Number(r.avg_invoice_value).toFixed(2)
      }));

      exportData.push({
        'SL': 'Total',
        [isTerminal ? 'Terminal / Counter' : 'User / Cashier']: `${reportData.rows.length} Groups`,
        'Store': '',
        'Total Invoices': reportData.totals.total_invoices,
        'Total Qty Sold': reportData.totals.total_qty,
        'Gross Sales (৳)': Number(reportData.totals.total_gross).toFixed(2),
        'Discount (৳)': Number(reportData.totals.total_discount).toFixed(2),
        'VAT (৳)': Number(reportData.totals.total_vat).toFixed(2),
        'Net Amount (৳)': Number(reportData.totals.total_net).toFixed(2),
        'Avg Invoice Value (৳)': Number(reportData.totals.avg_invoice_value).toFixed(2)
      });
    } else {
      exportData = reportData.rows.map((r, idx) => ({
        'SL': idx + 1,
        'Date & Time': r.date_time,
        'Invoice No': r.invoice_no,
        'Store': r.store_name,
        'Cashier / User': r.cashier_name,
        'Sales Executive': r.sales_executive_name,
        'Terminal': r.terminal_name,
        'Items Qty': r.total_qty,
        'Sub Total (Gross)': Number(r.gross_amount).toFixed(2),
        'Discount (৳)': Number(r.discount_amount).toFixed(2),
        'VAT (৳)': Number(r.vat_amount).toFixed(2),
        'Net Amount (৳)': Number(r.net_amount).toFixed(2),
        'Pay Mode': r.pay_mode
      }));

      exportData.push({
        'SL': 'Total',
        'Date & Time': '',
        'Invoice No': `${reportData.rows.length} Invoices`,
        'Store': '',
        'Cashier / User': '',
        'Sales Executive': '',
        'Terminal': '',
        'Items Qty': reportData.totals.total_qty,
        'Sub Total (Gross)': Number(reportData.totals.total_gross).toFixed(2),
        'Discount (৳)': Number(reportData.totals.total_discount).toFixed(2),
        'VAT (৳)': Number(reportData.totals.total_vat).toFixed(2),
        'Net Amount (৳)': Number(reportData.totals.total_net).toFixed(2),
        'Pay Mode': ''
      });
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales Summary");
    XLSX.writeFile(wb, `User_Terminal_Sales_Report_${fromDate}_to_${toDate}.xlsx`);
    toast.success("Excel Downloaded");
  };

  return (
    <div className="animate-fade-in" style={{ padding: '24px', backgroundColor: 'var(--bg-color)', minHeight: '100vh', boxSizing: 'border-box' }}>
      
      {/* Top Header Title */}
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '18px' }}>
        User & Terminal Wise Sales Report
      </h2>

      {/* Main Filter Panel - Exact Layout from Screenshot */}
      <div style={{
        backgroundColor: 'var(--card-bg, #fff)',
        borderRadius: '8px',
        border: '1px solid var(--border-color, #e2e8f0)',
        padding: '24px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
        marginBottom: '24px'
      }}>
        
        {/* Top 2-Column Grid for Dates, Store, User, Terminal */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '24px',
          marginBottom: '18px'
        }}>
          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* From Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
              <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>From Date</label>
              <input 
                type="date" 
                value={fromDate} 
                onChange={e => setFromDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  fontSize: '12.5px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  backgroundColor: '#fff',
                  color: '#1e293b',
                  outline: 'none'
                }}
              />
            </div>

            {/* Store */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
              <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>Store</label>
              <select 
                value={selectedStore} 
                onChange={e => setSelectedStore(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  fontSize: '12.5px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  backgroundColor: '#fff',
                  color: '#1e293b',
                  outline: 'none'
                }}
              >
                <option value="ALL">Select Store</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* Terminal */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
              <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>Terminal</label>
              <select 
                value={selectedTerminal} 
                onChange={e => setSelectedTerminal(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  fontSize: '12.5px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  backgroundColor: '#fff',
                  color: '#1e293b',
                  outline: 'none'
                }}
              >
                <option value="ALL">ALL</option>
                <option value="Counter 01">Counter 01</option>
                <option value="Counter 02">Counter 02</option>
                <option value="Counter 03">Counter 03</option>
                {terminals.map(t => (
                  <option key={t.id} value={`Counter ${t.counter_id}`}>Counter {t.counter_id}</option>
                ))}
              </select>
            </div>

          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* To Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
              <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>To Date</label>
              <input 
                type="date" 
                value={toDate} 
                onChange={e => setToDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  fontSize: '12.5px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  backgroundColor: '#fff',
                  color: '#1e293b',
                  outline: 'none'
                }}
              />
            </div>

            {/* User */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
              <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>User</label>
              <select 
                value={selectedUser} 
                onChange={e => setSelectedUser(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  fontSize: '12.5px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  backgroundColor: '#fff',
                  color: '#1e293b',
                  outline: 'none'
                }}
              >
                <option value="ALL">ALL</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.name} {e.designation ? `(${e.designation})` : ''}</option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* Row 4: Exact Functional Time Inputs as in Screenshot */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '14px', 
          flexWrap: 'wrap', 
          padding: '12px 14px',
          backgroundColor: '#f8fafc',
          borderRadius: '6px',
          border: '1px solid #e2e8f0',
          marginBottom: '22px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>From Hour:</span>
            <input 
              type="number" 
              min="0" 
              max="23" 
              value={fromHour} 
              onChange={e => setFromHour(Math.min(23, Math.max(0, Number(e.target.value) || 0)))}
              style={{ width: '64px', padding: '5px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>From Minute:</span>
            <input 
              type="number" 
              min="0" 
              max="59" 
              value={fromMinute} 
              onChange={e => setFromMinute(Math.min(59, Math.max(0, Number(e.target.value) || 0)))}
              style={{ width: '64px', padding: '5px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>From Second:</span>
            <input 
              type="number" 
              min="0" 
              max="59" 
              value={fromSecond} 
              onChange={e => setFromSecond(Math.min(59, Math.max(0, Number(e.target.value) || 0)))}
              style={{ width: '64px', padding: '5px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px' }}>
            <span style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>To Hour:</span>
            <input 
              type="number" 
              min="0" 
              max="23" 
              value={toHour} 
              onChange={e => setToHour(Math.min(23, Math.max(0, Number(e.target.value) || 0)))}
              style={{ width: '64px', padding: '5px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>To Minute:</span>
            <input 
              type="number" 
              min="0" 
              max="59" 
              value={toMinute} 
              onChange={e => setToMinute(Math.min(59, Math.max(0, Number(e.target.value) || 0)))}
              style={{ width: '64px', padding: '5px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>To Second:</span>
            <input 
              type="number" 
              min="0" 
              max="59" 
              value={toSecond} 
              onChange={e => setToSecond(Math.min(59, Math.max(0, Number(e.target.value) || 0)))}
              style={{ width: '64px', padding: '5px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center', outline: 'none' }}
            />
          </div>
        </div>

        {/* Row 5: Report Type Section with 4 Options */}
        <div style={{ marginBottom: '22px' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 12px 0' }}>
            Report Type
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              'User Wise Invoice Summary',
              'User Wise Summary',
              'Terminal Wise Invoice Summary',
              'Terminal Wise Summary'
            ].map(type => (
              <label 
                key={type} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px', 
                  cursor: 'pointer',
                  fontSize: '0.88rem',
                  color: reportType === type ? '#2e6f40' : 'var(--text-primary)',
                  fontWeight: reportType === type ? 600 : 400
                }}
              >
                <input 
                  type="radio" 
                  name="userTerminalReportType"
                  checked={reportType === type}
                  onChange={() => handleReportTypeChange(type)}
                  style={{ 
                    accentColor: '#2e6f40', 
                    width: '16px', 
                    height: '16px', 
                    cursor: 'pointer' 
                  }}
                />
                {type}
              </label>
            ))}
          </div>
        </div>

        {/* Row 6: Action Buttons Section - Windows 7 Aero Style */}
        <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
            Print Type
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Show Button */}
            <button
              onClick={handleShowReport}
              disabled={loading}
              className="btn-info"
              style={{
                padding: '6px 20px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
              Show
            </button>

            {/* Show Excel Button */}
            <button
              onClick={handleExportExcel}
              className="btn-info"
              style={{
                padding: '6px 18px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              <FileSpreadsheet size={14} />
              Show Excel
            </button>

            {/* Download PDF Button */}
            <button
              onClick={handlePrintPDF}
              className="btn-theme"
              style={{
                padding: '6px 18px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              <Download size={14} />
              Download PDF
            </button>

            {/* Reload Button */}
            <button
              onClick={handleReload}
              className="btn-danger"
              style={{
                padding: '6px 18px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={14} />
              Reload
            </button>
          </div>
        </div>

      </div>

      {/* Report Output Display Panel */}
      {reportData && (
        <div className="animate-fade-in" style={{
          backgroundColor: 'var(--card-bg, #fff)',
          borderRadius: '8px',
          border: '1px solid var(--border-color, #e2e8f0)',
          padding: '24px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)'
        }}>
          
          {/* Summary KPI Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            
            <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#f0f9ff', border: '1px solid #e0f2fe' }}>
              <div style={{ fontSize: '0.78rem', color: '#0369a1', fontWeight: 600, textTransform: 'uppercase' }}>Invoices Count</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0c4a6e', marginTop: '4px' }}>
                {reportData.totals.total_invoices}
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#f0fdf4', border: '1px solid #dcfce7' }}>
              <div style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>Total Quantity Sold</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#14532d', marginTop: '4px' }}>
                {reportData.totals.total_qty}
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#fefce8', border: '1px solid #fef08a' }}>
              <div style={{ fontSize: '0.78rem', color: '#854d0e', fontWeight: 600, textTransform: 'uppercase' }}>Gross Sales</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#713f12', marginTop: '4px' }}>
                ৳ {Number(reportData.totals.total_gross).toFixed(2)}
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
              <div style={{ fontSize: '0.78rem', color: '#991b1b', fontWeight: 600, textTransform: 'uppercase' }}>Total Discount</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#b91c1c', marginTop: '4px' }}>
                ৳ {Number(reportData.totals.total_discount).toFixed(2)}
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#eff6ff', border: '1px solid #dbeafe' }}>
              <div style={{ fontSize: '0.78rem', color: '#1e40af', fontWeight: 600, textTransform: 'uppercase' }}>Total VAT</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1e3a8a', marginTop: '4px' }}>
                ৳ {Number(reportData.totals.total_vat).toFixed(2)}
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#f5f3ff', border: '1px solid #ede9fe' }}>
              <div style={{ fontSize: '0.78rem', color: '#5b21b6', fontWeight: 600, textTransform: 'uppercase' }}>Net Sales Collection</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#4c1d95', marginTop: '4px' }}>
                ৳ {Number(reportData.totals.total_net).toFixed(2)}
              </div>
            </div>

          </div>

          {/* Quick Table Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {reportData.reportType} ({displayedRows.length} Rows)
              </h3>
            </div>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="text" 
                placeholder="Filter table rows..." 
                value={tableSearch}
                onChange={e => setTableSearch(e.target.value)}
                style={{ padding: '6px 12px 6px 32px', fontSize: '0.85rem', border: '1px solid var(--border-color)', borderRadius: '4px', width: '220px' }}
              />
            </div>
          </div>

          {/* Data Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#2e6f40', color: '#ffffff', fontWeight: 'bold' }}>
                  {reportData.reportType.includes('Summary') && !reportData.reportType.includes('Invoice') ? (
                    // Summary Columns
                    <>
                      <th style={{ padding: '10px 10px', textAlign: 'center' }}>SL</th>
                      <th style={{ padding: '10px 10px' }}>
                        {reportData.reportType.includes('Terminal') ? 'Terminal / Counter' : 'User / Cashier'}
                      </th>
                      <th style={{ padding: '10px 10px' }}>Store</th>
                      <th style={{ padding: '10px 10px', textAlign: 'center' }}>Invoices</th>
                      <th style={{ padding: '10px 10px', textAlign: 'right' }}>Total Qty</th>
                      <th style={{ padding: '10px 10px', textAlign: 'right' }}>Gross Sales</th>
                      <th style={{ padding: '10px 10px', textAlign: 'right' }}>Discount</th>
                      <th style={{ padding: '10px 10px', textAlign: 'right' }}>VAT</th>
                      <th style={{ padding: '10px 10px', textAlign: 'right' }}>Net Amount</th>
                      <th style={{ padding: '10px 10px', textAlign: 'right' }}>Avg Value</th>
                    </>
                  ) : (
                    // Invoice Level Columns
                    <>
                      <th style={{ padding: '10px 8px', textAlign: 'center' }}>SL</th>
                      <th style={{ padding: '10px 8px' }}>Date & Time</th>
                      <th style={{ padding: '10px 8px' }}>Invoice No</th>
                      <th style={{ padding: '10px 8px' }}>Store</th>
                      <th style={{ padding: '10px 8px' }}>Cashier / User</th>
                      <th style={{ padding: '10px 8px' }}>Sales Executive</th>
                      <th style={{ padding: '10px 8px' }}>Terminal</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>Qty</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>Gross</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>Discount</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>VAT</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>Net Amount</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center' }}>Pay Mode</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {displayedRows.length === 0 ? (
                  <tr>
                    <td colSpan={13} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                      No matching records found.
                    </td>
                  </tr>
                ) : (
                  displayedRows.map((r, idx) => (
                    <tr 
                      key={idx} 
                      style={{ 
                        borderBottom: '1px solid var(--border-color, #e2e8f0)',
                        backgroundColor: idx % 2 === 0 ? 'var(--card-bg, #ffffff)' : '#fafafa' 
                      }}
                    >
                      {reportData.reportType.includes('Summary') && !reportData.reportType.includes('Invoice') ? (
                        <>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>{idx + 1}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 600, color: '#2e6f40' }}>
                            {reportData.reportType.includes('Terminal') ? r.terminal_name : r.user_name}
                          </td>
                          <td style={{ padding: '8px 10px' }}>{r.store_name}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>{r.total_invoices}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>{r.total_qty}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>{Number(r.gross_amount).toFixed(2)}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', color: '#dc2626' }}>{Number(r.discount_amount).toFixed(2)}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>{Number(r.vat_amount).toFixed(2)}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#166534' }}>{Number(r.net_amount).toFixed(2)}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', color: '#0369a1' }}>{Number(r.avg_invoice_value).toFixed(2)}</td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '8px 8px', textAlign: 'center' }}>{idx + 1}</td>
                          <td style={{ padding: '8px 8px', whiteSpace: 'nowrap' }}>{r.date_time}</td>
                          <td style={{ padding: '8px 8px', fontWeight: 600, color: '#2e6f40' }}>{r.invoice_no}</td>
                          <td style={{ padding: '8px 8px' }}>{r.store_name}</td>
                          <td style={{ padding: '8px 8px', fontWeight: 500 }}>{r.cashier_name}</td>
                          <td style={{ padding: '8px 8px' }}>{r.sales_executive_name}</td>
                          <td style={{ padding: '8px 8px' }}>{r.terminal_name}</td>
                          <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600 }}>{r.total_qty}</td>
                          <td style={{ padding: '8px 8px', textAlign: 'right' }}>{Number(r.gross_amount).toFixed(2)}</td>
                          <td style={{ padding: '8px 8px', textAlign: 'right', color: '#dc2626' }}>{Number(r.discount_amount).toFixed(2)}</td>
                          <td style={{ padding: '8px 8px', textAlign: 'right' }}>{Number(r.vat_amount).toFixed(2)}</td>
                          <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, color: '#166534' }}>{Number(r.net_amount).toFixed(2)}</td>
                          <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                            <span style={{ 
                              padding: '2px 8px', 
                              borderRadius: '10px', 
                              fontSize: '0.75rem', 
                              backgroundColor: '#e0f2fe', 
                              color: '#0369a1',
                              fontWeight: 600 
                            }}>
                              {r.pay_mode}
                            </span>
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
              {/* Total Footer Row */}
              {displayedRows.length > 0 && (
                <tfoot>
                  <tr style={{ backgroundColor: '#f0fdf4', color: '#166534', fontWeight: 'bold', borderTop: '2px solid #bbf7d0' }}>
                    {reportData.reportType.includes('Summary') && !reportData.reportType.includes('Invoice') ? (
                      <>
                        <td style={{ padding: '10px 10px', textAlign: 'center' }}>Total</td>
                        <td colSpan={2} style={{ padding: '10px 10px' }}>{reportData.rows.length} Summary Groups</td>
                        <td style={{ padding: '10px 10px', textAlign: 'center' }}>{reportData.totals.total_invoices}</td>
                        <td style={{ padding: '10px 10px', textAlign: 'right' }}>{reportData.totals.total_qty}</td>
                        <td style={{ padding: '10px 10px', textAlign: 'right' }}>৳ {Number(reportData.totals.total_gross).toFixed(2)}</td>
                        <td style={{ padding: '10px 10px', textAlign: 'right', color: '#dc2626' }}>৳ {Number(reportData.totals.total_discount).toFixed(2)}</td>
                        <td style={{ padding: '10px 10px', textAlign: 'right' }}>৳ {Number(reportData.totals.total_vat).toFixed(2)}</td>
                        <td style={{ padding: '10px 10px', textAlign: 'right' }}>৳ {Number(reportData.totals.total_net).toFixed(2)}</td>
                        <td style={{ padding: '10px 10px', textAlign: 'right' }}>৳ {Number(reportData.totals.avg_invoice_value).toFixed(2)}</td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>Total</td>
                        <td colSpan={6} style={{ padding: '10px 8px' }}>{reportData.rows.length} Total Invoices</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>{reportData.totals.total_qty}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>৳ {Number(reportData.totals.total_gross).toFixed(2)}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', color: '#dc2626' }}>৳ {Number(reportData.totals.total_discount).toFixed(2)}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>৳ {Number(reportData.totals.total_vat).toFixed(2)}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>৳ {Number(reportData.totals.total_net).toFixed(2)}</td>
                        <td style={{ padding: '10px 8px' }}></td>
                      </>
                    )}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

        </div>
      )}

    </div>
  );
};

export default UserWiseInvoiceSummaryReport;
