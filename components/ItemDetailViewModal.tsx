import React from 'react';
import { X, Package, MapPin, Hash, Ruler, Database } from 'lucide-react';

interface ItemDetailViewModalProps {
  item: any;
  isOpen: boolean;
  onClose: () => void;
}

const ItemDetailViewModal: React.FC<ItemDetailViewModalProps> = ({ item, isOpen, onClose }) => {
  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-[2100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-white/20">
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
              <p className="text-white/70 text-xs font-bold uppercase tracking-widest mt-1">Item Master Record</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SKU */}
          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex flex-col space-y-2">
            <div className="flex items-center space-x-2 text-[#2d808e]">
              <Hash size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">SKU Code</span>
            </div>
            <span className="text-xl font-black text-gray-800 tracking-tight">{item.sku}</span>
          </div>

          {/* UOM */}
          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex flex-col space-y-2">
            <div className="flex items-center space-x-2 text-[#2d808e]">
              <Ruler size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Unit of Measure</span>
            </div>
            <span className="text-xl font-black text-gray-800 tracking-tight uppercase">{item.uom}</span>
          </div>

          {/* Location */}
          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex flex-col space-y-2">
            <div className="flex items-center space-x-2 text-[#2d808e]">
              <MapPin size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Storage Location</span>
            </div>
            <span className="text-xl font-black text-gray-800 tracking-tight uppercase">{item.location || 'Not Assigned'}</span>
          </div>

          {/* On Hand Stock */}
          <div className="bg-[#2d808e]/5 p-6 rounded-2xl border border-[#2d808e]/20 flex flex-col space-y-2">
            <div className="flex items-center space-x-2 text-[#2d808e]">
              <Database size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Current Stock On-Hand</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-black text-[#2d808e] tracking-tighter">{item.on_hand_stock}</span>
              <span className="text-xs font-bold text-[#2d808e]/60 uppercase">{item.uom}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">System Timestamp</span>
            <span className="text-[10px] font-bold text-gray-500">{new Date().toLocaleString()}</span>
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

export default ItemDetailViewModal;
