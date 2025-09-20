import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { fetchRevenue } from '../api/revenue';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

const toIDR = (n) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

function TimeSeriesGraph() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bucket, setBucket] = useState('daily');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewWindow, setViewWindow] = useState({ start: 0, end: 20 }); // For panning
  const [isAutoScroll, setIsAutoScroll] = useState(true);

  const bucketOptions = [
    { value: 'daily', label: 'Daily', days: 30 },
    { value: 'weekly', label: 'Weekly', days: 84 }, // 12 weeks
    { value: 'monthly', label: 'Monthly', days: 365 }, // 12 months
  ];

  const loadRevenueData = async (selectedBucket = bucket) => {
    try {
      setLoading(true);
      setError(null);
      
      const bucketConfig = bucketOptions.find(opt => opt.value === selectedBucket);
      const limit = Math.floor(bucketConfig.days / (selectedBucket === 'daily' ? 1 : selectedBucket === 'weekly' ? 7 : 30));
      
      const result = await fetchRevenue({ bucket: selectedBucket, limit });
      const newData = result.data || [];
      setData(newData);
      
      // Auto-scroll to show latest data when new data arrives
      if (isAutoScroll && newData.length > 20) {
        setViewWindow({ start: Math.max(0, newData.length - 20), end: newData.length });
      } else {
        setViewWindow({ start: 0, end: Math.min(20, newData.length) });
      }
    } catch (err) {
      // console.error('Failed to load revenue data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRevenueData();
  }, []);

  const handleBucketChange = (newBucket) => {
    setBucket(newBucket);
    setZoomLevel(1); // Reset zoom when changing bucket
    setViewWindow({ start: 0, end: 20 }); // Reset view window
    loadRevenueData(newBucket);
  };

  const handleZoom = (zoomFactor) => {
    setZoomLevel(prev => Math.max(0.5, Math.min(3, prev * zoomFactor)));
  };

  const handlePan = (direction) => {
    const windowSize = viewWindow.end - viewWindow.start;
    const step = Math.max(1, Math.floor(windowSize * 0.3));
    
    if (direction === 'left' && viewWindow.start > 0) {
      const newStart = Math.max(0, viewWindow.start - step);
      setViewWindow({ start: newStart, end: newStart + windowSize });
    } else if (direction === 'right' && viewWindow.end < data.length) {
      const newEnd = Math.min(data.length, viewWindow.end + step);
      setViewWindow({ start: newEnd - windowSize, end: newEnd });
    }
  };

  const handleReset = () => {
    setZoomLevel(1);
    if (isAutoScroll && data.length > 20) {
      setViewWindow({ start: Math.max(0, data.length - 20), end: data.length });
    } else {
      setViewWindow({ start: 0, end: Math.min(20, data.length) });
    }
  };

  // Calculate statistics
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  const avgRevenue = data.length > 0 ? totalRevenue / data.length : 0;
  const maxRevenue = Math.max(...data.map(item => item.revenue), 0);
  const totalInvoices = data.reduce((sum, item) => sum + item.invoiceCount, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mt-12 bg-white dark:bg-[#1E2139] rounded-lg shadow-lg p-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Revenue Analysis
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Track revenue trends over time
          </p>
        </div>

        {/* Time Period Controls */}
        <div className="flex items-center space-x-2 mt-4 md:mt-0">
          {bucketOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleBucketChange(option.value)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                bucket === option.value
                  ? 'bg-[#7c5dfa] text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {toIDR(totalRevenue)}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <div className="text-sm text-gray-600 dark:text-gray-400">Average Revenue</div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {toIDR(avgRevenue)}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <div className="text-sm text-gray-600 dark:text-gray-400">Peak Revenue</div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {toIDR(maxRevenue)}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Invoices</div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {totalInvoices.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Chart Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 space-y-2 md:space-y-0">
        <div className="flex items-center space-x-4">
          {/* Zoom Controls */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Zoom:</span>
            <button
              onClick={() => handleZoom(1.2)}
              className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              +
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[60px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => handleZoom(0.8)}
              className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              -
            </button>
          </div>

          {/* Pan Controls */}
          {data.length > 20 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Pan:</span>
              <button
                onClick={() => handlePan('left')}
                disabled={viewWindow.start === 0}
                className={`px-3 py-1 rounded transition-colors ${
                  viewWindow.start === 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                ←
              </button>
              <button
                onClick={() => handlePan('right')}
                disabled={viewWindow.end >= data.length}
                className={`px-3 py-1 rounded transition-colors ${
                  viewWindow.end >= data.length
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                →
              </button>
            </div>
          )}

          {/* Auto-scroll Toggle */}
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Auto-scroll:</label>
            <button
              onClick={() => setIsAutoScroll(!isAutoScroll)}
              className={`px-3 py-1 rounded transition-colors ${
                isAutoScroll
                  ? 'bg-[#7c5dfa] text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {isAutoScroll ? 'On' : 'Off'}
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleReset}
            className="px-3 py-1 bg-[#7c5dfa] text-white rounded hover:opacity-80 transition-opacity"
          >
            Reset View
          </button>
          
          <button
            onClick={() => loadRevenueData()}
            disabled={loading}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              loading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-[#7c5dfa] text-white hover:opacity-80'
            }`}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Chart Area */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
            <div className="text-gray-600 dark:text-gray-400">Loading revenue data...</div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <div className="text-red-800 dark:text-red-400 font-medium">Failed to load revenue data</div>
            <div className="text-red-600 dark:text-red-500 text-sm mt-1">{error}</div>
          </div>
        )}

        {!loading && !error && data.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 dark:text-gray-400">No revenue data available</div>
            <div className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Try creating some paid invoices to see revenue trends
            </div>
          </div>
        )}

        {!loading && !error && data.length > 0 && (
          <div className="relative overflow-hidden rounded-lg" style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart 
                data={data.slice(viewWindow.start, viewWindow.end)} 
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c5dfa" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#7c5dfa" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="period" 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={{ stroke: '#d1d5db' }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={{ stroke: '#d1d5db' }}
                  tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-4">
                          <p className="font-medium text-gray-900 dark:text-white">{`Period: ${label}`}</p>
                          <p className="text-[#7c5dfa]">
                            {`Revenue: ${toIDR(payload[0].value)}`}
                          </p>
                          {payload[0].payload.invoiceCount && (
                            <p className="text-gray-600 dark:text-gray-400 text-sm">
                              {`Invoices: ${payload[0].payload.invoiceCount}`}
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#7c5dfa"
                  strokeWidth={3}
                  fill="url(#colorRevenue)"
                  name="Revenue"
                  dot={{ r: 4, fill: '#7c5dfa' }}
                  activeDot={{ r: 6, fill: '#7c5dfa', strokeWidth: 2, stroke: '#ffffff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
            
            {/* View Indicator */}
            {data.length > 20 && (
              <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                Showing {viewWindow.start + 1}-{viewWindow.end} of {data.length}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Data Table (for now) */}
      {!loading && !error && data.length > 0 && (
        <div className="mt-6">
          <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Recent Data ({data.length} periods)
          </div>
          <div className="max-h-40 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-400">Period</th>
                  <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">Revenue</th>
                  <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">Invoices</th>
                  <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">Avg Value</th>
                </tr>
              </thead>
              <tbody>
                {data.slice(-10).reverse().map((item, idx) => (
                  <tr key={idx} className="border-t border-gray-200 dark:border-gray-700">
                    <td className="px-3 py-2 text-gray-900 dark:text-white">{item.period}</td>
                    <td className="px-3 py-2 text-right text-gray-900 dark:text-white">{toIDR(item.revenue)}</td>
                    <td className="px-3 py-2 text-right text-gray-900 dark:text-white">{item.invoiceCount}</td>
                    <td className="px-3 py-2 text-right text-gray-900 dark:text-white">{toIDR(item.avgInvoiceValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default TimeSeriesGraph;