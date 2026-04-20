import React, { useState, useEffect } from 'react';
import { X, Clock, User, Loader2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface HistoryEntry {
  updatedBy: string;
  updatedAt: string;
  action: string;
  type: 'Receive' | 'Issue';
  quantity: number;
  reference_no?: string;
  department?: string;
}

interface ItemHistoryModalProps {
  item: any;
  onClose: () => void;
}

const ItemHistoryModal: React.FC<ItemHistoryModalProps> = ({ item, onClose }) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('item_sku', item.sku)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
          setHistory(data.map(tnx => ({
            updatedBy: 'System User', // In a real app, you'd join with profiles
            updatedAt: new Date(tnx.created_at).toLocaleString(),
            action: tnx.type === 'Receive' ? 'Stock Received' : 'Stock Issued',
            type: tnx.type as 'Receive' | 'Issue',
            quantity: tnx.quantity,
            reference_no: tnx.reference_no,
            department: tnx.department
          })));
        }
      } catch (err) {
        console.error("Error fetching history:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [item.sku]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white sticky top-0">
          <div className="flex flex-col">
            <h3 className="text-lg font-bold text-gray-800 tracking-tight">Transaction History</h3>
            <p className="text-[10px] text-[#2d808e] font-bold uppercase tracking-widest">{item.name} ({item.sku})</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="animate-spin text-[#2d808e]" size={32} />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Fetching History...</span>
            </div>
          ) : history.length > 0 ? (
            <div className="space-y-6">
              {history.map((entry, idx) => (
                <div key={idx} className="relative pl-8 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-[-24px] before:w-[2px] before:bg-gray-100 last:before:hidden">
                  <div className={`absolute left-0 top-0 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center z-10 shadow-sm ${entry.type === 'Receive' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                    {entry.type === 'Receive' ? <ArrowDownCircle size={14} /> : <ArrowUpCircle size={14} />}
                  </div>
                  
                  <div className="bg-gray-50/50 rounded-lg p-4 border border-gray-100 hover:border-[#2d808e]/30 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[12px] font-black uppercase ${entry.type === 'Receive' ? 'text-emerald-600' : 'text-orange-600'}`}>
                        {entry.action}
                      </span>
                      <div className="flex items-center space-x-1 text-[10px] text-gray-400 font-bold">
                        <Clock size={12} />
                        <span>{entry.updatedAt}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="block text-[9px] text-gray-400 font-black uppercase tracking-tighter">Quantity</span>
                        <span className="text-[14px] font-black text-gray-800">{entry.quantity} <span className="text-[10px] text-gray-400 uppercase">{item.uom}</span></span>
                      </div>
                      {entry.reference_no && (
                        <div className="space-y-1">
                          <span className="block text-[9px] text-gray-400 font-black uppercase tracking-tighter">Reference</span>
                          <span className="text-[11px] font-bold text-gray-700">{entry.reference_no}</span>
                        </div>
                      )}
                      {entry.department && (
                        <div className="space-y-1">
                          <span className="block text-[9px] text-gray-400 font-black uppercase tracking-tighter">Department</span>
                          <span className="text-[11px] font-bold text-gray-700">{entry.department}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center">
              <p className="text-gray-300 font-black uppercase tracking-widest text-[11px]">No transaction history found</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-8 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded transition-all uppercase tracking-widest"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemHistoryModal;
