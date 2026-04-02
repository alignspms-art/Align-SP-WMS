
import React from 'react';
import { CheckCircle, X } from 'lucide-react';

interface GRNSuccessModalProps {
  grnId: string;
  items: any[];
  onClose: () => void;
}

const GRNSuccessModal: React.FC<GRNSuccessModalProps> = ({ grnId, items, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-[450px] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="bg-emerald-100 p-2 rounded-full">
                <CheckCircle className="text-emerald-600" size={24} />
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-gray-800 leading-tight">
                  Goods received ID #{grnId} - process completed
                </h2>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-3 text-[13px] text-gray-600">
            <p>New goods receive record created #{grnId}</p>
            <p>Transaction details created ({items.length} items)</p>
            
            <div className="space-y-2 mt-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
              {items.map((item, idx) => (
                <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-gray-800">Item {item.sku} updated</span>
                  </div>
                  <p className="text-[12px] text-gray-500 mt-1">
                    (location: {item.location}, receive Qty: {item.grnQty || item.recQty})
                  </p>
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-full mt-6 py-2.5 bg-[#2d808e] text-white text-[13px] font-bold rounded-lg hover:bg-[#256b78] transition-all shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default GRNSuccessModal;
