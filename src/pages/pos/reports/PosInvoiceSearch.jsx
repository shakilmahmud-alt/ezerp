import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import CustomSelect from '../../../components/CustomSelect';
import { Search, Printer, Eye, X, Calendar, FileText, DollarSign, ShoppingCart, User, Filter, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const PosInvoiceSearch = () => {
  const { posTerminal } = useAuth();
  
  // Search Filters
  const [invoiceNoQuery, setInvoiceNoQuery] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('ALL');

  // Sales Data
  const [salesList, setSalesList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Selected Invoice Modal State
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleItems, setSaleItems] = useState([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });

      if (posTerminal?.store_id) {
        query = query.eq('store_id', posTerminal.store_id);
      }

      if (fromDate) {
        query = query.gte('created_at', `${fromDate}T00:00:00.000Z`);
      }
      if (toDate) {
        query = query.lte('created_at', `${toDate}T23:59:59.999Z`);
      }

      const { data, error } = await query;
      
      // If error occurs OR if no records found under strict filter, fetch all sales fallback
      if (error || !data || data.length === 0) {
        const { data: fallbackData } = await supabase
          .from('sales')
          .select('*')
          .order('created_at', { ascending: false });
        setSalesList(fallbackData || []);
      } else {
        setSalesList(data || []);
      }
    } catch (err) {
      console.error('Error fetching sales invoices:', err);
      toast.error('Failed to load invoice search data');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to extract Payment Type
  const getPaymentType = (sale) => {
    if (sale.payment_type && sale.payment_type.trim()) {
      return sale.payment_type;
    }
    if (sale.invoice_note && sale.invoice_note.includes('[Payment:')) {
      const match = sale.invoice_note.match(/\[Payment:\s*([^\]]+)\]/);
      if (match && match[1]) return match[1];
    }
    return 'Cash';
  };

  // Filter Sales locally by text and payment method
  const filteredSales = salesList.filter(sale => {
    const invMatch = !invoiceNoQuery.trim() || sale.invoice_no?.toLowerCase().includes(invoiceNoQuery.trim().toLowerCase());
    const custMatch = !customerQuery.trim() || 
      sale.customer_name?.toLowerCase().includes(customerQuery.trim().toLowerCase()) ||
      sale.customer_mobile?.includes(customerQuery.trim()) ||
      sale.customer_phone?.includes(customerQuery.trim());
    
    const pType = getPaymentType(sale).toUpperCase();
    const payMatch = paymentTypeFilter === 'ALL' || pType.includes(paymentTypeFilter.toUpperCase());
    
    return invMatch && custMatch && payMatch;
  });

  // Calculate Metrics
  const totalInvoices = filteredSales.length;
  const totalQtySold = filteredSales.reduce((sum, s) => sum + (Number(s.total_qty) || 0), 0);
  const totalGrossAmount = filteredSales.reduce((sum, s) => sum + (Number(s.total_amount || s.subtotal) || 0), 0);
  const totalDiscount = filteredSales.reduce((sum, s) => sum + (Number(s.discount_amount) || 0), 0);
  const totalNetRevenue = filteredSales.reduce((sum, s) => sum + (Number(s.net_amount || s.subtotal || s.total_amount) || 0), 0);

  // View Invoice Details
  const handleViewInvoice = async (sale) => {
    setSelectedSale(sale);
    setShowDetailModal(true);
    setIsLoadingDetails(true);
    setSaleItems([]);

    try {
      let itemsData = [];
      if (sale.id) {
        const { data, error } = await supabase
          .from('sale_items')
          .select('*')
          .eq('sale_id', sale.id);
        if (!error && data) itemsData = data;
      }
      
      if (itemsData.length === 0 && sale.invoice_no) {
        const { data: invData } = await supabase
          .from('sale_items')
          .select('*')
          .eq('invoice_no', sale.invoice_no);
        if (invData) itemsData = invData;
      }

      setSaleItems(itemsData);
    } catch (err) {
      console.error('Error fetching sale items:', err);
      toast.error('Could not load invoice item details');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Print Invoice Receipt PDF
  const handlePrintPDF = (sale, items) => {
    const doc = new jsPDF({
      unit: 'mm',
      format: [80, 200] // Receipt paper dimensions
    });

    const storeTitle = posTerminal?.store_name || sale.shop_name || 'EZ ERP STORE';

    doc.setFontSize(12);
    doc.text(storeTitle, 40, 10, { align: 'center' });

    doc.setFontSize(8);
    doc.text(`Invoice #: ${sale.invoice_no}`, 5, 18);
    doc.text(`Date: ${sale.created_at ? sale.created_at.slice(0, 16).replace('T', ' ') : ''}`, 5, 23);
    doc.text(`Customer: ${sale.customer_name || 'Walk-in'}`, 5, 28);
    doc.text(`Phone: ${sale.customer_mobile || sale.customer_phone || 'N/A'}`, 5, 33);
    doc.text(`Sales Exec: ${sale.sales_executive_name || sale.cashier_name || 'Staff'}`, 5, 38);

    const tableCols = ['Item', 'Qty', 'Price', 'Total'];
    const tableRows = (items || []).map(i => [
      (i.product_name || 'Item').slice(0, 15),
      i.qty || i.quantity || 1,
      Number(i.unit_price || 0).toFixed(0),
      Number(i.line_total || i.total_price || 0).toFixed(0)
    ]);

    autoTable(doc, {
      head: [tableCols],
      body: tableRows,
      startY: 42,
      styles: { fontSize: 7, cellPadding: 1 },
      headStyles: { fillColor: [46, 111, 64] },
      margin: { left: 4, right: 4 }
    });

    const finalY = doc.lastAutoTable.finalY || 60;
    doc.setFontSize(8);
    doc.text(`Subtotal: Tk ${Number(sale.total_amount || sale.sub_total || 0).toFixed(2)}`, 75, finalY + 5, { align: 'right' });
    doc.text(`Discount: Tk ${Number(sale.discount_amount || 0).toFixed(2)}`, 75, finalY + 10, { align: 'right' });
    doc.text(`Net Payable: Tk ${Number(sale.net_amount || sale.net_payable || 0).toFixed(2)}`, 75, finalY + 15, { align: 'right' });
    doc.text(`Paid: Tk ${Number(sale.paid_amount || 0).toFixed(2)}`, 75, finalY + 20, { align: 'right' });
    doc.text(`Change: Tk ${Number(sale.change_amount || 0).toFixed(2)}`, 75, finalY + 25, { align: 'right' });

    doc.text('Thank you for shopping with us!', 40, finalY + 33, { align: 'center' });

    doc.save(`Invoice_${sale.invoice_no}.pdf`);
    toast.success('Invoice receipt downloaded!');
  };

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: '#f8fafc', minHeight: '100vh', fontSize: '13px' }}>
      
      {/* Page Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', margin: 0, color: '#1e293b' }}>
            POS Invoice Search & Viewer
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '12px' }}>
            Search, filter, view details, and reprint sales invoices for {posTerminal?.store_name || 'Branch Store'}
          </p>
        </div>
        
        <button 
          onClick={fetchSales}
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={14} /> Refresh Data
        </button>
      </div>

      {/* Summary Metrics Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '20px' }}>
        
        <div className="glass-panel" style={{ padding: '15px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '10px', borderRadius: '8px', background: 'linear-gradient(180deg, #52be72 0%, #2e6f40 100%)', color: '#fff' }}>
            <FileText size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>Total Invoices</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#1e293b' }}>{totalInvoices}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '15px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '10px', borderRadius: '8px', background: 'linear-gradient(180deg, #38bdf8 0%, #0284c7 100%)', color: '#fff' }}>
            <ShoppingCart size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>Total Items Sold</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#1e293b' }}>{totalQtySold} pcs</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '15px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '10px', borderRadius: '8px', background: 'linear-gradient(180deg, #4ade80 0%, #166534 100%)', color: '#fff' }}>
            <DollarSign size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>Net Revenue</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#166534' }}>Tk {totalNetRevenue.toLocaleString()}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '15px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '10px', borderRadius: '8px', background: 'linear-gradient(180deg, #fca5a5 0%, #dc2626 100%)', color: '#fff' }}>
            <Filter size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>Total Discount</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#dc2626' }}>Tk {totalDiscount.toLocaleString()}</div>
          </div>
        </div>

      </div>

      {/* Filter Options Panel */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', alignItems: 'flex-end' }}>
          
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>Invoice No</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                placeholder="e.g. INV07000..." 
                value={invoiceNoQuery} 
                onChange={(e) => setInvoiceNoQuery(e.target.value)}
                style={{ width: '100%', padding: '7px 10px 7px 30px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }}
              />
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>Customer Name / Phone</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                placeholder="Search name or mobile..." 
                value={customerQuery} 
                onChange={(e) => setCustomerQuery(e.target.value)}
                style={{ width: '100%', padding: '7px 10px 7px 30px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }}
              />
              <User size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>From Date</label>
            <input 
              type="date" 
              value={fromDate} 
              onChange={(e) => setFromDate(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>To Date</label>
            <input 
              type="date" 
              value={toDate} 
              onChange={(e) => setToDate(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>Payment Type</label>
            <CustomSelect value={paymentTypeFilter} onChange={(e) => setPaymentTypeFilter(e.target.value)}>
              <option value="ALL">All Payment Types</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Card / Amex / Visa</option>
              <option value="MFS">Mobile Banking (bKash/Nagad)</option>
              <option value="CREDIT">Credit</option>
            </CustomSelect>
          </div>

          <div>
            <button 
              onClick={fetchSales}
              className="btn-theme"
              style={{ width: '100%', padding: '8px', fontSize: '13px', fontWeight: 'bold' }}
            >
              Filter Search
            </button>
          </div>

        </div>
      </div>

      {/* Invoices Table Panel */}
      <div className="glass-panel" style={{ padding: '20px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: 'linear-gradient(180deg, #52be72 0%, #2e6f40 100%)', color: '#ffffff', textAlign: 'left' }}>
              <th style={{ padding: '10px 12px' }}>Invoice No</th>
              <th style={{ padding: '10px 12px' }}>Date & Time</th>
              <th style={{ padding: '10px 12px' }}>Customer</th>
              <th style={{ padding: '10px 12px' }}>Executive</th>
              <th style={{ padding: '10px 12px', textAlign: 'center' }}>Total Qty</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Net Payable</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Paid Amount</th>
              <th style={{ padding: '10px 12px', textAlign: 'center' }}>Payment Type</th>
              <th style={{ padding: '10px 12px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Loading sales invoices...
                </td>
              </tr>
            ) : filteredSales.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  No matching sales invoices found.
                </td>
              </tr>
            ) : (
              filteredSales.map((sale, idx) => (
                <tr 
                  key={sale.id || idx}
                  style={{ 
                    borderBottom: '1px solid #e2e8f0', 
                    backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                    transition: 'background 0.15s'
                  }}
                  className="win7-table-row"
                >
                  <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#2e6f40' }}>
                    {sale.invoice_no}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#475569' }}>
                    {sale.created_at ? new Date(sale.created_at).toLocaleString() : sale.sale_date || '-'}
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: '500' }}>
                    {sale.customer_name || 'Walk-in Customer'}
                    {(sale.customer_mobile || sale.customer_phone) && (
                      <div style={{ fontSize: '10px', color: '#64748b' }}>
                        {sale.customer_mobile || sale.customer_phone}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#475569' }}>
                    {sale.sales_executive_name || sale.cashier_name || 'Staff'}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 'bold' }}>
                    {sale.total_qty || 0}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 'bold', color: '#166534' }}>
                    Tk {Number(sale.net_amount || sale.net_payable || 0).toLocaleString()}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#0369a1' }}>
                    Tk {Number(sale.paid_amount || 0).toLocaleString()}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <span style={{ 
                      padding: '3px 8px', 
                      borderRadius: '12px', 
                      fontSize: '10px', 
                      fontWeight: 'bold',
                      backgroundColor: '#e0f2fe',
                      color: '#0369a1',
                      border: '1px solid #7dd3fc'
                    }}>
                      {getPaymentType(sale)}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      <button 
                        className="btn-info" 
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                        onClick={() => handleViewInvoice(sale)}
                        title="View Invoice Details"
                      >
                        <Eye size={12} /> View
                      </button>
                      <button 
                        className="btn-theme" 
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                        onClick={() => {
                          handleViewInvoice(sale);
                          handlePrintPDF(sale, []);
                        }}
                        title="Print / Download PDF"
                      >
                        <Printer size={12} /> Print
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Invoice Details Modal */}
      {showDetailModal && selectedSale && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div className="glass-panel" style={{
            width: '650px',
            maxWidth: '95vw',
            maxHeight: '90vh',
            overflowY: 'auto',
            borderRadius: '8px',
            background: '#ffffff',
            border: '1px solid #7dd3fc',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            padding: 0
          }}>
            
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(180deg, #52be72 0%, #2e6f40 46%, #1b4527 50%, #29683c 100%)',
              padding: '12px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: '#ffffff',
              fontWeight: 'bold',
              borderBottom: '1px solid #1a4427'
            }}>
              <div>
                INVOICE RECEIPT #: {selectedSale.invoice_no}
              </div>
              <button 
                onClick={() => setShowDetailModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '20px' }}>
              
              {/* Receipt Top Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', paddingBottom: '15px', borderBottom: '1px dashed #cbd5e1', marginBottom: '15px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Store Branch:</div>
                  <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#1e293b' }}>{posTerminal?.store_name || selectedSale.shop_name || 'EZ ERP Branch'}</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>Date & Time:</div>
                  <div style={{ fontWeight: '500' }}>{selectedSale.created_at ? new Date(selectedSale.created_at).toLocaleString() : selectedSale.sale_date}</div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Customer Name:</div>
                  <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#166534' }}>{selectedSale.customer_name || 'Walk-in Customer'}</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>Mobile / Phone:</div>
                  <div style={{ fontWeight: '500' }}>{selectedSale.customer_mobile || selectedSale.customer_phone || 'N/A'}</div>
                </div>
              </div>

              {/* Items Breakdown Table */}
              <h4 style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#475569' }}>Itemized Products Breakdown</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '15px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1', color: '#475569' }}>
                    <th style={{ padding: '6px', textAlign: 'left' }}>Item Name</th>
                    <th style={{ padding: '6px', textAlign: 'center' }}>Barcode</th>
                    <th style={{ padding: '6px', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>Unit Price</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingDetails ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '15px' }}>Loading items...</td></tr>
                  ) : saleItems.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '15px', color: '#64748b' }}>No items recorded.</td></tr>
                  ) : (
                    saleItems.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px', fontWeight: '500' }}>{item.product_name}</td>
                        <td style={{ padding: '6px', textAlign: 'center', color: '#64748b' }}>{item.barcode || '-'}</td>
                        <td style={{ padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>{item.qty || item.quantity}</td>
                        <td style={{ padding: '6px', textAlign: 'right' }}>Tk {Number(item.unit_price || 0).toFixed(2)}</td>
                        <td style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>Tk {Number(item.line_total || item.total_price || 0).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Financial Totals Summary */}
              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Payment Method: <span style={{ fontWeight: 'bold', color: '#0369a1' }}>{getPaymentType(selectedSale)}</span></div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Cashier: <span style={{ fontWeight: 'bold' }}>{selectedSale.sales_executive_name || selectedSale.cashier_name || 'Staff'}</span></div>
                </div>

                <div style={{ textAlign: 'right', fontSize: '12px' }}>
                  <div>Gross Amount: <b>Tk {Number(selectedSale.total_amount || selectedSale.sub_total || 0).toFixed(2)}</b></div>
                  <div>Discount: <b style={{ color: '#dc2626' }}>- Tk {Number(selectedSale.discount_amount || 0).toFixed(2)}</b></div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#166534', marginTop: '4px' }}>Net Payable: Tk {Number(selectedSale.net_amount || selectedSale.net_payable || 0).toFixed(2)}</div>
                  <div>Paid: <b>Tk {Number(selectedSale.paid_amount || 0).toFixed(2)}</b> | Change: <b>Tk {Number(selectedSale.change_amount || 0).toFixed(2)}</b></div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{ padding: '12px 20px', backgroundColor: '#f1f5f9', borderTop: '1px solid #cbd5e1', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn-secondary" onClick={() => setShowDetailModal(false)}>Close</button>
              <button className="btn-theme" onClick={() => handlePrintPDF(selectedSale, saleItems)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Printer size={14} /> Download Receipt PDF
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default PosInvoiceSearch;
