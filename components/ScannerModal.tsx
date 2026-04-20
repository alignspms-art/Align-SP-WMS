
import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, RefreshCw, AlertCircle } from 'lucide-react';
// @ts-expect-error - external esm import
import { Html5Qrcode } from 'https://esm.sh/html5-qrcode';

interface ScannerModalProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

const ScannerModal: React.FC<ScannerModalProps> = ({ onScan, onClose }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const stopScanner = React.useCallback(async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (e) {
        console.warn("Error stopping scanner", e);
      }
    }
  }, []);

  useEffect(() => {
    const scannerId = "mo-reader";
    
    const startScanner = async () => {
      try {
        scannerRef.current = new Html5Qrcode(scannerId);
        await scannerRef.current.start(
          { facingMode: "environment" }, // Forces mobile back camera
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText: string) => {
            // Success callback
            onScan(decodedText);
            stopScanner();
          },
          () => {
            // Errors during scanning are common (no code found in frame), ignore them
          }
        );
        setIsInitializing(false);
      } catch (err: any) {
        console.error("Scanner Error:", err);
        setError("Camera access denied or not available. Please ensure you have granted camera permissions.");
        setIsInitializing(false);
      }
    };

    startScanner();

    return () => {
      stopScanner();
    };
  }, [onScan, stopScanner]);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <Camera size={20} className="text-[#2d808e]" />
            <h3 className="font-black text-gray-800 uppercase tracking-tight">MO Scanner</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="relative aspect-square bg-black">
          <div id="mo-reader" className="w-full h-full"></div>
          
          {isInitializing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white space-y-3 bg-black/40">
              <RefreshCw size={32} className="animate-spin text-[#2d808e]" />
              <span className="text-[10px] font-black uppercase tracking-widest">Initializing Back Camera...</span>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-gray-900 text-white space-y-4">
              <AlertCircle size={48} className="text-red-500" />
              <p className="text-sm font-bold leading-relaxed">{error}</p>
              <button 
                onClick={onClose}
                className="px-6 py-2 bg-[#2d808e] rounded-lg font-black text-xs uppercase"
              >
                Close Scanner
              </button>
            </div>
          )}

          {!isInitializing && !error && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
               <div className="w-64 h-64 border-2 border-[#2d808e] rounded-xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-white -translate-x-1 -translate-y-1"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-white translate-x-1 -translate-y-1"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-white -translate-x-1 translate-y-1"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-white translate-x-1 translate-y-1"></div>
                  {/* Scanning Animation Line */}
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-red-500 shadow-[0_0_8px_red] animate-[scan_2s_linear_infinite]"></div>
               </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 text-center">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Place the SKU code inside the square to scan
          </p>
        </div>
      </div>
      <style>{`
        @keyframes scan {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
      `}</style>
    </div>
  );
};

export default ScannerModal;
