import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export const UNIT_OPTIONS = ['حبة', 'كرتون', 'كيس', 'سطل', 'برميل', 'كيلو', 'متر', 'لتر'];

interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  id?: string;
  className?: string;
}

export function CustomSelect({ value, onChange, options, id, className }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative w-full text-right" ref={containerRef} id={id} dir="rtl">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600 focus:bg-white transition-all font-bold cursor-pointer text-slate-800 ${className}`}
      >
        <span className="truncate">{value}</span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-[100] mt-1.5 w-full max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl py-1 animate-in fade-in slide-in-from-top-1 duration-100">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-right cursor-pointer hover:bg-slate-50 transition-colors ${
                value === option ? 'text-emerald-700 bg-emerald-50 font-black' : 'text-slate-700 font-bold'
              }`}
            >
              <span>{option}</span>
              {value === option && <Check className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
