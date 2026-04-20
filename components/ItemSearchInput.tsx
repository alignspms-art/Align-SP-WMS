
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

interface ItemSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: any) => void;
  placeholder: string;
  searchField: 'name' | 'sku';
  className?: string;
}

const ItemSearchInput: React.FC<ItemSearchInputProps> = ({
  value,
  onChange,
  onSelect,
  placeholder,
  searchField,
  className
}) => {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (value && value.length >= 2 && showSuggestions) {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('items')
            .select('*')
            .or(`name.ilike.%${value}%,sku.ilike.%${value}%`)
            .limit(5);
          
          if (data && !error) {
            setSuggestions(data);
          }
        } catch (err) {
          console.error('Search error:', err);
        } finally {
          setLoading(false);
        }
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [value, searchField, showSuggestions]);

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          placeholder={placeholder}
          className={className}
        />
        {loading && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Loader2 size={12} className="animate-spin text-gray-400" />
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelect(item);
                setShowSuggestions(false);
              }}
              className="w-full px-4 py-2 text-left text-xs hover:bg-gray-50 flex flex-col border-b border-gray-50 last:border-0"
            >
              <span className="font-bold text-gray-800 uppercase">{item.name}</span>
              <span className="text-[10px] text-[#2d808e] font-mono">{item.sku}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ItemSearchInput;
