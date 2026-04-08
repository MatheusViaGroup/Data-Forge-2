"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Check } from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Quando true, o dropdown abre para cima */
  position?: "top" | "bottom";
}

/**
 * CustomSelect — dropdown customizado coerente com o design system Via Core
 *
 * Padrão visual extraído dos inputs existentes no projeto:
 * - Background: #F0F4F8
 * - Border radius: rounded-full (2rem / 30px)
 * - Focus ring: 2px solid #4B5FBF
 * - Texto: text-sm (#333333)
 * - Sombra dropdown: shadow-lg
 * - Hover item: #EEF1FB
 */
export function CustomSelect({
  options,
  value,
  onValueChange,
  placeholder = "— Selecione —",
  disabled = false,
  className = "",
  position = "bottom",
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fechar com Escape
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setOpen(true);
      }
    },
    []
  );

  const handleSelect = (optionValue: string) => {
    onValueChange?.(optionValue);
    setOpen(false);
  };

  return (
    <div ref={ref} className={`relative w-full ${className}`} onKeyDown={handleKeyDown}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`
          flex w-full items-center justify-between
          px-5 py-2.5
          bg-[#F0F4F8] border border-transparent rounded-full
          text-sm text-[#333333]
          focus:outline-none focus:ring-2 focus:ring-[#4B5FBF] transition-all
          disabled:opacity-50 disabled:cursor-not-allowed
          ${open ? "ring-2 ring-[#4B5FBF] border-transparent" : ""}
        `}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected ? "" : "text-[#94A3B8]"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`
            h-4 w-4 text-[#94A3B8] transition-transform duration-200 flex-shrink-0 ml-2
            ${open ? "rotate-180" : ""}
          `}
        />
      </button>

      {/* Dropdown list */}
      {open && (
        <div
          role="listbox"
          className={`
            absolute z-[60] w-full
            max-h-60 overflow-y-auto
            bg-white rounded-xl
            border border-[#E2E8F0]
            shadow-lg
            p-1
            ${position === "top" ? "bottom-full mb-1" : "top-full mt-1"}
          `}
        >
          {options.map((option) => (
            <div
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              onClick={() => handleSelect(option.value)}
              className={`
                relative flex cursor-pointer select-none items-center
                rounded-lg px-4 py-2.5 text-sm outline-none
                transition-colors
                hover:bg-[#EEF1FB] hover:text-[#4B5FBF]
                ${option.value === value ? "bg-[#EEF1FB] font-semibold text-[#4B5FBF]" : "text-[#333333]"}
              `}
            >
              <span className="flex-1 truncate">{option.label}</span>
              {option.value === value && (
                <Check className="h-4 w-4 text-[#4B5FBF] flex-shrink-0 ml-2" />
              )}
            </div>
          ))}

          {options.length === 0 && (
            <div className="px-4 py-3 text-sm text-[#94A3B8] text-center">
              Nenhuma opção disponível
            </div>
          )}
        </div>
      )}
    </div>
  );
}
