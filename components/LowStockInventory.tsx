
import React, { useState, useEffect } from 'react';
import { ShieldAlert, Package, MapPin, Layers, FileSpreadsheet, Loader2, Search, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

const LowStockInventory: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLowStock = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*');
      
      if (error) throw error;
      
      if (data) {
        const lowStock = data.filter(item => 
          item.on_hand_stock <= (item.safety_stock || 0) && item.safety_stock > 0
        );
        setItems(lowStock);
      }
    } catch (err) {
      console.error('Error fetching low stock items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLowStock();
  }, []);

  const handleExportExcel = () => {
    const exportData = items.map(item => ({
      'SKU': item.sku,
      'Item Name': item.name,
      'UOM': item.uom,
      'Location': item.location,
      'Type': item.type,
      'On Hand Stock': item.on_hand_stock,
      'Safety Stock': item.safety_stock,
      'Status': 'Critical'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Low Stock Items");
    XLSX.writeFile(workbook, `Low_Stock_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-3">
            <ShieldAlert className="text-red-500" size={28} />
            Low Stock Inventory
          </h2>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
            Real-time monitoring of items below safety stock levels
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchLowStock}
            className="p-2.5 bg-white border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
            title="Refresh Data"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={handleExportExcel}
            disabled={items.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#2d808e] text-white text-[11px] font-black uppercase rounded-xl hover:bg-[#256b78] transition-all shadow-lg shadow-cyan-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet size={16} />
            Export Report
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
        <Search size={18} className="text-gray-300" />
        <input 
          type="text" 
          placeholder="SEARCH BY SKU OR ITEM NAME..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-[11px] font-bold text-gray-700 placeholder:text-gray-300 uppercase tracking-wider"
        />
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center text-gray-400">
          <Loader2 size={40} className="animate-spin mb-4 text-[#2d808e]" />
          <p className="text-[10px] font-black uppercase tracking-widest">Loading Critical Inventory...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-gray-400 bg-white rounded-[32px] border border-dashed border-gray-200">
          <Package size={48} className="mb-4 opacity-20" />
          <p className="text-[10px] font-black uppercase tracking-widest">No low stock items found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-bl-[100px] -mr-12 -mt-12 transition-all group-hover:scale-150 duration-500 opacity-50"></div>
              
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-[#f0f9fa] rounded-lg flex items-center justify-center">
                      <Package size={16} className="text-[#2d808e]" />
                    </div>
                    <span className="text-[11px] font-black text-[#2d808e] uppercase tracking-widest">{item.sku}</span>
                  </div>
                  <div className="px-2.5 py-1 bg-red-50 rounded-lg text-[9px] font-black text-red-500 uppercase flex items-center gap-1.5">
                    <ShieldAlert size={10} />
                    Critical
                  </div>
                </div>
                
                <h4 className="text-base font-black text-gray-800 mb-6 line-clamp-2 leading-tight min-h-[2.5rem]">{item.name}</h4>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                    <p className="text-[9px] font-black text-gray-400 uppercase mb-1 tracking-widest">On Hand</p>
                    <p className="text-2xl font-black text-gray-800">{item.on_hand_stock}</p>
                    <p className="text-[9px] font-bold text-gray-300 uppercase mt-1">{item.uom}</p>
                  </div>
                  <div className="p-4 bg-red-50/30 rounded-2xl border border-red-100/30">
                    <p className="text-[9px] font-black text-red-400 uppercase mb-1 tracking-widest">Safety Stock</p>
                    <p className="text-2xl font-black text-red-600">{item.safety_stock}</p>
                    <p className="text-[9px] font-bold text-red-300 uppercase mt-1">{item.uom}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <div className="flex items-center space-x-2">
                    <MapPin size={12} className="text-gray-300" />
                    <span>{item.location || 'NO LOCATION'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Layers size={12} className="text-gray-300" />
                    <span>{item.type || 'NO TYPE'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LowStockInventory;
