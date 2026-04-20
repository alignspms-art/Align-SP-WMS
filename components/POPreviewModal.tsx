
import React, { useState } from 'react';
import { X, Printer, FileSpreadsheet, CheckCircle, Save, ThumbsUp, Loader2, FileDown } from 'lucide-react';
import POPrintTemplate from './POPrintTemplate';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface POPreviewModalProps {
  po: any;
  onClose: () => void;
}

const POPreviewModal: React.FC<POPreviewModalProps> = ({ po: initialPo, onClose }) => {
  const { user, hasGranularPermission } = useAuth();
  const [po, setPo] = useState<any>(initialPo);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const handleApprove = async () => {
    if (window.confirm(`Are you sure you want to APPROVE PO No: ${po.po_no}?`)) {
      setIsSaving(true);
      try {
        const { error } = await supabase
          .from('purchase_orders')
          .update({ 
            status: 'Approved',
            prepared_by: po.prepared_by,
            checked_by: po.checked_by,
            confirmed_by: po.confirmed_by,
            approved_by: po.approved_by,
            accepted_by: po.accepted_by
          })
          .eq('id', po.id);

        if (error) throw error;
        alert("Purchase Order Approved & Signatures Saved!");
        onClose();
      } catch (err: any) {
        alert("Approval failed: " + err.message);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleSaveSignatures = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('purchase_orders')
        .update({ 
          prepared_by: po.prepared_by,
          checked_by: po.checked_by,
          confirmed_by: po.confirmed_by,
          approved_by: po.approved_by,
          accepted_by: po.accepted_by
        })
        .eq('id', po.id);

      if (error) throw error;
      alert("Signatures Saved Successfully!");
    } catch (err: any) {
      alert("Save failed: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('po-print-area');
    if (!element) return;
    
    setIsSaving(true);
    setIsPrinting(true);

    // Small delay to ensure React re-renders with isPrinting=true
    await new Promise(resolve => setTimeout(resolve, 150));

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`PO_${po.po_no}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Failed to generate PDF");
    } finally {
      setIsPrinting(false);
      setIsSaving(false);
    }
  };

  const handlePrint = async () => {
    const element = document.getElementById('po-print-area');
    if (!element) return;
    
    setIsSaving(true);
    setIsPrinting(true);

    // Small delay to ensure React re-renders with isPrinting=true
    await new Promise(resolve => setTimeout(resolve, 150));

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      // Auto print logic using autoPrint() and opening in new tab
      pdf.autoPrint();
      const blobUrl = pdf.output('bloburl');
      window.open(blobUrl, '_blank');
    } catch (err) {
      console.error("Print generation error:", err);
      alert("Failed to generate print document");
    } finally {
      setIsPrinting(false);
      setIsSaving(false);
    }
  };

  const handleExportExcel = () => {
    const items = po.items || [];
    const exportData = items.map((item: any, idx: number) => ({
      SL: idx + 1,
      'PO No': po.po_no,
      'PR No': item.prNo,
      'SKU': item.sku,
      'Name': item.name,
      'PO Price': item.poPrice,
      'PO Qty': item.poQty,
      'Total Value': Number(item.poQty || 0) * Number(item.poPrice || 0),
      'Supplier': po.supplier_name,
      'Status': po.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Purchase Order");
    XLSX.writeFile(workbook, `PO_${po.po_no}.xlsx`);
  };

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto ${isPrinting ? 'print-mode-active' : ''}`}>
      <div className="bg-white w-full max-w-[1300px] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 flex flex-col my-auto max-h-[96vh]">
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-white sticky top-0 z-10 no-print">
          <div className="flex items-center space-x-4">
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-xl transition-colors">
              <X size={20} />
            </button>
            <div className="flex flex-col">
              <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">PO Management Terminal</h2>
              <p className="text-sm font-black text-gray-800 tracking-tight uppercase">PO NO: {po.po_no}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
             <button 
               onClick={handleSaveSignatures}
               disabled={isSaving}
               className="p-2.5 text-blue-600 hover:bg-blue-50 border border-blue-100 rounded-xl transition-all flex items-center space-x-2"
               title="Save Signatures"
             >
               {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
               <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Save Signatures</span>
             </button>
             {(po.status === 'Pending Approval' || po.status === 'Pending') && hasGranularPermission('purchase_order', 'approved') && (
               <button 
                onClick={handleApprove}
                disabled={isSaving}
                className="bg-emerald-600 text-white px-8 py-2.5 rounded-xl text-xs font-black shadow-xl shadow-emerald-900/10 hover:bg-emerald-700 flex items-center space-x-3 uppercase tracking-widest active:scale-95 transition-all"
              >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <ThumbsUp size={18} />}
                <span>Approve PO</span>
              </button>
             )}
             <button onClick={handleDownloadPDF} className="p-2.5 text-red-600 hover:bg-red-50 border border-red-100 rounded-xl transition-all" title="Download PDF">
               <FileDown size={18} />
             </button>
             <button onClick={handlePrint} className="p-2.5 text-gray-600 hover:bg-gray-100 border border-gray-200 rounded-xl transition-all" title="Print PO">
               <Printer size={18} />
             </button>
             <button onClick={handleExportExcel} className="p-2.5 text-green-600 hover:bg-green-50 border border-green-100 rounded-xl transition-all" title="Export Excel">
               <FileSpreadsheet size={18} />
             </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-10 scrollbar-thin bg-gray-100/30">
           <div id="po-print-area" className={`bg-white shadow-xl border border-gray-200 rounded-sm printable ${isPrinting ? 'html2canvas-container' : ''}`}>
             <POPrintTemplate 
               po={po} 
               onPoChange={(field, val) => setPo({ ...po, [field]: val })}
               isPrinting={isPrinting}
             />
           </div>
        </div>
      </div>
    </div>
  );
};

export default POPreviewModal;
