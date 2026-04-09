
import React from 'react';
import { useAuth } from '../context/AuthContext';

interface POPrintTemplateProps {
  po: any;
  onPoChange?: (field: string, value: any) => void;
  isPrinting?: boolean;
}

const POPrintTemplate: React.FC<POPrintTemplateProps> = ({ po, onPoChange, isPrinting = false }) => {
  const { hasGranularPermission } = useAuth();
  const items = po.items || [];
  const terms = po.terms || {};

  const totalValue = items.reduce((acc: number, i: any) => acc + (Number(i.poQty || 0) * Number(i.poPrice || 0)), 0);
  const totalVat = items.reduce((acc: number, i: any) => acc + ((Number(i.poQty || 0) * Number(i.poPrice || 0)) * (Number(i.vatPercent || 0) / 100)), 0);
  const grandTotal = totalValue + totalVat;

  const formatCurrency = (num: number) => num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Strictly map status for visualization: only Approved or Pending
  const displayStatus = (['Approved', 'Open', 'Closed', 'APPROVED', 'OPEN', 'CLOSED'].includes(po.status)) ? 'Approved' : 'Pending';

  return (
    <div className="p-10 bg-white text-black font-roboto min-h-screen text-[12px] leading-relaxed">
      {/* Header Section */}
      <div className="flex justify-between items-start mb-8 relative">
        <div className="w-24 h-24"></div> {/* Spacer for symmetry */}
        <div className="flex-1 text-center">
          <h1 className="text-3xl font-black text-gray-900 leading-tight mb-1">Maheen Label Tex Ltd.</h1>
          <p className="text-[11px] text-gray-600 font-medium">Gazipur, Bangladesh-1750. #+880 1787-670 786</p>
          <div className="mt-4">
            <h2 className="text-lg font-black uppercase tracking-widest">PURCHASE ORDER (PO)</h2>
          </div>
        </div>
        <div className="w-24 h-24 flex items-center justify-center border border-gray-100 p-1">
           <img 
            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=PO-${po.po_no}`} 
            alt="QR Code" 
            className="w-full h-full"
           />
        </div>
      </div>

      {/* Meta Grid Section - Strictly dynamic based on PO data */}
      <div className="grid grid-cols-3 gap-x-8 gap-y-1.5 mb-8 border-t border-gray-100 pt-6">
        {/* Left Column: Supplier Details */}
        <div className="space-y-1">
          <p className="flex items-baseline"><span className="font-bold w-24 shrink-0">PO No.:</span> <span className="font-black text-gray-700">{po.po_no}</span></p>
          <p className="flex items-baseline"><span className="font-bold w-24 shrink-0">Supplier Name:</span> <span className="uppercase text-gray-700">{po.supplier_name}</span></p>
          <p className="flex items-baseline text-[10px]"><span className="font-bold w-24 shrink-0">Supplier Address:</span> <span className="text-gray-700">{po.supplier_address || terms.supplier_address || 'N/A'}</span></p>
          <p className="flex items-baseline"><span className="font-bold w-24 shrink-0">VAT No.:</span> <span className="text-gray-700">{po.supplier_vat || terms.supplier_vat || 'N/A'}</span></p>
          <p className="flex items-baseline"><span className="font-bold w-24 shrink-0">TIN No.:</span> <span className="text-gray-700">{po.supplier_tin || terms.supplier_tin || 'N/A'}</span></p>
          <p className="flex items-baseline"><span className="font-bold w-24 shrink-0">Email:</span> <span className="text-gray-700 lowercase">{po.supplier_email || terms.supplier_email || 'N/A'}</span></p>
          <p className="flex items-baseline"><span className="font-bold w-24 shrink-0">Contact:</span> <span className="text-gray-700">{po.supplier_contact || terms.supplier_contact || 'N/A'}</span></p>
        </div>
        
        {/* Middle Column: Buyer Details */}
        <div className="space-y-1">
          <p className="flex items-baseline"><span className="font-bold w-24 shrink-0">Buyer Name:</span> <span className="text-gray-700">Maheen Label Tex Ltd.</span></p>
          <p className="flex items-baseline text-[10px]"><span className="font-bold w-24 shrink-0">Buyer Address:</span> <span className="text-gray-700">76/B, Khawaja Palace, Road-11 Banani, Dhaka, Bangladesh, 1213.</span></p>
          <p className="flex items-baseline"><span className="font-bold w-24 shrink-0">Buyer BIN Name:</span> <span className="text-gray-700">XXXXX</span></p>
          <p className="flex items-baseline"><span className="font-bold w-24 shrink-0">Buyer BIN No.:</span> <span className="text-gray-700">XXXX</span></p>
          <p className="flex items-baseline"><span className="font-bold w-24 shrink-0">Buyer BIN Address:</span> <span className="text-gray-700">XXXX</span></p>
        </div>

        {/* Right Column: Metadata */}
        <div className="space-y-1">
          <p className="flex items-baseline"><span className="font-bold w-24 shrink-0">Issue Date:</span> <span className="text-gray-700">{new Date(po.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span></p>
          <p className="flex items-baseline"><span className="font-bold w-24 shrink-0">Delivery Date:</span> <span className="text-gray-700">{terms.deliveryTarget || 'N/A'}</span></p>
          <p className={`flex items-baseline ${['Approved', 'Ordered', 'Closed', 'APPROVED', 'ORDERED', 'CLOSED'].includes(po.status) ? 'hidden' : ''}`}>
            <span className="font-bold w-24 shrink-0">PO Status:</span> 
            <span className={`font-black uppercase ${displayStatus === 'Approved' ? 'text-green-600' : 'text-orange-600'}`}>
              {displayStatus}
            </span>
          </p>
          <p className="flex items-baseline"><span className="font-bold w-24 shrink-0">Currency:</span> <span className="text-gray-700">{po.currency || 'BDT'}</span></p>
          <p className="flex items-baseline"><span className="font-bold w-24 shrink-0">Requested by:</span> <span className="text-gray-700">{po.requested_by || terms.requested_by || 'N/A'}</span></p>
          <p className="flex items-baseline"><span className="font-bold w-24 shrink-0">Contact No.:</span> <span className="text-gray-700">{po.requested_contact || terms.requested_contact || 'N/A'}</span></p>
          <p className="flex items-baseline"><span className="font-bold w-24 shrink-0">PO Note:</span> <span className="text-gray-700">{po.note || 'N/A'}</span></p>
        </div>
      </div>

      {/* Main Items Table */}
      <table className="w-full border-collapse border border-black mb-1">
        <thead>
          <tr className="bg-gray-50 text-[11px] font-bold">
            <th className="border border-black py-2 px-1 text-center w-8">SL</th>
            <th className="border border-black py-2 px-1 text-center">PR Ref.</th>
            <th className="border border-black py-2 px-1 text-center">Part Code</th>
            <th className="border border-black py-2 px-2 text-left">Name</th>
            <th className="border border-black py-2 px-1 text-center">Spec.</th>
            <th className="border border-black py-2 px-1 text-center">UOM</th>
            <th className="border border-black py-2 px-1 text-right">Unit Price</th>
            <th className="border border-black py-2 px-1 text-center">% of VAT</th>
            <th className="border border-black py-2 px-1 text-center w-14">PO Qty</th>
            <th className="border border-black py-2 px-1 text-right">PO Value</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: any, idx: number) => (
            <tr key={idx} className="text-[11px]">
              <td className="border border-black py-2 px-1 text-center">{idx + 1}</td>
              <td className="border border-black py-2 px-1 text-center">{item.prNo}</td>
              <td className="border border-black py-2 px-1 text-center">{item.sku}</td>
              <td className="border border-black py-2 px-2 font-bold uppercase">{item.name}</td>
              <td className="border border-black py-2 px-1 text-center">{item.specification}</td>
              <td className="border border-black py-2 px-1 text-center uppercase">{item.uom || 'SET'}</td>
              <td className="border border-black py-2 px-1 text-right">{formatCurrency(Number(item.poPrice))}</td>
              <td className="border border-black py-2 px-1 text-center">{Number(item.vatPercent || 0).toFixed(2)}</td>
              <td className="border border-black py-2 px-1 text-center font-bold">{item.poQty}</td>
              <td className="border border-black py-2 px-1 text-right font-bold">{formatCurrency(Number(item.poQty) * Number(item.poPrice))}</td>
            </tr>
          ))}
          <tr className="font-bold text-[11px]">
            <td colSpan={8} className="border border-black py-2 px-2 text-right">Total</td>
            <td className="border border-black py-2 px-1 text-center">{items.reduce((a: number, b: any) => a + Number(b.poQty), 0)}</td>
            <td className="border border-black py-2 px-1 text-right">{formatCurrency(totalValue)}</td>
          </tr>
          <tr className="font-bold text-[11px]">
            <td colSpan={9} className="border border-black py-2 px-2 text-right">VAT Amount</td>
            <td className="border border-black py-2 px-1 text-right">{formatCurrency(totalVat)}</td>
          </tr>
          <tr className="font-bold text-[11px] bg-gray-50">
            <td colSpan={9} className="border border-black py-2 px-2 text-right">Grand Total</td>
            <td className="border border-black py-2 px-1 text-right">{formatCurrency(grandTotal)}</td>
          </tr>
        </tbody>
      </table>

      {/* Amount In Words */}
      <p className="text-[11px] font-bold mb-8 mt-4 uppercase italic">
        Total Amount In Word: {grandTotal.toLocaleString()} {po.currency || 'BDT'} ONLY.
      </p>

      {/* Terms & Conditions Section */}
      <div className="border border-black mb-12 overflow-hidden">
        {[
          { label: 'Delivery Terms:', text: terms.deliveryTerms || 'N/A' },
          { label: 'Delivery Location:', text: terms.deliveryLocation || 'N/A' },
          { label: 'Bill Submission:', text: terms.billSubmission || 'N/A' },
          { label: 'Documents to be submitted with the bill:', text: terms.documentsRequired || 'N/A' },
          { label: 'Payment Terms:', text: terms.paymentTerms || 'N/A' },
          { label: 'Payment Mode:', text: terms.paymentMethod || 'Bank A/C Name: N/A\nBank A/C Number: N/A\nBank Name: N/A\nBranch Name: N/A\nRouting No.: N/A\nSwift Code: N/A' },
        ].map((row, i) => (
          <div key={i} className="flex border-b last:border-0 border-black min-h-[50px]">
            <div className="w-64 px-4 py-3 font-bold border-r border-black flex items-center bg-gray-50/30 text-[11px]">
              {row.label}
            </div>
            <div className="flex-1 px-4 py-3 whitespace-pre-wrap leading-relaxed text-[10px] flex items-center">
              {row.text}
            </div>
          </div>
        ))}
      </div>

      {/* Signature Grid */}
      <div className="grid grid-cols-5 gap-4 mt-16 px-4">
        {[
          { title: 'PREPARED BY', field: 'prepared_by', perm: 'prepared' },
          { title: 'CHECKED BY', field: 'checked_by', perm: 'checked' },
          { title: 'CONFIRMED BY', field: 'confirmed_by', perm: 'confirmed' },
          { title: 'APPROVED BY', field: 'approved_by', perm: 'approved' },
          { title: 'ACCEPTED BY', field: 'accepted_by', perm: 'accepted' },
        ].map((sig, i) => {
          const canEdit = hasGranularPermission('purchase_order', sig.perm);
          return (
            <div key={i} className="text-center flex flex-col">
              <div className="border-t-[1.5px] border-black pt-2 mb-1">
                <p className="font-black text-[11px] uppercase tracking-wider">{sig.title}</p>
              </div>
              {isPrinting ? (
                <p className="text-[10px] font-bold uppercase text-center py-1 text-gray-700">
                  {po[sig.field] || (sig.field === 'accepted_by' ? po.supplier_name : '')}
                </p>
              ) : (
                <input 
                  className={`w-full text-[10px] font-bold uppercase text-center bg-transparent border-none outline-none focus:bg-yellow-50 ${!canEdit ? 'cursor-not-allowed' : ''}`}
                  value={po[sig.field] || (sig.field === 'accepted_by' ? po.supplier_name : '')}
                  onChange={(e) => canEdit && onPoChange && onPoChange(sig.field, e.target.value)}
                  readOnly={!canEdit}
                  placeholder={canEdit ? "Type Name..." : ""}
                />
              )}
              <p className="text-[9px] text-gray-400 font-medium">{sig.field === 'accepted_by' ? 'Supplier' : 'Maheen Label Tex Ltd.'}</p>
            </div>
          );
        })}
      </div>

      {/* Footer Branding */}
      <div className="mt-12 text-center text-gray-300 text-[8px] font-black uppercase tracking-[0.3em]">
        ALIGN ERP GENERATED DOCUMENT • SYSTEM DATE: {new Date().toLocaleDateString()}
      </div>
    </div>
  );
};

export default POPrintTemplate;
