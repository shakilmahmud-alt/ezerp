import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
  PieChart, Pie, Cell
} from 'recharts';
import { Clock, FileText, CalendarDays, Calendar } from 'lucide-react';

// --- Dummy Data ---
const lastSevenDaysSaleData = [];
const currentYearSaleData = [];
const topSellingProductsData = [];
const categorySaleData = [];
const customerTypeData = [];
const saleGrowthTable = [];
const storeSalesTable = [];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a05195', '#d45087', '#f95d6a', '#ff7c43', '#ffa600'];

const Dashboard = () => {
  return (
    <div style={{ backgroundColor: '#f4f6f9', minHeight: '100%', padding: '20px', color: '#333', fontFamily: 'sans-serif' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 500 }}>Dashboard <span style={{ fontSize: '0.9rem', color: '#666' }}>(Sales overview & summary)</span></h2>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <select style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff', color: '#333' }}>
            <option>-- Select AREA --</option>
          </select>
          <select style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff', color: '#333' }}>
            <option>-- Select Store --</option>
          </select>
        </div>
      </div>

      {/* 4 Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '20px' }}>
        
        <div style={{ backgroundColor: '#fff', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid #6f00ff', borderTop: '1px solid #eee', borderRight: '1px solid #eee', borderBottom: '1px solid #eee' }}>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>৳ 0</div>
            <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>Today's Sales Value</div>
          </div>
          <div style={{ backgroundColor: '#6f00ff', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff' }}>
            <Clock size={20} />
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid #f39c12', borderTop: '1px solid #eee', borderRight: '1px solid #eee', borderBottom: '1px solid #eee' }}>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>৳ 0</div>
            <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>Last 7 days Sales Value</div>
          </div>
          <div style={{ backgroundColor: '#f39c12', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff' }}>
            <FileText size={20} />
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid #9b59b6', borderTop: '1px solid #eee', borderRight: '1px solid #eee', borderBottom: '1px solid #eee' }}>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>৳ 0</div>
            <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>Current Month Sales Value</div>
          </div>
          <div style={{ backgroundColor: '#9b59b6', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff' }}>
            <CalendarDays size={20} />
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid #16a085', borderTop: '1px solid #eee', borderRight: '1px solid #eee', borderBottom: '1px solid #eee' }}>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>৳ 0</div>
            <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>Last Month Sales Value</div>
          </div>
          <div style={{ backgroundColor: '#16a085', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff' }}>
            <Calendar size={20} />
          </div>
        </div>

      </div>

      {/* Row 1 Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
        
        {/* Last Seven Days Sale */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #eee', padding: '15px' }}>
          <h3 style={{ fontSize: '0.9rem', color: '#333', marginTop: 0, marginBottom: '15px', fontWeight: 500 }}>Last Seven Days Sale</h3>
          <div style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={lastSevenDaysSaleData} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" fontSize={11} />
                <Tooltip />
                <Bar dataKey="value" barSize={15}>
                  {lastSevenDaysSaleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Current Year Sale */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #eee', padding: '15px' }}>
          <h3 style={{ fontSize: '0.9rem', color: '#333', marginTop: 0, marginBottom: '15px', fontWeight: 500 }}>Current Year Sale</h3>
          <div style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={currentYearSaleData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#6f00ff" fill="#e8d5ff" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2 Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '15px', marginBottom: '20px' }}>
        
        {/* Top Selling Products */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #eee', padding: '15px' }}>
          <h3 style={{ fontSize: '0.9rem', color: '#333', marginTop: 0, marginBottom: '15px', fontWeight: 500 }}>Top Selling Products (Current Month)</h3>
          <div style={{ height: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topSellingProductsData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={9} interval={0} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Bar dataKey="value" barSize={30}>
                  {topSellingProductsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category wise Sale */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #eee', padding: '15px' }}>
          <h3 style={{ fontSize: '0.9rem', color: '#333', marginTop: 0, marginBottom: '15px', fontWeight: 500 }}>Category wise Sale (Current Month)</h3>
          <div style={{ height: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categorySaleData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value">
                  {categorySaleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Customer Type Wise Sale */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #eee', padding: '15px' }}>
          <h3 style={{ fontSize: '0.9rem', color: '#333', marginTop: 0, marginBottom: '15px', fontWeight: 500 }}>Customer Type Wise Sale (Current Month)</h3>
          <div style={{ height: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={customerTypeData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value">
                  {customerTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3 Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
        
        {/* Last Seven Days Sale Growth */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #eee', padding: '15px' }}>
          <h3 style={{ fontSize: '0.9rem', color: '#333', marginTop: 0, marginBottom: '15px', fontWeight: 500 }}>Last Seven Days Sale Growth</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #ddd' }}>
                  <th style={{ textAlign: 'left', padding: '8px' }}></th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Sale Amount</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Prev. Date Sale</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Vs Prev. Date(%)</th>
                </tr>
              </thead>
              <tbody>
                {saleGrowthTable.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '8px' }}><div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#eee', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '8px', color: '#333' }}>+</div></td>
                    <td style={{ padding: '8px' }}>{row.date}</td>
                    <td style={{ padding: '8px' }}>{row.amount.toLocaleString()}</td>
                    <td style={{ padding: '8px' }}>{row.prevAmount.toLocaleString()}</td>
                    <td style={{ padding: '8px' }}>{row.vs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Store Wise Today's Sales */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #eee', padding: '15px' }}>
          <h3 style={{ fontSize: '0.9rem', color: '#333', marginTop: 0, marginBottom: '15px', fontWeight: 500 }}>Store Wise Today's Sales</h3>
          
          <div style={{ marginBottom: '10px' }}>
            <input type="text" placeholder="Search" style={{ padding: '6px', border: '1px solid #ccc', borderRadius: '4px', width: '200px', fontSize: '0.8rem' }} />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #ddd' }}>
                  <th style={{ textAlign: 'left', padding: '8px' }}>SL</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Name</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>Sale Amount</th>
                </tr>
              </thead>
              <tbody>
                {storeSalesTable.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '8px' }}>{row.sl}</td>
                    <td style={{ padding: '8px' }}>{row.name}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{row.amount}</td>
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

export default Dashboard;
