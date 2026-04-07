
import React from 'react';
import { X, Printer } from 'lucide-react';
import TnxPrintTemplate from './TnxPrintTemplate';

interface TnxDetailsModalProps {
  tnx: any;
  onClose: () => void;
}

const TnxDetailsModal: React.FC<TnxDetailsModalProps> = ({ tnx, onClose }) => {
  if (!tnx) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto print-mode-active">
      <div className="bg-[#fcfcfc] w-full max-w-[1300px] rounded-xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in-95 duration-300 flex flex-col my-auto max-h-[96vh]">
        <div className="flex items-center justify-between px-8 py-4 border-b border-gray-100 bg-white sticky top-0 z-10 shadow-sm no-print">
          <div className="flex items-center space-x-4">
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-xl transition-colors">
              <X size={20} />
            </button>
            <div className="flex flex-col">
              <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Transaction Detail Node</h2>
              <p className="text-sm font-black text-[#2d808e] tracking-tight uppercase mt-1">Ref: {tnx.reference || tnx.mo_no || tnx.tnxRef}</p>
            </div>
          </div>
          <button 
            onClick={handlePrint}
            className="bg-[#2d808e] text-white px-8 py-2 rounded-lg text-xs font-black shadow-lg shadow-cyan-900/10 hover:bg-[#256b78] flex items-center space-x-3 uppercase tracking-widest active:scale-95 transition-all"
          >
            <Printer size={18} />
            <span>Print Report</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-12 scrollbar-thin bg-gray-200/20">
           <div className="bg-white shadow-2xl border border-gray-200 rounded-sm printable">
             <TnxPrintTemplate tnx={tnx} />
           </div>
        </div>

        <div className="px-8 py-6 border-t border-gray-100 bg-white flex items-center space-x-4 no-print">
           <button 
             onClick={handlePrint}
             className="w-10 h-9 flex items-center justify-center bg-[#2d808e] text-white rounded hover:bg-[#256b78] transition-all shadow-md"
             title="Print"
           >
             <Printer size={18} />
           </button>
           <button 
             onClick={onClose}
             className="px-10 py-1.5 border border-gray-300 text-gray-500 rounded text-[13px] font-bold hover:bg-gray-50 transition-all uppercase tracking-tighter"
           >
             Close
           </button>
        </div>
      </div>
    </div>
  );
};

export default TnxDetailsModal;
