import React, { useState, useEffect } from 'react';
import { X, Printer, FileSpreadsheet, FileText, CheckCircle2, Edit2, Loader2, Save, ThumbsUp, FileDown } from 'lucide-react';
import PRPrintTemplate from './PRPrintTemplate';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface PRPreviewModalProps {
  pr: any;
  onClose: () => void;
}

const PRPreviewModal: React.FC<PRPreviewModalProps> = ({ pr: initialPr, onClose }) => {
  const { hasGranularPermission } = useAuth();
  const [pr, setPr] = useState<any>(initialPr);
  const [justificationData, setJustificationData] = useState<any[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // Reset internal state when initialPr changes
    setPr({ ...initialPr });
    setImages(initialPr.images || []);
    
    // Initialize justification data from saved field OR items
    if (initialPr.justification && initialPr.justification.length > 0) {
      setJustificationData(initialPr.justification);
    } else if (initialPr.items) {
      setJustificationData(initialPr.items.map((item: any) => ({
        name: item.name || 'N/A',
        last6m: item.last6m || 0,
        consumptionRate: item.consumptionRate || '',
        stockHand: item.stockInHand || 0,
        stockStore: item.onHand || 0,
        orderedQty: 0,
        purpose: '',
        approvedDesign: ''
      })));
    }
  }, [initialPr]);

  const handlePrFieldChange = (field: string, value: any) => {
    setPr({ ...pr, [field]: value });
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...(pr.items || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    setPr({ ...pr, items: newItems });
  };

  const handleAddItem = () => {
    const newItems = [...(pr.items || []), {
      sku: '',
      name: '',
      specification: '',
      brand: '',
      uom: 'SET',
      unitPrice: 0,
      reqQty: 0,
      onHand: 0,
      remarks: ''
    }];
    setPr({ ...pr, items: newItems });
    
    setJustificationData([...justificationData, {
      name: '',
      last6m: 0,
      consumptionRate: '',
      stockHand: 0,
      stockStore: 0,
      orderedQty: 0,
      purpose: '',
      approvedDesign: ''
    }]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...(pr.items || [])];
    newItems.splice(index, 1);
    setPr({ ...pr, items: newItems });

    const newJustification = [...justificationData];
    newJustification.splice(index, 1);
    setJustificationData(newJustification);
  };

  const handleJustificationChange = (index: number, field: string, value: any) => {
    const updated = [...justificationData];
    updated[index][field] = value;
    setJustificationData(updated);
  };

  const handleSaveToDB = async (statusOverride?: string) => {
    setIsSaving(true);
    try {
      const totalValue = (pr.items || []).reduce((acc: number, item: any) => acc + (Number(item.reqQty || 0) * Number(item.unitPrice || 0)), 0);

      // Clean payload to ensure only valid columns are sent
      const payload: any = {
        id: pr.id,
        pr_no: pr.pr_no,
        reference: pr.reference,
        type: pr.type,
        status: statusOverride || pr.status || 'Pending',
        req_by_name: pr.req_by_name,
        contact: pr.contact,
        email: pr.email,
        req_by_dept: pr.req_by_dept || pr.reqDpt,
        note: pr.note,
        total_value: totalValue,
        items: pr.items,
        images: images,
        justification: justificationData,
        updated_at: new Date().toISOString()
      };

      let { error } = await supabase
        .from('requisitions')
        .upsert([payload]);

      // Handle missing columns gracefully if schema cache is not updated
      if (error && (
        error.message.includes("column \"contact\" of relation \"requisitions\" does not exist") || 
        error.message.includes("Could not find the 'contact' column") ||
        error.code === 'PGRST204'
      )) {
        console.warn("Retrying PR save without missing columns...");
        const fallbackPayload = { ...payload };
        delete fallbackPayload.contact;
        delete fallbackPayload.email;
        delete fallbackPayload.note;
        delete fallbackPayload.images;
        delete fallbackPayload.justification;
        
        // Store extra info in header_text if possible
        fallbackPayload.header_text = `Contact: ${pr.contact}, Email: ${pr.email}${pr.note ? `, Note: ${pr.note}` : ''}`;
        
        const retry = await supabase.from('requisitions').upsert([fallbackPayload]);
        error = retry.error;
      }

      if (error) throw error;
      
      if (statusOverride === 'Approved') {
        setShowSuccess(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        alert("Changes saved to database successfully!");
        onClose(); // Parent will refresh list
      }
    } catch (err: any) {
      console.error("PR Save Error:", err);
      alert("Error saving changes: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    if (window.confirm("Are you sure you want to Approve this Requisition?")) {
      handleSaveToDB('Approved');
    }
  };

  const handleExportExcel = () => {
    const mainItems = pr.items.map((item: any, idx: number) => ({
      SL: idx + 1,
      'Part Code': item.sku || 'N/A',
      Name: item.name || 'N/A',
      Spec: item.specification || '',
      Brand: item.brand || '',
      UOM: item.uom || 'SET',
      'Unit Price (BDT)': item.unitPrice || 0,
      'Req Qty': item.reqQty || 0,
      'Value (BDT)': Number(item.reqQty || 0) * Number(item.unitPrice || 0),
      'On Hand': item.onHand || 0,
      'Remarks': item.remarks || ''
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(mainItems);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Purchase Requisition");
    
    const justificationExport = justificationData.map(row => ({
      'Item Name': row.name,
      'Last 6M Used': row.last6m,
      'Consumption Rate': row.consumptionRate,
      'Stock Hand [A]': row.stockHand,
      'Stock Store [B]': row.stockStore,
      'Ordered Qty [C]': row.orderedQty,
      'Total [D=A+B+C]': Number(row.stockHand) + Number(row.stockStore) + Number(row.orderedQty),
      'Purpose': row.purpose,
      'Approved Design (Y/N)': row.approvedDesign
    }));
    const worksheet2 = XLSX.utils.json_to_sheet(justificationExport);
    XLSX.utils.book_append_sheet(workbook, worksheet2, "Justification");

    XLSX.writeFile(workbook, `PR_${pr.pr_no}.xlsx`);
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('pr-print-area');
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
      pdf.save(`PR_${pr.pr_no}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Failed to generate PDF");
    } finally {
      setIsPrinting(false);
      setIsSaving(false);
    }
  };

  const handlePrint = async () => {
    const element = document.getElementById('pr-print-area');
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

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto ${isPrinting ? 'print-mode-active' : ''}`}>
      {showSuccess ? (
        <div className="bg-white p-12 rounded-3xl shadow-2xl flex flex-col items-center justify-center animate-in zoom-in duration-300">
          <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-6 animate-bounce">
            <CheckCircle2 size={64} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight mb-2">PR Approved!</h2>
          <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">Requisition has been successfully authorized</p>
        </div>
      ) : (
        <div className="bg-[#f8f9fa] w-full max-w-[1300px] rounded-2xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in-95 duration-300 flex flex-col my-auto max-h-[96vh]">
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-white sticky top-0 z-10 no-print">
          <div className="flex items-center space-x-4">
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-xl transition-colors">
              <X size={20} />
            </button>
            <div className="flex flex-col">
              <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dynamic Document Editor</h2>
              <p className="text-sm font-black text-gray-800 tracking-tight uppercase">PR NO: {pr.pr_no} {pr.status === 'Approved' && <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-600 text-[9px] rounded-full">APPROVED</span>}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
             <button 
               onClick={() => handleSaveToDB()}
               disabled={isSaving}
               className="p-2.5 text-blue-500 hover:bg-blue-50 border border-blue-100 rounded-xl transition-all flex items-center gap-2" 
               title="Save Changes to Database"
             >
               {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
               <span className="text-[10px] font-black uppercase">SAVE DB</span>
             </button>
             
             {pr.status !== 'Approved' && hasGranularPermission('requisition', 'approved') && (
               <button 
                onClick={handleApprove}
                disabled={isSaving}
                className="p-2.5 text-emerald-600 hover:bg-emerald-50 border border-emerald-100 rounded-xl transition-all flex items-center gap-2"
              >
                <ThumbsUp size={18} />
                <span className="text-[10px] font-black uppercase">Approve PR</span>
              </button>
             )}

             <button onClick={handlePrint} className="p-2.5 text-gray-600 hover:bg-gray-100 border border-gray-200 rounded-xl transition-all" title="Print to PDF">
               <Printer size={18} />
             </button>
             <button onClick={handleExportExcel} className="p-2.5 text-green-600 hover:bg-green-50 border border-green-100 rounded-xl transition-all" title="Export Excel">
               <FileSpreadsheet size={18} />
             </button>
             <button onClick={handleDownloadPDF} className="p-2.5 text-red-600 hover:bg-red-50 border border-red-100 rounded-xl transition-all" title="Download PDF">
               <FileDown size={18} />
             </button>
             <div className="h-8 w-px bg-gray-200 mx-2"></div>
             <button 
               onClick={() => handleSaveToDB()}
               className="bg-[#2d808e] text-white px-8 py-2.5 rounded-xl text-xs font-black shadow-xl shadow-cyan-900/10 hover:bg-[#256b78] flex items-center space-x-3 uppercase tracking-widest active:scale-95 transition-all"
             >
                <CheckCircle2 size={18} />
                <span>Confirm & Save</span>
             </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-10 scrollbar-thin bg-gray-100/50">
           <div id="pr-print-area" className={`bg-white shadow-2xl border border-gray-200 rounded-sm ring-1 ring-black/5 printable ${isPrinting ? 'html2canvas-container' : ''}`}>
             <PRPrintTemplate 
                pr={pr} 
                onPrChange={handlePrFieldChange}
                justificationData={justificationData}
                onJustificationChange={handleJustificationChange}
                images={images}
                onImagesChange={setImages}
                onAddItem={handleAddItem}
                onRemoveItem={handleRemoveItem}
                onItemChange={handleItemChange}
                isPrinting={isPrinting}
             />
           </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default PRPreviewModal;