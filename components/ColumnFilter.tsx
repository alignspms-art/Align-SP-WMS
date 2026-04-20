
import React, { useState, useRef, useEffect } from 'react';
import { Filter, X } from 'lucide-react';

interface ColumnFilterProps {
  columnName: string;
  onFilter: (value: string) => void;
  currentValue: string;
  suggestions?: string[];
}

const ColumnFilter: React.FC<ColumnFilterProps> = ({ columnName, onFilter, currentValue, suggestions = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(currentValue);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredSuggestions = suggestions
    .filter(s => s && s.toLowerCase().includes(inputValue.toLowerCase()) && s.toLowerCase() !== inputValue.toLowerCase())
    .slice(0, 5); // Limit to 5 suggestions

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleApply = (value: string = inputValue) => {
    onFilter(value);
    setIsOpen(false);
    setShowSuggestions(false);
  };

  const handleClear = () => {
    setInputValue('');
    onFilter('');
    setIsOpen(false);
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    handleApply(suggestion);
  };

  return (
    <div className="relative inline-block ml-1" ref={containerRef} onClick={(e) => e.stopPropagation()}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`p-1 rounded hover:bg-gray-100 transition-colors ${currentValue ? 'text-[#2d808e]' : 'text-gray-300'}`}
      >
        <Filter size={10} strokeWidth={3} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-100 shadow-xl rounded-lg p-3 z-[100] animate-in fade-in zoom-in duration-150">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Filter {columnName}</span>
            <button onClick={() => setIsOpen(false)} className="text-gray-300 hover:text-gray-500">
              <X size={12} />
            </button>
          </div>
          <div className="relative">
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={(e) => e.key === 'Enter' && handleApply()}
              placeholder={`Search ${columnName}...`}
              className="w-full px-3 py-1.5 border border-gray-100 rounded text-[11px] outline-none focus:border-[#2d808e] mb-3"
              autoFocus
            />
            
            {showSuggestions && inputValue && filteredSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 -mt-2 mb-3 bg-white border border-gray-100 shadow-lg rounded-md overflow-hidden z-[110]">
                {filteredSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left px-3 py-2 text-[11px] hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => handleApply()}
              className="flex-1 py-1.5 bg-[#2d808e] text-white text-[10px] font-black uppercase rounded hover:bg-[#256b78] transition-all"
            >
              Apply
            </button>
            <button 
              onClick={handleClear}
              className="px-3 py-1.5 border border-gray-100 text-gray-400 text-[10px] font-black uppercase rounded hover:bg-gray-50 transition-all"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColumnFilter;
