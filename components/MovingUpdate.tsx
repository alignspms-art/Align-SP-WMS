
import React, { useState, useEffect, useCallback } from 'react';
import { Home, Search, FileDown, Loader2, Filter, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

const MovingUpdate: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<{ type: 'month' | 'year'; value: number }>({ type: 'month', value: 1 });
  const [searchTerm, setSearchTerm] = useState('');

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch all items
      const { data: allItems, error: itemsError } = await supabase
        .from('items')
        .select('*');
      
      if (itemsError) throw itemsError;

      // 2. Calculate cutoff date
      const cutoffDate = new Date();
      if (timeFilter.type === 'month') {
        cutoffDate.setMonth(cutoffDate.getMonth() - timeFilter.value);
      } else {
        cutoffDate.setFullYear(cutoffDate.getFullYear() - timeFilter.value);
      }

      // 3. Fetch move orders in that range to find "Moved" items
      const { data: recentMOs, error: moError } = await supabase
        .from('move_orders')
        .select('items, created_at')
        .gte('created_at', cutoffDate.toISOString());

      if (moError) throw moError;

      // 4. Collect SKUs that HAVE moved
      const movedSKUs = new Set<string>();
      (recentMOs as any[])?.forEach((mo: any) => {
        mo.items?.forEach((item: any) => {
          if (item.sku) movedSKUs.add(item.sku);
        });
      });

      // 5. Filter items that have NOT moved
      const nonMovingItems = (allItems as any[])?.filter((item: any) => {
        const matchesSearch = !searchTerm || 
          item.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
          item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.code?.toLowerCase().includes(searchTerm.toLowerCase());
        
        return matchesSearch && !movedSKUs.has(item.sku);
      }) || [];

      setItems(nonMovingItems);
    } catch (err) {
      console.error("Error fetching moving update data:", err);
      alert("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [timeFilter, searchTerm]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleDownloadExcel = () => {
    const exportData = items.map((item, idx) => ({
      'SL': idx + 1,
      'Code': item.code,
      'SKU': item.sku,
      'Item Name': item.name,
      'Location': item.location,
      'UOM': item.uom,
      'Type': item.type,
      'Stock': item.on_hand_stock,
      'Last Issued': item.last_issued ? new Date(item.last_issued).toLocaleDateString() : 'Never'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Non-Moving Items");
    
    const fileName = `Non_Moving_Items_${timeFilter.value}_${timeFilter.type}s.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] space-y-4">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2 text-[11px] font-bold text-[#2d808e] uppercase tracking-wider">
          <Home size={14} className="text-gray-400" />
          <span className="text-gray-300">/</span>
          <span className="text-[#2d808e]">ANALYSIS</span>
          <span className="text-gray-300">/</span>
          <span className="text-[#2d808e]">MOVING UPDATE (NON-MOVING)</span>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={handleDownloadExcel}
            className="bg-[#2d808e] text-white px-6 py-2 rounded text-[13px] font-black shadow-lg shadow-cyan-900/10 hover:bg-[#256b78] transition-all flex items-center space-x-2 uppercase tracking-tight"
          >
            <FileDown size={16} strokeWidth={3} />
            <span>Download Excel</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-100">
            <button 
              onClick={() => setTimeFilter({ ...timeFilter, type: 'month' })}
              className={`px-4 py-1.5 rounded-md text-[11px] font-black uppercase transition-all ${timeFilter.type === 'month' ? 'bg-[#2d808e] text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Monthly
            </button>
            <button 
              onClick={() => setTimeFilter({ ...timeFilter, type: 'year' })}
              className={`px-4 py-1.5 rounded-md text-[11px] font-black uppercase transition-all ${timeFilter.type === 'year' ? 'bg-[#2d808e] text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Yearly
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Period:</span>
            <select 
              value={timeFilter.value}
              onChange={(e) => setTimeFilter({ ...timeFilter, value: parseInt(e.target.value) })}
              className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold text-[#2d808e] outline-none focus:ring-2 focus:ring-[#2d808e]/20"
            >
              {timeFilter.type === 'month' ? (
                [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                  <option key={m} value={m}>{m} {m === 1 ? 'Month' : 'Months'}</option>
                ))
              ) : (
                [1, 2, 3, 4, 5].map(y => (
                  <option key={y} value={y}>{y} {y === 1 ? 'Year' : 'Years'}</option>
                ))
              )}
            </select>
          </div>

          <div className="h-6 w-px bg-gray-100 hidden md:block"></div>

          <div className="relative flex-1 min-w-[240px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <input 
              type="text"
              placeholder="Filter by Name/SKU/Code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchItems()}
              className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-transparent rounded-lg outline-none text-[11px] font-medium text-gray-600 focus:bg-white focus:border-[#2d808e]/30 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
            Non-Moving Items: <span className="text-red-500">{items.length}</span>
          </div>
          <button 
            onClick={fetchItems}
            className="p-2 text-[#2d808e] hover:bg-cyan-50 rounded-lg transition-all"
            title="Refresh Report"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm flex flex-col">
        <div className="overflow-auto scrollbar-thin">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-[#fcfcfc] sticky top-0 z-10 border-b border-gray-100 shadow-sm">
              <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-5 w-16 text-center">SL</th>
                <th className="px-6 py-5 w-32 text-center">Code</th>
                <th className="px-6 py-5 w-32 text-center">SKU</th>
                <th className="px-6 py-5">Item Description</th>
                <th className="px-6 py-5 w-32 text-center">UOM</th>
                <th className="px-6 py-5 w-40 text-center">Stock Info</th>
                <th className="px-6 py-5 w-40 text-center">Last Activity</th>
                <th className="px-6 py-5 w-32 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="text-[11px] font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <Loader2 className="animate-spin text-[#2d808e]" size={32} />
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Generating Analysis Report...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
                        <Filter className="text-emerald-500 opacity-40" size={24} />
                      </div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">All items have moved within this period</span>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4 text-center text-gray-400">{idx + 1}</td>
                    <td className="px-6 py-4 text-center font-bold text-gray-800">{item.code}</td>
                    <td className="px-6 py-4 text-center text-gray-500 font-mono tracking-tighter">{item.sku}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-gray-800 font-black uppercase tracking-tight">{item.name}</span>
                        <span className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">{item.type || 'N/A'} • {item.location || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-[9px] font-black text-gray-500 uppercase">{item.uom}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className={`text-[13px] font-black ${item.on_hand_stock <= 0 ? 'text-red-500' : 'text-[#2d808e]'}`}>{item.on_hand_stock}</span>
                        <span className="text-[8px] font-black text-gray-300 uppercase tracking-wider">On-Hand</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-gray-600 font-bold">{item.last_issued ? new Date(item.last_issued).toLocaleDateString('en-GB') : 'N/A'}</span>
                        <span className="text-[8px] font-black text-gray-300 uppercase tracking-wider">Last Issue</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-3 py-1 bg-red-50 text-red-500 text-[9px] font-black uppercase rounded-full border border-red-100">
                        Dead Stock?
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MovingUpdate;
