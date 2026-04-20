
import React, { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle2, MapPin, ScanLine } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ScannerModal from './ScannerModal';

interface LocationTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LocationTransferModal: React.FC<LocationTransferModalProps> = ({ isOpen, onClose }) => {
  const [transferMode, setTransferMode] = useState<'item' | 'rack'>('item');
  const [sku, setSku] = useState('');
  const [itemName, setItemName] = useState('');
  const [currentLocation, setCurrentLocation] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<{skus: string[], locations: string[]}>({ skus: [], locations: [] });

  useEffect(() => {
    if (!isOpen) {
      setSku('');
      setItemName('');
      setCurrentLocation('');
      setNewLocation('');
      setFromLocation('');
      setToLocation('');
      setShowSuccess(false);
      setTransferMode('item');
    } else {
      fetchSuggestions();
    }
  }, [isOpen]);

  const fetchSuggestions = async () => {
    try {
      const { data, error } = await supabase.from('items').select('sku, location');
      if (data && !error) {
        const skus = Array.from(new Set(data.map(i => i.sku).filter(Boolean)));
        const locations = Array.from(new Set(data.map(i => i.location).filter(Boolean)));
        setSuggestions({ skus, locations });
      }
    } catch (err) {
      console.error("Error fetching suggestions:", err);
    }
  };

  const handleSkuLookup = async (lookupSku: string) => {
    if (!lookupSku) return;
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('items')
        .select('name, location')
        .eq('sku', lookupSku)
        .maybeSingle();

      if (data && !error) {
        setItemName(data.name);
        setCurrentLocation(data.location || 'NOT SET');
      } else {
        setItemName('ITEM NOT FOUND');
        setCurrentLocation('');
      }
    } catch (err) {
      console.error("Lookup error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async () => {
    if (transferMode === 'item') {
      if (!sku || !newLocation) {
        alert("Please provide SKU and New Location.");
        return;
      }
    } else {
      if (!fromLocation || !toLocation) {
        alert("Please provide From Location and To Location.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (transferMode === 'item') {
        const { error } = await supabase
          .from('items')
          .update({ location: newLocation.toUpperCase() })
          .eq('sku', sku);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('items')
          .update({ location: toLocation.toUpperCase() })
          .eq('location', fromLocation.toUpperCase());
        if (error) throw error;
      }

      setShowSuccess(true);
      fetchSuggestions(); // Refresh suggestions
    } catch (err: any) {
      alert("Transfer failed: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScannedCode = (code: string) => {
    setSku(code);
    handleSkuLookup(code);
    setIsScannerOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {showSuccess ? (
          <div className="p-10 text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={40} className="text-emerald-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Transfer Complete</h3>
              <p className="text-sm text-gray-500 font-medium">
                {transferMode === 'item' ? (
                  <>Item <span className="text-[#2d808e] font-bold">{itemName}</span> has been moved to <span className="text-[#2d808e] font-bold">{newLocation.toUpperCase()}</span>.</>
                ) : (
                  <>All items from <span className="text-[#2d808e] font-bold">{fromLocation.toUpperCase()}</span> have been moved to <span className="text-[#2d808e] font-bold">{toLocation.toUpperCase()}</span>.</>
                )}
              </p>
            </div>
            <button 
              onClick={onClose}
              className="w-full py-3 bg-[#2d808e] text-white text-[13px] font-black uppercase rounded-xl tracking-widest hover:bg-[#256b78] shadow-lg transition-all"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <MapPin size={20} className="text-[#2d808e]" />
                <h2 className="text-lg font-black text-gray-800 uppercase tracking-tight">Loc. Transfer</h2>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="flex border-b border-gray-100">
              <button 
                onClick={() => setTransferMode('item')}
                className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest transition-all ${transferMode === 'item' ? 'text-[#2d808e] border-b-2 border-[#2d808e]' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Item Transfer
              </button>
              <button 
                onClick={() => setTransferMode('rack')}
                className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest transition-all ${transferMode === 'rack' ? 'text-[#2d808e] border-b-2 border-[#2d808e]' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Rack Transfer
              </button>
            </div>

            <div className="p-8 space-y-6">
              {transferMode === 'item' ? (
                <>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Item SKU</label>
                    <div className="flex space-x-2">
                      <div className="relative flex-1">
                        <input 
                          type="text" 
                          list="sku-suggestions"
                          value={sku}
                          onChange={(e) => setSku(e.target.value)}
                          onBlur={(e) => handleSkuLookup(e.target.value)}
                          placeholder="Scan or type SKU..."
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#2d808e] outline-none text-sm font-bold text-[#2d808e] uppercase"
                        />
                        <datalist id="sku-suggestions">
                          {suggestions.skus.map(s => <option key={s} value={s} />)}
                        </datalist>
                        {isSearching && (
                          <div className="absolute right-3 top-3">
                            <Loader2 size={16} className="animate-spin text-[#2d808e]" />
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => setIsScannerOpen(true)}
                        className="p-3 bg-[#2d808e] text-white rounded-xl hover:bg-[#256b78] transition-all shadow-sm"
                      >
                        <ScanLine size={20} />
                      </button>
                    </div>
                    {itemName && (
                      <p className={`text-[10px] font-black uppercase tracking-wider ${itemName === 'ITEM NOT FOUND' ? 'text-red-500' : 'text-[#2d808e]'}`}>
                        {itemName}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Current Loc.</label>
                      <div className="px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm font-bold text-gray-500 uppercase">
                        {currentLocation || '---'}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-[#2d808e] uppercase tracking-widest">New Location</label>
                      <input 
                        type="text" 
                        list="location-suggestions"
                        value={newLocation}
                        onChange={(e) => setNewLocation(e.target.value)}
                        placeholder="Enter Loc..."
                        className="w-full px-4 py-3 bg-white border border-[#2d808e]/30 rounded-xl focus:border-[#2d808e] outline-none text-sm font-bold text-gray-800 uppercase"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">From Location (Rack)</label>
                    <input 
                      type="text" 
                      list="location-suggestions"
                      value={fromLocation}
                      onChange={(e) => setFromLocation(e.target.value)}
                      placeholder="Current Rack Location..."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#2d808e] outline-none text-sm font-bold text-[#2d808e] uppercase"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-[#2d808e] uppercase tracking-widest">To Location (New Rack)</label>
                    <input 
                      type="text" 
                      list="location-suggestions"
                      value={toLocation}
                      onChange={(e) => setToLocation(e.target.value)}
                      placeholder="New Rack Location..."
                      className="w-full px-4 py-3 bg-white border border-[#2d808e]/30 rounded-xl focus:border-[#2d808e] outline-none text-sm font-bold text-gray-800 uppercase"
                    />
                  </div>
                </>
              )}

              <datalist id="location-suggestions">
                {suggestions.locations.map(l => <option key={l} value={l} />)}
              </datalist>

              <div className="pt-4">
                <button 
                  onClick={handleSubmit}
                  disabled={isSubmitting || (transferMode === 'item' ? (!sku || !newLocation || itemName === 'ITEM NOT FOUND') : (!fromLocation || !toLocation))}
                  className="w-full py-4 bg-[#2d808e] text-white text-[13px] font-black uppercase rounded-xl tracking-widest hover:bg-[#256b78] shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Confirm Transfer</span>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {isScannerOpen && (
        <ScannerModal 
          onScan={handleScannedCode} 
          onClose={() => setIsScannerOpen(false)} 
        />
      )}
    </div>
  );
};

export default LocationTransferModal;
