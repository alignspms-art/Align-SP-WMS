
import React, { useState, useEffect } from 'react';
import { X, Package, MapPin, Hash, Ruler, Database, User, ArrowDownCircle, ArrowUpCircle, Tag, Briefcase, Boxes, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ItemCheckStockDetailModalProps {
  item: any;
  isOpen: boolean;
  onClose: () => void;
}

const ItemCheckStockDetailModal: React.FC<ItemCheckStockDetailModalProps> = ({ item, isOpen, onClose }) => {
  const [lastReceive, setLastReceive] = useState<any>(null);
  const [lastIssue, setLastIssue] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !item) return;

    const fetchLastTransactions = async () => {
      setLoading(true);
      try {
        // Fetch last receive
        const { data: receiveData } = await supabase
          .from('transactions')
          .select('*')
          .eq('item_sku', item.sku)
          .eq('type', 'Receive')
          .order('created_at', { ascending: false })
          .limit(1);

        // Fetch last issue
        const { data: issueData } = await supabase
          .from('transactions')
          .select('*')
          .eq('item_sku', item.sku)
          .eq('type', 'Issue')
          .order('created_at', { ascending: false })
          .limit(1);

        if (receiveData && receiveData.length > 0) setLastReceive(receiveData[0]);
        if (issueData && issueData.length > 0) setLastIssue(issueData[0]);
      } catch (err) {
        console.error("Error fetching last transactions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLastTransactions();
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-white/20">
        {/* Header */}
        <div className="relative h-32 bg-gradient-to-r from-[#2d808e] to-[#256b78] p-8 flex items-end">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
          >
            <X size={20} />
          </button>
          <div className="flex items-center space-x-4">
            <div className="p-4 bg-white rounded-2xl shadow-lg">
              <Package size={32} className="text-[#2d808e]" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight leading-none">{item.name}</h2>
              <p className="text-white/70 text-xs font-bold uppercase tracking-widest mt-1">Detailed Stock Status Node</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[70vh] scrollbar-thin">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* SKU */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col space-y-1">
              <div className="flex items-center space-x-2 text-[#2d808e]">
                <Hash size={14} />
                <span className="text-[9px] font-black uppercase tracking-widest">SKU Code</span>
              </div>
              <span className="text-lg font-black text-gray-800 tracking-tight">{item.sku}</span>
            </div>

            {/* UOM */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col space-y-1">
              <div className="flex items-center space-x-2 text-[#2d808e]">
                <Ruler size={14} />
                <span className="text-[9px] font-black uppercase tracking-widest">Unit of Measure</span>
              </div>
              <span className="text-lg font-black text-gray-800 tracking-tight uppercase">{item.uom}</span>
            </div>

            {/* Location */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col space-y-1">
              <div className="flex items-center space-x-2 text-[#2d808e]">
                <MapPin size={14} />
                <span className="text-[9px] font-black uppercase tracking-widest">Storage Location</span>
              </div>
              <span className="text-lg font-black text-gray-800 tracking-tight uppercase">{item.location || 'Not Assigned'}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Stock Summary */}
            <div className="bg-[#2d808e]/5 p-8 rounded-3xl border border-[#2d808e]/20 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                 <Database size={80} />
               </div>
               <div className="relative z-10">
                <div className="flex items-center space-x-2 text-[#2d808e] mb-4">
                  <Database size={18} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Current Stock On-Hand</span>
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-6xl font-black text-[#2d808e] tracking-tighter">{item.on_hand_stock}</span>
                  <span className="text-sm font-bold text-[#2d808e]/60 uppercase">{item.uom}</span>
                </div>
                <div className="mt-6 flex items-center space-x-4">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Database In Date</span>
                    <span className="text-xs font-bold text-gray-600">{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="h-8 w-px bg-gray-200"></div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Last Price</span>
                    <span className="text-xs font-bold text-gray-600">{item.last_price ? `৳${item.last_price}` : 'N/A'}</span>
                  </div>
                </div>
               </div>
            </div>

            {/* Item Metadata */}
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center space-x-4">
                <div className="p-3 bg-white rounded-xl shadow-sm text-[#2d808e]">
                  <Tag size={18} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Source</span>
                  <span className="text-sm font-bold text-gray-800 uppercase">{item.source || 'N/A'}</span>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center space-x-4">
                <div className="p-3 bg-white rounded-xl shadow-sm text-[#2d808e]">
                  <Briefcase size={18} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Department</span>
                  <span className="text-sm font-bold text-gray-800 uppercase">{item.department || 'N/A'}</span>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center space-x-4">
                <div className="p-3 bg-white rounded-xl shadow-sm text-[#2d808e]">
                  <Boxes size={18} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Item Type</span>
                  <span className="text-sm font-bold text-gray-800 uppercase">{item.type || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Transaction History Summary */}
          <div className="space-y-4">
            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Last Transaction Activity</h3>
            
            {loading ? (
              <div className="py-10 flex items-center justify-center">
                <Loader2 className="animate-spin text-[#2d808e]" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Last Receive */}
                <div className="bg-emerald-50/30 border border-emerald-100 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2 text-emerald-600">
                      <ArrowDownCircle size={18} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Last Received</span>
                    </div>
                    {lastReceive && (
                      <span className="text-[10px] font-bold text-emerald-600/60">{new Date(lastReceive.created_at).toLocaleDateString()}</span>
                    )}
                  </div>
                  {lastReceive ? (
                    <div className="space-y-4">
                      <div className="flex items-baseline space-x-2">
                        <span className="text-2xl font-black text-emerald-700">+{lastReceive.quantity}</span>
                        <span className="text-[10px] font-bold text-emerald-600/60 uppercase">{item.uom}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-600">
                        <User size={14} className="text-emerald-500" />
                        <span className="text-xs font-bold uppercase tracking-tight">Received By: {lastReceive.received_by || 'System User'}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest py-4">No Receive History</p>
                  )}
                </div>

                {/* Last Issue */}
                <div className="bg-orange-50/30 border border-orange-100 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2 text-orange-600">
                      <ArrowUpCircle size={18} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Last Issued</span>
                    </div>
                    {lastIssue && (
                      <span className="text-[10px] font-bold text-orange-600/60">{new Date(lastIssue.created_at).toLocaleDateString()}</span>
                    )}
                  </div>
                  {lastIssue ? (
                    <div className="space-y-4">
                      <div className="flex items-baseline space-x-2">
                        <span className="text-2xl font-black text-orange-700">-{lastIssue.quantity}</span>
                        <span className="text-[10px] font-bold text-orange-600/60 uppercase">{item.uom}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-600">
                        <User size={14} className="text-orange-500" />
                        <span className="text-xs font-bold uppercase tracking-tight">Issued By: {lastIssue.issued_by || 'System User'}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest py-4">No Issue History</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Master Registry Node</span>
            <span className="text-[10px] font-bold text-gray-500">ID: {item.id}</span>
          </div>
          <button 
            onClick={onClose}
            className="px-10 py-3 bg-gray-800 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-900 transition-all shadow-lg active:scale-95"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemCheckStockDetailModal;
