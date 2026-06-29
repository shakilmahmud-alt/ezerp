import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import CRM from './pages/CRM';
import Settings from './pages/Settings';
import PlaceholderPage from './pages/PlaceholderPage';
import Category from './pages/Category';
import SubCategory from './pages/SubCategory';
import SubSubcategory from './pages/SubSubcategory';
import Brand from './pages/Brand';
import VatPolicy from './pages/VatPolicy';
import Vendor from './pages/Vendor';
import Product from './pages/Product';
import ProductQuickSearch from './pages/ProductQuickSearch';
import VendorWiseProductList from './pages/VendorWiseProductList';
import StoreTransferPermission from './pages/StoreTransferPermission';
import PurchaseOrderVendor from './pages/PurchaseOrderVendor';
import PurchaseReceive from './pages/PurchaseReceive';
import PurchaseReturn from './pages/PurchaseReturn';
import ReceiveFromShop from './pages/ReceiveFromShop';
import DamageAndLost from './pages/DamageAndLost';
import StoreDelivery from './pages/StoreDelivery';
import BarcodePrint from './pages/BarcodePrint';
import Reprint from './pages/Reprint';
import PriceChangeExcel from './pages/PriceChangeExcel';
import Promotion from './pages/Promotion';
import CustomerType from './pages/CustomerType';
import CustomerEntry from './pages/CustomerEntry';
import PointEarnPolicy from './pages/PointEarnPolicy';
import CustomerReport from './pages/CustomerReport';
import RequisitionApproval from './pages/RequisitionApproval';
function App() {
  return (
    <BrowserRouter>
      <Toaster 
        position="bottom-left" 
        toastOptions={{ 
          success: { style: { background: 'var(--accent-primary)', color: '#fff' }, iconTheme: { primary: '#fff', secondary: 'var(--accent-primary)' } },
          error: { style: { background: 'var(--danger)', color: '#fff' }, iconTheme: { primary: '#fff', secondary: 'var(--danger)' } }
        }} 
      />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<PlaceholderPage />} />
          <Route path="dashboard" element={<Dashboard />} />
          
          <Route path="catalog" element={<Settings />} />
          <Route path="catalog/category" element={<Category />} />
          <Route path="catalog/subcategory" element={<SubCategory />} />
          <Route path="catalog/sub-sub-category" element={<SubSubcategory />} />
          <Route path="catalog/brand" element={<Brand />} />
          <Route path="catalog/vat-policy" element={<VatPolicy />} />
          <Route path="catalog/vendor" element={<Vendor />} />
          <Route path="catalog/product" element={<Product />} />
          <Route path="catalog/measuring-unit" element={<PlaceholderPage />} />
          <Route path="catalog/product-quick-search" element={<ProductQuickSearch />} />
          <Route path="catalog/vendorwise-product-list" element={<VendorWiseProductList />} />
          <Route path="catalog/store-transfer-permission" element={<StoreTransferPermission />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="inventory/purchase-order-vendor" element={<PurchaseOrderVendor />} />
          <Route path="inventory/purchase-receive" element={<PurchaseReceive />} />
          <Route path="inventory/purchase-return" element={<PurchaseReturn />} />
          <Route path="inventory/receive-from-shop" element={<ReceiveFromShop />} />
          <Route path="inventory/damage-and-lost" element={<DamageAndLost />} />
          <Route path="inventory/store-delivery" element={<StoreDelivery />} />
          <Route path="inventory/barcode-print" element={<BarcodePrint />} />
          <Route path="inventory/reprint" element={<Reprint />} />
          <Route path="promotion" element={<PlaceholderPage />} />
          <Route path="promotion/price-change-excel" element={<PriceChangeExcel />} />
          <Route path="promotion/promotion" element={<Promotion />} />
          <Route path="promotion/price-change" element={<PlaceholderPage />} />
          <Route path="promotion/promotion-extend" element={<PlaceholderPage />} />
          <Route path="promotion/promotion-inactive" element={<PlaceholderPage />} />
          <Route path="crm" element={<CRM />} />
          <Route path="crm/customer-type" element={<CustomerType />} />
          <Route path="crm/customer-entry" element={<CustomerEntry />} />
          <Route path="crm/point-earn-policy" element={<PointEarnPolicy />} />
          <Route path="crm/customer-report" element={<CustomerReport />} />
          <Route path="crm/discount-reference" element={<PlaceholderPage />} />
          <Route path="app-module" element={<PlaceholderPage />} />
          <Route path="approval" element={<PlaceholderPage />} />
          <Route path="approval/requisition-approval" element={<RequisitionApproval />} />
          
          <Route path="*" element={<PlaceholderPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
