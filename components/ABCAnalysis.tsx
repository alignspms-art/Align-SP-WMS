
import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Search, 
  FileSpreadsheet, 
  Loader2, 
  RefreshCw,
  Info
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

const ABCAnalysis: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [analysisType, setAnalysisType] = useState<'QTY' | 'COST'>('QTY');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      let allItems: any[] = [];
      let from = 0;
      let to = 999;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('items')
          .select('*')
          .range(from, to);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allItems = [...allItems, ...data];
          if (data.length < 1000) {
            hasMore = false;
          } else {
            from += 1000;
            to += 1000;
          }
        } else {
          hasMore = false;
        }
      }
      
      setItems(allItems);
    } catch (err) {
      console.error('Error fetching items for ABC analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const analyzedData = useMemo(() => {
    if (items.length === 0) return [];

    // Calculate base metrics
    const processed = items.map(item => {
      const total_qty = (item.issued_qty || 0) + (item.received_qty || 0);
      const total_value = total_qty * (item.avg_price || 0);
      return {
        ...item,
        total_qty,
        total_value
      };
    });

    // Sort by the chosen metric descending
    const metric = analysisType === 'QTY' ? 'total_qty' : 'total_value';
    processed.sort((a, b) => b[metric] - a[metric]);

    // Calculate total sum of the metric
    const totalSum = processed.reduce((sum, item) => sum + item[metric], 0);

    if (totalSum === 0) {
      return processed.map(item => ({
        ...item,
        category: 'C' as const,
        cumulative_percentage: 0
      }));
    }

    // Assign categories based on cumulative percentage
    let cumulativeSum = 0;
    return processed.map(item => {
      cumulativeSum += item[metric];
      const cumulative_percentage = (cumulativeSum / totalSum) * 100;
      
      let category: 'A' | 'B' | 'C' = 'C';
      if (cumulative_percentage <= 70) {
        category = 'A';
      } else if (cumulative_percentage <= 90) {
        category = 'B';
      } else {
        category = 'C';
      }

      return {
        ...item,
        category,
        cumulative_percentage
      };
    });
  }, [items, analysisType]);

  const stats = useMemo(() => {
    const a = analyzedData.filter(i => i.category === 'A');
    const b = analyzedData.filter(i => i.category === 'B');
    const c = analyzedData.filter(i => i.category === 'C');

    const metric = analysisType === 'QTY' ? 'total_qty' : 'total_value';
    const totalVal = analyzedData.reduce((sum, i) => sum + i[metric], 0);

    return {
      A: { items: a, count: a.length, value: a.reduce((sum, i) => sum + i[metric], 0), percent: totalVal ? (a.reduce((sum, i) => sum + i[metric], 0) / totalVal) * 100 : 0 },
      B: { items: b, count: b.length, value: b.reduce((sum, i) => sum + i[metric], 0), percent: totalVal ? (b.reduce((sum, i) => sum + i[metric], 0) / totalVal) * 100 : 0 },
      C: { items: c, count: c.length, value: c.reduce((sum, i) => sum + i[metric], 0), percent: totalVal ? (c.reduce((sum, i) => sum + i[metric], 0) / totalVal) * 100 : 0 }
    };
  }, [analyzedData, analysisType]);

  const handleExportExcel = () => {
    const exportData = analyzedData.map(item => ({
      'Category': item.category,
      'Item Code': item.sku,
      'Item Name': item.name,
      'On Hand Qty': item.on_hand_stock,
      'Transactions Qty': item.total_qty,
      ...(analysisType === 'COST' ? {
        'Avg Price': item.avg_price,
        'Total Value': item.total_value,
      } : {}),
      'Cumulative %': item.cumulative_percentage.toFixed(2) + '%'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ABC Analysis");
    XLSX.writeFile(workbook, `ABC_Analysis_${analysisType}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredData = analyzedData.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-3">
            <BarChart3 className="text-[#2d808e]" size={28} />
            ABC Analysis Dashboard
          </h2>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
            Real-time Inventory Classification | Currency: BDT
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button 
              onClick={() => setAnalysisType('QTY')}
              className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${analysisType === 'QTY' ? 'bg-white text-[#2d808e] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              By Transaction
            </button>
            <button 
              onClick={() => setAnalysisType('COST')}
              className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${analysisType === 'COST' ? 'bg-white text-[#2d808e] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              By Cost
            </button>
          </div>
          <button 
            onClick={fetchData}
            className="p-2.5 bg-white border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#2d808e] text-white text-[11px] font-black uppercase rounded-xl hover:bg-[#256b78] transition-all shadow-lg"
          >
            <FileSpreadsheet size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[24px] border-2 border-emerald-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-[100px] -mr-12 -mt-12 opacity-50 transition-all group-hover:scale-110"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                <TrendingUp size={20} />
              </div>
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg uppercase">Category A</span>
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Items Count</p>
            <h3 className="text-3xl font-black text-gray-800">{stats.A.count}</h3>
            <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-end">
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Total {analysisType === 'QTY' ? 'Qty' : 'Value'}</p>
                <p className="text-sm font-black text-gray-700">
                  {analysisType === 'COST' ? 'BDT ' : ''}{stats.A.value.toLocaleString()}
                </p>
              </div>
              <p className="text-[11px] font-black text-emerald-600">{stats.A.percent.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[24px] border-2 border-amber-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-[100px] -mr-12 -mt-12 opacity-50 transition-all group-hover:scale-110"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                <Activity size={20} />
              </div>
              <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg uppercase">Category B</span>
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Items Count</p>
            <h3 className="text-3xl font-black text-gray-800">{stats.B.count}</h3>
            <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-end">
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Total {analysisType === 'QTY' ? 'Qty' : 'Value'}</p>
                <p className="text-sm font-black text-gray-700">
                  {analysisType === 'COST' ? 'BDT ' : ''}{stats.B.value.toLocaleString()}
                </p>
              </div>
              <p className="text-[11px] font-black text-amber-600">{stats.B.percent.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[24px] border-2 border-gray-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gray-50 rounded-bl-[100px] -mr-12 -mt-12 opacity-50 transition-all group-hover:scale-110"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-600">
                <TrendingDown size={20} />
              </div>
              <span className="text-[10px] font-black text-gray-600 bg-gray-50 px-2 py-1 rounded-lg uppercase">Category C</span>
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Items Count</p>
            <h3 className="text-3xl font-black text-gray-800">{stats.C.count}</h3>
            <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-end">
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Total {analysisType === 'QTY' ? 'Qty' : 'Value'}</p>
                <p className="text-sm font-black text-gray-700">
                  {analysisType === 'COST' ? 'BDT ' : ''}{stats.C.value.toLocaleString()}
                </p>
              </div>
              <p className="text-[11px] font-black text-gray-600">{stats.C.percent.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Details Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CategoryDetailsCard 
          title="Category A Details" 
          items={stats.A.items.slice(0, 10)} 
          color="emerald" 
          analysisType={analysisType}
        />
        <CategoryDetailsCard 
          title="Category B Details" 
          items={stats.B.items.slice(0, 10)} 
          color="amber" 
          analysisType={analysisType}
        />
        <CategoryDetailsCard 
          title="Category C Details" 
          items={stats.C.items.slice(0, 10)} 
          color="gray" 
          analysisType={analysisType}
        />
      </div>

      {/* Search and List */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100 flex-1 max-w-md">
            <Search size={18} className="text-gray-300" />
            <input 
              type="text" 
              placeholder="SEARCH BY SKU OR NAME..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-[11px] font-bold text-gray-700 placeholder:text-gray-300 uppercase tracking-widest w-full"
            />
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            <Info size={14} className="text-[#2d808e]" />
            <span>A: Top 70% | B: Next 20% | C: Remaining 10%</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Category</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Item Code</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Name</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">On Hand Qty</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">Transactions Qty</th>
                {analysisType === 'COST' && (
                  <>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">Avg Price</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">Total Value</th>
                  </>
                )}
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">Cum. %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={analysisType === 'COST' ? 8 : 6} className="px-6 py-20 text-center">
                    <Loader2 size={32} className="animate-spin mx-auto text-[#2d808e] mb-2" />
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Analyzing Inventory...</p>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={analysisType === 'COST' ? 8 : 6} className="px-6 py-20 text-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No items found</p>
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4 border-b border-gray-50">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                        item.category === 'A' ? 'bg-emerald-50 text-emerald-600' :
                        item.category === 'B' ? 'bg-amber-50 text-amber-600' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        Class {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 border-b border-gray-50 text-[11px] font-black text-[#2d808e] uppercase tracking-widest">{item.sku}</td>
                    <td className="px-6 py-4 border-b border-gray-50">
                      <p className="text-[11px] font-bold text-gray-700 uppercase line-clamp-1">{item.name}</p>
                    </td>
                    <td className="px-6 py-4 border-b border-gray-50 text-right text-[11px] font-black text-gray-700">{item.on_hand_stock?.toLocaleString() || '0'}</td>
                    <td className="px-6 py-4 border-b border-gray-50 text-right text-[11px] font-black text-gray-700">{item.total_qty.toLocaleString()}</td>
                    {analysisType === 'COST' && (
                      <>
                        <td className="px-6 py-4 border-b border-gray-50 text-right text-[11px] font-bold text-gray-500">BDT {item.avg_price?.toLocaleString() || '0'}</td>
                        <td className="px-6 py-4 border-b border-gray-50 text-right text-[11px] font-black text-gray-800">BDT {item.total_value.toLocaleString()}</td>
                      </>
                    )}
                    <td className="px-6 py-4 border-b border-gray-50 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-gray-400">{item.cumulative_percentage.toFixed(1)}%</span>
                        <div className="w-16 h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              item.category === 'A' ? 'bg-emerald-500' :
                              item.category === 'B' ? 'bg-amber-500' :
                              'bg-gray-400'
                            }`}
                            style={{ width: `${item.cumulative_percentage}%` }}
                          ></div>
                        </div>
                      </div>
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

const CategoryDetailsCard: React.FC<{ 
  title: string; 
  items: any[]; 
  color: 'emerald' | 'amber' | 'gray';
  analysisType: 'QTY' | 'COST';
}> = ({ title, items, color, analysisType }) => {
  const colorClasses = {
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-600',
    amber: 'border-amber-100 bg-amber-50 text-amber-600',
    gray: 'border-gray-200 bg-gray-50 text-gray-600'
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-xs font-bold text-gray-800 uppercase">{title}</h3>
        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${colorClasses[color]}`}>
          Top {items.length}
        </span>
      </div>
      <div className="overflow-y-auto max-h-[300px] scrollbar-thin">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50/50 sticky top-0">
            <tr className="text-[9px] font-medium text-gray-400 uppercase border-b border-gray-50">
              <th className="px-4 py-2">Item</th>
              <th className="px-4 py-2 text-right">{analysisType === 'QTY' ? 'Qty' : 'Value'}</th>
            </tr>
          </thead>
          <tbody className="text-[10px] font-medium text-gray-600">
            {items.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-10 text-center text-gray-300 uppercase font-bold">No items</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-black text-[#2d808e]">{item.sku}</span>
                      <span className="text-gray-400 truncate max-w-[150px]">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-black text-gray-800">
                    {analysisType === 'COST' ? 'BDT ' : ''}
                    {(analysisType === 'QTY' ? item.total_qty : item.total_value).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ABCAnalysis;
