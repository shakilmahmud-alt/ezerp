import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { 
  Download, RefreshCw, Search, FileSpreadsheet, 
  Users, ChevronRight, CheckSquare, Square
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import CustomSelect from '../../../components/CustomSelect';

const CustomerSummaryReport = () => {
  const { user } = useAuth();

  // Helper for today's date (YYYY-MM-DD)
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  // 1. Filter States (Matching 3rd Image Layout)
  const [fromDate, setFromDate] = useState(getTodayDate());
  const [toDate, setToDate] = useState(getTodayDate());
  const [selectedStore, setSelectedStore] = useState('ALL');
  const [selectedCustomerType, setSelectedCustomerType] = useState('ALL');
  const [customerInput, setCustomerInput] = useState('ALL');
  const [selectedEmployee, setSelectedEmployee] = useState('ALL');
  const [netAmountFrom, setNetAmountFrom] = useState('-111111111111110');
  const [netAmountTo, setNetAmountTo] = useState('111111111111111');

  // Report Type: 'Customer Wise Summary' | 'Customer Wise Invoice Summary' | 'Customer Wise Invoice Details'
  const [reportType, setReportType] = useState('Customer Wise Summary');
  const [printType, setPrintType] = useState('Details');

  // 2. Dropdown Master Data Lists
  const [storesList, setStoresList] = useState([]);
  const [customerTypesList, setCustomerTypesList] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [customersMap, setCustomersMap] = useState(new Map());

  // 3. Output / Generated Report State (strictly null on mount; NO auto-load)
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tableSearch, setTableSearch] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 25;

  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      const [storesRes, custTypesRes, empsRes, custsRes] = await Promise.all([
        supabase.from('stores').select('id, name, shop_type').order('name'),
        supabase.from('customer_types').select('id, code, name, discount_percent').order('name'),
        supabase.from('employees').select('id, code, name, username').order('name'),
        supabase.from('customers').select('id, code, first_name, middle_name, last_name, contact_no, email, card_no, address, customer_type_id, store')
      ]);

      setStoresList(storesRes.data || []);
      setCustomerTypesList(custTypesRes.data || []);
      setEmployeesList(empsRes.data || []);

      const cMap = new Map();
      (custsRes.data || []).forEach(c => {
        if (c.id) cMap.set(c.id, c);
        if (c.code) cMap.set(c.code, c);
        if (c.contact_no) cMap.set(c.contact_no, c);
        if (c.card_no) cMap.set(c.card_no, c);
      });
      setCustomersMap(cMap);
    } catch (err) {
      console.error('Error loading master data in CustomerSummaryReport:', err);
      toast.error('Failed to load filter dropdowns');
    }
  };

  // Handle Reload / Reset Filter values
  const handleReload = () => {
    setFromDate(getTodayDate());
    setToDate(getTodayDate());
    setSelectedStore('ALL');
    setSelectedCustomerType('ALL');
    setCustomerInput('ALL');
    setSelectedEmployee('ALL');
    setNetAmountFrom('-111111111111110');
    setNetAmountTo('111111111111111');
    setReportType('Customer Wise Summary');
    setPrintType('Details');
    setReportData(null);
    setTableSearch('');
    setCurrentPage(1);
    toast.success('Filters reloaded to default');
  };

  // Main Handle Show: Query and aggregate data
  const handleShowReport = async () => {
    setLoading(true);
    setTableSearch('');
    setCurrentPage(1);

    try {
      // 1. Fetch Sales records within date range
      const { data: salesData, error: salesErr } = await supabase
        .from('sales')
        .select('*')
        .gte('sale_date', `${fromDate}T00:00:00`)
        .lte('sale_date', `${toDate}T23:59:59`)
        .order('sale_date', { ascending: false });

      if (salesErr) {
        console.error('Sales fetch error:', salesErr);
        toast.error('Failed to fetch sales data');
      }

      const allSales = salesData || [];

      // 2. If Invoice Details mode, fetch sale_items
      let saleItemsMap = new Map();
      if (reportType === 'Customer Wise Invoice Details' && allSales.length > 0) {
        const saleIds = allSales.map(s => s.id);
        const { data: itemsData, error: itemsErr } = await supabase
          .from('sale_items')
          .select('*')
          .in('sale_id', saleIds);

        if (!itemsErr && itemsData) {
          itemsData.forEach(item => {
            const list = saleItemsMap.get(item.sale_id) || [];
            list.push(item);
            saleItemsMap.set(item.sale_id, list);
          });
        }
      }

      // 3. Enrich & Filter Sales records
      const storesLookup = new Map(storesList.map(s => [s.id, s.name]));
      const custTypesLookup = new Map(customerTypesList.map(ct => [ct.id, ct.name]));
      const empsLookup = new Map(employeesList.map(e => [e.id, e.name]));

      const enrichedSales = allSales.map(s => {
        const cust = customersMap.get(s.customer_id) || customersMap.get(s.customer_mobile) || null;
        const custFullName = cust 
          ? [cust.first_name, cust.middle_name, cust.last_name].filter(Boolean).join(' ') 
          : (s.customer_name || 'Walk-in Customer');
        const custCode = cust?.code || cust?.card_no || '-';
        const custMobile = s.customer_mobile || cust?.contact_no || '-';
        const custTypeName = cust?.customer_type_id ? (custTypesLookup.get(cust.customer_type_id) || 'Regular') : 'Regular';
        const storeName = storesLookup.get(s.store_id) || s.store_id || 'Store';
        const empName = s.sales_executive_name || empsLookup.get(s.sales_executive_id) || s.created_by || 'Staff';

        return {
          ...s,
          custCode,
          custFullName,
          custMobile,
          custTypeId: cust?.customer_type_id || '',
          custTypeName,
          storeName,
          empName,
          grossAmount: Number(s.total_amount || 0),
          discountAmount: Number(s.discount_amount || 0),
          vatAmount: Number(s.vat_amount || 0),
          netAmount: Number(s.net_amount || s.subtotal || 0),
          paidAmount: Number(s.paid_amount || 0),
          totalQty: Number(s.total_qty || 0)
        };
      });

      // Filter by Store, Customer Type, Customer Name/Mobile/Code, Employee, Net Amount Range
      const minNet = (netAmountFrom && !isNaN(Number(netAmountFrom))) ? Number(netAmountFrom) : -Infinity;
      const maxNet = (netAmountTo && !isNaN(Number(netAmountTo))) ? Number(netAmountTo) : Infinity;

      const filteredSales = enrichedSales.filter(row => {
        // Store
        if (selectedStore !== 'ALL' && selectedStore !== 'Select Store') {
          if (!row.storeName?.toLowerCase().includes(selectedStore.toLowerCase()) && row.store_id !== selectedStore) {
            return false;
          }
        }

        // Customer Type
        if (selectedCustomerType !== 'ALL' && selectedCustomerType !== 'Select Customer Type') {
          if (row.custTypeId !== selectedCustomerType && row.custTypeName?.toLowerCase() !== selectedCustomerType.toLowerCase()) {
            return false;
          }
        }

        // Customer query (input)
        if (customerInput && customerInput !== 'ALL' && customerInput.trim() !== '') {
          const q = customerInput.trim().toLowerCase();
          const matches = (
            row.custFullName?.toLowerCase().includes(q) ||
            row.custMobile?.toLowerCase().includes(q) ||
            row.custCode?.toLowerCase().includes(q) ||
            row.customer_name?.toLowerCase().includes(q)
          );
          if (!matches) return false;
        }

        // Employee
        if (selectedEmployee !== 'ALL') {
          if (row.sales_executive_id !== selectedEmployee && !row.empName?.toLowerCase().includes(selectedEmployee.toLowerCase())) {
            return false;
          }
        }

        // Net Amount Range
        if (row.netAmount < minNet || row.netAmount > maxNet) {
          return false;
        }

        return true;
      });

      // 4. Transform output according to selected Report Type
      let finalRows = [];

      if (reportType === 'Customer Wise Summary') {
        // Group by Customer Key
        const grouped = new Map();

        filteredSales.forEach(s => {
          const key = s.custMobile !== '-' ? s.custMobile : (s.custCode !== '-' ? s.custCode : s.custFullName);
          if (!grouped.has(key)) {
            grouped.set(key, {
              id: key,
              customerCode: s.custCode,
              customerName: s.custFullName,
              mobile: s.custMobile,
              customerType: s.custTypeName,
              totalInvoices: 0,
              totalQty: 0,
              grossAmount: 0,
              discountAmount: 0,
              vatAmount: 0,
              netAmount: 0,
              paidAmount: 0
            });
          }

          const curr = grouped.get(key);
          curr.totalInvoices += 1;
          curr.totalQty += s.totalQty;
          curr.grossAmount += s.grossAmount;
          curr.discountAmount += s.discountAmount;
          curr.vatAmount += s.vatAmount;
          curr.netAmount += s.netAmount;
          curr.paidAmount += s.paidAmount;
        });

        finalRows = Array.from(grouped.values()).sort((a, b) => b.netAmount - a.netAmount);

      } else if (reportType === 'Customer Wise Invoice Summary') {
        finalRows = filteredSales.map((s, idx) => ({
          id: s.id || idx,
          invoiceNo: s.invoice_no || '-',
          date: s.sale_date ? s.sale_date.split('T')[0] : (s.created_at ? s.created_at.split('T')[0] : '-'),
          store: s.storeName,
          customerCode: s.custCode,
          customerName: s.custFullName,
          mobile: s.custMobile,
          customerType: s.custTypeName,
          employee: s.empName,
          totalQty: s.totalQty,
          grossAmount: s.grossAmount,
          discountAmount: s.discountAmount,
          vatAmount: s.vatAmount,
          netAmount: s.netAmount,
          paidAmount: s.paidAmount
        }));

      } else {
        // Customer Wise Invoice Details
        filteredSales.forEach((s) => {
          const items = saleItemsMap.get(s.id) || [];
          const dateStr = s.sale_date ? s.sale_date.split('T')[0] : (s.created_at ? s.created_at.split('T')[0] : '-');

          if (items.length === 0) {
            finalRows.push({
              id: s.id,
              invoiceNo: s.invoice_no || '-',
              date: dateStr,
              customerName: s.custFullName,
              mobile: s.custMobile,
              barcode: '-',
              productName: 'General Sale',
              qty: s.totalQty || 1,
              unitPrice: s.grossAmount,
              discountAmount: s.discountAmount,
              vatAmount: s.vatAmount,
              totalValue: s.netAmount
            });
          } else {
            items.forEach((it, iIdx) => {
              finalRows.push({
                id: it.id || `${s.id}-${iIdx}`,
                invoiceNo: s.invoice_no || '-',
                date: dateStr,
                customerName: s.custFullName,
                mobile: s.custMobile,
                barcode: it.user_barcode || it.barcode || '-',
                productName: it.product_name || 'Item',
                qty: Number(it.qty || 1),
                unitPrice: Number(it.unit_price || 0),
                discountAmount: Number(it.discount_amount || 0),
                vatAmount: Number(it.vat_amount || 0),
                totalValue: Number(it.total_value || (Number(it.unit_price || 0) * Number(it.qty || 1)))
              });
            });
          }
        });
      }

      setReportData(finalRows);
      if (finalRows.length === 0) {
        toast.error('No sales records found matching the criteria.');
      } else {
        toast.success(`Found ${finalRows.length} customer record(s).`);
      }
    } catch (err) {
      console.error('Error in handleShowReport:', err);
      toast.error('Failed to generate report. Please try again.');
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtered rows for in-table search
  const displayRows = useMemo(() => {
    if (!reportData) return [];
    if (!tableSearch.trim()) return reportData;
    const q = tableSearch.trim().toLowerCase();
    return reportData.filter(r => 
      r.customerName?.toLowerCase().includes(q) ||
      r.customerCode?.toLowerCase().includes(q) ||
      r.mobile?.toLowerCase().includes(q) ||
      r.customerType?.toLowerCase().includes(q) ||
      r.invoiceNo?.toLowerCase().includes(q) ||
      r.store?.toLowerCase().includes(q) ||
      r.employee?.toLowerCase().includes(q) ||
      r.productName?.toLowerCase().includes(q) ||
      r.barcode?.toLowerCase().includes(q)
    );
  }, [reportData, tableSearch]);

  // Aggregated Summary Statistics
  const summaryStats = useMemo(() => {
    if (!reportData || reportData.length === 0) {
      return { totalRecords: 0, totalInvoices: 0, totalQty: 0, totalGross: 0, totalDiscount: 0, totalVat: 0, totalNet: 0, totalPaid: 0 };
    }
    const totalRecords = reportData.length;
    const totalInvoices = reportType === 'Customer Wise Summary'
      ? reportData.reduce((acc, r) => acc + Number(r.totalInvoices || 0), 0)
      : new Set(reportData.map(r => r.invoiceNo)).size;
    const totalQty = reportData.reduce((acc, r) => acc + Number(r.totalQty || r.qty || 0), 0);
    const totalGross = reportData.reduce((acc, r) => acc + Number(r.grossAmount || (r.unitPrice * r.qty) || 0), 0);
    const totalDiscount = reportData.reduce((acc, r) => acc + Number(r.discountAmount || 0), 0);
    const totalVat = reportData.reduce((acc, r) => acc + Number(r.vatAmount || 0), 0);
    const totalNet = reportData.reduce((acc, r) => acc + Number(r.netAmount || r.totalValue || 0), 0);
    const totalPaid = reportData.reduce((acc, r) => acc + Number(r.paidAmount || r.totalValue || 0), 0);

    return { totalRecords, totalInvoices, totalQty, totalGross, totalDiscount, totalVat, totalNet, totalPaid };
  }, [reportData, reportType]);

  // Pagination calculation
  const totalPages = Math.ceil(displayRows.length / rowsPerPage) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return displayRows.slice(start, start + rowsPerPage);
  }, [displayRows, currentPage, rowsPerPage]);

  // Generate Standard MIS Landscape Green Banner PDF
  const handleDownloadPDF = () => {
    if (!reportData || reportData.length === 0) {
      toast.error('No data available to export PDF');
      return;
    }

    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // 1. Top Green Banner (#2e6f40)
    doc.setFillColor(46, 111, 64);
    doc.rect(0, 0, pageWidth, 22, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('EZ ERP MANAGEMENT INFORMATION SYSTEM (MIS)', 14, 11);

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text('CRM & CUSTOMER SALES ANALYTICS', 14, 17);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('CUSTOMER SUMMARY REPORT (DETAILS)', pageWidth - 14, 14, { align: 'right' });

    // 2. Metadata Section below Banner
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(50, 50, 50);

    const line1Left = `Date Range: ${fromDate} to ${toDate} | Report Mode: ${reportType}`;
    const line2Left = `Store Scope: ${selectedStore !== 'ALL' && selectedStore !== 'Select Store' ? selectedStore : 'ALL Stores'} | Customer Type: ${selectedCustomerType} | Employee: ${selectedEmployee}`;

    const printDateStr = new Date().toLocaleString('en-US', {
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true
    });

    const currentUserName = user?.name || user?.username || (localStorage.getItem('erp_user') ? JSON.parse(localStorage.getItem('erp_user'))?.name || JSON.parse(localStorage.getItem('erp_user'))?.username : '') || 'Super Admin';
    const displayName = (currentUserName === 'msmraqeeb@gmail.com' || currentUserName === 'admin@email.com') ? 'Super Admin' : currentUserName;

    doc.text(line1Left, 14, 30);
    doc.text(line2Left, 14, 35);

    doc.text(`Generated On: ${printDateStr}`, pageWidth - 14, 30, { align: 'right' });
    doc.text(`Printed By: ${displayName}`, pageWidth - 14, 35, { align: 'right' });

    // 3. Table Columns & Body based on mode
    let tableCols = [];
    let tableBody = [];

    if (reportType === 'Customer Wise Summary') {
      tableCols = [
        ['SL', 'Cust Code', 'Customer Name', 'Mobile', 'Type', 'Invoices', 'Qty', 'Gross Amt', 'Discount', 'VAT', 'Net Amount', 'Paid Amount']
      ];

      tableBody = reportData.map((row, idx) => [
        idx + 1,
        row.customerCode,
        row.customerName,
        row.mobile,
        row.customerType,
        row.totalInvoices,
        row.totalQty,
        Number(row.grossAmount || 0).toFixed(2),
        Number(row.discountAmount || 0).toFixed(2),
        Number(row.vatAmount || 0).toFixed(2),
        Number(row.netAmount || 0).toFixed(2),
        Number(row.paidAmount || 0).toFixed(2)
      ]);

      tableBody.push([
        'Total',
        '',
        `${reportData.length} Customers`,
        '',
        '',
        summaryStats.totalInvoices,
        summaryStats.totalQty,
        summaryStats.totalGross.toFixed(2),
        summaryStats.totalDiscount.toFixed(2),
        summaryStats.totalVat.toFixed(2),
        summaryStats.totalNet.toFixed(2),
        summaryStats.totalPaid.toFixed(2)
      ]);

    } else if (reportType === 'Customer Wise Invoice Summary') {
      tableCols = [
        ['SL', 'Invoice No', 'Date', 'Store', 'Customer Name', 'Mobile', 'Type', 'Employee', 'Qty', 'Gross Amt', 'Discount', 'VAT', 'Net Amount']
      ];

      tableBody = reportData.map((row, idx) => [
        idx + 1,
        row.invoiceNo,
        row.date,
        row.store,
        row.customerName,
        row.mobile,
        row.customerType,
        row.employee,
        row.totalQty,
        Number(row.grossAmount || 0).toFixed(2),
        Number(row.discountAmount || 0).toFixed(2),
        Number(row.vatAmount || 0).toFixed(2),
        Number(row.netAmount || 0).toFixed(2)
      ]);

      tableBody.push([
        'Total',
        '',
        `${reportData.length} Invoices`,
        '',
        '',
        '',
        '',
        '',
        summaryStats.totalQty,
        summaryStats.totalGross.toFixed(2),
        summaryStats.totalDiscount.toFixed(2),
        summaryStats.totalVat.toFixed(2),
        summaryStats.totalNet.toFixed(2)
      ]);

    } else {
      // Details
      tableCols = [
        ['SL', 'Invoice No', 'Date', 'Customer Name', 'Mobile', 'Barcode', 'Product Name', 'Qty', 'Unit Price', 'Disc', 'VAT', 'Total Value']
      ];

      tableBody = reportData.map((row, idx) => [
        idx + 1,
        row.invoiceNo,
        row.date,
        row.customerName,
        row.mobile,
        row.barcode,
        row.productName,
        row.qty,
        Number(row.unitPrice || 0).toFixed(2),
        Number(row.discountAmount || 0).toFixed(2),
        Number(row.vatAmount || 0).toFixed(2),
        Number(row.totalValue || 0).toFixed(2)
      ]);

      tableBody.push([
        'Total',
        '',
        `${reportData.length} Items`,
        '',
        '',
        '',
        '',
        summaryStats.totalQty,
        '',
        summaryStats.totalDiscount.toFixed(2),
        summaryStats.totalVat.toFixed(2),
        summaryStats.totalNet.toFixed(2)
      ]);
    }

    autoTable(doc, {
      startY: 40,
      head: tableCols,
      body: tableBody,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.5, valign: 'middle', textColor: [30, 30, 30] },
      headStyles: { fillColor: [46, 111, 64], fontStyle: 'bold', textColor: [255, 255, 255], halign: 'center' },
      didParseCell: function (data) {
        if (data.section === 'head') {
          if (data.column.index === 0) data.cell.styles.halign = 'center';
        } else if (data.section === 'body') {
          if (data.column.index === 0) data.cell.styles.halign = 'center';
        }
        if (data.row.index === tableBody.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 245, 240];
          data.cell.styles.textColor = [10, 60, 20];
        }
      },
      margin: { top: 10, left: 14, right: 14 }
    });

    const finalY = doc.lastAutoTable?.finalY || 100;

    // 4. Signatures (Matching MIS Standard)
    const sigY = Math.max(finalY + 24, pageHeight - 24);
    doc.setDrawColor(160, 174, 192);
    doc.setLineWidth(0.4);

    // Prepared By (Left)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(displayName, 47.5, sigY - 2.5, { align: 'center' });
    doc.line(20, sigY, 75, sigY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Prepared By', 47.5, sigY + 5, { align: 'center' });

    // Checked By (Middle)
    doc.line(pageWidth / 2 - 27.5, sigY, pageWidth / 2 + 27.5, sigY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Checked By', pageWidth / 2, sigY + 5, { align: 'center' });

    // Authorized Signature (Right)
    doc.line(pageWidth - 75, sigY, pageWidth - 20, sigY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Authorized Signature', pageWidth - 47.5, sigY + 5, { align: 'center' });

    doc.save(`Customer_Summary_Report_${fromDate}_to_${toDate}.pdf`);
    toast.success('PDF downloaded successfully');
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (!reportData || reportData.length === 0) {
      toast.error('No data available to export');
      return;
    }

    let excelRows = [];
    if (reportType === 'Customer Wise Summary') {
      excelRows = reportData.map((row, idx) => ({
        'SL': idx + 1,
        'Customer Code': row.customerCode,
        'Customer Name': row.customerName,
        'Mobile': row.mobile,
        'Customer Type': row.customerType,
        'Total Invoices': row.totalInvoices,
        'Total Qty': row.totalQty,
        'Gross Amount (Tk)': Number(row.grossAmount || 0),
        'Discount Amount (Tk)': Number(row.discountAmount || 0),
        'VAT Amount (Tk)': Number(row.vatAmount || 0),
        'Net Amount (Tk)': Number(row.netAmount || 0),
        'Paid Amount (Tk)': Number(row.paidAmount || 0)
      }));
    } else if (reportType === 'Customer Wise Invoice Summary') {
      excelRows = reportData.map((row, idx) => ({
        'SL': idx + 1,
        'Invoice No': row.invoiceNo,
        'Date': row.date,
        'Store': row.store,
        'Customer Name': row.customerName,
        'Mobile': row.mobile,
        'Customer Type': row.customerType,
        'Employee': row.employee,
        'Total Qty': row.totalQty,
        'Gross Amount (Tk)': Number(row.grossAmount || 0),
        'Discount (Tk)': Number(row.discountAmount || 0),
        'VAT (Tk)': Number(row.vatAmount || 0),
        'Net Amount (Tk)': Number(row.netAmount || 0)
      }));
    } else {
      excelRows = reportData.map((row, idx) => ({
        'SL': idx + 1,
        'Invoice No': row.invoiceNo,
        'Date': row.date,
        'Customer Name': row.customerName,
        'Mobile': row.mobile,
        'Barcode': row.barcode,
        'Product Name': row.productName,
        'Qty': row.qty,
        'Unit Price (Tk)': Number(row.unitPrice || 0),
        'Discount (Tk)': Number(row.discountAmount || 0),
        'VAT (Tk)': Number(row.vatAmount || 0),
        'Total Value (Tk)': Number(row.totalValue || 0)
      }));
    }

    const ws = XLSX.utils.json_to_sheet(excelRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customer Summary');
    XLSX.writeFile(wb, `Customer_Summary_Report_${fromDate}_to_${toDate}.xlsx`);
    toast.success('Excel exported successfully');
  };

  return (
    <div className="animate-fade-in" style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header & Breadcrumb */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>
          <span>CRM Reports</span>
          <ChevronRight size={14} />
          <span style={{ color: '#166534', fontWeight: 600 }}>Customer Summary Report</span>
        </div>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#1e293b' }}>
          Customer Summary Report
        </h1>
      </div>

      {/* Main Filter Panel (Exact 3rd Image Layout) */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          columnGap: '40px',
          rowGap: '16px'
        }}>
          {/* Row 1: From Date / To Date */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                backgroundColor: '#fff'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                backgroundColor: '#fff'
              }}
            />
          </div>

          {/* Row 2: Store / Customer Type */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Store
            </label>
            <CustomSelect
              options={[
                { value: 'ALL', label: 'Select Store' },
                ...storesList.map(s => ({ value: s.name, label: s.name }))
              ]}
              value={selectedStore}
              onChange={(val) => setSelectedStore(val)}
              placeholder="Select Store"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Customer Type
            </label>
            <CustomSelect
              options={[
                { value: 'ALL', label: 'Select Customer Type' },
                ...customerTypesList.map(ct => ({ value: ct.id, label: ct.name }))
              ]}
              value={selectedCustomerType}
              onChange={(val) => setSelectedCustomerType(val)}
              placeholder="Select Customer Type"
            />
          </div>

          {/* Row 3: Customer / Employee */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Customer
            </label>
            <input
              type="text"
              placeholder="ALL"
              value={customerInput}
              onChange={(e) => setCustomerInput(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                backgroundColor: '#fff'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Employee
            </label>
            <CustomSelect
              options={[
                { value: 'ALL', label: 'ALL' },
                ...employeesList.map(e => ({ value: e.id, label: `${e.name || e.username} (${e.code || 'EMP'})` }))
              ]}
              value={selectedEmployee}
              onChange={(val) => setSelectedEmployee(val)}
              placeholder="ALL"
            />
          </div>

          {/* Row 4: Net Amount From / Net Amount To */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Net Amount From
            </label>
            <input
              type="text"
              value={netAmountFrom}
              onChange={(e) => setNetAmountFrom(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                backgroundColor: '#fff'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Net Amount To
            </label>
            <input
              type="text"
              value={netAmountTo}
              onChange={(e) => setNetAmountTo(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                backgroundColor: '#fff'
              }}
            />
          </div>
        </div>

        {/* Report Type Radio Group (Exact 3rd Image Style) */}
        <div style={{ marginTop: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
            Report Type
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { id: 'Customer Wise Summary', label: 'Customer Wise Summary' },
              { id: 'Customer Wise Invoice Summary', label: 'Customer Wise Invoice Summary' },
              { id: 'Customer Wise Invoice Details', label: 'Customer Wise Invoice Details' }
            ].map(rt => {
              const isSelected = reportType === rt.id;
              return (
                <div
                  key={rt.id}
                  onClick={() => {
                    setReportType(rt.id);
                    setReportData(null);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    fontSize: '13.5px',
                    color: isSelected ? '#1e293b' : '#64748b',
                    fontWeight: isSelected ? 600 : 400
                  }}
                >
                  {/* Round Green Bullet Point matching 3rd Image */}
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: isSelected ? '2px solid #2e6f40' : '2px solid #cbd5e1',
                    backgroundColor: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 0 0 1px rgba(46, 111, 64, 0.2)' : 'none',
                    flexShrink: 0
                  }}>
                    {isSelected && (
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#2e6f40'
                      }} />
                    )}
                  </div>
                  <span>{rt.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Print Type & Action Buttons (Aero Style matching 2nd Image) */}
        <div style={{ marginTop: '24px' }}>
          <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
            Print Type
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Aero Sky Blue Show Button */}
            <button
              onClick={handleShowReport}
              disabled={loading}
              className="btn-info"
              style={{
                padding: '6px 24px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              <Search size={14} />
              {loading ? 'Loading...' : 'Show'}
            </button>

            {/* Aero Ruby Red Reload Button */}
            <button
              onClick={handleReload}
              disabled={loading}
              className="btn-danger"
              style={{
                padding: '6px 22px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Reload
            </button>
          </div>
        </div>
      </div>

      {/* Report Results Section (Visible only after clicking Show) */}
      {reportData !== null && (
        <div style={{ marginTop: '20px' }}>
          {/* Summary Metric Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            marginBottom: '20px'
          }}>
            <div style={{
              backgroundColor: '#fff',
              padding: '16px 20px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {reportType === 'Customer Wise Summary' ? 'Total Customers' : (reportType === 'Customer Wise Invoice Summary' ? 'Total Invoices' : 'Total Item Rows')}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
                {summaryStats.totalRecords}
              </div>
            </div>

            <div style={{
              backgroundColor: '#fff',
              padding: '16px 20px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Total Invoices
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0284c7', marginTop: '6px' }}>
                {summaryStats.totalInvoices}
              </div>
            </div>

            <div style={{
              backgroundColor: '#fff',
              padding: '16px 20px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Total Items Qty
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#166534', marginTop: '6px' }}>
                {summaryStats.totalQty}
              </div>
            </div>

            <div style={{
              backgroundColor: '#fff',
              padding: '16px 20px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Total Net Amount
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#166534', marginTop: '6px' }}>
                Tk {summaryStats.totalNet.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Table Container Card */}
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            overflow: 'hidden'
          }}>
            {/* Table Action Bar */}
            <div style={{
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#fff',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              {/* In-table Search */}
              <div style={{ position: 'relative', width: '300px' }}>
                <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Quick search in results..."
                  value={tableSearch}
                  onChange={(e) => {
                    setTableSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{
                    width: '100%',
                    padding: '7px 12px 7px 32px',
                    borderRadius: '5px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Action Export Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={handleDownloadPDF}
                  className="btn-theme"
                  style={{
                    padding: '6px 18px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: '4px'
                  }}
                >
                  <Download size={14} />
                  Download PDF
                </button>

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
                    borderRadius: '4px'
                  }}
                >
                  <FileSpreadsheet size={14} />
                  Export Excel
                </button>
              </div>
            </div>

            {/* Main Table based on Report Type */}
            <div style={{ overflowX: 'auto', maxHeight: '600px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{
                    backgroundColor: '#2e6f40',
                    color: '#fff',
                    position: 'sticky',
                    top: 0,
                    zIndex: 5,
                    borderBottom: '2px solid #1e5a2f'
                  }}>
                    {reportType === 'Customer Wise Summary' && (
                      <>
                        <th style={{ padding: '10px 8px', textAlign: 'center', width: '40px' }}>SL</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left' }}>Cust Code</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left' }}>Customer Name</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left' }}>Mobile</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left' }}>Customer Type</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center' }}>Total Invoices</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center' }}>Total Qty</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right' }}>Gross Amount</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right' }}>Discount Amt</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right' }}>VAT Amount</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right' }}>Net Amount</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right' }}>Paid Amount</th>
                      </>
                    )}

                    {reportType === 'Customer Wise Invoice Summary' && (
                      <>
                        <th style={{ padding: '10px 8px', textAlign: 'center', width: '40px' }}>SL</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left' }}>Invoice No</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left' }}>Date</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left' }}>Store</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left' }}>Customer Name</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left' }}>Mobile</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left' }}>Type</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left' }}>Employee</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center' }}>Qty</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right' }}>Gross Amt</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right' }}>Disc Amt</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right' }}>VAT Amt</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right' }}>Net Amount</th>
                      </>
                    )}

                    {reportType === 'Customer Wise Invoice Details' && (
                      <>
                        <th style={{ padding: '10px 8px', textAlign: 'center', width: '40px' }}>SL</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left' }}>Invoice No</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left' }}>Date</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left' }}>Customer Name</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left' }}>Mobile</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left' }}>Barcode</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left' }}>Product Name</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center' }}>Qty</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right' }}>Unit Price</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right' }}>Disc Amt</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right' }}>VAT Amt</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right' }}>Total Value</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={14} style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                        No records match the current filter or search criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row, idx) => {
                      const absoluteIndex = (currentPage - 1) * rowsPerPage + idx + 1;
                      return (
                        <tr
                          key={row.id + '-' + idx}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            backgroundColor: idx % 2 === 0 ? '#fff' : '#f8fafc',
                            transition: 'background-color 0.15s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0fdf4'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#fff' : '#f8fafc'}
                        >
                          <td style={{ padding: '9px 8px', textAlign: 'center', color: '#64748b' }}>{absoluteIndex}</td>

                          {reportType === 'Customer Wise Summary' && (
                            <>
                              <td style={{ padding: '9px 8px', fontWeight: 600, color: '#0284c7' }}>{row.customerCode}</td>
                              <td style={{ padding: '9px 8px', fontWeight: 600, color: '#1e293b' }}>{row.customerName}</td>
                              <td style={{ padding: '9px 8px', color: '#475569' }}>{row.mobile}</td>
                              <td style={{ padding: '9px 8px', color: '#334155' }}>
                                <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, backgroundColor: '#f1f5f9', color: '#334155' }}>
                                  {row.customerType}
                                </span>
                              </td>
                              <td style={{ padding: '9px 8px', textAlign: 'center', fontWeight: 600, color: '#0284c7' }}>{row.totalInvoices}</td>
                              <td style={{ padding: '9px 8px', textAlign: 'center', color: '#1e293b' }}>{row.totalQty}</td>
                              <td style={{ padding: '9px 8px', textAlign: 'right', color: '#475569' }}>{Number(row.grossAmount).toFixed(2)}</td>
                              <td style={{ padding: '9px 8px', textAlign: 'right', color: '#dc2626', fontWeight: 500 }}>{Number(row.discountAmount).toFixed(2)}</td>
                              <td style={{ padding: '9px 8px', textAlign: 'right', color: '#475569' }}>{Number(row.vatAmount).toFixed(2)}</td>
                              <td style={{ padding: '9px 8px', textAlign: 'right', fontWeight: 700, color: '#166534' }}>{Number(row.netAmount).toFixed(2)}</td>
                              <td style={{ padding: '9px 8px', textAlign: 'right', color: '#0284c7' }}>{Number(row.paidAmount).toFixed(2)}</td>
                            </>
                          )}

                          {reportType === 'Customer Wise Invoice Summary' && (
                            <>
                              <td style={{ padding: '9px 8px', fontWeight: 600, color: '#0284c7' }}>{row.invoiceNo}</td>
                              <td style={{ padding: '9px 8px', color: '#475569', whiteSpace: 'nowrap' }}>{row.date}</td>
                              <td style={{ padding: '9px 8px', color: '#475569' }}>{row.store}</td>
                              <td style={{ padding: '9px 8px', fontWeight: 600, color: '#1e293b' }}>{row.customerName}</td>
                              <td style={{ padding: '9px 8px', color: '#475569' }}>{row.mobile}</td>
                              <td style={{ padding: '9px 8px', color: '#334155' }}>
                                <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, backgroundColor: '#f1f5f9', color: '#334155' }}>
                                  {row.customerType}
                                </span>
                              </td>
                              <td style={{ padding: '9px 8px', color: '#475569' }}>{row.employee}</td>
                              <td style={{ padding: '9px 8px', textAlign: 'center', color: '#1e293b' }}>{row.totalQty}</td>
                              <td style={{ padding: '9px 8px', textAlign: 'right', color: '#475569' }}>{Number(row.grossAmount).toFixed(2)}</td>
                              <td style={{ padding: '9px 8px', textAlign: 'right', color: '#dc2626', fontWeight: 500 }}>{Number(row.discountAmount).toFixed(2)}</td>
                              <td style={{ padding: '9px 8px', textAlign: 'right', color: '#475569' }}>{Number(row.vatAmount).toFixed(2)}</td>
                              <td style={{ padding: '9px 8px', textAlign: 'right', fontWeight: 700, color: '#166534' }}>{Number(row.netAmount).toFixed(2)}</td>
                            </>
                          )}

                          {reportType === 'Customer Wise Invoice Details' && (
                            <>
                              <td style={{ padding: '9px 8px', fontWeight: 600, color: '#0284c7' }}>{row.invoiceNo}</td>
                              <td style={{ padding: '9px 8px', color: '#475569', whiteSpace: 'nowrap' }}>{row.date}</td>
                              <td style={{ padding: '9px 8px', fontWeight: 600, color: '#1e293b' }}>{row.customerName}</td>
                              <td style={{ padding: '9px 8px', color: '#475569' }}>{row.mobile}</td>
                              <td style={{ padding: '9px 8px', fontFamily: 'monospace', color: '#0f172a' }}>{row.barcode}</td>
                              <td style={{ padding: '9px 8px', fontWeight: 500, color: '#0f172a' }}>{row.productName}</td>
                              <td style={{ padding: '9px 8px', textAlign: 'center', color: '#1e293b' }}>{row.qty}</td>
                              <td style={{ padding: '9px 8px', textAlign: 'right', color: '#475569' }}>{Number(row.unitPrice).toFixed(2)}</td>
                              <td style={{ padding: '9px 8px', textAlign: 'right', color: '#dc2626', fontWeight: 500 }}>{Number(row.discountAmount).toFixed(2)}</td>
                              <td style={{ padding: '9px 8px', textAlign: 'right', color: '#475569' }}>{Number(row.vatAmount).toFixed(2)}</td>
                              <td style={{ padding: '9px 8px', textAlign: 'right', fontWeight: 700, color: '#166534' }}>{Number(row.totalValue).toFixed(2)}</td>
                            </>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* Summary / Total Footer Row */}
                {displayRows.length > 0 && (
                  <tfoot style={{ position: 'sticky', bottom: 0, zIndex: 4, backgroundColor: '#f0fdf4', borderTop: '2px solid #86efac' }}>
                    <tr style={{ fontWeight: 700, color: '#14532d' }}>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>Total</td>

                      {reportType === 'Customer Wise Summary' && (
                        <>
                          <td colSpan={4} style={{ padding: '10px 10px' }}>
                            {displayRows.length} Customer(s)
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                            {displayRows.reduce((a, b) => a + Number(b.totalInvoices || 0), 0)}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                            {displayRows.reduce((a, b) => a + Number(b.totalQty || 0), 0)}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                            {displayRows.reduce((a, b) => a + Number(b.grossAmount || 0), 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                            {displayRows.reduce((a, b) => a + Number(b.discountAmount || 0), 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                            {displayRows.reduce((a, b) => a + Number(b.vatAmount || 0), 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                            {displayRows.reduce((a, b) => a + Number(b.netAmount || 0), 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                            {displayRows.reduce((a, b) => a + Number(b.paidAmount || 0), 0).toFixed(2)}
                          </td>
                        </>
                      )}

                      {reportType === 'Customer Wise Invoice Summary' && (
                        <>
                          <td colSpan={7} style={{ padding: '10px 10px' }}>
                            {displayRows.length} Invoice(s)
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                            {displayRows.reduce((a, b) => a + Number(b.totalQty || 0), 0)}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                            {displayRows.reduce((a, b) => a + Number(b.grossAmount || 0), 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                            {displayRows.reduce((a, b) => a + Number(b.discountAmount || 0), 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                            {displayRows.reduce((a, b) => a + Number(b.vatAmount || 0), 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                            {displayRows.reduce((a, b) => a + Number(b.netAmount || 0), 0).toFixed(2)}
                          </td>
                        </>
                      )}

                      {reportType === 'Customer Wise Invoice Details' && (
                        <>
                          <td colSpan={6} style={{ padding: '10px 10px' }}>
                            {displayRows.length} Item Row(s)
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                            {displayRows.reduce((a, b) => a + Number(b.qty || 0), 0)}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'right' }}>-</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                            {displayRows.reduce((a, b) => a + Number(b.discountAmount || 0), 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                            {displayRows.reduce((a, b) => a + Number(b.vatAmount || 0), 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                            {displayRows.reduce((a, b) => a + Number(b.totalValue || 0), 0).toFixed(2)}
                          </td>
                        </>
                      )}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Pagination Controls */}
            <div style={{
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid #e2e8f0',
              backgroundColor: '#fff'
            }}>
              <div style={{ fontSize: '13px', color: '#64748b' }}>
                Showing {displayRows.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0} to {Math.min(currentPage * rowsPerPage, displayRows.length)} of {displayRows.length} entries
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: currentPage === 1 ? '#f1f5f9' : '#fff',
                    color: currentPage === 1 ? '#94a3b8' : '#334155',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '12.5px'
                  }}
                >
                  Previous
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '4px',
                      border: '1px solid',
                      borderColor: currentPage === pageNum ? '#2e6f40' : '#cbd5e1',
                      backgroundColor: currentPage === pageNum ? '#2e6f40' : '#fff',
                      color: currentPage === pageNum ? '#fff' : '#334155',
                      fontWeight: currentPage === pageNum ? 700 : 400,
                      cursor: 'pointer',
                      fontSize: '12.5px'
                    }}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: currentPage === totalPages || totalPages === 0 ? '#f1f5f9' : '#fff',
                    color: currentPage === totalPages || totalPages === 0 ? '#94a3b8' : '#334155',
                    cursor: currentPage === totalPages || totalPages === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '12.5px'
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerSummaryReport;
