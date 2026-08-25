import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Clock, FileText, CalendarDays, Calendar, RefreshCw, Store, MapPin, Filter, XCircle, Award, Search, TrendingUp, PackageCheck, Layers } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import CustomSelect from '../components/CustomSelect';

const CHART_COLORS = [
  '#2e6f40', '#52be72', '#0284c7', '#f59e0b', 
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', 
  '#6366f1', '#10b981', '#06b6d4', '#d946ef'
];

// Helper: Format date to local YYYY-MM-DD
const toLocalDateStr = (d) => {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper: Format Currency
const formatCurrency = (val) => {
  const num = Number(val) || 0;
  return `৳ ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const Dashboard = () => {
  const [areas, setAreas] = useState([]);
  const [stores, setStores] = useState([]);
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedStore, setSelectedStore] = useState('');

  // Date Range States
  const [datePreset, setDatePreset] = useState('ALL'); // 'ALL', 'TODAY', 'YESTERDAY', 'LAST_7_DAYS', 'THIS_MONTH', 'LAST_MONTH', 'CUSTOM'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Raw Database Data
  const [salesData, setSalesData] = useState([]);
  const [saleItemsData, setSaleItemsData] = useState([]);
  const [productsData, setProductsData] = useState([]);
  const [categoriesData, setCategoriesData] = useState([]);
  const [customersData, setCustomersData] = useState([]);
  const [customerTypesData, setCustomerTypesData] = useState([]);
  const [requisitionsData, setRequisitionsData] = useState([]);
  const [requisitionItemsData, setRequisitionItemsData] = useState([]);
  const [storeStocksData, setStoreStocksData] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [storeSearchText, setStoreSearchText] = useState('');
  const [top20SearchText, setTop20SearchText] = useState('');

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [
        areasRes, 
        storesRes, 
        salesRes, 
        itemsRes, 
        prodRes, 
        catRes, 
        custRes, 
        typesRes,
        reqsRes,
        reqItemsRes,
        storeStocksRes
      ] = await Promise.all([
        supabase.from('areas').select('id, name').order('name'),
        supabase.from('stores').select('id, name, area_id').eq('status', 'ACTIVE').order('name'),
        supabase.from('sales').select('*').order('sale_date', { ascending: false }),
        supabase.from('sale_items').select('*'),
        supabase.from('products').select('id, code, barcode, item_name, purchase_price, mrp, category_id, wh_stock, str_stock'),
        supabase.from('categories').select('id, name'),
        supabase.from('customers').select('id, first_name, last_name, customer_type_id'),
        supabase.from('customer_types').select('id, name'),
        supabase.from('requisitions').select('id, shop_id, requisition_no, status, requisition_date'),
        supabase.from('requisition_items').select('id, requisition_id, product_id, barcode, req_qty, approve_qty, cpu, mrp'),
        supabase.from('store_stocks').select('id, store_id, product_id, stock_qty')
      ]);

      if (areasRes.data) setAreas(areasRes.data);
      if (storesRes.data) setStores(storesRes.data);
      if (salesRes.data) setSalesData(salesRes.data);
      if (itemsRes.data) setSaleItemsData(itemsRes.data);
      if (prodRes.data) setProductsData(prodRes.data);
      if (catRes.data) setCategoriesData(catRes.data);
      if (custRes.data) setCustomersData(custRes.data);
      if (typesRes.data) setCustomerTypesData(typesRes.data);
      if (reqsRes.data) setRequisitionsData(reqsRes.data);
      if (reqItemsRes.data) setRequisitionItemsData(reqItemsRes.data);
      if (storeStocksRes.data) setStoreStocksData(storeStocksRes.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Handle Preset Selection
  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    const d = new Date();
    const today = toLocalDateStr(d);

    if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'TODAY') {
      setStartDate(today);
      setEndDate(today);
    } else if (preset === 'YESTERDAY') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = toLocalDateStr(y);
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === 'LAST_7_DAYS') {
      const s = new Date();
      s.setDate(s.getDate() - 6);
      setStartDate(toLocalDateStr(s));
      setEndDate(today);
    } else if (preset === 'THIS_MONTH') {
      const firstDay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      setStartDate(firstDay);
      setEndDate(today);
    } else if (preset === 'LAST_MONTH') {
      const firstDayLastMonth = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(d.getFullYear(), d.getMonth(), 0);
      setStartDate(toLocalDateStr(firstDayLastMonth));
      setEndDate(toLocalDateStr(lastDayLastMonth));
    }
  };

  // Reset all filters to default
  const handleResetFilters = () => {
    setSelectedArea('');
    setSelectedStore('');
    setDatePreset('ALL');
    setStartDate('');
    setEndDate('');
    setStoreSearchText('');
  };

  // Filtered Stores based on selected Area
  const filteredStores = useMemo(() => {
    if (selectedArea) {
      return stores.filter(s => String(s.area_id) === String(selectedArea));
    }
    return stores;
  }, [stores, selectedArea]);

  // Base Scope Filtered Sales (Store/Area level, ignoring date range for standard benchmark cards)
  const scopeFilteredSales = useMemo(() => {
    if (selectedStore) {
      return salesData.filter(s => String(s.store_id) === String(selectedStore));
    }
    if (selectedArea) {
      const storeIdsInArea = new Set(filteredStores.map(st => String(st.id)));
      return salesData.filter(s => s.store_id && storeIdsInArea.has(String(s.store_id)));
    }
    return salesData;
  }, [salesData, selectedStore, selectedArea, filteredStores]);

  // Full Filtered Sales (Store/Area + Date Range)
  const filteredSales = useMemo(() => {
    let list = scopeFilteredSales;
    if (startDate) {
      list = list.filter(s => s.sale_date && toLocalDateStr(s.sale_date) >= startDate);
    }
    if (endDate) {
      list = list.filter(s => s.sale_date && toLocalDateStr(s.sale_date) <= endDate);
    }
    return list;
  }, [scopeFilteredSales, startDate, endDate]);

  // Set of Sale IDs for filtering line items
  const filteredSaleIds = useMemo(() => {
    return new Set(filteredSales.map(s => s.id));
  }, [filteredSales]);

  // Filtered Sale Items
  const filteredSaleItems = useMemo(() => {
    return saleItemsData.filter(item => filteredSaleIds.has(item.sale_id));
  }, [saleItemsData, filteredSaleIds]);

  // Lookups maps
  const categoryMap = useMemo(() => {
    return Object.fromEntries(categoriesData.map(c => [c.id, c.name]));
  }, [categoriesData]);

  const productCategoryMap = useMemo(() => {
    return Object.fromEntries(productsData.map(p => [p.id, categoryMap[p.category_id] || 'General']));
  }, [productsData, categoryMap]);

  const customerTypeMap = useMemo(() => {
    const typeNames = Object.fromEntries(customerTypesData.map(t => [t.id, t.name]));
    return Object.fromEntries(customersData.map(c => [c.id, typeNames[c.customer_type_id] || 'Regular']));
  }, [customersData, customerTypesData]);

  // ----------------------------------------------------
  // Metric Calculations
  // ----------------------------------------------------
  const now = new Date();
  const todayStr = toLocalDateStr(now);
  
  // Current Month String (YYYY-MM)
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed
  const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

  // Previous Month Date
  const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

  // 1. Today's Sales Value
  const todaySalesValue = useMemo(() => {
    return scopeFilteredSales
      .filter(s => s.sale_date && toLocalDateStr(s.sale_date) === todayStr)
      .reduce((sum, s) => sum + (Number(s.net_amount) || Number(s.total_amount) || 0), 0);
  }, [scopeFilteredSales, todayStr]);

  // 2. Last 7 Days Dates Array & Total
  const last7DaysArray = useMemo(() => {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dates.push(toLocalDateStr(d));
    }
    return dates;
  }, [todayStr]);

  const last7DaysSalesValue = useMemo(() => {
    const dateSet = new Set(last7DaysArray);
    return scopeFilteredSales
      .filter(s => s.sale_date && dateSet.has(toLocalDateStr(s.sale_date)))
      .reduce((sum, s) => sum + (Number(s.net_amount) || Number(s.total_amount) || 0), 0);
  }, [scopeFilteredSales, last7DaysArray]);

  // 3. Current Month Sales Value
  const currentMonthSalesValue = useMemo(() => {
    return scopeFilteredSales
      .filter(s => s.sale_date && toLocalDateStr(s.sale_date).startsWith(currentMonthStr))
      .reduce((sum, s) => sum + (Number(s.net_amount) || Number(s.total_amount) || 0), 0);
  }, [scopeFilteredSales, currentMonthStr]);

  // 4. Last Month Sales Value
  const lastMonthSalesValue = useMemo(() => {
    return scopeFilteredSales
      .filter(s => s.sale_date && toLocalDateStr(s.sale_date).startsWith(prevMonthStr))
      .reduce((sum, s) => sum + (Number(s.net_amount) || Number(s.total_amount) || 0), 0);
  }, [scopeFilteredSales, prevMonthStr]);

  // 5. Selected Period Sales Value (If custom Date Range is active)
  const selectedPeriodSalesValue = useMemo(() => {
    return filteredSales.reduce((sum, s) => sum + (Number(s.net_amount) || Number(s.total_amount) || 0), 0);
  }, [filteredSales]);

  const isDateFilterActive = Boolean(startDate || endDate);

  // ----------------------------------------------------
  // Chart 1: Daily / Period Sales Trend Bar Chart
  // ----------------------------------------------------
  const trendBarChartData = useMemo(() => {
    if (isDateFilterActive && startDate && endDate) {
      // Generate days between startDate and endDate
      const start = new Date(startDate);
      const end = new Date(endDate);
      const daysDiff = Math.round((end - start) / (1000 * 60 * 60 * 24));

      if (daysDiff <= 31 && daysDiff >= 0) {
        const dates = [];
        for (let i = 0; i <= daysDiff; i++) {
          const curr = new Date(start);
          curr.setDate(curr.getDate() + i);
          const dStr = toLocalDateStr(curr);
          const dayLabel = curr.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
          const dayTotal = filteredSales
            .filter(s => s.sale_date && toLocalDateStr(s.sale_date) === dStr)
            .reduce((sum, s) => sum + (Number(s.net_amount) || Number(s.total_amount) || 0), 0);

          dates.push({ name: dayLabel, fullDate: dStr, value: Number(dayTotal.toFixed(2)) });
        }
        return dates;
      }
    }

    // Default: Last 7 days
    return last7DaysArray.map(dateStr => {
      const dateObj = new Date(dateStr);
      const dayLabel = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      const dayTotal = filteredSales
        .filter(s => s.sale_date && toLocalDateStr(s.sale_date) === dateStr)
        .reduce((sum, s) => sum + (Number(s.net_amount) || Number(s.total_amount) || 0), 0);
      
      return {
        name: dayLabel,
        fullDate: dateStr,
        value: Number(dayTotal.toFixed(2))
      };
    });
  }, [isDateFilterActive, startDate, endDate, last7DaysArray, filteredSales]);

  // ----------------------------------------------------
  // Chart 2: Current Year Sale (Monthly Area Chart)
  // ----------------------------------------------------
  const currentYearSaleData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthNames.map((mName, mIdx) => {
      const monthPrefix = `${currentYear}-${String(mIdx + 1).padStart(2, '0')}`;
      const monthTotal = scopeFilteredSales
        .filter(s => s.sale_date && toLocalDateStr(s.sale_date).startsWith(monthPrefix))
        .reduce((sum, s) => sum + (Number(s.net_amount) || Number(s.total_amount) || 0), 0);

      return {
        name: mName,
        value: Number(monthTotal.toFixed(2))
      };
    });
  }, [scopeFilteredSales, currentYear]);

  // ----------------------------------------------------
  // Chart 3: Top Selling Products
  // ----------------------------------------------------
  const topSellingProductsData = useMemo(() => {
    const prodStats = {};
    filteredSaleItems.forEach(item => {
      const pName = item.product_name || 'Product';
      if (!prodStats[pName]) {
        prodStats[pName] = { name: pName, qty: 0, amount: 0 };
      }
      prodStats[pName].qty += Number(item.qty || 0);
      prodStats[pName].amount += Number(item.total_value || 0);
    });

    const sorted = Object.values(prodStats)
      .sort((a, b) => b.qty - a.qty || b.amount - a.amount)
      .slice(0, 6);

    return sorted.map((p, idx) => ({
      name: p.name.length > 14 ? `${p.name.substring(0, 12)}...` : p.name,
      fullName: p.name,
      value: p.qty,
      amount: p.amount,
      fill: CHART_COLORS[idx % CHART_COLORS.length]
    }));
  }, [filteredSaleItems]);

  // ----------------------------------------------------
  // Chart 4: Category Wise Sale
  // ----------------------------------------------------
  const categorySaleData = useMemo(() => {
    const catStats = {};
    filteredSaleItems.forEach(item => {
      const catName = productCategoryMap[item.product_id] || 'General';
      catStats[catName] = (catStats[catName] || 0) + (Number(item.total_value) || 0);
    });

    const res = Object.entries(catStats).map(([name, val]) => ({
      name,
      value: Number(val.toFixed(2))
    }));

    return res.length > 0 ? res : [{ name: 'No Sales', value: 0 }];
  }, [filteredSaleItems, productCategoryMap]);

  // ----------------------------------------------------
  // Chart 5: Customer Type Wise Sale
  // ----------------------------------------------------
  const customerTypeData = useMemo(() => {
    const typeStats = {};
    filteredSales.forEach(s => {
      let tName = 'Walk-in';
      if (s.customer_id && customerTypeMap[s.customer_id]) {
        tName = customerTypeMap[s.customer_id];
      } else if (s.customer_name && s.customer_name !== 'Walk-in Customer') {
        tName = 'Member';
      }
      typeStats[tName] = (typeStats[tName] || 0) + (Number(s.net_amount) || Number(s.total_amount) || 0);
    });

    const res = Object.entries(typeStats).map(([name, val], idx) => ({
      name,
      value: Number(val.toFixed(2)),
      fill: CHART_COLORS[idx % CHART_COLORS.length]
    }));

    return res.length > 0 ? res : [{ name: 'Walk-in', value: 0, fill: '#2e6f40' }];
  }, [filteredSales, customerTypeMap]);

  // ----------------------------------------------------
  // Table 1: Sale Growth Table
  // ----------------------------------------------------
  const saleGrowthTable = useMemo(() => {
    const activeDateList = isDateFilterActive && trendBarChartData.length > 0 
      ? trendBarChartData.map(d => d.fullDate).filter(Boolean)
      : last7DaysArray;

    return activeDateList.map((dateStr) => {
      const dateObj = new Date(dateStr);
      const formattedDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      
      const currentAmount = scopeFilteredSales
        .filter(s => s.sale_date && toLocalDateStr(s.sale_date) === dateStr)
        .reduce((sum, s) => sum + (Number(s.net_amount) || Number(s.total_amount) || 0), 0);

      // Previous Day Calculation
      const prevDateObj = new Date(dateObj);
      prevDateObj.setDate(prevDateObj.getDate() - 1);
      const prevDateStr = toLocalDateStr(prevDateObj);

      const prevAmount = scopeFilteredSales
        .filter(s => s.sale_date && toLocalDateStr(s.sale_date) === prevDateStr)
        .reduce((sum, s) => sum + (Number(s.net_amount) || Number(s.total_amount) || 0), 0);

      let vsPercent = '0.00%';
      let growthType = 'neutral';

      if (prevAmount === 0 && currentAmount > 0) {
        vsPercent = '+100.00%';
        growthType = 'positive';
      } else if (prevAmount > 0) {
        const diff = ((currentAmount - prevAmount) / prevAmount) * 100;
        vsPercent = (diff >= 0 ? `+${diff.toFixed(2)}%` : `${diff.toFixed(2)}%`);
        growthType = diff > 0 ? 'positive' : diff < 0 ? 'negative' : 'neutral';
      }

      return {
        date: formattedDate,
        amount: currentAmount,
        prevAmount: prevAmount,
        vs: vsPercent,
        growthType
      };
    });
  }, [isDateFilterActive, trendBarChartData, last7DaysArray, scopeFilteredSales]);

  // ----------------------------------------------------
  // Table 2: Store Wise Sales Table
  // ----------------------------------------------------
  const storeSalesTable = useMemo(() => {
    const list = filteredStores.map((st, idx) => {
      // Period Total (using active date range filter)
      const periodTotal = filteredSales
        .filter(s => String(s.store_id) === String(st.id))
        .reduce((sum, s) => sum + (Number(s.net_amount) || Number(s.total_amount) || 0), 0);

      // Today Total (unfiltered benchmark)
      const todayTotal = salesData
        .filter(s => String(s.store_id) === String(st.id) && s.sale_date && toLocalDateStr(s.sale_date) === todayStr)
        .reduce((sum, s) => sum + (Number(s.net_amount) || Number(s.total_amount) || 0), 0);

      return {
        sl: idx + 1,
        id: st.id,
        name: st.name,
        todayAmount: todayTotal,
        periodAmount: periodTotal
      };
    });

    // Filter by search text
    const searched = list.filter(st => 
      !storeSearchText.trim() || st.name.toLowerCase().includes(storeSearchText.trim().toLowerCase())
    );

    // Sort descending by period sales / today sales
    return searched.sort((a, b) => b.periodAmount - a.periodAmount || b.todayAmount - a.todayAmount);
  }, [filteredStores, filteredSales, salesData, todayStr, storeSearchText]);

  // ----------------------------------------------------
  // Table 3: 20 Top Selling Products (Filtered by Sell-Through Rate >= 80%, Max 20)
  // Formula: Sell-Through Rate = (Sold Quantity ÷ Received Quantity) × 100
  // ----------------------------------------------------
  const top20SellingProducts = useMemo(() => {
    // 1. Determine active store IDs in current filter scope
    let activeStoreIds = null;
    if (selectedStore) {
      activeStoreIds = new Set([String(selectedStore)]);
    } else if (selectedArea) {
      activeStoreIds = new Set(filteredStores.map(st => String(st.id)));
    }

    // 2. Filter sales within scope & date range
    const relevantSales = salesData.filter(s => {
      if (activeStoreIds && !activeStoreIds.has(String(s.store_id))) return false;
      if (startDate && toLocalDateStr(s.sale_date) < startDate) return false;
      if (endDate && toLocalDateStr(s.sale_date) > endDate) return false;
      return true;
    });
    const relevantSaleIds = new Set(relevantSales.map(s => s.id));

    // 3. Aggregate sold_qty by product_id
    const soldQtyMap = {};
    saleItemsData.forEach(item => {
      if (relevantSaleIds.has(item.sale_id)) {
        soldQtyMap[item.product_id] = (soldQtyMap[item.product_id] || 0) + Number(item.qty || 0);
      }
    });

    // 4. Aggregate received_qty by product_id
    const relevantReqs = requisitionsData.filter(r => {
      if (activeStoreIds && !activeStoreIds.has(String(r.shop_id))) return false;
      return true;
    });
    const relevantReqIds = new Set(relevantReqs.map(r => r.id));

    const receivedQtyMap = {};
    requisitionItemsData.forEach(item => {
      if (relevantReqIds.has(item.requisition_id)) {
        const qty = Number(item.approve_qty || item.req_qty || 0);
        receivedQtyMap[item.product_id] = (receivedQtyMap[item.product_id] || 0) + qty;
      }
    });

    // 5. Aggregate branch balance / current stock
    const branchStockMap = {};
    storeStocksData.forEach(ss => {
      if (!activeStoreIds || activeStoreIds.has(String(ss.store_id))) {
        branchStockMap[ss.product_id] = (branchStockMap[ss.product_id] || 0) + Number(ss.stock_qty || 0);
      }
    });

    // 6. Build the list strictly for products with Sell-Through Rate >= 80%
    const qualifyingList = [];

    productsData.forEach(prod => {
      const soldQty = soldQtyMap[prod.id] || 0;
      const receivedQty = receivedQtyMap[prod.id] || (branchStockMap[prod.id] !== undefined ? branchStockMap[prod.id] + soldQty : 0);
      const balance = branchStockMap[prod.id] !== undefined ? branchStockMap[prod.id] : Math.max(0, receivedQty - soldQty);

      // Formula: Sell-Through Rate = (Sold Quantity ÷ Received Quantity) × 100
      if (receivedQty > 0 && soldQty > 0) {
        const str = (soldQty / receivedQty) * 100;
        if (str >= 80) {
          qualifyingList.push({
            id: prod.id,
            barcode: prod.barcode || prod.code || 'N/A',
            name: prod.item_name || 'Product',
            cost_price: Number(prod.purchase_price || 0),
            mrp: Number(prod.mrp || 0),
            received_qty: receivedQty,
            sold_qty: soldQty,
            balance: balance,
            str: str.toFixed(1)
          });
        }
      }
    });

    // 7. Sort by highest Sell-Through Rate descending, take top 20 max
    const top20 = qualifyingList
      .sort((a, b) => parseFloat(b.str) - parseFloat(a.str) || b.sold_qty - a.sold_qty)
      .slice(0, 20)
      .map((item, idx) => ({ ...item, sl: idx + 1 }));

    return top20;
  }, [
    productsData, 
    saleItemsData, 
    salesData, 
    requisitionsData, 
    requisitionItemsData, 
    storeStocksData, 
    selectedStore, 
    selectedArea, 
    filteredStores, 
    startDate, 
    endDate
  ]);

  // Filtered Top 20 based on user's table search input
  const filteredTop20Products = useMemo(() => {
    if (!top20SearchText.trim()) return top20SellingProducts;
    const q = top20SearchText.trim().toLowerCase();
    return top20SellingProducts.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.barcode.toLowerCase().includes(q)
    );
  }, [top20SellingProducts, top20SearchText]);

  return (
    <div style={{ backgroundColor: '#f4f6f9', minHeight: '100vh', padding: '20px', color: '#1e293b', fontFamily: 'Segoe UI, Roboto, Helvetica, Arial, sans-serif' }}>
      
      {/* Header & Filter Controls Bar */}
      <div style={{ backgroundColor: '#fff', padding: '16px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', marginBottom: '20px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', margin: 0, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Dashboard <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>(Sales overview & summary)</span>
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Refresh Button */}
            <button 
              onClick={fetchDashboardData}
              title="Refresh Live Data"
              style={{
                padding: '6px 14px',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#2e6f40',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </button>

            {/* Reset All Filters Button */}
            {(selectedArea || selectedStore || isDateFilterActive) && (
              <button 
                onClick={handleResetFilters}
                title="Reset All Filters"
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fca5a5',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  color: '#991b1b',
                  fontWeight: 600,
                  fontSize: '0.85rem'
                }}
              >
                <XCircle size={14} />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', alignItems: 'flex-end' }}>
          
          {/* 1. Date Preset */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
              Date Preset
            </label>
            <CustomSelect 
              value={datePreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fff', color: '#334155', width: '100%', fontSize: '0.85rem' }}
            >
              <option value="ALL">-- All / Lifetime --</option>
              <option value="TODAY">Today</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="LAST_7_DAYS">Last 7 Days</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="LAST_MONTH">Last Month</option>
              <option value="CUSTOM">Custom Range</option>
            </CustomSelect>
          </div>

          {/* 2. From Date */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
              From Date
            </label>
            <input 
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatePreset('CUSTOM');
              }}
              style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fff', color: '#334155', width: '100%', fontSize: '0.85rem', boxSizing: 'border-box' }}
            />
          </div>

          {/* 3. To Date */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
              To Date
            </label>
            <input 
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDatePreset('CUSTOM');
              }}
              style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fff', color: '#334155', width: '100%', fontSize: '0.85rem', boxSizing: 'border-box' }}
            />
          </div>

          {/* 4. Area Selector */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
              Area
            </label>
            <CustomSelect 
              value={selectedArea}
              onChange={(e) => { setSelectedArea(e.target.value); setSelectedStore(''); }}
              style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fff', color: '#334155', width: '100%', fontSize: '0.85rem' }}
            >
              <option value="">-- Select AREA --</option>
              {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </CustomSelect>
          </div>

          {/* 5. Store Selector */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
              Store / Outlet
            </label>
            <CustomSelect 
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fff', color: '#334155', width: '100%', fontSize: '0.85rem' }}
            >
              <option value="">-- Select Store --</option>
              {filteredStores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </CustomSelect>
          </div>

        </div>

      </div>

      {/* Active Scope & Date Range Indicator Banner */}
      <div style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px', fontSize: '0.85rem' }}>
        <span style={{ fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Filter size={14} color="#2e6f40" /> Active Scope:
        </span>
        
        {/* Store / Area Scope Tag */}
        <span style={{ 
          padding: '4px 12px', 
          backgroundColor: '#e2f5ea', 
          color: '#166534', 
          borderRadius: '16px', 
          fontWeight: 600,
          border: '1px solid #bbf7d0',
          display: 'flex',
          alignItems: 'center',
          gap: '5px'
        }}>
          {selectedStore ? (
            <><Store size={14} /> Store: {stores.find(s => String(s.id) === String(selectedStore))?.name || 'Selected Store'}</>
          ) : selectedArea ? (
            <><MapPin size={14} /> Area: {areas.find(a => String(a.id) === String(selectedArea))?.name || 'Selected Area'} ({filteredStores.length} Stores Aggregated)</>
          ) : (
            <><Store size={14} /> All Stores Combined ({stores.length} Outlets)</>
          )}
        </span>

        {/* Date Scope Tag */}
        <span style={{ 
          padding: '4px 12px', 
          backgroundColor: isDateFilterActive ? '#eff6ff' : '#f1f5f9', 
          color: isDateFilterActive ? '#1e40af' : '#475569', 
          borderRadius: '16px', 
          fontWeight: 600,
          border: `1px solid ${isDateFilterActive ? '#bfdbfe' : '#e2e8f0'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '5px'
        }}>
          <Calendar size={14} />
          {isDateFilterActive 
            ? `Date Range: ${startDate || 'Start'} to ${endDate || 'Today'}` 
            : 'Date Range: All Time (Full History)'}
        </span>

        {/* Selected Period Sales Total Highlight */}
        {isDateFilterActive && (
          <span style={{
            padding: '4px 12px',
            backgroundColor: '#fef3c7',
            color: '#92400e',
            borderRadius: '16px',
            fontWeight: 700,
            border: '1px solid #fde68a'
          }}>
            Selected Period Sales: {formatCurrency(selectedPeriodSalesValue)}
          </span>
        )}
      </div>

      {/* 4 Summary Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px', marginBottom: '20px' }}>
        
        {/* Card 1: Today's Sales Value */}
        <div style={{ 
          backgroundColor: '#fff', 
          padding: '16px 20px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          borderLeft: '4px solid #2e6f40', 
          borderRadius: '4px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
          border: '1px solid #e2e8f0',
          borderLeftWidth: '4px'
        }}>
          <div>
            <div style={{ fontSize: '1.35rem', fontWeight: 'bold', color: '#0f172a' }}>
              {formatCurrency(todaySalesValue)}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>
              Today's Sales Value
            </div>
          </div>
          <div style={{ backgroundColor: '#2e6f40', borderRadius: '50%', width: '42px', height: '42px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', boxShadow: '0 2px 6px rgba(46, 111, 64, 0.3)' }}>
            <Clock size={20} />
          </div>
        </div>

        {/* Card 2: Last 7 Days Sales Value */}
        <div style={{ 
          backgroundColor: '#fff', 
          padding: '16px 20px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          borderLeft: '4px solid #f59e0b', 
          borderRadius: '4px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
          border: '1px solid #e2e8f0',
          borderLeftWidth: '4px'
        }}>
          <div>
            <div style={{ fontSize: '1.35rem', fontWeight: 'bold', color: '#0f172a' }}>
              {formatCurrency(last7DaysSalesValue)}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>
              Last 7 days Sales Value
            </div>
          </div>
          <div style={{ backgroundColor: '#f59e0b', borderRadius: '50%', width: '42px', height: '42px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', boxShadow: '0 2px 6px rgba(245, 158, 11, 0.3)' }}>
            <FileText size={20} />
          </div>
        </div>

        {/* Card 3: Current Month Sales Value */}
        <div style={{ 
          backgroundColor: '#fff', 
          padding: '16px 20px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          borderLeft: '4px solid #8b5cf6', 
          borderRadius: '4px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
          border: '1px solid #e2e8f0',
          borderLeftWidth: '4px'
        }}>
          <div>
            <div style={{ fontSize: '1.35rem', fontWeight: 'bold', color: '#0f172a' }}>
              {formatCurrency(currentMonthSalesValue)}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>
              Current Month Sales Value
            </div>
          </div>
          <div style={{ backgroundColor: '#8b5cf6', borderRadius: '50%', width: '42px', height: '42px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', boxShadow: '0 2px 6px rgba(139, 92, 246, 0.3)' }}>
            <CalendarDays size={20} />
          </div>
        </div>

        {/* Card 4: Last Month Sales Value */}
        <div style={{ 
          backgroundColor: '#fff', 
          padding: '16px 20px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          borderLeft: '4px solid #0284c7', 
          borderRadius: '4px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
          border: '1px solid #e2e8f0',
          borderLeftWidth: '4px'
        }}>
          <div>
            <div style={{ fontSize: '1.35rem', fontWeight: 'bold', color: '#0f172a' }}>
              {formatCurrency(lastMonthSalesValue)}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>
              Last Month Sales Value
            </div>
          </div>
          <div style={{ backgroundColor: '#0284c7', borderRadius: '50%', width: '42px', height: '42px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)' }}>
            <Calendar size={20} />
          </div>
        </div>

      </div>

      {/* Row 1 Charts: Trend Bar Chart & Current Year Sale */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '15px', marginBottom: '20px' }}>
        
        {/* Trend Bar Chart */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '18px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ fontSize: '0.95rem', color: '#0f172a', margin: 0, fontWeight: 600 }}>
              {isDateFilterActive ? 'Daily Sales Trend (Selected Period)' : 'Last Seven Days Sale'}
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Daily Progression</span>
          </div>
          <div style={{ height: '260px' }}>
            {trendBarChartData.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#94a3b8', fontSize: '13px' }}>
                No sales in selected date range
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendBarChartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={11} stroke="#64748b" />
                  <YAxis fontSize={11} stroke="#64748b" tickFormatter={(v) => `৳${v}`} />
                  <Tooltip 
                    formatter={(value) => [`৳ ${Number(value).toLocaleString()}`, 'Sale Amount']} 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                  <Bar dataKey="value" fill="#2e6f40" radius={[4, 4, 0, 0]} barSize={26}>
                    {trendBarChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Current Year Sale Area Chart */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '18px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ fontSize: '0.95rem', color: '#0f172a', margin: 0, fontWeight: 600 }}>
              Current Year Sale ({currentYear})
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Monthly Trajectory</span>
          </div>
          <div style={{ height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={currentYearSaleData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="yearSaleGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2e6f40" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#52be72" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={11} stroke="#64748b" />
                <YAxis fontSize={11} stroke="#64748b" tickFormatter={(v) => `৳${v}`} />
                <Tooltip 
                  formatter={(value) => [`৳ ${Number(value).toLocaleString()}`, 'Monthly Sale']} 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="value" stroke="#2e6f40" fillOpacity={1} fill="url(#yearSaleGradient)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2 Charts: Top Products, Category Wise & Customer Type Wise */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px', marginBottom: '20px' }}>
        
        {/* Top Selling Products */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '18px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ fontSize: '0.95rem', color: '#0f172a', margin: 0, fontWeight: 600 }}>
              Top Selling Products {isDateFilterActive ? '(Selected Period)' : '(Current Month)'}
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>By Qty</span>
          </div>
          <div style={{ height: '220px' }}>
            {topSellingProductsData.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#94a3b8', fontSize: '13px' }}>
                No sales records found
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topSellingProductsData} margin={{ top: 5, right: 15, left: -20, bottom: 15 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={10} interval={0} angle={-15} textAnchor="end" stroke="#64748b" />
                  <YAxis fontSize={10} stroke="#64748b" />
                  <Tooltip 
                    formatter={(value, name, item) => [`${value} pcs (৳ ${Number(item.payload.amount).toLocaleString()})`, 'Quantity Sold']}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={24}>
                    {topSellingProductsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category wise Sale */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '18px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ fontSize: '0.95rem', color: '#0f172a', margin: 0, fontWeight: 600 }}>
              Category wise Sale {isDateFilterActive ? '(Selected Period)' : '(Current Month)'}
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Share</span>
          </div>
          <div style={{ height: '220px' }}>
            {categorySaleData.length === 0 || (categorySaleData.length === 1 && categorySaleData[0].value === 0) ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#94a3b8', fontSize: '13px' }}>
                No category sales recorded
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={categorySaleData} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={45}
                    outerRadius={75} 
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categorySaleData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`৳ ${Number(value).toLocaleString()}`, 'Sale Value']}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Customer Type Wise Sale */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '18px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ fontSize: '0.95rem', color: '#0f172a', margin: 0, fontWeight: 600 }}>
              Customer Type Wise Sale {isDateFilterActive ? '(Selected Period)' : '(Current Month)'}
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Distribution</span>
          </div>
          <div style={{ height: '220px' }}>
            {customerTypeData.length === 0 || (customerTypeData.length === 1 && customerTypeData[0].value === 0) ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#94a3b8', fontSize: '13px' }}>
                No customer sales recorded
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={customerTypeData} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={45}
                    outerRadius={75} 
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {customerTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill || CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`৳ ${Number(value).toLocaleString()}`, 'Total Sales']}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* Premier Full-Width Section: 20 Top Selling Products Table */}
      <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '18px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)', marginBottom: '20px' }}>
        
        {/* Table Header Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={18} color="#2e6f40" />
              <h3 style={{ fontSize: '1.05rem', color: '#0f172a', margin: 0, fontWeight: 700 }}>
                20 Top Selling Products
              </h3>
              {isDateFilterActive && (
                <span style={{ fontSize: '0.75rem', backgroundColor: '#eff6ff', color: '#1d4ed8', fontWeight: 600, padding: '2px 8px', borderRadius: '12px' }}>
                  Selected Period
                </span>
              )}
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              {selectedStore 
                ? `Showing top selling products for: ${stores.find(s => String(s.id) === String(selectedStore))?.name || 'Selected Branch'}` 
                : selectedArea 
                  ? `Aggregated across branches in Area: ${areas.find(a => String(a.id) === String(selectedArea))?.name || 'Selected Area'} (${filteredStores.length} Branches)` 
                  : 'Total aggregated received qty, sold qty, and stock balance across all branches'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="Filter products..." 
                value={top20SearchText}
                onChange={(e) => setTop20SearchText(e.target.value)}
                style={{ 
                  padding: '6px 12px 6px 30px', 
                  border: '1px solid #cbd5e1', 
                  borderRadius: '4px', 
                  width: '200px', 
                  fontSize: '0.8rem',
                  outline: 'none'
                }} 
              />
            </div>
          </div>
        </div>

        {/* Wide Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1', color: '#334155' }}>
                <th style={{ textAlign: 'center', padding: '10px 8px', width: '45px' }}>SL</th>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>Barcode</th>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>Product Name</th>
                <th style={{ textAlign: 'right', padding: '10px 12px' }}>Cost Price</th>
                <th style={{ textAlign: 'right', padding: '10px 12px' }}>MRP</th>
                <th style={{ textAlign: 'right', padding: '10px 12px' }}>Received Qty</th>
                <th style={{ textAlign: 'right', padding: '10px 12px' }}>Sold Qty</th>
                <th style={{ textAlign: 'right', padding: '10px 12px' }}>Balance</th>
                <th style={{ textAlign: 'right', padding: '10px 12px' }}>Sell-Through Rate (%)</th>
              </tr>
            </thead>
            <tbody>
              {filteredTop20Products.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                    No top selling products found for the selected scope/filters
                  </td>
                </tr>
              ) : (
                filteredTop20Products.map((row) => (
                  <tr key={row.id || row.sl} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: row.sl % 2 === 0 ? '#fcfdfd' : '#ffffff' }}>
                    <td style={{ padding: '9px 8px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
                      {row.sl}
                    </td>
                    <td style={{ padding: '9px 12px', fontWeight: 600, color: '#2e6f40', fontFamily: 'monospace' }}>
                      {row.barcode}
                    </td>
                    <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0f172a', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {row.name}
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: '#475569', fontWeight: 500 }}>
                      {formatCurrency(row.cost_price)}
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                      {formatCurrency(row.mrp)}
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                      <span style={{ 
                        padding: '3px 8px', 
                        borderRadius: '4px', 
                        backgroundColor: '#eff6ff', 
                        color: '#1d4ed8', 
                        fontWeight: 600, 
                        fontSize: '0.78rem' 
                      }}>
                        {Number(row.received_qty).toLocaleString()} pcs
                      </span>
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                      <span style={{ 
                        padding: '3px 8px', 
                        borderRadius: '4px', 
                        backgroundColor: '#dcfce7', 
                        color: '#166534', 
                        fontWeight: 700, 
                        fontSize: '0.8rem' 
                      }}>
                        {Number(row.sold_qty).toLocaleString()} pcs
                      </span>
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                      <span style={{ 
                        padding: '3px 8px', 
                        borderRadius: '4px', 
                        backgroundColor: row.balance > 0 ? '#e0f2fe' : '#fee2e2', 
                        color: row.balance > 0 ? '#0369a1' : '#991b1b', 
                        fontWeight: 600, 
                        fontSize: '0.78rem' 
                      }}>
                        {Number(row.balance).toLocaleString()} pcs
                      </span>
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                      <span style={{ 
                        padding: '3px 8px', 
                        borderRadius: '4px', 
                        backgroundColor: '#fef3c7', 
                        color: '#92400e', 
                        fontWeight: 700, 
                        fontSize: '0.8rem' 
                      }}>
                        {row.str}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Row 3 Tables: Sale Growth & Store Wise Sales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '15px' }}>
        
        {/* Sale Growth Table */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '18px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ fontSize: '0.95rem', color: '#0f172a', margin: 0, fontWeight: 600 }}>
              {isDateFilterActive ? 'Daily Sale Growth (Selected Period)' : 'Last Seven Days Sale Growth'}
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Day-over-Day</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ textAlign: 'center', padding: '8px 10px', width: '30px' }}>#</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px' }}>Date</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px' }}>Sale Amount</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px' }}>Prev. Date Sale</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px' }}>Vs Prev. Date(%)</th>
                </tr>
              </thead>
              <tbody>
                {saleGrowthTable.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfdfd' }}>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <div style={{ 
                        width: '18px', 
                        height: '18px', 
                        borderRadius: '50%', 
                        backgroundColor: row.growthType === 'positive' ? '#dcfce7' : row.growthType === 'negative' ? '#fee2e2' : '#f1f5f9', 
                        display: 'inline-flex', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        fontSize: '9px', 
                        color: row.growthType === 'positive' ? '#166534' : row.growthType === 'negative' ? '#991b1b' : '#64748b' 
                      }}>
                        {row.growthType === 'positive' ? '▲' : row.growthType === 'negative' ? '▼' : '•'}
                      </div>
                    </td>
                    <td style={{ padding: '8px 10px', fontWeight: 500, color: '#334155' }}>{row.date}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 'bold', color: '#2e6f40' }}>
                      {formatCurrency(row.amount)}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: '#64748b' }}>
                      {formatCurrency(row.prevAmount)}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: row.growthType === 'positive' ? '#dcfce7' : row.growthType === 'negative' ? '#fee2e2' : '#f1f5f9',
                        color: row.growthType === 'positive' ? '#166534' : row.growthType === 'negative' ? '#991b1b' : '#64748b'
                      }}>
                        {row.vs}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Store Wise Sales Table */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '18px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ fontSize: '0.95rem', color: '#0f172a', margin: 0, fontWeight: 600 }}>
              Store Wise Sales {isDateFilterActive ? '(Selected Period)' : "(Today's Sales)"}
            </h3>
            
            <input 
              type="text" 
              placeholder="Search store..." 
              value={storeSearchText}
              onChange={(e) => setStoreSearchText(e.target.value)}
              style={{ 
                padding: '5px 10px', 
                border: '1px solid #cbd5e1', 
                borderRadius: '4px', 
                width: '150px', 
                fontSize: '0.8rem',
                outline: 'none'
              }} 
            />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ textAlign: 'center', padding: '8px 10px', width: '40px' }}>SL</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px' }}>Store Name</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px' }}>
                    {isDateFilterActive ? 'Period Sales' : "Today's Sale"}
                  </th>
                  <th style={{ textAlign: 'right', padding: '8px 10px' }}>Today's Sale</th>
                </tr>
              </thead>
              <tbody>
                {storeSalesTable.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                      No active store sales found
                    </td>
                  </tr>
                ) : (
                  storeSalesTable.map((row, idx) => (
                    <tr key={row.id || idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfdfd' }}>
                      <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748b' }}>{row.sl}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 600, color: '#1e293b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Store size={14} color="#2e6f40" />
                          {row.name}
                        </div>
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 'bold', color: row.periodAmount > 0 ? '#2e6f40' : '#64748b' }}>
                        {formatCurrency(row.periodAmount)}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#475569', fontWeight: 500 }}>
                        {formatCurrency(row.todayAmount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Dashboard;
