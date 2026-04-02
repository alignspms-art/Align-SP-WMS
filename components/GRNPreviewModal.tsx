
import React, { useEffect, useState, useRef } from 'react';
import { X, Printer, FileText, Download, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface GRNPreviewModalProps {
  grnId: string;
  onClose: () => void;
}

const GRNPreviewModal: React.FC<GRNPreviewModalProps> = ({ grnId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [grnData, setGrnData] = useState<any>(null);
  const [poData, setPoData] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch GRN
        const { data: grn, error: grnError } = await supabase
          .from('grns')
          .select('*')
          .eq('grn_no', grnId)
          .maybeSingle();

        if (grnError) throw grnError;
        
        let targetGrn = grn;
        if (!targetGrn) {
          // If not found by grn_no, try by id (uuid)
          // Only try if grnId looks like a UUID to avoid error
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (uuidRegex.test(grnId)) {
            const { data: grnById } = await supabase
              .from('grns')
              .select('*')
              .eq('id', grnId)
              .maybeSingle();
            targetGrn = grnById;
          }
        }

        if (targetGrn) {
          setGrnData(targetGrn);
          
          let foundPo = null;
          // Fetch PO if source_ref looks like a PO number
          if (targetGrn.source_ref) {
            // Try by po_no first
            const { data: poByNo } = await supabase
              .from('purchase_orders')
              .select('*')
              .eq('po_no', targetGrn.source_ref)
              .maybeSingle();
            
            if (poByNo) {
              foundPo = poByNo;
            } else {
              // Try by id (uuid) if it looks like one
              const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
              if (uuidRegex.test(targetGrn.source_ref)) {
                const { data: poById } = await supabase
                  .from('purchase_orders')
                  .select('*')
                  .eq('id', targetGrn.source_ref)
                  .maybeSingle();
                if (poById) foundPo = poById;
              }
            }
          }
          
          // If still no poData, try to find it from the first item's poNo if available
          if (!foundPo && targetGrn.items?.[0]?.poNo) {
            const { data: poFromItem } = await supabase
              .from('purchase_orders')
              .select('*')
              .eq('po_no', targetGrn.items[0].poNo)
              .maybeSingle();
            if (poFromItem) foundPo = poFromItem;
          }

          if (foundPo) setPoData(foundPo);
        }
      } catch (err) {
        console.error('Error fetching GRN data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [grnId]);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>GRN - ${grnId}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              .no-print { display: none; }
              body { padding: 0; margin: 0; }
              @page { margin: 1cm; }
            }
            body { font-family: 'Times New Roman', Times, serif; }
          </style>
        </head>
        <body>
          <div class="p-0">
            ${printContent.innerHTML}
          </div>
          <script>
            window.onload = () => {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadPDF = async () => {
    const element = printRef.current;
    if (!element) return;

    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`GRN_${grnId}.pdf`);
  };

  const handleExportExcel = () => {
    if (!grnData) return;
    
    const wsData = [
      ["Fair Technology Limited"],
      ["3rd Floor, House-# 76/B, Dhaka-1213"],
      ["Mobile:"],
      [],
      ["Goods Received Note"],
      [],
      ["Supplier Number:", poData?.supplier_id || "", "", "GRN No. / Date:", `${grnData.grn_no} / ${new Date(grnData.created_at).toLocaleDateString('en-GB')}`],
      ["Supplier Name:", poData?.supplier_name || "", "", "Delivery Note:", grnData.invoice_no || ""],
      ["PO Number:", grnData.source_ref || "", "", "Bill of Lading:", grnData.bl_mushok_no || ""],
      ["PO Date:", poData ? new Date(poData.created_at).toLocaleDateString('en-GB') : "", "", "B/L Container:", grnData.bl_container || ""],
      [],
      ["SL", "Material Number", "Goods", "UOM", "Order Quantity", "Received Quantity", "Comments"],
    ];

    grnData.items.forEach((item: any, index: number) => {
      wsData.push([
        index + 1,
        item.sku,
        item.name,
        item.uom,
        item.poQty || item.recQty,
        item.grnQty || item.recQty,
        item.remarks || ""
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "GRN");
    XLSX.writeFile(wb, `GRN_${grnId}.xlsx`);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 z-[300] flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl flex flex-col items-center">
          <Loader2 className="animate-spin text-[#2d808e] mb-4" size={32} />
          <p className="text-sm font-bold text-gray-600">Loading GRN Preview...</p>
        </div>
      </div>
    );
  }

  if (!grnData) {
    return (
      <div className="fixed inset-0 bg-black/40 z-[300] flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl flex flex-col items-center">
          <X className="text-red-500 mb-4" size={32} />
          <p className="text-sm font-bold text-gray-600">GRN not found.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-100 rounded-lg">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-[900px] rounded-xl shadow-2xl flex flex-col max-h-[95vh]">
        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-t-xl">
          <div className="flex items-center space-x-4">
            <h2 className="text-sm font-bold text-gray-700">GRN Preview #{grnId}</h2>
            <div className="flex items-center space-x-2">
              <button 
                onClick={handlePrint}
                className="p-2 hover:bg-white rounded-lg text-gray-600 hover:text-[#2d808e] transition-all flex items-center space-x-1 border border-transparent hover:border-gray-200"
                title="Print"
              >
                <Printer size={18} />
                <span className="text-xs font-bold">Print</span>
              </button>
              <button 
                onClick={handleDownloadPDF}
                className="p-2 hover:bg-white rounded-lg text-gray-600 hover:text-red-500 transition-all flex items-center space-x-1 border border-transparent hover:border-gray-200"
                title="Download PDF"
              >
                <FileText size={18} />
                <span className="text-xs font-bold">PDF</span>
              </button>
              <button 
                onClick={handleExportExcel}
                className="p-2 hover:bg-white rounded-lg text-gray-600 hover:text-green-600 transition-all flex items-center space-x-1 border border-transparent hover:border-gray-200"
                title="Export Excel"
              >
                <Download size={18} />
                <span className="text-xs font-bold">Excel</span>
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={onClose}
              className="px-4 py-1.5 bg-[#2d808e] text-white text-xs font-bold rounded-lg hover:bg-[#256b78] transition-all"
            >
              Done
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-400 transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-100/50">
          <div 
            ref={printRef}
            className="bg-white shadow-lg mx-auto p-8 min-h-[1000px] w-[794px] text-black"
            style={{ fontFamily: "'Times New Roman', Times, serif" }}
          >
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-1">Fair Technology Limited.</h1>
              <p className="text-sm font-bold">3rd Floor, House-# 76/B, Dhaka-1213</p>
              <p className="text-sm font-bold">Mobile:</p>
              <h2 className="text-2xl font-bold mt-6 underline underline-offset-4">Goods Received Note</h2>
            </div>

            {/* Info Section */}
            <div className="grid grid-cols-2 gap-8 mb-6 text-sm">
              <div className="space-y-1">
                <div className="flex"><span className="w-32 font-bold">Supplier Number:</span> <span>{poData?.supplier_id || ''}</span></div>
                <div className="flex"><span className="w-32 font-bold">Supplier Name:</span> <span>{poData?.supplier_name || ''}</span></div>
                <div className="flex"><span className="w-32 font-bold">PO Number:</span> <span>{poData?.po_no || grnData.source_ref || ''}</span></div>
                <div className="flex"><span className="w-32 font-bold">PO Date:</span> <span>{poData ? new Date(poData.created_at).toLocaleDateString('en-GB') : ''}</span></div>
              </div>
              <div className="space-y-1">
                <div className="flex"><span className="w-40 font-bold">GRN No. / Date:</span> <span>{grnData.grn_no} / {new Date(grnData.created_at).toLocaleDateString('en-GB')}</span></div>
                <div className="flex"><span className="w-40 font-bold">Delivery Note:</span> <span>{grnData.invoice_no || ''}</span></div>
                <div className="flex"><span className="w-40 font-bold">Bill of Lading:</span> <span>{grnData.bl_mushok_no || ''}</span></div>
                <div className="flex"><span className="w-40 font-bold">B/L Container:</span> <span>{grnData.bl_container || ''}</span></div>
              </div>
            </div>

            {/* Table */}
            <table className="w-full border-collapse border border-black text-xs">
              <thead>
                <tr>
                  <th className="border border-black px-2 py-2 w-10">SL</th>
                  <th className="border border-black px-2 py-2 w-32">Material Number</th>
                  <th className="border border-black px-2 py-2">Goods</th>
                  <th className="border border-black px-2 py-2 w-12">UOM</th>
                  <th className="border border-black px-2 py-2 w-24">Order Quantity</th>
                  <th className="border border-black px-2 py-2 w-24">Received Quantity</th>
                  <th className="border border-black px-2 py-2 w-32">Comments</th>
                </tr>
              </thead>
              <tbody>
                {grnData.items.map((item: any, index: number) => (
                  <tr key={index} className="h-8">
                    <td className="border border-black px-2 py-1 text-center">{index + 1}</td>
                    <td className="border border-black px-2 py-1">{item.sku}</td>
                    <td className="border border-black px-2 py-1">{item.name}</td>
                    <td className="border border-black px-2 py-1 text-center">{item.uom}</td>
                    <td className="border border-black px-2 py-1 text-right">{(item.poQty || item.recQty || 0).toFixed(3)}</td>
                    <td className="border border-black px-2 py-1 text-right">{(item.grnQty || item.recQty || 0).toFixed(3)}</td>
                    <td className="border border-black px-2 py-1">{item.remarks || ''}</td>
                  </tr>
                ))}
                {/* Empty rows to fill space if needed */}
                {Array.from({ length: Math.max(0, 15 - grnData.items.length) }).map((_, i) => (
                  <tr key={`empty-${i}`} className="h-8">
                    <td className="border border-black px-2 py-1"></td>
                    <td className="border border-black px-2 py-1"></td>
                    <td className="border border-black px-2 py-1"></td>
                    <td className="border border-black px-2 py-1"></td>
                    <td className="border border-black px-2 py-1"></td>
                    <td className="border border-black px-2 py-1"></td>
                    <td className="border border-black px-2 py-1"></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer */}
            <div className="mt-10 grid grid-cols-3 gap-4 text-sm text-center">
              <div className="border-t border-black pt-2 font-bold">Received By</div>
              <div className="border-t border-black pt-2 font-bold">Checked by</div>
              <div className="border-t border-black pt-2 font-bold">Approved by</div>
            </div>

            <div className="mt-12 text-[10px] space-y-1">
              <p>1. Accounts/Finance dept. copy</p>
              <p>2. Supplier copy</p>
              <p>3. Store/Goods Inwards copy</p>
            </div>

            <div className="mt-8 flex justify-between items-end text-[10px]">
              <p>Note: This is a computer generated invoice and printed by FTLGNWH01</p>
              <p>1 of 1</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GRNPreviewModal;
