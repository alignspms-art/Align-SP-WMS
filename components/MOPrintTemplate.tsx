
import React from 'react';

interface MOPrintTemplateProps {
  mo: any;
}

const MOPrintTemplate: React.FC<MOPrintTemplateProps> = ({ mo }) => {
  const items = mo.items || [];
  const totalReqQty = items.reduce((acc: number, i: any) => acc + (Number(i.reqQty) || 0), 0);
  const totalTnxQty = items.reduce((acc: number, i: any) => acc + (Number(i.issuedQty || i.tnxQty) || 0), 0);
  const totalTnxValue = items.reduce((acc: number, i: any) => {
    const qty = Number(i.issuedQty || i.tnxQty) || 0;
    const price = Number(i.unitPrice) || 0;
    return acc + (qty * price);
  }, 0);

  const formatCurrency = (num: number) => num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div id="mo-print-view" className="bg-white text-black font-sans p-8 md:p-12 max-w-[1200px] mx-auto select-text leading-tight printable">
      {/* Header */}
      <div className="flex justify-between items-start mb-8 relative">
        <div className="flex-1 text-center">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Fair Technology Limited</h1>
          <p className="text-[11px] text-gray-600 mt-1 uppercase font-medium">Plot- 12/A & 12/B, Block-C, Kaliakoir Hi-Tech Park</p>
          <p className="text-[11px] text-gray-600 uppercase font-medium">Gazipur, Bangladesh-1750. +#880 1787-670 786</p>
          <h2 className="text-lg font-black mt-4 uppercase tracking-tighter">Move Order Details Report</h2>
        </div>
        <div className="absolute top-0 right-0">
          <img 
            src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=MO-${mo.reference || mo.mo_no}`} 
            alt="QR Code" 
            className="w-24 h-24 border border-gray-100"
          />
        </div>
      </div>

      {/* Meta Data Section - 3 Columns */}
      <div className="grid grid-cols-3 gap-x-12 gap-y-1 mb-6 text-[11px] font-bold">
        <div className="space-y-1">
          <p className="flex"><span className="w-16 shrink-0">MO.ID:</span> <span className="font-medium text-gray-700">{mo.reference || mo.mo_no}</span></p>
          <p className="flex"><span className="w-16 shrink-0">MO.Type:</span> <span className="font-medium text-gray-700">Move Order</span></p>
          <p className="flex"><span className="w-16 shrink-0">Ref.:</span> <span className="font-medium text-gray-700">{mo.mo_no}</span></p>
        </div>
        <div className="space-y-1">
          <p className="flex"><span className="w-20 shrink-0">Req. Date:</span> <span className="font-medium text-gray-700">{formatDate(mo.created_at)}</span></p>
          <p className="flex"><span className="w-20 shrink-0">Req. By:</span> <span className="font-medium text-gray-700">{mo.requested_by || 'System'}</span></p>
          <p className="flex"><span className="w-20 shrink-0">Dept.:</span> <span className="font-medium text-gray-700 uppercase">{mo.department || 'N/A'}</span></p>
        </div>
        <div className="space-y-1">
          <p className="flex"><span className="w-24 shrink-0">Updated At:</span> <span className="font-medium text-gray-700">{formatDate(mo.updated_at || mo.created_at)}</span></p>
          <p className="flex"><span className="w-24 shrink-0">Status:</span> <span className="font-medium text-emerald-600">{mo.status || 'Pending'}</span></p>
          <p className="flex"><span className="w-24 shrink-0">Updated By:</span> <span className="font-medium text-gray-700">{mo.updated_by || 'System'}</span></p>
          {mo.note && <p className="flex"><span className="w-24 shrink-0">Note:</span> <span className="font-medium text-gray-700 italic">{mo.note}</span></p>}
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full border-collapse border border-black mb-1 text-[10px]">
        <thead>
          <tr className="font-black text-center uppercase tracking-tighter">
            <th className="border border-black py-1 px-1 w-8">SL</th>
            <th className="border border-black py-1 px-2 w-32">Available</th>
            <th className="border border-black py-1 px-2 w-28">Item SKU</th>
            <th className="border border-black py-1 px-3 text-left">Item Name</th>
            <th className="border border-black py-1 px-1 w-14">UOM</th>
            <th className="border border-black py-1 px-1 w-20">Unit Price</th>
            <th className="border border-black py-1 px-1 w-16">On-Hand</th>
            <th className="border border-black py-1 px-1 w-16">Req. Qty</th>
            <th className="border border-black py-1 px-1 w-16">Issued Qty</th>
            <th className="border border-black py-1 px-1 w-24">Tnx. Value</th>
            <th className="border border-black py-1 px-1 w-16">1M Used</th>
            <th className="border border-black py-1 px-1 w-16">6M Used</th>
            <th className="border border-black py-1 px-2">Remarks</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: any, idx: number) => {
            const tnxQty = Number(item.issuedQty || item.tnxQty) || 0;
            const price = Number(item.unitPrice) || 0;
            return (
              <tr key={idx} className="font-medium text-center">
                <td className="border border-black py-1 px-1">{idx + 1}</td>
                <td className="border border-black py-1 px-2 text-[9px] truncate max-w-[100px] uppercase">{item.location || 'N/A'}</td>
                <td className="border border-black py-1 px-2">{item.sku}</td>
                <td className="border border-black py-1 px-3 text-left font-bold uppercase">{item.name}</td>
                <td className="border border-black py-1 px-1 uppercase">{item.uom || 'PC'}</td>
                <td className="border border-black py-1 px-1 text-right">{formatCurrency(price)}</td>
                <td className="border border-black py-1 px-1">{Number(item.onHand || 0).toFixed(2)}</td>
                <td className="border border-black py-1 px-1">{Number(item.reqQty || 0).toFixed(2)}</td>
                <td className="border border-black py-1 px-1 font-bold">{tnxQty.toFixed(2)}</td>
                <td className="border border-black py-1 px-1 text-right">{formatCurrency(tnxQty * price)}</td>
                <td className="border border-black py-1 px-1">{Number(item.used1m || 0).toFixed(2)}</td>
                <td className="border border-black py-1 px-1">{Number(item.used6m || 0).toFixed(2)}</td>
                <td className="border border-black py-1 px-2 text-left italic text-gray-500">{item.remarks || ''}</td>
              </tr>
            );
          })}
          {/* Total Row */}
          <tr className="font-black text-right bg-gray-50/30">
            <td colSpan={7} className="border border-black py-1.5 px-2 uppercase tracking-tighter">Total=</td>
            <td className="border border-black py-1.5 px-1 text-center">{totalReqQty.toFixed(2)}</td>
            <td className="border border-black py-1.5 px-1 text-center">{totalTnxQty.toFixed(2)}</td>
            <td className="border border-black py-1.5 px-1 text-right text-[#2d808e]">{formatCurrency(totalTnxValue)}</td>
            <td colSpan={3} className="border border-black"></td>
          </tr>
        </tbody>
      </table>

      {/* Footer Branding */}
      <div className="mt-24 pt-4 border-t border-gray-100 flex items-center justify-center text-[8px] font-black text-gray-300 uppercase tracking-[0.5em]">
        ALIGN ERP SYSTEM GENERATED NODE • DATE: {new Date().toLocaleString()}
      </div>
    </div>
  );
};

export default MOPrintTemplate;
