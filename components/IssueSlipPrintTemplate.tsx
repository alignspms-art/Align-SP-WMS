
import React from 'react';

interface IssueSlipPrintTemplateProps {
  mo: any;
}

const IssueSlipPrintTemplate: React.FC<IssueSlipPrintTemplateProps> = ({ mo }) => {
  const items = mo.items || [];
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    const day = d.getDate().toString().padStart(2, '0');
    const month = d.toLocaleString('en-GB', { month: 'short' });
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${day} ${month} ${year}, ${hours}:${minutes}`;
  };

  return (
    <div id="issue-slip-print" className="bg-white text-black font-sans p-8 md:p-12 max-w-[1000px] mx-auto select-text leading-tight printable">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-block bg-black text-white px-8 py-1.5 rounded-full text-sm font-black uppercase tracking-[0.2em] mb-4 shadow-sm">
          Material Issue Slip
        </div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase mb-0.5">Fair Technology Limited</h1>
        <h2 className="text-lg font-black text-gray-800 uppercase tracking-tighter mb-0.5">Hyundai Manufacturing Plant</h2>
        <p className="text-[10px] text-gray-600 uppercase font-bold tracking-tight">
          Hi-tech City (Plot no.-12, Block- 6), Kaliakoir, Gazipur, Bangladesh.
        </p>
      </div>

      {/* Meta Data Section */}
      <div className="grid grid-cols-3 gap-x-8 gap-y-1 mb-8 text-[13px] py-4">
        <div className="space-y-1">
          <p className="flex items-start">
            <span className="w-36 shrink-0 font-bold text-gray-900">Employee Name:</span> 
            <span className="font-medium text-gray-800 whitespace-nowrap">{mo.employee_name || '-'}</span>
          </p>
          <p className="flex items-start">
            <span className="w-36 shrink-0 font-bold text-gray-900">Date & Time:</span> 
            <span className="font-medium text-gray-800 whitespace-nowrap">{formatDate(mo.created_at) || '-'}</span>
          </p>
          <p className="flex items-start">
            <span className="w-36 shrink-0 font-bold text-gray-900">Section:</span> 
            <span className="font-medium text-gray-800">{mo.section || '-'}</span>
          </p>
        </div>
        <div className="space-y-1">
          <p className="flex items-start">
            <span className="w-28 shrink-0 font-bold text-gray-900">Dept.:</span> 
            <span className="font-medium text-gray-800 uppercase">{mo.department || '-'}</span>
          </p>
          <p className="flex items-start">
            <span className="w-28 shrink-0 font-bold text-gray-900">Purpose:</span> 
            <span className="font-medium text-gray-800">{mo.header_text || '-'}</span>
          </p>
          <p className="flex items-start">
            <span className="w-28 shrink-0 font-bold text-gray-900">Sub-Section:</span> 
            <span className="font-medium text-gray-800">{mo.sub_section || '-'}</span>
          </p>
        </div>
        <div className="space-y-1">
          <p className="flex items-start">
            <span className="w-28 shrink-0 font-bold text-gray-900">Employee ID:</span> 
            <span className="font-medium text-gray-800">{mo.employee_id || '-'}</span>
          </p>
          <p className="flex items-start">
            <span className="w-28 shrink-0 font-bold text-[#2d808e]">TNX.NO:</span> 
            <span className="font-black text-[#2d808e]">{mo.reference || mo.mo_no || '-'}</span>
          </p>
          <p className="flex items-start">
            <span className="w-28 shrink-0 font-bold text-gray-900">Shift:</span> 
            <span className="font-medium text-gray-800 uppercase">{mo.shift || '-'}</span>
          </p>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full border-collapse border-2 border-black mb-6 text-[11px]">
        <thead>
          <tr className="font-black text-center uppercase tracking-tighter bg-gray-100 border-b-2 border-black">
            <th className="border-r-2 border-black py-2 px-1 w-12">Sl No.</th>
            <th className="border-r-2 border-black py-2 px-3 text-left">Description</th>
            <th className="border-r-2 border-black py-2 px-2 w-32">Part No</th>
            <th className="border-r-2 border-black py-2 px-2 w-24">Size</th>
            <th className="border-r-2 border-black py-2 px-1 w-24">Req. QTY</th>
            <th className="border-r-2 border-black py-2 px-1 w-24">Issued QTY</th>
            <th className="border-r-2 border-black py-2 px-1 w-20">UOM</th>
            <th className="py-2 px-2 w-36">Remarks</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: any, idx: number) => (
            <tr key={idx} className="font-bold text-center h-10 border-b-2 border-black last:border-b-0">
              <td className="border-r-2 border-black py-1 px-1">{String(idx + 1).padStart(2, '0')}.</td>
              <td className="border-r-2 border-black py-1 px-3 text-left uppercase">{item.name || '-'}</td>
              <td className="border-r-2 border-black py-1 px-2">{item.sku || '-'}</td>
              <td className="border-r-2 border-black py-1 px-2">{item.size || '-'}</td>
              <td className="border-r-2 border-black py-1 px-1">{Number(item.reqQty || 0).toFixed(2)}</td>
              <td className="border-r-2 border-black py-1 px-1">
                {mo.isRequest ? '' : Number(item.tnxQty || item.issuedQty || 0).toFixed(2)}
              </td>
              <td className="border-r-2 border-black py-1 px-1 uppercase">{item.uom || '-'}</td>
              <td className="py-1 px-2 text-left italic text-gray-600">{item.remarks || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-[11px] font-bold mb-12">
        <p className="border-b border-dotted border-gray-400 pb-1 w-full">NOTE: <span className="font-medium text-gray-600">{mo.note || '-'}</span></p>
      </div>

      {/* Signature Section */}
      <div className="grid grid-cols-4 border-2 border-black text-[11px] font-black uppercase tracking-tighter">
        <div className="border-r-2 border-black flex flex-col items-center justify-end h-28 pb-2">
          <div className="w-full border-t-2 border-black pt-2 text-center">Received By</div>
        </div>
        <div className="border-r-2 border-black flex flex-col items-center justify-end h-28 pb-2">
          <div className="w-full border-t-2 border-black pt-2 text-center">Issued By</div>
        </div>
        <div className="border-r-2 border-black flex flex-col items-center justify-end h-28 pb-2">
          <div className="w-full border-t-2 border-black pt-2 text-center">Checked By</div>
        </div>
        <div className="flex flex-col items-center justify-end h-28 pb-2">
          <div className="w-full border-t-2 border-black pt-2 text-center px-1">Approved By<br/>Depertment Head</div>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="mt-8 pt-4 border-t border-gray-100 flex items-center justify-center text-[8px] font-black text-gray-300 uppercase tracking-[0.5em]">
        ALIGN ERP SYSTEM GENERATED NODE • DATE: {new Date().toLocaleString()}
      </div>
    </div>
  );
};

export default IssueSlipPrintTemplate;
