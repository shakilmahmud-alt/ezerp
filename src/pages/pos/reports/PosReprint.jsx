import React, { useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { Search, Printer, RotateCcw, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const PosReprint = () => {
  const { posTerminal, user } = useAuth();
  const [invoiceNoInput, setInvoiceNoInput] = useState('');
  const [reprintReason, setReprintReason] = useState('Customer Request');
  const [foundSale, setFoundSale] = useState(null);
  const [saleItems, setSaleItems] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearchInvoice = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!invoiceNoInput.trim()) {
      toast.error('Please enter an invoice number');
      return;
    }

    setIsSearching(true);
    setFoundSale(null);
    setSaleItems([]);

    try {
      const { data: saleData, error } = await supabase
        .from('sales')
        .select('*')
        .eq('invoice_no', invoiceNoInput.trim())
        .single();

      if (error || !saleData) {
        toast.error('Invoice not found');
        setIsSearching(false);
        return;
      }

      setFoundSale(saleData);

      const { data: items } = await supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', saleData.id);

      setSaleItems(items || []);
      toast.success('Invoice found!');

    } catch (err) {
      console.error(err);
      toast.error('Error searching invoice');
    } finally {
      setIsSearching(false);
    }
  };

  const handleExecuteReprint = async () => {
    if (!foundSale) return;

    // Log reprint event
    try {
      await supabase.from('reprint_logs').insert([{
        invoice_no: foundSale.invoice_no,
        reprinted_by: user?.email || user?.id || 'Cashier',
        store_id: posTerminal?.store_id,
        reason: reprintReason,
        printed_at: new Date().toISOString()
      }]);
    } catch (err) {
      console.warn("Reprint log insert warning:", err);
    }

    // Print Receipt
    const doc = new jsPDF({ unit: 'mm', format: [80, 200] });
    doc.setFontSize(12);
    doc.text(posTerminal?.store_name || foundSale.shop_name || 'EZ ERP STORE', 40, 10, { align: 'center' });
    doc.setFontSize(8);
    doc.text('*** REPRINTED INVOICE ***', 40, 15, { align: 'center' });
    doc.text(`Invoice #: ${foundSale.invoice_no}`, 5, 22);
    doc.text(`Original Date: ${foundSale.created_at ? foundSale.created_at.slice(0, 16).replace('T', ' ') : ''}`, 5, 27);
    doc.text(`Customer: ${foundSale.customer_name || 'Walk-in'}`, 5, 32);

    const tableCols = ['Item', 'Qty', 'Price', 'Total'];
    const tableRows = saleItems.map(i => [
      (i.product_name || 'Item').slice(0, 15),
      i.qty || 1,
      Number(i.unit_price || 0).toFixed(0),
      Number(i.line_total || i.total_price || 0).toFixed(0)
    ]);

    autoTable(doc, {
      head: [tableCols],
      body: tableRows,
      startY: 36,
      styles: { fontSize: 7 }
    });

    const finalY = doc.lastAutoTable.finalY || 55;
    doc.text(`Net Amount: Tk ${Number(foundSale.net_amount || foundSale.net_payable || 0).toFixed(2)}`, 75, finalY + 5, { align: 'right' });
    doc.save(`Reprint_${foundSale.invoice_no}.pdf`);
    toast.success('Reprint receipt downloaded & logged!');
  };

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: '#f8fafc', minHeight: '100vh', fontSize: '13px' }}>
      <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', margin: '0 0 20px 0', color: '#1e293b' }}>
        POS Invoice Reprint
      </h2>

      <div className="glass-panel" style={{ padding: '25px', maxWidth: '600px', marginBottom: '20px' }}>
        <form onSubmit={handleSearchInvoice} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '15px' }}>
          <input 
            type="text" 
            placeholder="Enter Invoice Number (e.g. INV07000...)" 
            value={invoiceNoInput} 
            onChange={(e) => setInvoiceNoInput(e.target.value)}
            style={{ flex: 1, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }}
          />
          <button type="submit" className="btn-theme" disabled={isSearching} style={{ padding: '8px 18px' }}>
            <Search size={14} /> {isSearching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {foundSale && (
          <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
              <div><b>Invoice No:</b> {foundSale.invoice_no}</div>
              <div><b>Net Amount:</b> Tk {Number(foundSale.net_amount || foundSale.net_payable || 0).toFixed(2)}</div>
              <div><b>Customer:</b> {foundSale.customer_name || 'Walk-in'}</div>
              <div><b>Payment:</b> {foundSale.payment_type || 'Cash'}</div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>Reprint Reason</label>
              <input 
                type="text" 
                value={reprintReason} 
                onChange={(e) => setReprintReason(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              />
            </div>

            <button className="btn-theme" onClick={handleExecuteReprint} style={{ width: '100%', padding: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
              <Printer size={16} /> Reprint Invoice Receipt PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PosReprint;
