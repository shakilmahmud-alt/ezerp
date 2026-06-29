import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

const SectionWrapper = ({ title, children }) => (
  <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px', backgroundColor: 'var(--card-bg)', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
    {title && (
      <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          {title}
        </h3>
      </div>
    )}
    {children}
  </div>
);

const VendorWiseProductList = () => {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [subSubcategories, setSubSubcategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [vatPercents, setVatPercents] = useState([]);
  
  const [filters, setFilters] = useState({
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    vendorId: '',
    categoryId: '',
    subcategoryId: '',
    subSubcategoryId: '',
    saleVatPercent: '',
    reportVersion: 'Vendor wise',
    reportType: 'PDF'
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchDropdownData();
  }, []);

  const fetchDropdownData = async () => {
    try {
      const [catRes, subcatRes, subsubRes, vendorRes, productsRes] = await Promise.all([
        supabase.from('categories').select('id, name'),
        supabase.from('subcategories').select('id, name'),
        supabase.from('sub_subcategories').select('id, name'),
        supabase.from('vendors').select('id, name'),
        supabase.from('products').select('sale_vat_percent')
      ]);
      
      setCategories(catRes.data || []);
      setSubcategories(subcatRes.data || []);
      setSubSubcategories(subsubRes.data || []);
      setVendors(vendorRes.data || []);

      // Extract unique VAT percentages
      if (productsRes.data) {
        const uniqueVats = [...new Set(productsRes.data.map(p => p.sale_vat_percent).filter(Boolean))];
        setVatPercents(uniqueVats.sort((a, b) => parseFloat(a) - parseFloat(b)));
      }
    } catch (error) {
      console.error("Error fetching dropdown data:", error);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleShowReport = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('products')
        .select(`
          *,
          category:category_id (name),
          subcategory:subcategory_id (name),
          sub_subcategory:sub_subcategory_id (name),
          brand:brand_id (name),
          vendor:vendor_id (name)
        `);

      if (filters.vendorId) query = query.eq('vendor_id', filters.vendorId);
      if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
      if (filters.subcategoryId) query = query.eq('subcategory_id', filters.subcategoryId);
      if (filters.subSubcategoryId) query = query.eq('sub_subcategory_id', filters.subSubcategoryId);
      if (filters.saleVatPercent) query = query.eq('sale_vat_percent', filters.saleVatPercent);
      
      // Date filtering assuming there's a created_at or similar field to filter by "From" and "To" date
      if (filters.fromDate) query = query.gte('created_at', `${filters.fromDate}T00:00:00.000Z`);
      if (filters.toDate) query = query.lte('created_at', `${filters.toDate}T23:59:59.999Z`);

      const { data, error } = await query;
      if (error) throw error;

      let products = data || [];

      // Sort alphabetically based on Report Version
      products.sort((a, b) => {
        let nameA = '';
        let nameB = '';
        if (filters.reportVersion === 'Vendor wise') {
          nameA = a.vendor?.name || '';
          nameB = b.vendor?.name || '';
        } else if (filters.reportVersion === 'Category wise') {
          nameA = a.category?.name || '';
          nameB = b.category?.name || '';
        } else if (filters.reportVersion === 'Sub Category wise') {
          nameA = a.subcategory?.name || '';
          nameB = b.subcategory?.name || '';
        }
        
        // Secondary sort by item name if primary is same
        if (nameA.toLowerCase() === nameB.toLowerCase()) {
          return (a.item_name || '').localeCompare(b.item_name || '');
        }
        return nameA.toLowerCase().localeCompare(nameB.toLowerCase());
      });

      if (filters.reportType === 'Excel') {
        generateExcel(products);
      } else {
        generatePDF(products);
      }

    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Error generating report: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const generateExcel = (products) => {
    const exportData = products.map((p, index) => ({
      SL: index + 1,
      Vendor: p.vendor?.name || '',
      Category: p.category?.name || '',
      'Sub Category': p.subcategory?.name || '',
      'Item Name': p.item_name || '',
      Code: p.code || '',
      'User Barcode': p.barcode || '',
      'Purchase Price': p.purchase_price || 0,
      MRP: p.mrp || 0,
      'Sale VAT(%)': p.sale_vat_percent || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, `VendorWiseProductList_${filters.reportVersion}.xlsx`);
  };

  const generatePDF = (products) => {
    const doc = new jsPDF();
    
    doc.setFontSize(14);
    doc.text(`Vendor Wise Product List - ${filters.reportVersion}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Date Range: ${filters.fromDate} to ${filters.toDate}`, 14, 22);

    const tableColumn = ["SL", "Vendor", "Category", "Item Name", "Code", "Pur. Price", "MRP", "VAT(%)"];
    const tableRows = [];

    products.forEach((p, index) => {
      const rowData = [
        index + 1,
        p.vendor?.name || '',
        p.category?.name || '',
        p.item_name || '',
        p.code || '',
        p.purchase_price || '0',
        p.mrp || '0',
        p.sale_vat_percent || '0'
      ];
      tableRows.push(rowData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 28,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [46, 111, 64] } // matches var(--accent-primary)
    });

    doc.save(`VendorWiseProductList_${filters.reportVersion}.pdf`);
  };

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color)' }}>
      <SectionWrapper title="Vendor Wise Product List">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: 'var(--text-secondary)' }}>From</label>
            <input type="date" name="fromDate" value={filters.fromDate} onChange={handleFilterChange} className="input-animated" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: 'var(--text-secondary)' }}>TO</label>
            <input type="date" name="toDate" value={filters.toDate} onChange={handleFilterChange} className="input-animated" />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: 'var(--text-secondary)' }}>Vendor</label>
            <select name="vendorId" value={filters.vendorId} onChange={handleFilterChange} className="input-animated">
              <option value="">-- ALL --</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: 'var(--text-secondary)' }}>Category</label>
            <select name="categoryId" value={filters.categoryId} onChange={handleFilterChange} className="input-animated">
              <option value="">-- ALL --</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: 'var(--text-secondary)' }}>Sub Category</label>
            <select name="subcategoryId" value={filters.subcategoryId} onChange={handleFilterChange} className="input-animated">
              <option value="">-- ALL --</option>
              {subcategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: 'var(--text-secondary)' }}>Sub Subcategory</label>
            <select name="subSubcategoryId" value={filters.subSubcategoryId} onChange={handleFilterChange} className="input-animated">
              <option value="">-- ALL --</option>
              {subSubcategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: 'var(--text-secondary)' }}>Sale VAT Percent</label>
            <select name="saleVatPercent" value={filters.saleVatPercent} onChange={handleFilterChange} className="input-animated">
              <option value="">-- ALL --</option>
              {vatPercents.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '10px', color: 'var(--text-secondary)' }}>Report Version</label>
          <div style={{ display: 'flex', gap: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input type="radio" name="reportVersion" value="Vendor wise" checked={filters.reportVersion === 'Vendor wise'} onChange={handleFilterChange} style={{ accentColor: 'var(--accent-primary)' }} /> Vendor wise
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input type="radio" name="reportVersion" value="Category wise" checked={filters.reportVersion === 'Category wise'} onChange={handleFilterChange} style={{ accentColor: 'var(--accent-primary)' }} /> Category wise
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input type="radio" name="reportVersion" value="Sub Category wise" checked={filters.reportVersion === 'Sub Category wise'} onChange={handleFilterChange} style={{ accentColor: 'var(--accent-primary)' }} /> Sub Category wise
            </label>
          </div>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '10px', color: 'var(--text-secondary)' }}>Report Type</label>
          <div style={{ display: 'flex', gap: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input type="radio" name="reportType" value="PDF" checked={filters.reportType === 'PDF'} onChange={handleFilterChange} style={{ accentColor: 'var(--accent-primary)' }} /> PDF
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input type="radio" name="reportType" value="Excel" checked={filters.reportType === 'Excel'} onChange={handleFilterChange} style={{ accentColor: 'var(--accent-primary)' }} /> Excel
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-theme" 
            onClick={handleShowReport} 
            disabled={isLoading}
            style={{ padding: '10px 40px', backgroundColor: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {isLoading ? 'Generating...' : 'Show'}
          </button>
        </div>
      </SectionWrapper>
    </div>
  );
};

export default VendorWiseProductList;
