
import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, Printer, FileDown, FileSpreadsheet, Scan, CheckCircle2, AlertCircle, Trash2, Camera } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import IssueSlipPrintTemplate from './IssueSlipPrintTemplate';
import ScannerModal from './ScannerModal';
import { getPrintRoot } from '../lib/printRoot';

interface MOApprovalModalProps {
  mo: any;
  isOpen: boolean;
  onClose: () => void;
}

const MOApprovalModal: React.FC<MOApprovalModalProps> = ({ mo, isOpen, onClose }) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [scanInput, setScanInput] = useState('');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && mo) {
      setItems(mo.items.map((item: any) => ({
        ...item,
        issuedQty: item.issuedQty || item.reqQty, // Default to reqQty
        verified: mo.status === 'Approved' || mo.status === 'Completed',
        remarks: item.remarks || ''
      })));

      if (mo.status === 'Approved' || mo.status === 'Completed') {
        setShowPrintPreview(true);
      } else {
        setShowPrintPreview(false);
      }

      // Focus scanner input
      setTimeout(() => scanInputRef.current?.focus(), 100);
    }
  }, [isOpen, mo]);

  if (!isOpen || !mo) return null;

  const totalQty = items.reduce((sum: number, item: any) => sum + (Number(item.reqQty) || 0), 0);
  const totalIssuedQty = items.reduce((sum: number, item: any) => sum + (Number(item.issuedQty) || 0), 0);

  const handleScan = (decodedText?: string) => {
    const sku = (decodedText || scanInput).trim();
    if (!sku) return;

    const itemIdx = items.findIndex(i => i.sku === sku);

    if (itemIdx !== -1) {
      const newItems = [...items];
      newItems[itemIdx].verified = true;
      setItems(newItems);
      setLastScanned(sku);
      setScanError(null);
      // Success top-up message
      alert(`Item Verified: ${newItems[itemIdx].name}`);
    } else {
      const errorMsg = `SKU ${sku} not found in this order.`;
      setScanError(errorMsg);
      setLastScanned(null);
      // Error top-up message
      alert(errorMsg);
    }
    setScanInput('');
    setIsScannerOpen(false);
    setTimeout(() => scanInputRef.current?.focus(), 100);
  };

  const removeItem = (idx: number) => {
    if (confirm("Are you sure you want to remove this item from the issue slip?")) {
      const newItems = items.filter((_, i) => i !== idx);
      setItems(newItems);
    }
  };

  const updateItem = (idx: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[idx] = { ...newItems[idx], [field]: value };
    setItems(newItems);
  };

  const handleApprove = async () => {
    const unverifiedItems = items.filter(i => !i.verified);
    if (unverifiedItems.length > 0) {
      alert(`Approval Problem: Please verify all items before approving. ${unverifiedItems.length} items remaining.`);
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Update Move Order status to Approved
      // NOTE: Stock reduction is deferred until "Commit Materials Movement" (MO Issue)
      const { error: updateError } = await supabase
        .from('move_orders')
        .update({ 
          status: 'Approved',
          items: items, // Save with issuedQty and verified status
          updated_at: new Date().toISOString(),
          updated_by: user?.fullName || 'System'
        })
        .eq('id', mo.id);

      if (updateError) throw updateError;

      setShowPrintPreview(true);
    } catch (err: any) {
      alert("Approval failed: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHold = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('move_orders')
        .update({ 
          status: 'On Hold',
          updated_at: new Date().toISOString(),
          updated_by: user?.fullName || 'System'
        })
        .eq('id', mo.id);

      if (error) throw error;
      onClose();
    } catch (err: any) {
      alert("Status update failed: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    const printSection = document.getElementById('print-section');
    if (!printSection) {
      window.print();
      return;
    }

    printSection.classList.add('printable');
    const root = getPrintRoot(printSection);
    root.render(<IssueSlipPrintTemplate mo={{ ...mo, items }} />);

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        printSection.classList.remove('printable');
        root.render(null);
      }, 1000);
    }, 500);
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('issue-slip-print');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Issue_Slip_${mo.mo_no || mo.reference}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
    }
  };

  const handleExportExcel = () => {
    const exportData = items.map((item, idx) => ({
      'Sl No.': idx + 1,
      'Description': item.name,
      'Part No': item.sku,
      'UOM': item.uom,
      'Req. QTY': item.reqQty,
      'Issued QTY': item.issuedQty,
      'Remarks': item.remarks,
      'Verified': item.verified ? 'YES' : 'NO'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Issue Slip");
    XLSX.writeFile(workbook, `Issue_Slip_${mo.mo_no || mo.reference}.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto print-mode-active">
      {showPrintPreview ? (
        <div className="bg-white w-full max-w-[1100px] h-[95vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          {/* Print Preview Header */}
          <div className="flex items-center justify-between px-8 py-4 border-b border-gray-100 bg-white no-print">
            <div className="flex items-center space-x-4">
              <div className="bg-[#2d808e] p-2 rounded-lg text-white shadow-lg shadow-cyan-900/20">
                <Printer size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-800 tracking-tight uppercase">Issue Slip Print Preview</h2>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Transaction: #{mo.reference || mo.mo_no}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={handlePrint}
                className="flex items-center space-x-2 px-6 py-2.5 bg-[#2d808e] text-white rounded-lg text-xs font-black uppercase hover:bg-[#256b78] transition-all shadow-lg shadow-cyan-900/20 active:scale-95"
              >
                <Printer size={16} />
                <span>Print Now</span>
              </button>
              <button 
                onClick={handleDownloadPDF}
                className="flex items-center space-x-2 px-6 py-2.5 bg-red-500 text-white rounded-lg text-xs font-black uppercase hover:bg-red-600 transition-all shadow-lg shadow-red-900/20 active:scale-95"
              >
                <FileDown size={16} />
                <span>Download PDF</span>
              </button>
              <div className="w-px h-8 bg-gray-100 mx-2"></div>
              <button 
                onClick={onClose}
                className="flex items-center space-x-2 px-6 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-black uppercase hover:bg-gray-200 transition-all active:scale-95"
              >
                <X size={16} />
                <span>Close</span>
              </button>
            </div>
          </div>

          {/* Print Preview Content */}
          <div className="flex-1 overflow-y-auto bg-gray-50 p-12 scrollbar-thin">
            <div className="bg-white shadow-2xl mx-auto ring-1 ring-gray-200 printable">
              <IssueSlipPrintTemplate mo={{ ...mo, items }} />
            </div>
          </div>
          
          {/* Print Preview Footer */}
          <div className="px-8 py-4 bg-white border-t border-gray-100 text-center no-print">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Material Request Approved Successfully • Ready for Final Issue</p>
          </div>
        </div>
      ) : (
        <div className="bg-white w-full max-w-[1200px] rounded-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-200 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#fcfcfc] no-print">
          <div className="flex items-center space-x-3">
            <div className="bg-[#2d808e] p-1.5 rounded text-white">
              <Scan size={18} />
            </div>
            <h2 className="text-[16px] font-black text-gray-800 tracking-tight uppercase">Move Order Verification & Approval</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={handlePrint} className="p-2 text-gray-500 hover:text-[#2d808e] hover:bg-cyan-50 rounded transition-all" title="Print">
              <Printer size={20} />
            </button>
            <button onClick={handleDownloadPDF} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded transition-all" title="Download PDF">
              <FileDown size={20} />
            </button>
            <button onClick={handleExportExcel} className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-all" title="Export Excel">
              <FileSpreadsheet size={20} />
            </button>
            <div className="w-px h-6 bg-gray-200 mx-2"></div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Scanner Bar */}
        <div className="px-6 py-4 bg-cyan-50/50 border-b border-cyan-100 no-print">
          <div className="flex items-center space-x-4">
            <form onSubmit={(e) => { e.preventDefault(); handleScan(); }} className="flex-1 max-w-md relative">
              <input 
                ref={scanInputRef}
                type="text" 
                placeholder="Scan Item SKU to Verify..."
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-cyan-200 rounded-lg text-sm font-bold focus:border-[#2d808e] outline-none shadow-sm"
              />
              <Scan size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#2d808e]" />
            </form>
            
            <button 
              onClick={() => setIsScannerOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-[#2d808e] text-white rounded-lg text-xs font-black uppercase hover:bg-[#256b78] transition-all shadow-md"
            >
              <Camera size={16} />
              <span>Open Scanner</span>
            </button>

            <div className="flex items-center space-x-4">
              {lastScanned && (
                <div className="flex items-center text-emerald-600 text-xs font-black uppercase animate-in fade-in slide-in-from-left-2">
                  <CheckCircle2 size={14} className="mr-1" />
                  Verified: {lastScanned}
                </div>
              )}
              {scanError && (
                <div className="flex items-center text-red-500 text-xs font-black uppercase animate-in fade-in slide-in-from-left-2">
                  <AlertCircle size={14} className="mr-1" />
                  {scanError}
                </div>
              )}
              <button 
                onClick={() => {
                  if (confirm("Bypass System: Are you sure you want to verify all items manually?")) {
                    setItems(items.map(i => ({ ...i, verified: true })));
                  }
                }}
                className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-[10px] font-black uppercase hover:bg-emerald-100 transition-all"
              >
                Verify All (Bypass)
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-col lg:flex-row h-[70vh]">
          {/* Left Side: Interactive Form */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin no-print">
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Employee</span>
                  <p className="text-sm font-bold text-gray-800">{mo.employee_name}</p>
                </div>
                <div className="space-y-1 text-center">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Department</span>
                  <p className="text-sm font-bold text-gray-800 uppercase">{mo.department}</p>
                </div>
                <div className="space-y-1 text-right">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">TNX.NO</span>
                  <p className="text-sm font-black text-[#2d808e]">#{mo.reference || mo.mo_no}</p>
                </div>
              </div>

              <div className="border border-gray-100 rounded-lg overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#fafafa]">
                    <tr className="text-[10px] font-black text-gray-500 uppercase tracking-wider border-b border-gray-100">
                      <th className="px-4 py-3 text-center w-12">Verify</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3 text-center w-32">SKU</th>
                      <th className="px-4 py-3 text-center w-20">Req. Qty</th>
                      <th className="px-4 py-3 text-center w-24">Issue Qty</th>
                      <th className="px-4 py-3 text-center w-16">UOM</th>
                      <th className="px-4 py-3">Remarks</th>
                      <th className="px-4 py-3 text-center w-12">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-[11px] font-medium text-gray-700">
                    {items.map((item: any, idx: number) => (
                      <tr key={idx} className={`border-b border-gray-50 last:border-0 transition-colors ${item.verified ? 'bg-emerald-50/30' : ''}`}>
                        <td className="px-4 py-3 text-center">
                          <button 
                            onClick={() => updateItem(idx, 'verified', !item.verified)}
                            className="focus:outline-none group"
                            title={item.verified ? "Unverify" : "Manually Verify"}
                          >
                            <div className={`w-4 h-4 rounded-full mx-auto shadow-sm transition-all flex items-center justify-center ${
                              item.verified 
                                ? 'bg-emerald-500 ring-2 ring-emerald-100' 
                                : 'bg-red-500 ring-2 ring-red-100 group-hover:scale-110'
                            }`}>
                              {item.verified && <CheckCircle2 size={10} className="text-white" />}
                            </div>
                          </button>
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-800 uppercase">{item.name}</td>
                        <td className="px-4 py-3 text-center font-mono text-gray-500">{item.sku}</td>
                        <td className="px-4 py-3 text-center font-black text-gray-400">{item.reqQty}</td>
                        <td className="px-4 py-3 text-center">
                          <input 
                            type="number" 
                            value={item.issuedQty}
                            onChange={(e) => updateItem(idx, 'issuedQty', e.target.value)}
                            className="w-16 px-2 py-1 border border-gray-200 rounded text-center font-black text-[#2d808e] focus:border-[#2d808e] outline-none"
                          />
                        </td>
                        <td className="px-4 py-3 text-center uppercase font-bold text-gray-400">{item.uom}</td>
                        <td className="px-4 py-3">
                          <input 
                            type="text" 
                            value={item.remarks}
                            onChange={(e) => updateItem(idx, 'remarks', e.target.value)}
                            placeholder="Add remarks..."
                            className="w-full px-2 py-1 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-[#2d808e] outline-none transition-all italic text-gray-500"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button 
                            onClick={() => removeItem(idx)}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Side: Print Preview (Hidden on screen, but used for PDF/Print) */}
          <div className="hidden lg:block w-[400px] border-l border-gray-100 bg-gray-50 overflow-y-auto p-4 no-print">
            <div className="sticky top-0">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 text-center">Live Print Preview</p>
              <div className="bg-white shadow-lg rounded-sm scale-[0.35] origin-top transform -translate-y-48">
                <IssueSlipPrintTemplate mo={{ ...mo, items }} />
              </div>
            </div>
          </div>
        </div>

        {/* Hidden Print Template for actual printing */}
        <div className="hidden print:block printable">
          <IssueSlipPrintTemplate mo={{ ...mo, items }} />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-8 py-6 border-t border-gray-100 bg-white no-print">
          <div className="flex items-center space-x-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Req. Qty</span>
              <p className="text-lg font-black text-gray-800">{totalQty.toFixed(2)}</p>
            </div>
            <div className="w-px h-8 bg-gray-100"></div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Approved Qty</span>
              <p className="text-lg font-black text-[#2d808e]">{totalIssuedQty.toFixed(2)}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button 
              onClick={handleHold}
              disabled={isSubmitting}
              className="px-8 py-2.5 text-[13px] font-bold text-red-500 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-all uppercase tracking-tight"
            >
              Put on Hold
            </button>
            <button 
              onClick={handleApprove}
              disabled={isSubmitting || items.some(i => !i.verified)}
              className={`px-12 py-2.5 text-[13px] font-black text-white rounded-lg shadow-lg transition-all flex items-center gap-3 uppercase tracking-widest active:scale-95 ${
                items.some(i => !i.verified) 
                  ? 'bg-gray-400 cursor-not-allowed shadow-none' 
                  : 'bg-[#2d808e] shadow-cyan-900/20 hover:bg-[#256b78]'
              }`}
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Approve Move Order
            </button>
          </div>
        </div>
      </div>
      )}
      
      {isScannerOpen && (
        <ScannerModal 
          onScan={(text) => handleScan(text)} 
          onClose={() => setIsScannerOpen(false)} 
        />
      )}
    </div>
  );
};

export default MOApprovalModal;
