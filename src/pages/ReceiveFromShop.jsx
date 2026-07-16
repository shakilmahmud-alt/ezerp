import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ReceiveFromShop = () => {
  const [challans, setChallans] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChallan, setSelectedChallan] = useState(null);
  const [challanItems, setChallanItems] = useState([]);
  const [isViewMode, setIsViewMode] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);

  useEffect(() => {
    fetchChallans();
  }, []);

  const fetchChallans = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('shop_transfers')
        .select(`
          id,
          challan_no,
          challan_date,
          status,
          shops ( name )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code !== '42P01') throw error;
      }
      setChallans(data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load shop challans');
    } finally {
      setIsLoading(false);
    }
  };

  const handleView = async (challan) => {
    setIsLoading(true);
    try {
      const { data: items, error } = await supabase
        .from('shop_transfer_items')
        .select('*, products(id, item_name, barcode, mrp)')
        .eq('transfer_id', challan.id);

      if (error) {
        if (error.message && error.message.includes("transfer_id")) {
          toast.error('Database setup needed. Please run the SQL script from the SQL Editor in Supabase first.');
        } else {
          throw error;
        }
        setIsLoading(false);
        return;
      }

      setSelectedChallan(challan);
      setChallanItems(items || []);
      setIsViewMode(true);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load challan items: ' + (err.message || ''));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReceive = async () => {
    if (!selectedChallan) return;
    setIsReceiving(true);
    try {
      // 1. Update wh_stock (central store) for each item
      for (const item of challanItems) {
        const qty = Number(item.qty || 0);
        if (qty <= 0) continue;

        const { data: prodData } = await supabase
          .from('products')
          .select('wh_stock')
          .eq('id', item.products?.id || item.product_id)
          .single();

        if (prodData) {
          const newWhStock = Number(prodData.wh_stock || 0) + qty;
          await supabase
            .from('products')
            .update({ wh_stock: newWhStock })
            .eq('id', item.products?.id || item.product_id);
        }
      }

      // 2. Mark challan as Received
      const { error: updateErr } = await supabase
        .from('shop_transfers')
        .update({ status: 'Received' })
        .eq('id', selectedChallan.id);

      if (updateErr) throw updateErr;

      toast.success('Stock received successfully into Central Store!');
      
      // Generate PDF
      generatePDF();

      setIsViewMode(false);
      setSelectedChallan(null);
      setChallanItems([]);
      fetchChallans();
    } catch (err) {
      console.error(err);
      toast.error('Failed to receive stock');
    } finally {
      setIsReceiving(false);
    }
  };

  const generatePDF = () => {
    if (!selectedChallan || challanItems.length === 0) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('EG ERP', pageWidth / 2, 15, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('House:352,Lane:05,2nd floor,Baridhara DOHS,', pageWidth / 2, 20, { align: 'center' });
    doc.text('Dhaka , Dhaka-1212 Bangladesh', pageWidth / 2, 24, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('RECEIVE FROM SHOP CHALLAN', pageWidth - 14, 15, { align: 'right' });
    doc.text(`CHALLAN NO # ${selectedChallan.challan_no}`, pageWidth - 14, 20, { align: 'right' });
    doc.text(`DATE: ${selectedChallan.challan_date}`, pageWidth - 14, 25, { align: 'right' });
    doc.text(`RECEIVED FROM: ${selectedChallan.shops?.name || 'Unknown'}`, pageWidth - 14, 30, { align: 'right' });

    doc.text('RECEIVE TO: Central Store', 14, 45);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`PRINT DATE: ${new Date().toLocaleString()}`, pageWidth - 14, 50, { align: 'right' });

    const tableData = challanItems.map((i, idx) => {
      const qty = Number(i.qty || 0);
      const mrp = Number(i.products?.mrp || i.mrp || 0);
      return [idx + 1, i.products?.barcode || '', i.products?.item_name || '', qty.toFixed(2), mrp.toFixed(2), (qty * mrp).toFixed(2)];
    });

    autoTable(doc, {
      startY: 55,
      head: [['S/L', 'BARCODE', 'DISPLAY_NAME', 'QTY', 'MRP', 'VALUE']],
      body: tableData,
      theme: 'plain',
      headStyles: { fontStyle: 'bold', lineWidth: { top: 0.5, bottom: 0.5 }, lineColor: [0, 0, 0], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { top: 10, left: 14, right: 14 }
    });

    const finalY = doc.lastAutoTable.finalY || 55;
    const totalQty = challanItems.reduce((s, i) => s + Number(i.qty || 0), 0);
    const totalVal = challanItems.reduce((s, i) => s + (Number(i.qty || 0) * Number(i.products?.mrp || i.mrp || 0)), 0);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.line(pageWidth / 2, finalY + 2, pageWidth - 14, finalY + 2);
    doc.text('SUB TOTAL:', pageWidth / 2, finalY + 7, { align: 'right' });
    doc.text(`${totalQty.toFixed(2)}`, pageWidth / 2 + 20, finalY + 7, { align: 'right' });
    doc.text(`${totalVal.toFixed(2)}`, pageWidth - 14, finalY + 7, { align: 'right' });
    doc.line(pageWidth / 2, finalY + 12, pageWidth - 14, finalY + 12);
    doc.text('NET AMOUNT:', pageWidth / 2, finalY + 17, { align: 'right' });
    doc.text(`${totalVal.toFixed(2)}`, pageWidth - 14, finalY + 17, { align: 'right' });

    const sigY = doc.internal.pageSize.getHeight() - 30;
    doc.setFont('helvetica', 'normal');
    doc.setLineWidth(0.5);
    doc.line(20, sigY, 70, sigY);
    doc.setFont('helvetica', 'bold');
    doc.text('Posted By', 45, sigY + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.line(pageWidth / 2 - 25, sigY, pageWidth / 2 + 25, sigY);
    doc.setFont('helvetica', 'bold');
    doc.text('Checked By', pageWidth / 2, sigY + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.line(pageWidth - 70, sigY, pageWidth - 20, sigY);
    doc.setFont('helvetica', 'bold');
    doc.text('Authorized Signatory', pageWidth - 45, sigY + 5, { align: 'center' });

    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const filteredChallans = challans.filter(c =>
    (c.challan_no && c.challan_no.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.shops?.name && c.shops?.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // --- VIEW MODE ---
  if (isViewMode && selectedChallan) {
    const totalQty = challanItems.reduce((s, i) => s + Number(i.qty || 0), 0);
    const totalVal = challanItems.reduce((s, i) => s + (Number(i.qty || 0) * Number(i.products?.mrp || i.mrp || 0)), 0);

    return (
      <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color)', minHeight: '100vh' }}>
        <div style={{ backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ backgroundColor: '#f9f9f9', padding: '15px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>
              Transfer Challan: {selectedChallan.challan_no}
            </h2>
            <button
              onClick={() => { setIsViewMode(false); setSelectedChallan(null); setChallanItems([]); }}
              style={{ padding: '6px 14px', background: '#888', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              ← Back
            </button>
          </div>

          <div style={{ padding: '20px' }}>
            {/* Info */}
            <div style={{ display: 'flex', gap: '40px', marginBottom: '20px', fontSize: '0.9rem' }}>
              <div><strong>From Shop:</strong> {selectedChallan.shops?.name}</div>
              <div><strong>Challan Date:</strong> {selectedChallan.challan_date}</div>
              <div><strong>Status:</strong> <span style={{ color: selectedChallan.status === 'Received' ? 'green' : '#e67e22', fontWeight: 'bold' }}>{selectedChallan.status}</span></div>
            </div>

            {/* Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>SL</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Barcode</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Product Name</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Qty</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>MRP</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {challanItems.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#999' }}>No items found</td></tr>
                ) : challanItems.map((item, idx) => {
                  const qty = Number(item.qty || 0);
                  const mrp = Number(item.products?.mrp || item.mrp || 0);
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '10px' }}>{idx + 1}</td>
                      <td style={{ padding: '10px' }}>{item.products?.barcode || ''}</td>
                      <td style={{ padding: '10px' }}>{item.products?.item_name || ''}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>{qty.toFixed(2)}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>{mrp.toFixed(2)}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>{(qty * mrp).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border-color)', fontWeight: 'bold' }}>
                  <td colSpan="3" style={{ padding: '10px', textAlign: 'right' }}>TOTAL:</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>{totalQty.toFixed(2)}</td>
                  <td></td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>{totalVal.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>

            {/* Actions */}
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={generatePDF}
                style={{ padding: '8px 18px', background: '#555', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Print / PDF
              </button>
              {selectedChallan.status !== 'Received' && (
                <button
                  onClick={handleReceive}
                  disabled={isReceiving}
                  style={{ padding: '8px 18px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', opacity: isReceiving ? 0.7 : 1 }}
                >
                  {isReceiving ? 'Receiving...' : 'Receive into Central Store'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- LIST MODE ---
  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color)', minHeight: '100vh' }}>
      <div style={{ backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ backgroundColor: '#f9f9f9', padding: '15px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
            Transfer Challan List
          </h2>
        </div>

        <div style={{ padding: '20px' }}>
          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Search by Shop Name or Challan No"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '10px 15px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '0.9rem', outline: 'none' }}
            />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '12px 10px', fontWeight: 'bold' }}>SL</th>
                  <th style={{ padding: '12px 10px', fontWeight: 'bold' }}>Shop Name</th>
                  <th style={{ padding: '12px 10px', fontWeight: 'bold' }}>Challan No</th>
                  <th style={{ padding: '12px 10px', fontWeight: 'bold' }}>Challan Date</th>
                  <th style={{ padding: '12px 10px', fontWeight: 'bold' }}>Status</th>
                  <th style={{ padding: '12px 10px', fontWeight: 'bold' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>Loading...</td></tr>
                ) : filteredChallans.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>No transfer challans found.</td></tr>
                ) : filteredChallans.map((challan, index) => (
                  <tr key={challan.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 10px' }}>{index + 1}</td>
                    <td style={{ padding: '12px 10px', color: '#1565c0', fontWeight: '500' }}>{challan.shops?.name}</td>
                    <td style={{ padding: '12px 10px' }}>{challan.challan_no}</td>
                    <td style={{ padding: '12px 10px' }}>{challan.challan_date}</td>
                    <td style={{ padding: '12px 10px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold',
                        backgroundColor: challan.status === 'Received' ? '#e8f5e9' : '#fff3e0',
                        color: challan.status === 'Received' ? '#2e7d32' : '#e65100'
                      }}>
                        {challan.status || 'Pending'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 10px' }}>
                      <button
                        onClick={() => handleView(challan)}
                        style={{ padding: '6px 12px', backgroundColor: '#2e7d32', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                      >
                        View / Receive
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiveFromShop;
