
import React, { useState } from 'react';
import { Home, ScanBarcode, QrCode } from 'lucide-react';
import BarcodeGenerator from './BarcodeGenerator';
import QRCodeGenerator from './QRCodeGenerator';

const LabelCard: React.FC<{ 
  title: string; 
  subtitle: string; 
  icon: React.ReactNode; 
  onClick?: () => void 
}> = ({ title, subtitle, icon, onClick }) => (
  <button 
    onClick={onClick}
    className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center text-center space-y-6 hover:shadow-xl hover:-translate-y-1 transition-all group w-full max-w-[320px]"
  >
    <div className="relative w-48 h-48 bg-[#f8fafb] rounded-lg flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center p-4">
        {icon}
      </div>
    </div>
    <div className="space-y-1.5">
      <h3 className="text-lg font-black text-gray-800 tracking-tight">{title}</h3>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{subtitle}</p>
    </div>
  </button>
);

const LabelManagement: React.FC = () => {
  const [view, setView] = useState<'hub' | 'barcode' | 'qr'>('hub');

  if (view === 'barcode') {
    return <BarcodeGenerator onBack={() => setView('hub')} />;
  }

  if (view === 'qr') {
    return <QRCodeGenerator onBack={() => setView('hub')} />;
  }

  return (
    <div className="space-y-8 animate-slide-up">
      <div className="flex items-center space-x-2 text-[11px] font-bold text-[#2d808e] uppercase tracking-wider">
        <Home size={14} className="text-gray-400" />
        <span className="text-gray-300">/</span>
        <span className="text-[#2d808e] font-black uppercase tracking-tight">LABEL</span>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
        <LabelCard 
          title="Barcode Generator" 
          subtitle="Barcode for your products"
          icon={
            <div className="relative">
              <div className="absolute -left-12 -top-12 w-24 h-40 bg-gray-600 rounded-2xl rotate-[30deg]"></div>
              <div className="absolute -left-8 -top-8 w-16 h-12 bg-yellow-400 rounded-lg rotate-[30deg]"></div>
              <div className="relative z-10 p-4 bg-white border-2 border-gray-100 rounded-lg shadow-sm">
                <ScanBarcode size={64} className="text-gray-800" strokeWidth={1.5} />
              </div>
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex space-x-0.5">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className={`h-8 w-1 bg-pink-500/20 ${i % 3 === 0 ? 'h-10' : ''}`}></div>
                ))}
              </div>
            </div>
          }
          onClick={() => setView('barcode')}
        />

        <LabelCard 
          title="QR Code Generator" 
          subtitle="QR code for your products"
          icon={
            <div className="relative">
              <div className="absolute -left-12 -top-12 w-24 h-40 bg-gray-600 rounded-2xl rotate-[30deg]"></div>
              <div className="absolute -left-8 -top-8 w-16 h-12 bg-yellow-400 rounded-lg rotate-[30deg]"></div>
              <div className="relative z-10 p-4 bg-white border-2 border-gray-100 rounded-lg shadow-sm">
                <QrCode size={64} className="text-gray-800" strokeWidth={1.5} />
              </div>
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 h-24 border-2 border-pink-500/30 rounded-lg border-dashed animate-pulse"></div>
            </div>
          }
          onClick={() => setView('qr')}
        />
      </div>
    </div>
  );
};

export default LabelManagement;
