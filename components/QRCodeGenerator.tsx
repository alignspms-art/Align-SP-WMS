
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Home, Printer, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface QRCodeGeneratorProps {
  onBack: () => void;
}

const QRCodePrintView = ({ labels, settings }: any) => {
  return (
    <div className="grid grid-cols-2 gap-4 p-4 bg-white" style={{ width: '100%' }}>
      {labels.map((label: any, idx: number) => (
        <div 
          key={`${label.sku}-${idx}`}
          className="border border-gray-300 p-4 flex flex-col items-center justify-center break-inside-avoid mb-4 text-center"
          style={{ minHeight: '150px' }}
        >
          {settings.showName && (
            <div className="w-full font-black uppercase truncate mb-2" style={{ fontSize: `${settings.nameFontSize}px` }}>
              {label.name}
            </div>
          )}
          <div className="bg-white p-1">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=${settings.qrSize}x${settings.qrSize}&data=${label.sku}`} 
              alt={label.sku}
              style={{ width: `${settings.qrSize}px`, height: `${settings.qrSize}px` }}
            />
          </div>
          {settings.showCode && (
            <div className="w-full mt-2 font-black tracking-widest" style={{ fontSize: `${settings.codeFontSize}px` }}>
              {label.sku}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const CustomSlider = ({ label, value, min, max, steps, onChange }: any) => (
  <div className="flex flex-col space-y-3 flex-1 min-w-[150px]">
    <label className="text-[11px] font-medium text-gray-500">{label}:</label>
    <div className="relative h-1 bg-gray-100 rounded-full mx-2">
      <div 
        className="absolute h-full bg-[#2d808e] rounded-full" 
        style={{ width: `${((value - min) / (max - min)) * 100}%` }}
      ></div>
      <input 
        type="range" 
        min={min} 
        max={max} 
        step={steps[1] - steps[0] || 1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute -top-2 left-0 w-full h-5 opacity-0 cursor-pointer z-20"
      />
      <div className="absolute top-0 left-0 w-full flex justify-between px-0">
        {steps.map((step: number) => (
          <div key={step} className="flex flex-col items-center -mt-0.5">
            <div className={`w-2 h-2 rounded-full border-2 bg-white ${value === step ? 'border-[#2d808e]' : 'border-gray-200'}`}></div>
            <span className={`text-[9px] mt-1 font-bold ${value === step ? 'text-[#2d808e]' : 'text-gray-400'}`}>{step}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ onBack }) => {
  const [skuInput, setSkuInput] = useState('');
  const [hGutter, setHGutter] = useState(16);
  const [vGutter, setVGutter] = useState(16);
  const [columnCount, setColumnCount] = useState(2);
  const [showCode, setShowCode] = useState(true);
  const [codeFontSize, setCodeFontSize] = useState(12);
  const [showName, setShowName] = useState(true);
  const [nameFontSize, setNameFontSize] = useState(12);
  const [qrSize, setQrSize] = useState(100);
  const [pageWidth, setPageWidth] = useState(210);
  
  const [labels, setLabels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchItems = React.useCallback(async (skus: string[]) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('items')
      .select('sku, name')
      .in('sku', skus);
    
    if (data && !error) {
      const itemMap = data.reduce((acc: any, item: any) => {
        acc[item.sku] = item.name;
        return acc;
      }, {});
      
      const newLabels = skus.map(sku => ({
        sku: sku,
        name: itemMap[sku] || 'Unknown Item'
      }));
      setLabels(newLabels);
    } else {
      setLabels(skus.map(sku => ({ sku, name: 'Item not found' })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const skus = skuInput.split('\n').map(s => s.trim()).filter(s => s !== '');
    if (skus.length > 0) {
      const timer = setTimeout(() => fetchItems(skus), 500);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setLabels([]), 0);
      return () => clearTimeout(timer);
    }
  }, [skuInput, fetchItems]);

  const handlePrint = () => {
    const printSection = document.getElementById('print-section');
    if (!printSection) return;
    printSection.innerHTML = '';
    const root = createRoot(printSection);
    root.render(
      <QRCodePrintView 
        labels={labels} 
        settings={{ showCode, codeFontSize, showName, nameFontSize, qrSize }} 
      />
    );
    // Give time for images to load from external API
    setTimeout(() => window.print(), 1000);
  };

  return (
    <div className="space-y-6 font-sans antialiased text-gray-800 animate-slide-up no-print">
      <div className="flex items-center space-x-2 text-[11px] font-bold text-[#2d808e] uppercase tracking-wider">
        <Home size={14} className="text-gray-400" />
        <span className="text-gray-300">/</span>
        <button onClick={onBack} className="text-gray-400 hover:text-[#2d808e] uppercase">LABEL</button>
        <span className="text-gray-300">/</span>
        <span className="text-[#2d808e] font-black uppercase tracking-tight">QR CODE</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 space-y-8">
          <textarea 
            value={skuInput}
            onChange={(e) => setSkuInput(e.target.value)}
            placeholder="3000011183&#10;3000011184&#10;3000011185"
            className="w-full h-32 px-4 py-3 border border-gray-200 rounded-lg focus:border-[#2d808e] outline-none text-sm font-bold tracking-tight resize-none shadow-inner bg-gray-50/30"
          />

          <div className="flex flex-wrap gap-x-12 gap-y-8 items-start">
            <CustomSlider 
              label="Horizontal Gutter (px)" 
              value={hGutter} 
              min={8} 
              max={48} 
              steps={[8, 16, 24, 32, 40, 48]}
              onChange={setHGutter}
            />
            <CustomSlider 
              label="Vertical Gutter (px)" 
              value={vGutter} 
              min={8} 
              max={48} 
              steps={[8, 16, 24, 32, 40, 48]}
              onChange={setVGutter}
            />
            <CustomSlider 
              label="Column Count" 
              value={columnCount} 
              min={1} 
              max={12} 
              steps={[1, 2, 3, 4, 6, 8, 12]}
              onChange={setColumnCount}
            />

            <div className="grid grid-cols-2 gap-x-8 gap-y-4 min-w-[300px]">
              <div className="flex items-center space-x-3">
                <input type="checkbox" checked={showCode} onChange={e => setShowCode(e.target.checked)} className="w-4 h-4 accent-[#2d808e]" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Show Code/SKU, Font size:</span>
                  <input type="number" value={codeFontSize} onChange={e => setCodeFontSize(Number(e.target.value))} className="w-16 px-2 py-0.5 border border-gray-200 rounded text-xs font-bold mt-1" />
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <input type="checkbox" checked={showName} onChange={e => setShowName(e.target.checked)} className="w-4 h-4 accent-[#2d808e]" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Show Name, Font size:</span>
                  <input type="number" value={nameFontSize} onChange={e => setNameFontSize(Number(e.target.value))} className="w-16 px-2 py-0.5 border border-gray-200 rounded text-xs font-bold mt-1" />
                </div>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase">QR Size (px)</span>
                <input type="number" value={qrSize} onChange={e => setQrSize(Number(e.target.value))} className="w-16 px-2 py-0.5 border border-gray-200 rounded text-xs font-bold" />
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase">Page Width mm</span>
                <input type="number" value={pageWidth} onChange={e => setPageWidth(Number(e.target.value))} className="w-16 px-2 py-0.5 border border-gray-200 rounded text-xs font-bold" />
              </div>
              <div className="col-span-2 flex items-center justify-end mt-2">
                <button 
                  onClick={handlePrint}
                  className="bg-[#2d808e] text-white px-8 py-2 rounded-lg text-sm font-black flex items-center space-x-2 hover:bg-[#256b78] shadow-md transition-all uppercase tracking-widest active:scale-95"
                >
                  <Printer size={16} />
                  <span>Print QR</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="qr-preview-area" className="flex flex-wrap justify-center overflow-x-auto" style={{ gap: `${vGutter}px ${hGutter}px` }}>
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <Loader2 size={32} className="animate-spin text-[#2d808e]" />
            <span className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Resolving SKU Master Data...</span>
          </div>
        ) : labels.map((label, idx) => (
          <div 
            key={`${label.sku}-${idx}`}
            className="bg-white border border-gray-100 flex flex-col items-center justify-center overflow-hidden transition-all hover:shadow-lg"
            style={{ 
              width: `${(pageWidth / columnCount) - (hGutter / columnCount)}mm`,
              padding: '10px'
            }}
          >
            {showName && (
              <div className="w-full text-center mb-2 font-bold uppercase truncate px-2" style={{ fontSize: `${nameFontSize}px` }}>
                {label.name}
              </div>
            )}
            <div className="flex items-center justify-center bg-white p-1">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${label.sku}`} 
                alt={label.sku}
                style={{ width: `${qrSize}px`, height: `${qrSize}px` }}
              />
            </div>
            {showCode && (
              <div className="w-full text-center mt-2 font-black" style={{ fontSize: `${codeFontSize}px` }}>
                {label.sku}
              </div>
            )}
          </div>
        ))}
        {!loading && labels.length === 0 && (
          <div className="py-32 flex flex-col items-center opacity-20 select-none pointer-events-none">
             <div className="w-48 h-48 bg-gray-200 rounded flex flex-wrap p-4 gap-2">
                {[...Array(9)].map((_, i) => <div key={i} className="w-[30%] h-[30%] bg-gray-400 rounded-sm"></div>)}
             </div>
             <p className="mt-4 font-black uppercase tracking-[0.3em] text-sm">Waiting for SKU entry...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRCodeGenerator;
