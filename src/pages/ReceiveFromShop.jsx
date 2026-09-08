import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Printer, CheckCircle, Eye, Download } from 'lucide-react';

const ReceiveFromShop = () => {
  const { user } = useAuth();
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
      const [transfersRes, shopsRes] = await Promise.all([
        supabase.from('shop_transfers').select('*').order('created_at', { ascending: false }),
        supabase.from('shops').select('id, name')
      ]);

      const shopsMap = new Map();
      (shopsRes.data || []).forEach(s => shopsMap.set(s.id, s));

      const rawTransfers = transfersRes.data || [];
      const mapped = rawTransfers.map(t => {
        let shopObj = shopsMap.get(t.shop_id);
        if (!shopObj && t.shop_id) {
          shopObj = { id: t.shop_id, name: t.shop_name || 'Store' };
        }
        return {
          ...t,
          shops: shopObj || { name: 'Store' }
        };
      });

      setChallans(mapped);
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
        .select('*')
        .eq('transfer_id', challan.id);

      if (error) throw error;

      const rawItems = items || [];
      const productIds = rawItems.map(i => i.product_id).filter(Boolean);
      let productsMap = new Map();

      if (productIds.length > 0) {
        const { data: prods } = await supabase
          .from('products')
          .select('id, item_name, barcode, user_define_barcode, code, mrp, uom, category_id, subcategory_id')
          .in('id', productIds);

        (prods || []).forEach(p => {
          productsMap.set(p.id, p);
          productsMap.set(String(p.id), p);
          if (p.barcode) productsMap.set(p.barcode, p);
          if (p.user_define_barcode) productsMap.set(p.user_define_barcode, p);
          if (p.code) productsMap.set(p.code, p);
        });
      }

      const enrichedItems = rawItems.map(item => {
        const prod = productsMap.get(item.product_id) || productsMap.get(String(item.product_id)) || {};
        const barcode = prod.barcode || prod.user_define_barcode || prod.code || item.barcode || '-';
        const itemName = prod.item_name || item.product_name || item.item_name || 'Product';
        const mrp = Number(prod.mrp || item.mrp || 0);
        const uom = prod.uom || item.uom || 'Pcs';
        const category = prod.category?.name || prod.category_name || '-';

        return {
          ...item,
          products: {
            id: item.product_id,
            item_name: itemName,
            barcode: barcode,
            mrp: mrp,
            uom: uom,
            category: category
          }
        };
      });

      setSelectedChallan(challan);
      setChallanItems(enrichedItems);
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

        const prodId = item.products?.id || item.product_id;
        const { data: prodData } = await supabase
          .from('products')
          .select('wh_stock')
          .eq('id', prodId)
          .single();

        if (prodData) {
          const newWhStock = Number(prodData.wh_stock || 0) + qty;
          await supabase
            .from('products')
            .update({ wh_stock: newWhStock })
            .eq('id', prodId);
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
      generatePDF(false, false);

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

  const generatePDF = (isDuplicate = false, isPreview = false) => {
    const duplicate = isDuplicate === true;
    const preview = isPreview === true;
    if (!selectedChallan || challanItems.length === 0) {
      toast.error('No items to generate PDF');
      return;
    }

    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // 1. Top Green Banner (#2e6f40)
      doc.setFillColor(46, 111, 64);
      doc.rect(0, 0, pageWidth, 22, 'F');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text("EZ ERP MANAGEMENT INFORMATION SYSTEM (MIS)", 14, 11);

      doc.setFontSize(9.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(230, 245, 235);
      doc.text("CENTRAL INVENTORY & POS SALES ANALYTICS", 14, 17);

      // Right Header Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      let title = "RECEIVE FROM SHOP CHALLAN";
      if (duplicate) title += " [DUPLICATE]";
      if (preview) title += " [PREVIEW]";
      doc.text(title, pageWidth - 14, 14, { align: 'right' });

      const fromShopName = selectedChallan.shops?.name || 'Store';
      const currentUserName = user?.name || user?.username || (localStorage.getItem('erp_user') ? JSON.parse(localStorage.getItem('erp_user'))?.name || JSON.parse(localStorage.getItem('erp_user'))?.username : '') || 'Super Admin';
      const displayName = (currentUserName === 'msmraqeeb@gmail.com' || currentUserName === 'admin@email.com') ? 'Super Admin' : currentUserName;

      // 2. Metadata Section below Banner
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(50, 50, 50);

      const challanDateStr = selectedChallan.challan_date ? new Date(selectedChallan.challan_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

      doc.text(`From Shop: ${fromShopName}    |    Receive To: Central Store    |    Challan No: #${selectedChallan.challan_no}`, 14, 30);
      doc.text(`Challan Date: ${challanDateStr}    |    Status: ${selectedChallan.status || 'Pending'}`, 14, 35);
      doc.text(`Generated On: ${new Date().toLocaleString('en-GB')}`, pageWidth - 14, 30, { align: 'right' });
      doc.text(`Printed By: ${displayName}`, pageWidth - 14, 35, { align: 'right' });

      let totalQty = 0;
      let totalVal = 0;

      const tableCols = ["SL", "Barcode", "Product Name", "Qty", "MRP (Tk)", "Value (Tk)"];

      const tableData = challanItems.map((i, idx) => {
        const qty = Number(i.qty || 0);
        const mrp = Number(i.products?.mrp || i.mrp || 0);
        const val = qty * mrp;

        totalQty += qty;
        totalVal += val;

        return [
          idx + 1,
          i.products?.barcode || '-',
          i.products?.item_name || 'Product',
          qty.toFixed(2),
          mrp.toFixed(2),
          val.toFixed(2)
        ];
      });

      tableData.push([
        'Total',
        '',
        `${challanItems.length} Items`,
        totalQty.toFixed(2),
        '',
        totalVal.toFixed(2)
      ]);

      autoTable(doc, {
        startY: 40,
        head: [tableCols],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 2, textColor: [30, 30, 30], valign: 'middle' },
        headStyles: { fillColor: [46, 111, 64], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'right' },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12 },
          1: { halign: 'left', cellWidth: 32 },
          2: { halign: 'left', cellWidth: 'auto' },
          3: { halign: 'right', cellWidth: 26 },
          4: { halign: 'right', cellWidth: 28 },
          5: { halign: 'right', cellWidth: 32 }
        },
        didParseCell: function (data) {
          if (data.section === 'head') {
            if (data.column.index === 0) data.cell.styles.halign = 'center';
            if (data.column.index >= 1 && data.column.index <= 2) data.cell.styles.halign = 'left';
          }
          if (data.row.index === tableData.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 245, 240];
            data.cell.styles.textColor = [10, 60, 20];
          }
        },
        margin: { top: 10, left: 14, right: 14 }
      });

      const finalY = doc.lastAutoTable.finalY || 80;
      const sigY = Math.max(finalY + 26, pageHeight - 20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setLineWidth(0.4);
      doc.setDrawColor(120, 120, 120);
      doc.setTextColor(40, 40, 40);

      // Prepared / Posted By
      doc.line(20, sigY, 70, sigY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(2, 132, 199);
      doc.text(displayName, 45, sigY - 2, { align: 'center' });

      doc.setFont("helvetica", "bold");
      doc.setTextColor(40, 40, 40);
      doc.text('Prepared By', 45, sigY + 5, { align: 'center' });

      // Checked By
      doc.setFont("helvetica", "bold");
      doc.line(pageWidth / 2 - 25, sigY, pageWidth / 2 + 25, sigY);
      doc.text('Checked By', pageWidth / 2, sigY + 5, { align: 'center' });

      // Authorized Signature
      doc.setFont("helvetica", "bold");
      doc.line(pageWidth - 70, sigY, pageWidth - 20, sigY);
      doc.text('Authorized Signature', pageWidth - 45, sigY + 5, { align: 'center' });

      const cleanFilename = String(selectedChallan.challan_no || 'Challan').replace(/[^a-zA-Z0-9_-]/g, '_');

      if (preview) {
        const blob = doc.output('blob');
        const blobUrl = URL.createObjectURL(blob);
        const win = window.open(blobUrl, '_blank');
        if (!win) {
          doc.save(`Receive_From_Shop_${cleanFilename}.pdf`);
          toast.success('Challan PDF downloaded');
        } else {
          toast.success('Challan Preview opened in new tab');
        }
      } else {
        doc.save(`Receive_From_Shop_${cleanFilename}.pdf`);
        toast.success('Challan PDF downloaded');
      }
    } catch (pdfErr) {
      console.error('PDF generation error:', pdfErr);
      toast.error('Failed to generate PDF: ' + pdfErr.message);
    }
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
        <div style={{ backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          {/* Header */}
          <div style={{ backgroundColor: '#f8fafc', padding: '15px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, color: '#1e293b' }}>
              Transfer Challan: {selectedChallan.challan_no}
            </h2>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => { setIsViewMode(false); setSelectedChallan(null); setChallanItems([]); }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 16px', fontSize: '13px', fontWeight: 'bold' }}
            >
              <ArrowLeft size={14} /> Back
            </button>
          </div>

          <div style={{ padding: '20px' }}>
            {/* Info */}
            <div style={{ display: 'flex', gap: '40px', marginBottom: '20px', fontSize: '0.9rem', backgroundColor: '#f1f5f9', padding: '12px 16px', borderRadius: '4px' }}>
              <div><strong>From Shop:</strong> <span style={{ color: '#2e6f40', fontWeight: '600' }}>{selectedChallan.shops?.name || 'Store'}</span></div>
              <div><strong>Challan Date:</strong> {selectedChallan.challan_date}</div>
              <div>
                <strong>Status:</strong>{' '}
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  backgroundColor: selectedChallan.status === 'Received' ? '#ecfdf5' : '#fff7ed',
                  color: selectedChallan.status === 'Received' ? '#047857' : '#c2410c',
                  border: `1px solid ${selectedChallan.status === 'Received' ? '#a7f3d0' : '#fed7aa'}`
                }}>
                  {selectedChallan.status || 'Pending'}
                </span>
              </div>
            </div>

            {/* Items Table */}
            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#334155' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', width: '50px' }}>SL</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', width: '180px' }}>Barcode</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Product Name</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', width: '100px' }}>Qty</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', width: '120px' }}>MRP</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', width: '120px' }}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {challanItems.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No items found</td></tr>
                  ) : challanItems.map((item, idx) => {
                    const qty = Number(item.qty || 0);
                    const mrp = Number(item.products?.mrp || item.mrp || 0);
                    return (
                      <tr key={item.id || idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 1 ? '#fcfdfc' : '#fff' }}>
                        <td style={{ padding: '10px 12px', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: '500', color: '#1e293b' }}>{item.products?.barcode || '-'}</td>
                        <td style={{ padding: '10px 12px', fontWeight: '500', color: '#1e293b' }}>{item.products?.item_name || 'Product'}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600', color: '#1e293b' }}>{qty.toFixed(2)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#475569' }}>{mrp.toFixed(2)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600', color: '#2e6f40' }}>{(qty * mrp).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                {challanItems.length > 0 && (
                  <tfoot>
                    <tr style={{ backgroundColor: '#f0fdf4', borderTop: '2px solid #bbf7d0', fontWeight: 'bold', color: '#166534' }}>
                      <td colSpan="3" style={{ padding: '10px 12px', textAlign: 'right' }}>TOTAL:</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>{totalQty.toFixed(2)}</td>
                      <td></td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>{totalVal.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Actions */}
            <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center' }}>
              <button
                type="button"
                className="btn-info"
                onClick={() => generatePDF(false, false)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 22px', fontSize: '13px', fontWeight: 'bold' }}
              >
                <Printer size={15} /> Print / PDF
              </button>
              {selectedChallan.status !== 'Received' && (
                <button
                  type="button"
                  className="btn-theme"
                  onClick={handleReceive}
                  disabled={isReceiving}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 24px', fontSize: '13px', fontWeight: 'bold' }}
                >
                  <CheckCircle size={15} />
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
      <div style={{ backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <div style={{ backgroundColor: '#f8fafc', padding: '15px 20px', borderBottom: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
            Transfer Challan List
          </h2>
        </div>

        <div style={{ padding: '20px' }}>
          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Search by Shop Name or Challan No..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-animated"
              style={{ width: '100%', height: '38px', fontSize: '0.875rem' }}
            />
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#334155' }}>
                  <th style={{ padding: '12px 10px', fontWeight: 'bold', width: '50px' }}>SL</th>
                  <th style={{ padding: '12px 10px', fontWeight: 'bold' }}>Shop Name</th>
                  <th style={{ padding: '12px 10px', fontWeight: 'bold' }}>Challan No</th>
                  <th style={{ padding: '12px 10px', fontWeight: 'bold' }}>Challan Date</th>
                  <th style={{ padding: '12px 10px', fontWeight: 'bold' }}>Status</th>
                  <th style={{ padding: '12px 10px', fontWeight: 'bold', textAlign: 'center', width: '140px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '36px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                        <img src="https://ik.imagekit.io/eg7u6xcn0u/Shopping-Cart.gif" alt="Loading..." style={{ width: '120px', height: '120px', objectFit: 'contain' }} />
                        <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent-primary, #2e6f40)' }}>Loading transfer challans...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredChallans.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No transfer challans found.</td></tr>
                ) : filteredChallans.map((challan, index) => (
                  <tr key={challan.id || index} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: index % 2 === 1 ? '#fcfdfc' : '#fff' }}>
                    <td style={{ padding: '12px 10px', color: '#64748b' }}>{index + 1}</td>
                    <td style={{ padding: '12px 10px', color: '#2e6f40', fontWeight: '600' }}>{challan.shops?.name || 'Store'}</td>
                    <td style={{ padding: '12px 10px', fontWeight: '500', color: '#1e293b' }}>{challan.challan_no}</td>
                    <td style={{ padding: '12px 10px', color: '#475569' }}>{challan.challan_date}</td>
                    <td style={{ padding: '12px 10px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold',
                        backgroundColor: challan.status === 'Received' ? '#ecfdf5' : '#fff7ed',
                        color: challan.status === 'Received' ? '#047857' : '#c2410c',
                        border: `1px solid ${challan.status === 'Received' ? '#a7f3d0' : '#fed7aa'}`
                      }}>
                        {challan.status || 'Pending'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn-theme"
                        onClick={() => handleView(challan)}
                        style={{ padding: '4px 14px', fontSize: '12px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Eye size={13} /> View / Receive
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
