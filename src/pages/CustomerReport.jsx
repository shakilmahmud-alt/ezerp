import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const CustomerReport = () => {
  // Form States
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [dateOfEnrollment, setDateOfEnrollment] = useState(false);
  const [status, setStatus] = useState('Active');
  
  const [customerTypes, setCustomerTypes] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  
  const [store, setStore] = useState('-- ALL --');
  const [exportFormat, setExportFormat] = useState('PDF');
  const [isLoading, setIsLoading] = useState(false);

  const typeDropdownRef = useRef(null);

  useEffect(() => {
    // Set default dates (1st of month to today)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    setFromDate(firstDay.toISOString().split('T')[0]);
    setToDate(today.toISOString().split('T')[0]);

    fetchCustomerTypes();

    // Close dropdown on outside click
    const handleClickOutside = (event) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target)) {
        setShowTypeDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchCustomerTypes = async () => {
    try {
      const { data, error } = await supabase.from('customer_types').select('*').order('name');
      if (error) throw error;
      setCustomerTypes(data || []);
      // Initially select all
      setSelectedTypes(data.map(t => t.id));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load customer types');
    }
  };

  const handleTypeToggle = (id) => {
    setSelectedTypes(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleShow = async () => {
    setIsLoading(true);
    try {
      // Build Query
      let query = supabase
        .from('customers')
        .select(`
          *,
          customer_type:customer_types(id, name)
        `);

      // Status filter
      if (status === 'Active') query = query.eq('inactive', false);
      else if (status === 'Inactive') query = query.eq('inactive', true);

      // Store filter
      if (store !== '-- ALL --') {
        query = query.eq('store', store);
      }

      // Customer Type filter
      if (selectedTypes.length > 0) {
        query = query.in('customer_type_id', selectedTypes);
      } else {
        toast.error('Please select at least one customer type.');
        setIsLoading(false);
        return;
      }

      // Date filter
      const dateField = dateOfEnrollment ? 'enrollment_date' : 'created_at';
      if (fromDate) {
        query = query.gte(dateField, dateOfEnrollment ? fromDate : `${fromDate}T00:00:00.000Z`);
      }
      if (toDate) {
        query = query.lte(dateField, dateOfEnrollment ? toDate : `${toDate}T23:59:59.999Z`);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error('No records found for the selected criteria.');
        setIsLoading(false);
        return;
      }

      generateReport(data);

    } catch (err) {
      console.error(err);
      toast.error('Failed to generate report: ' + (err.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const generateReport = (data) => {
    const reportData = data.map(c => {
      const addr = c.address ? c.address + '\n' : '';
      const phone = c.contact_no ? `PHONE: ${c.contact_no}\n` : '';
      const email = c.email ? `EMAIL: ${c.email}` : '';
      
      return {
        id: c.code || '-',
        customerName: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
        address: `${addr}${phone}${email}`.trim(),
        customerPriceTag: c.customer_type?.name || '-',
        dob: c.dob || '-',
        zeroVat: c.sale_without_vat ? 'Y' : 'N',
        creditLimit: parseFloat(c.credit_limit || 0).toFixed(2),
        discountPercent: `${parseFloat(c.discount_percent || 0).toFixed(2)}%`,
        earnPoint: '0.00',
        redeemedPoint: '0.00',
        balancePoint: '0.00'
      };
    });

    const sumEarn = 0;
    const sumRedeemed = 0;
    const sumBalance = 0;

    const selectedTypeNames = customerTypes
      .filter(t => selectedTypes.includes(t.id))
      .map(t => t.name)
      .join(', ');

    if (exportFormat === 'PDF') {
      generatePDF(reportData, selectedTypeNames, sumEarn, sumRedeemed, sumBalance);
    } else {
      generateExcel(reportData, selectedTypeNames, sumEarn, sumRedeemed, sumBalance);
    }
  };

  const generatePDF = (data, selectedTypeNames, sumEarn, sumRedeemed, sumBalance) => {
    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.width;

    // Header Texts
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('EZ ERP', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text('CUSTOMER REPORT', pageWidth / 2, 22, { align: 'center' });
    doc.text(`CUSTOMER TYPE: ${selectedTypeNames}`, pageWidth / 2, 28, { align: 'center' });
    doc.text(`STORE: ${store.replace('-- ALL --', 'ALL')}`, pageWidth / 2, 34, { align: 'center' });
    
    const fromStr = new Date(fromDate).toLocaleDateString('en-US');
    const toStr = new Date(toDate).toLocaleDateString('en-US');
    doc.text(`FROM ${fromStr} TO ${toStr}`, pageWidth / 2, 40, { align: 'center' });

    doc.setFontSize(8);
    const now = new Date();
    const printTime = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();
    doc.text(`PRINT ON: ${printTime}`, pageWidth - 14, 48, { align: 'right' });

    // Table Data
    const tableHeaders = [
      'ID', 'Customer Name', 'Address', 'Customer Price\nTAG', 'DATE OF\nBIRTH', 
      'Zero\nVAT sale', 'CREDIT\nLIMIT', 'DISCOUNT\nPERCENT', 'EARN\nPOINT', 
      'REDEEMED\nPOINT', 'BALANCE\nPOINT'
    ];

    const tableBody = data.map(row => [
      row.id,
      row.customerName,
      row.address,
      row.customerPriceTag,
      row.dob,
      row.zeroVat,
      row.creditLimit,
      row.discountPercent,
      row.earnPoint,
      row.redeemedPoint,
      row.balancePoint
    ]);

    // Footer row
    tableBody.push([
      { content: `TOTAL(${selectedTypeNames})`, colSpan: 2, styles: { fontStyle: 'bold' } },
      { content: data.length.toString(), styles: { fontStyle: 'bold' } },
      '', '', '', '', '',
      { content: sumEarn.toFixed(2), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: sumRedeemed.toFixed(2), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: sumBalance.toFixed(2), styles: { fontStyle: 'bold', halign: 'right' } }
    ]);

    autoTable(doc, {
      startY: 50,
      head: [tableHeaders],
      body: tableBody,
      theme: 'plain',
      styles: {
        fontSize: 7,
        cellPadding: 1,
        lineWidth: 0.1,
        lineColor: [200, 200, 200],
      },
      headStyles: {
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        lineWidth: 0.1,
        lineColor: [0, 0, 0]
      },
      columnStyles: {
        2: { cellWidth: 50 }, // Make address column wider for newlines
        6: { halign: 'right' },
        7: { halign: 'right' },
        8: { halign: 'right' },
        9: { halign: 'right' },
        10: { halign: 'right' }
      },
      didDrawPage: (data) => {
        const str = `Page ${doc.internal.getNumberOfPages()}`;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('SYSTEM BY: EZ ERP', data.settings.margin.left, doc.internal.pageSize.height - 10);
        doc.text(str, doc.internal.pageSize.width - data.settings.margin.right, doc.internal.pageSize.height - 10, { align: 'right' });
      }
    });

    doc.save('Customer_Report.pdf');
  };

  const generateExcel = (data, selectedTypeNames, sumEarn, sumRedeemed, sumBalance) => {
    const wsData = [];
    
    // Header rows
    wsData.push(['EZ ERP']);
    wsData.push(['CUSTOMER REPORT']);
    wsData.push([`CUSTOMER TYPE: ${selectedTypeNames}`]);
    wsData.push([`STORE: ${store.replace('-- ALL --', 'ALL')}`]);
    
    const fromStr = new Date(fromDate).toLocaleDateString('en-US');
    const toStr = new Date(toDate).toLocaleDateString('en-US');
    wsData.push([`FROM ${fromStr} TO ${toStr}`]);
    
    const now = new Date();
    const printTime = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();
    wsData.push(['', '', '', '', '', '', '', '', '', `PRINT ON: ${printTime}`]);
    
    wsData.push([]); // Empty row

    // Table Headers
    const headers = [
      'ID', 'Customer Name', 'Address', 'Customer Price TAG', 'DATE OF BIRTH', 
      'Zero VAT sale', 'CREDIT LIMIT', 'DISCOUNT PERCENT', 'EARN POINT', 
      'REDEEMED POINT', 'BALANCE POINT'
    ];
    wsData.push(headers);

    // Table Body
    data.forEach(row => {
      wsData.push([
        row.id,
        row.customerName,
        row.address,
        row.customerPriceTag,
        row.dob,
        row.zeroVat,
        row.creditLimit,
        row.discountPercent,
        row.earnPoint,
        row.redeemedPoint,
        row.balancePoint
      ]);
    });

    // Totals
    wsData.push([
      `TOTAL(${selectedTypeNames})`, '', data.length.toString(), '', '', '', '', '',
      sumEarn.toFixed(2), sumRedeemed.toFixed(2), sumBalance.toFixed(2)
    ]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customer Report");

    XLSX.writeFile(wb, 'Customer_Report.xlsx');
  };

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color)', minHeight: '100vh' }}>
      <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
        
        <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>Customer List</h2>
        </div>

        <div style={{ padding: '20px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', alignItems: 'start' }}>
            
            {/* From Date */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px', color: 'var(--text-primary)' }}>From</label>
              <input 
                type="date" 
                value={fromDate} 
                onChange={(e) => setFromDate(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', border: 'none', borderBottom: '1px dashed var(--border-color)', outline: 'none', backgroundColor: 'transparent', color: 'var(--text-primary)' }}
              />
            </div>

            {/* To Date */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px', color: 'var(--text-primary)' }}>TO</label>
              <input 
                type="date" 
                value={toDate} 
                onChange={(e) => setToDate(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', border: 'none', borderBottom: '1px dashed var(--border-color)', outline: 'none', backgroundColor: 'transparent', color: 'var(--text-primary)' }}
              />
            </div>

            {/* Date of Enrollment Checkbox */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                <input 
                  type="checkbox" 
                  checked={dateOfEnrollment}
                  onChange={(e) => setDateOfEnrollment(e.target.checked)}
                />
                Date Of Enrollment
              </label>
            </div>

            {/* Status */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px', color: 'var(--text-primary)' }}>Status</label>
              <select 
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', border: 'none', borderBottom: '1px dashed var(--border-color)', outline: 'none', backgroundColor: 'transparent', color: 'var(--text-primary)' }}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="ALL">ALL</option>
              </select>
            </div>

            {/* Customer Type Dropdown */}
            <div ref={typeDropdownRef} style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px', color: 'var(--text-primary)' }}>Customer Type</label>
              <div 
                onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                style={{ 
                  width: '100%', padding: '6px 10px', border: '1px solid var(--border-color)', borderRadius: '4px',
                  backgroundColor: 'var(--bg-color)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  color: 'var(--text-primary)', fontSize: '13px'
                }}
              >
                {selectedTypes.length} checked
                <span style={{ fontSize: '10px' }}>▼</span>
              </div>
              {showTypeDropdown && (
                <div style={{ 
                  position: 'absolute', top: '100%', left: 0, width: '100%', backgroundColor: 'var(--card-bg)', 
                  border: '1px solid var(--border-color)', zIndex: 10, maxHeight: '200px', overflowY: 'auto',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)', padding: '5px'
                }}>
                  {customerTypes.map(ct => (
                    <label key={ct.id} style={{ display: 'block', padding: '5px 10px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedTypes.includes(ct.id)} 
                        onChange={() => handleTypeToggle(ct.id)}
                        style={{ marginRight: '8px' }}
                      />
                      {ct.name}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Store */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px', color: 'var(--text-primary)' }}>Store</label>
              <select 
                value={store}
                onChange={(e) => setStore(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', border: 'none', borderBottom: '1px dashed var(--border-color)', outline: 'none', backgroundColor: 'transparent', color: 'var(--text-primary)' }}
              >
                <option value="-- ALL --">-- ALL --</option>
                <option value="Central Store">Central Store</option>
                <option value="Shop">Shop</option>
              </select>
            </div>

          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '30px' }}>
            
            {/* Format Radios */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)' }}>
                <input 
                  type="radio" 
                  name="format" 
                  checked={exportFormat === 'PDF'} 
                  onChange={() => setExportFormat('PDF')} 
                  style={{ accentColor: 'var(--accent-primary)' }}
                />
                PDF
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)' }}>
                <input 
                  type="radio" 
                  name="format" 
                  checked={exportFormat === 'Excel'} 
                  onChange={() => setExportFormat('Excel')} 
                  style={{ accentColor: 'var(--accent-primary)' }}
                />
                Excel
              </label>
            </div>

            {/* Show Button */}
            <button 
              onClick={handleShow} 
              disabled={isLoading}
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: '#fff',
                padding: '8px 30px',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              {isLoading ? 'Loading...' : 'Show'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CustomerReport;
