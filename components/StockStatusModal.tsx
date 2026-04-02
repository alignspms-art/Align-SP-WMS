
import React, { useState, useEffect } from 'react';
import { X, Inbox, Search, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface StockStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const StockStatusModal: React.FC<StockStatusModalProps> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setItems([]);
      return;
    }
  }, [isOpen]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`)
        .limit(50);

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger search on Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 bg-black/40 backdrop-blur-[2px]">
      <div className="bg-white w-full max-w-5xl rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
          <h2 className="text-lg font-bold text-gray-800 tracking-tight flex items-center gap-2">
            <Search size={18} className="text-[#2d808e]" />
            On-Hand Stock Status
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Section */}
        <div className="p-6 bg-gray-50/50 border-b border-gray-100">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input 
                type="text" 
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter Item Name or SKU..."
                className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 focus:border-[#2d808e] rounded-lg outline-none text-sm placeholder-gray-400 transition-all shadow-sm"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {loading ? <Loader2 size={16} className="animate-spin text-[#2d808e]" /> : <Search size={16} className="text-gray-300" />}
              </div>
            </div>
            <button 
              onClick={handleSearch}
              className="bg-[#2d808e] text-white px-8 py-2.5 rounded-lg text-sm font-black uppercase tracking-widest hover:bg-[#256b78] transition-all shadow-md active:scale-95"
            >
              Search
            </button>
          </div>
          <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-tight">Press Enter to lookup items in Master Database</p>
        </div>

        {/* Table Section */}
        <div className="p-0 max-h-[60vh] overflow-y-auto scrollbar-thin">
          <table className="w-full border-collapse">
            <thead className="bg-[#fcfcfc] sticky top-0 z-10">
              <tr className="text-[11px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-100">
                <th className="py-4 px-6 text-center w-32 border-r border-gray-50">SKU</th>
                <th className="py-4 px-6 text-left border-r border-gray-50">Item Name</th>
                <th className="py-4 px-6 text-center w-24 border-r border-gray-50">UOM</th>
                <th className="py-4 px-6 text-center w-48 border-r border-gray-50">Location</th>
                <th className="py-4 px-6 text-right w-32">Available Stock</th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-cyan-50/20 transition-colors border-b border-gray-50 last:border-0 group">
                    <td className="py-4 px-6 text-center font-black text-gray-400 border-r border-gray-50">{item.sku || 'N/A'}</td>
                    <td className="py-4 px-6 text-left font-black uppercase text-gray-800 leading-tight border-r border-gray-50">{item.name}</td>
                    <td className="py-4 px-6 text-center border-r border-gray-50">
                      <span className="px-2 py-0.5 bg-gray-100 text-[10px] font-black rounded">{item.uom}</span>
                    </td>
                    <td className="py-4 px-6 text-center text-gray-500 border-r border-gray-50 uppercase text-[10px]">{item.location || 'Not Set'}</td>
                    <td className="py-4 px-6 text-right font-black text-[#2d808e] text-lg">
                      {item.on_hand_stock}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>
                    <div className="py-32 flex flex-col items-center justify-center bg-white">
                      {loading ? (
                        <div className="flex flex-col items-center space-y-4">
                           <Loader2 size={48} className="animate-spin text-[#2d808e]" />
                           <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Querying Master Repository...</span>
                        </div>
                      ) : (
                        <>
                          <div className="text-gray-100 mb-3">
                            <Inbox size={64} strokeWidth={1} />
                          </div>
                          <p className="text-sm font-black text-gray-300 uppercase tracking-[0.2em]">
                            {searchTerm ? 'No results found' : 'Enter search criteria above'}
                          </p>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t border-gray-100">
           <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Master Item Registry Node</span>
           <button 
             onClick={onClose}
             className="px-8 py-2 text-xs font-black text-gray-500 hover:text-gray-800 transition-colors uppercase tracking-widest"
           >
             Close
           </button>
        </div>
      </div>
    </div>
  );
};

export default StockStatusModal;
