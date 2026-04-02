import React, { useState } from 'react';
import { Home, Plus, Edit2, Search, X } from 'lucide-react';

interface UOMItem {
  sl: number;
  name: string;
  description: string;
}

const ItemUOM: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [uoms, setUoms] = useState<UOMItem[]>([
    { sl: 1, name: 'CAN', description: 'Canister / Can' },
    { sl: 2, name: 'ROLL', description: 'Roll of material' },
    { sl: 3, name: 'BOX', description: 'Box container' },
    { sl: 4, name: 'CYL', description: 'Cylinder' },
    { sl: 5, name: 'PACK', description: 'Package' },
    { sl: 6, name: 'BAG', description: 'Bag / Sack' },
    { sl: 7, name: 'SET', description: 'Set of multiple items' },
    { sl: 8, name: 'PAIR', description: 'Pair of items' },
    { sl: 9, name: 'PCS', description: 'Pieces' },
    { sl: 10, name: 'BOTTLE', description: 'Bottle container' },
    { sl: 11, name: 'FEET', description: 'Feet (Length)' },
    { sl: 12, name: 'LOT', description: 'Lot / Batch' },
    { sl: 13, name: 'MTR', description: 'Meter (Length)' },
    { sl: 14, name: 'LTR', description: 'Liter (Volume)' },
    { sl: 15, name: 'REAM', description: 'Ream (for paper)' },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<UOMItem | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  const filteredUoms = uoms.filter(uom => 
    uom.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    uom.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (item?: UOMItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({ name: item.name, description: item.description });
    } else {
      setEditingItem(null);
      setFormData({ name: '', description: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) return;

    if (editingItem) {
      setUoms(uoms.map(u => u.sl === editingItem.sl ? { ...u, ...formData } : u));
    } else {
      const nextSl = uoms.length > 0 ? Math.max(...uoms.map(u => u.sl)) + 1 : 1;
      setUoms([...uoms, { sl: nextSl, ...formData }]);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-[11px] font-bold text-[#2d808e] uppercase tracking-wider">
          <Home size={14} className="text-gray-400" />
          <span className="text-gray-300">/</span>
          <span className="text-[#2d808e]">ITEM-UOM</span>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-[#2d808e] text-white px-6 py-1.5 rounded text-[13px] font-bold shadow-sm hover:bg-[#256b78] transition-all flex items-center gap-2"
        >
          <Plus size={14} /> Add UOM
        </button>
      </div>

      <div className="flex items-center justify-between">
        <button className="border border-[#2d808e] text-[#2d808e] px-5 py-1 rounded text-[12px] font-bold hover:bg-gray-50 transition-all">
          Logs
        </button>
        <div className="flex items-center">
          <div className="relative flex">
            <input 
              type="text" 
              placeholder="Search UOM"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 px-4 py-1.5 border border-gray-200 rounded-l outline-none text-[12px] text-gray-600 focus:border-[#2d808e]"
            />
            <button className="bg-[#2d808e] text-white px-3 rounded-r flex items-center justify-center hover:bg-[#256b78]">
              <Search size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#fcfcfc]">
              <tr className="text-[11px] font-bold text-gray-800 border-b border-gray-100 uppercase">
                <th className="px-6 py-4 w-16 text-center">SL</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4 text-center w-24">Action</th>
              </tr>
            </thead>
            <tbody className="text-[11px] text-gray-600 font-medium">
              {filteredUoms.map((uom) => (
                <tr key={uom.sl} className="hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                  <td className="px-6 py-4 text-center">{uom.sl}</td>
                  <td className="px-6 py-4 font-bold text-[#2d808e]">{uom.name}</td>
                  <td className="px-6 py-4">{uom.description}</td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => handleOpenModal(uom)}
                      className="p-1.5 text-blue-500 hover:bg-blue-50 border border-blue-100 rounded transition-all"
                    >
                      <Edit2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUoms.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-gray-400 italic">
                    No matching UOM found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">{editingItem ? 'Edit Unit of Measure' : 'Add Unit of Measure'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#2d808e] uppercase">UOM Name</label>
                <input 
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                  placeholder="e.g., PCS"
                  className="w-full px-3 py-2 border border-gray-200 rounded outline-none focus:border-[#2d808e] text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#2d808e] uppercase">Description</label>
                <input 
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Pieces"
                  className="w-full px-3 py-2 border border-gray-200 rounded outline-none focus:border-[#2d808e] text-sm"
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  className="bg-[#2d808e] text-white px-8 py-2 rounded text-sm font-bold shadow-sm hover:bg-[#256b78] transition-all"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemUOM;