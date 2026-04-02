import React from 'react';
import { Plus, X, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface PRPrintTemplateProps {
  pr: any;
  onPrChange: (field: string, value: any) => void;
  justificationData: any[];
  onJustificationChange: (index: number, field: string, value: any) => void;
  images: string[];
  onImagesChange: (newImages: string[]) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onItemChange: (index: number, field: string, value: any) => void;
  isPrinting?: boolean;
}

const PRPrintTemplate: React.FC<PRPrintTemplateProps> = ({ 
  pr, 
  onPrChange,
  justificationData, 
  onJustificationChange,
  images,
  onImagesChange,
  onAddItem,
  onRemoveItem,
  onItemChange,
  isPrinting = false
}) => {
  const { hasGranularPermission } = useAuth();
  const items = pr.items || [];
  
  const totalQty = items.reduce((acc: number, i: any) => acc + (Number(i.reqQty) || 0), 0);
  const totalValue = items.reduce((acc: number, i: any) => acc + ((Number(i.reqQty) || 0) * (Number(i.unitPrice) || 0)), 0);

  const formatCurrency = (num: number) => num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  const formatDateForInput = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImagesChange([...images, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onImagesChange(newImages);
  };

  return (
    <div className="bg-white text-black font-roboto p-6 md:p-10 max-w-[1200px] mx-auto overflow-visible print:p-0 select-text text-[12px] leading-relaxed">
      {/* Header Section */}
      <div className="flex justify-between items-start mb-8 relative">
        <div className="w-24 h-24"></div> {/* Spacer for symmetry */}
        <div className="flex-1 text-center">
          <h1 className="text-3xl font-black text-gray-900 leading-tight mb-1">Fair Technology Limited</h1>
          <p className="text-[11px] text-gray-600 font-medium">Plot- 12/A & 12/B, Block-C, Kaliakoir Hi-Tech Park</p>
          <p className="text-[11px] text-gray-600 font-medium">Gazipur, Bangladesh-1750. #+880 1787-670 786</p>
          <div className="mt-4">
            <h2 className="text-lg font-black uppercase tracking-widest">PURCHASE REQUISITION FORM</h2>
          </div>
        </div>
        <div className="w-24 h-24 flex items-center justify-center border border-gray-100 p-1">
           <img 
            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=PR-${pr.pr_no || pr.PR}`} 
            alt="QR Code" 
            className="w-full h-full"
           />
        </div>
      </div>

      {/* Meta Grid Section - Matching Image Exactly */}
      <div className="grid grid-cols-3 gap-x-8 gap-y-1.5 mb-8 border-t border-gray-100 pt-6">
        <div className="space-y-1">
          <div className="flex items-baseline">
            <span className="font-bold w-24 shrink-0">PR No.:</span>
            {isPrinting ? (
              <span className="px-1 py-0.5 text-gray-700">{pr.pr_no || ''}</span>
            ) : (
              <input 
                className="w-full bg-transparent border-none outline-none focus:bg-yellow-50 px-1 py-0.5 text-gray-700"
                value={pr.pr_no || ''}
                onChange={(e) => onPrChange('pr_no', e.target.value)}
              />
            )}
          </div>
          <div className="flex items-baseline">
            <span className="font-bold w-24 shrink-0">Reference:</span>
            {isPrinting ? (
              <span className="px-1 py-0.5 text-gray-700">{pr.reference || ''}</span>
            ) : (
              <input 
                className="w-full bg-transparent border-none outline-none focus:bg-yellow-50 px-1 py-0.5 text-gray-700"
                value={pr.reference || ''}
                onChange={(e) => onPrChange('reference', e.target.value)}
              />
            )}
          </div>
          <div className="flex items-baseline">
            <span className="font-bold w-24 shrink-0">Requested By:</span>
            {isPrinting ? (
              <span className="px-1 py-0.5 text-gray-700">{pr.req_by_name || ''}</span>
            ) : (
              <input 
                className="w-full bg-transparent border-none outline-none focus:bg-yellow-50 px-1 py-0.5 text-gray-700"
                value={pr.req_by_name || ''}
                onChange={(e) => onPrChange('req_by_name', e.target.value)}
              />
            )}
          </div>
        </div>
        
        <div className="space-y-1">
          <div className="flex items-baseline">
            <span className="font-bold w-24 shrink-0">Department:</span>
            {isPrinting ? (
              <span className="px-1 py-0.5 text-gray-700">{pr.reqDpt || ''}</span>
            ) : (
              <input 
                className="w-full bg-transparent border-none outline-none focus:bg-yellow-50 px-1 py-0.5 text-gray-700"
                value={pr.reqDpt || ''}
                onChange={(e) => onPrChange('reqDpt', e.target.value)}
              />
            )}
          </div>
          <div className="flex items-baseline">
            <span className="font-bold w-24 shrink-0">Email:</span>
            {isPrinting ? (
              <span className="px-1 py-0.5 text-gray-700 lowercase">{pr.email || ''}</span>
            ) : (
              <input 
                className="w-full bg-transparent border-none outline-none focus:bg-yellow-50 px-1 py-0.5 text-gray-700 lowercase"
                value={pr.email || ''}
                onChange={(e) => onPrChange('email', e.target.value)}
              />
            )}
          </div>
          <div className="flex items-baseline">
            <span className="font-bold w-24 shrink-0">Phone No.:</span>
            {isPrinting ? (
              <span className="px-1 py-0.5 text-gray-700">{pr.contact || ''}</span>
            ) : (
              <input 
                className="w-full bg-transparent border-none outline-none focus:bg-yellow-50 px-1 py-0.5 text-gray-700"
                value={pr.contact || ''}
                onChange={(e) => onPrChange('contact', e.target.value)}
              />
            )}
          </div>
        </div>

        <div className="space-y-1 md:text-right">
          <div className="flex items-baseline justify-end">
            <span className="font-bold w-24 shrink-0 text-left md:text-right mr-2">Req. Date:</span>
            {isPrinting ? (
              <span className="px-1 py-0.5 text-right w-32 text-gray-700">{formatDateForInput(pr.created_at)}</span>
            ) : (
              <input 
                type="date"
                className="bg-transparent border-none outline-none focus:bg-yellow-50 px-1 py-0.5 text-right w-32 text-gray-700"
                value={formatDateForInput(pr.created_at)}
                onChange={(e) => onPrChange('created_at', e.target.value)}
              />
            )}
          </div>
          <div className="flex items-baseline justify-end">
            <span className="font-bold w-24 shrink-0 text-left md:text-right mr-2">PR Status:</span>
            {isPrinting ? (
              <span className="px-1 py-0.5 text-right w-32 font-bold text-[#2d808e]">{pr.status || ''}</span>
            ) : (
              <input 
                className="bg-transparent border-none outline-none focus:bg-yellow-50 px-1 py-0.5 text-right w-32 font-bold text-[#2d808e]"
                value={pr.status || ''}
                onChange={(e) => onPrChange('status', e.target.value)}
              />
            )}
          </div>
          <div className="flex items-baseline justify-end">
            <span className="font-bold w-24 shrink-0 text-left md:text-right mr-2">Update On:</span>
            {isPrinting ? (
              <span className="px-1 py-0.5 text-right w-32 text-gray-700">{formatDateForInput(pr.updated_at || pr.created_at)}</span>
            ) : (
              <input 
                type="date"
                className="bg-transparent border-none outline-none focus:bg-yellow-50 px-1 py-0.5 text-right w-32 text-gray-700"
                value={formatDateForInput(pr.updated_at || pr.created_at)}
                onChange={(e) => onPrChange('updated_at', e.target.value)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Main Items Table */}
      <div className="mb-2 overflow-x-auto">
        <table className="w-full border-collapse border border-black">
          <thead className="bg-[#fcfcfc] text-[11px] font-black uppercase">
            <tr>
              <th className="border border-black py-1.5 px-1 text-center w-8">SL</th>
              <th className="border border-black py-1.5 px-1 text-center w-24">Part Code</th>
              <th className="border border-black py-1.5 px-2 text-center">Name</th>
              <th className="border border-black py-1.5 px-1 text-center w-20">Spec.</th>
              <th className="border border-black py-1.5 px-1 text-center w-20">Brand</th>
              <th className="border border-black py-1.5 px-1 text-center w-14">UOM</th>
              <th className="border border-black py-1.5 px-1 text-center w-24">Unit Price</th>
              <th className="border border-black py-1.5 px-1 text-center w-16">Req. Qty</th>
              <th className="border border-black py-1.5 px-1 text-center w-24">Value</th>
              <th className="border border-black py-1.5 px-1 text-center w-24">Stock</th>
              <th className="border border-black py-1.5 px-1 text-center w-24">Remarks</th>
              <th className="border border-black py-1.5 px-1 text-center w-8 no-print"></th>
            </tr>
          </thead>
          <tbody className="text-[11px]">
            {items.map((item: any, idx: number) => (
              <tr key={idx} className="hover:bg-gray-50/50 group">
                <td className="border border-black py-1 px-1 text-center">{idx + 1}</td>
                <td className="border border-black py-0 px-0">
                  {isPrinting ? (
                    <div className="w-full px-1 py-1 text-center">{item.sku || ''}</div>
                  ) : (
                    <input className="w-full bg-transparent border-none outline-none focus:bg-yellow-50 px-1 py-1 text-center" value={item.sku || ''} onChange={(e) => onItemChange(idx, 'sku', e.target.value)} />
                  )}
                </td>
                <td className="border border-black py-0 px-0">
                  {isPrinting ? (
                    <div className="w-full px-2 py-1 font-bold uppercase">{item.name || ''}</div>
                  ) : (
                    <input className="w-full bg-transparent border-none outline-none focus:bg-yellow-50 px-2 py-1 font-bold uppercase" value={item.name || ''} onChange={(e) => onItemChange(idx, 'name', e.target.value.toUpperCase())} />
                  )}
                </td>
                <td className="border border-black py-0 px-0">
                  {isPrinting ? (
                    <div className="w-full px-1 py-1 text-center">{item.specification || ''}</div>
                  ) : (
                    <input className="w-full bg-transparent border-none outline-none focus:bg-yellow-50 px-1 py-1 text-center" value={item.specification || ''} onChange={(e) => onItemChange(idx, 'specification', e.target.value)} />
                  )}
                </td>
                <td className="border border-black py-0 px-0">
                  {isPrinting ? (
                    <div className="w-full px-1 py-1 text-center">{item.brand || ''}</div>
                  ) : (
                    <input className="w-full bg-transparent border-none outline-none focus:bg-yellow-50 px-1 py-1 text-center" value={item.brand || ''} onChange={(e) => onItemChange(idx, 'brand', e.target.value)} />
                  )}
                </td>
                <td className="border border-black py-0 px-0">
                  {isPrinting ? (
                    <div className="w-full px-1 py-1 text-center uppercase">{item.uom || ''}</div>
                  ) : (
                    <input className="w-full bg-transparent border-none outline-none focus:bg-yellow-50 px-1 py-1 text-center uppercase" value={item.uom || ''} onChange={(e) => onItemChange(idx, 'uom', e.target.value.toUpperCase())} />
                  )}
                </td>
                <td className="border border-black py-0 px-0">
                  {isPrinting ? (
                    <div className="w-full px-1 py-1 text-right">{item.unitPrice || 0}</div>
                  ) : (
                    <input type="number" className="w-full bg-transparent border-none outline-none focus:bg-yellow-50 px-1 py-1 text-right" value={item.unitPrice || 0} onChange={(e) => onItemChange(idx, 'unitPrice', e.target.value)} />
                  )}
                </td>
                <td className="border border-black py-0 px-0">
                  {isPrinting ? (
                    <div className="w-full px-1 py-1 text-center font-black">{item.reqQty || 0}</div>
                  ) : (
                    <input type="number" className="w-full bg-transparent border-none outline-none focus:bg-yellow-50 px-1 py-1 text-center font-black" value={item.reqQty || 0} onChange={(e) => onItemChange(idx, 'reqQty', e.target.value)} />
                  )}
                </td>
                <td className="border border-black py-1 px-1 text-right font-black">
                  {formatCurrency(Number(item.reqQty || 0) * Number(item.unitPrice || 0))}
                </td>
                <td className="border border-black py-0 px-0">
                  {isPrinting ? (
                    <div className="w-full px-1 py-1 text-center font-bold text-[#2d808e]">{item.onHand || 0}</div>
                  ) : (
                    <input type="number" className="w-full bg-transparent border-none outline-none focus:bg-yellow-50 px-1 py-1 text-center font-bold text-[#2d808e]" value={item.onHand || 0} onChange={(e) => onItemChange(idx, 'onHand', e.target.value)} />
                  )}
                </td>
                <td className="border border-black py-0 px-0">
                  {isPrinting ? (
                    <div className="w-full px-1 py-1 text-left italic text-gray-400">{item.remarks || ''}</div>
                  ) : (
                    <input className="w-full bg-transparent border-none outline-none focus:bg-yellow-50 px-1 py-1 text-left italic text-gray-400" value={item.remarks || ''} onChange={(e) => onItemChange(idx, 'remarks', e.target.value)} />
                  )}
                </td>
                <td className="border border-black py-1 px-1 text-center no-print">
                   <button onClick={() => onRemoveItem(idx)} className="text-red-300 hover:text-red-500 transition-colors">
                     <Trash2 size={12} />
                   </button>
                </td>
              </tr>
            ))}
            <tr className="font-bold text-[11px] bg-[#fcfcfc]">
              <td colSpan={7} className="border border-black py-2 px-2 text-right uppercase tracking-widest">Total</td>
              <td className="border border-black py-2 px-1 text-center font-black">{totalQty}</td>
              <td className="border border-black py-2 px-1 text-right font-black">{formatCurrency(totalValue)}</td>
              <td className="border border-black py-2 px-1"></td>
              <td className="border border-black py-2 px-1"></td>
              <td className="border border-black py-2 px-1 no-print"></td>
            </tr>
          </tbody>
        </table>
      </div>

      <button onClick={onAddItem} className="no-print w-full py-1.5 border border-dashed border-gray-200 text-gray-400 text-[9px] uppercase font-black hover:bg-gray-50 hover:text-[#2d808e] hover:border-[#2d808e] transition-all flex items-center justify-center gap-1.5 mb-6">
        <Plus size={12} strokeWidth={3} />
        <span>Add New Item Row</span>
      </button>

      {/* Note & Upload Section */}
      <div className="flex flex-col items-center mb-10">
        <div className="text-[10px] font-bold text-gray-700 mb-2 self-start flex items-center w-full">
          <span className="mr-2 shrink-0">Note:</span> 
          {isPrinting ? (
            <div className="w-full font-medium text-gray-500 italic border-b border-gray-100 py-1">{pr.note || ''}</div>
          ) : (
            <input 
              className="w-full font-medium text-gray-500 italic border-b border-gray-100 bg-transparent outline-none focus:border-[#2d808e]" 
              value={pr.note || ''}
              onChange={(e) => onPrChange('note', e.target.value)}
              placeholder="Type your notes here..."
            />
          )}
        </div>
        <div className="flex flex-wrap gap-2 justify-center py-2">
             {images.map((img, idx) => (
               <div key={idx} className="relative group w-24 h-24 border border-gray-100 rounded-lg overflow-hidden shadow-sm">
                  <img src={img} alt="item" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => removeImage(idx)}
                    className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-bl opacity-0 group-hover:opacity-100 transition-opacity no-print"
                  >
                    <X size={12} />
                  </button>
               </div>
             ))}
             <label className="w-24 h-24 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-300 hover:border-[#2d808e] hover:text-[#2d808e] transition-all cursor-pointer no-print group">
                <Plus size={24} className="group-hover:scale-110 transition-transform" strokeWidth={3} />
                <span className="text-[10px] font-black uppercase tracking-tighter mt-2">Upload</span>
                <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
             </label>
           </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-10 pt-4">
              {[
                { label: 'Prepared By', field: 'req_by_name', perm: 'prepared' },
                { label: 'Checked By', field: 'checked_by', perm: 'checked' },
                { label: 'Confirmed By', field: 'confirmed_by', perm: 'confirmed' },
                { label: 'Approved By', field: 'approved_by', perm: 'approved' },
              ].map((sig, i) => {
                const canEdit = hasGranularPermission('requisition', sig.perm);
                return (
                  <div key={i} className="text-center">
                    <div className="border-t border-black mb-1.5 pt-1.5">
                      <p className="font-black text-[11px] uppercase tracking-tighter">{sig.label}</p>
                    </div>
                    {isPrinting ? (
                      <div className="w-full text-[10px] font-bold text-gray-600 uppercase text-center py-1">
                        {pr[sig.field] || (sig.field === 'req_by_name' ? pr.req_by_name : '')}
                      </div>
                    ) : (
                      <input 
                        className={`w-full text-[10px] font-bold text-gray-600 uppercase text-center bg-transparent border-none outline-none focus:bg-yellow-50 ${!canEdit ? 'cursor-not-allowed' : ''}`}
                        value={pr[sig.field] || (sig.field === 'req_by_name' ? pr.req_by_name : '')}
                        onChange={(e) => canEdit && onPrChange(sig.field, e.target.value)}
                        readOnly={!canEdit}
                        placeholder={canEdit ? "Type Name..." : ""}
                      />
                    )}
                  </div>
                );
              })}
      </div>

      {/* Justification Table - Matching Red Marked Area 2 */}
      <div className="space-y-0">
        <h3 className="bg-[#fcfcfc] border border-black border-b-0 py-2 text-center text-[11px] font-black uppercase tracking-widest">
          Justification of Purchase Requisition
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-black text-[11px]">
            <thead>
              <tr className="bg-white font-black text-center uppercase tracking-tighter">
                <th className="border border-black py-2 px-2">Item Name</th>
                <th className="border border-black py-2 px-1 w-20">Last 6M Used</th>
                <th className="border border-black py-2 px-1 w-32">Consumption Rate</th>
                <th className="border border-black py-2 px-1 w-24">Stock in Hand [A]</th>
                <th className="border border-black py-2 px-1 w-24">Stock in Store [B]</th>
                <th className="border border-black py-2 px-1 w-24">Ordered Qty [C]</th>
                <th className="border border-black py-2 px-1 w-24">Total [D=A+B+C]</th>
                <th className="border border-black py-2 px-2">Purpose</th>
                <th className="border border-black py-2 px-1 w-32 text-[8px]">Approved Design [Y/N]</th>
              </tr>
            </thead>
            <tbody className="font-bold">
              {justificationData.map((row, idx) => (
                <tr key={idx} className="text-center group min-h-[40px]">
                  <td className="border border-black py-2 px-2 text-left uppercase truncate max-w-[200px]">
                    {isPrinting ? (
                      <div className="w-full px-1 py-1">{row.name || ''}</div>
                    ) : (
                      <input className="w-full bg-transparent border-none outline-none focus:bg-yellow-50 px-1 py-1" value={row.name || ''} onChange={(e) => onJustificationChange(idx, 'name', e.target.value)} />
                    )}
                  </td>
                  <td className="border border-black py-2 px-1">
                    {isPrinting ? (
                      <div className="w-full text-center">{row.last6m}</div>
                    ) : (
                      <input 
                        type="number" 
                        className="w-full bg-transparent text-center focus:bg-yellow-50 outline-none border-none p-0" 
                        value={row.last6m} 
                        onChange={(e) => onJustificationChange(idx, 'last6m', e.target.value)}
                      />
                    )}
                  </td>
                  <td className="border border-black py-2 px-1">
                    {isPrinting ? (
                      <div className="w-full text-center">{row.consumptionRate}</div>
                    ) : (
                      <input 
                        type="text" 
                        className="w-full bg-transparent text-center focus:bg-yellow-50 outline-none border-none p-0" 
                        value={row.consumptionRate} 
                        onChange={(e) => onJustificationChange(idx, 'consumptionRate', e.target.value)}
                      />
                    )}
                  </td>
                  <td className="border border-black py-0 px-0">
                    {isPrinting ? (
                      <div className="w-full px-1 py-2 text-center font-black text-[#2d808e]">{row.stockHand || 0}</div>
                    ) : (
                      <input type="number" className="w-full bg-transparent border-none outline-none focus:bg-yellow-50 px-1 py-2 text-center font-black text-[#2d808e]" value={row.stockHand || 0} onChange={(e) => onJustificationChange(idx, 'stockHand', e.target.value)} />
                    )}
                  </td>
                  <td className="border border-black py-2 px-1">
                    <div className="w-full text-center">{row.stockStore}</div>
                  </td>
                  <td className="border border-black py-2 px-1">
                    {isPrinting ? (
                      <div className="w-full text-center">{row.orderedQty}</div>
                    ) : (
                      <input 
                        type="number" 
                        className="w-full bg-transparent text-center focus:bg-yellow-50 outline-none border-none p-0" 
                        value={row.orderedQty} 
                        onChange={(e) => onJustificationChange(idx, 'orderedQty', e.target.value)}
                      />
                    )}
                  </td>
                  <td className="border border-black py-2 px-1 font-black">
                    {(Number(row.stockHand || 0) + Number(row.stockStore || 0) + Number(row.orderedQty || 0)).toFixed(2)}
                  </td>
                  <td className="border border-black py-2 px-2">
                    {isPrinting ? (
                      <div className="w-full text-left px-1 uppercase">{row.purpose}</div>
                    ) : (
                      <input 
                        type="text" 
                        className="w-full bg-transparent text-left focus:bg-yellow-50 outline-none border-none p-0 px-1 uppercase" 
                        value={row.purpose} 
                        onChange={(e) => onJustificationChange(idx, 'purpose', e.target.value)}
                      />
                    )}
                  </td>
                  <td className="border border-black py-2 px-1">
                    {isPrinting ? (
                      <div className="w-full text-center font-black">{row.approvedDesign}</div>
                    ) : (
                      <select 
                        className="w-full bg-transparent text-center focus:bg-yellow-50 outline-none appearance-none border-none p-0 font-black" 
                        value={row.approvedDesign} 
                        onChange={(e) => onJustificationChange(idx, 'approvedDesign', e.target.value)}
                      >
                        <option value=""></option>
                        <option value="Y">Y</option>
                        <option value="N">N</option>
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="mt-12 pt-4 border-t border-gray-100 flex items-center justify-center text-[7px] font-black text-gray-300 uppercase tracking-[0.4em]">
        Align ERP • Document ID: PR-{pr.pr_no || pr.PR} • Generated: {new Date().toLocaleString()}
      </div>
    </div>
  );
};

export default PRPrintTemplate;
