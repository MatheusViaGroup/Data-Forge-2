"use client";

import { useState, useRef, useCallback } from "react";
import { DayPicker } from "react-day-picker";
import { format, isValid, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import { useFloatingPosition } from "@/hooks/useFloatingPosition";

interface DatePickerProps {
  value?: string; // Formato "dd/MM/yyyy"
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Mínimo de espaço abaixo para abrir para baixo (px) */
  dropdownHeight?: number;
}

/**
 * DatePicker — componente de calendário customizado coerente com o design system Via Core.
 *
 * Padrão visual:
 * - Background: #F0F4F8
 * - Border radius: rounded-full (trigger)
 * - Focus ring: 2px solid #4B5FBF
 * - Texto: text-sm (#333333)
 * - Locale: pt-BR
 * - Flip automático quando próximo ao rodapé
 */
export function DatePicker({
  value,
  onChange,
  placeholder = "dd/mm/aaaa",
  disabled = false,
  className = "",
  dropdownHeight = 280,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { vertical, horizontal } = useFloatingPosition(
    triggerRef,
    open,
    dropdownHeight
  );

  // Converter string "dd/MM/yyyy" para Date
  const selectedDate = value
    ? parse(value, "dd/MM/yyyy", new Date())
    : undefined;

  const handleSelect = useCallback(
    (date: Date | undefined) => {
      if (date && isValid(date)) {
        onChange?.(format(date, "dd/MM/yyyy"));
      } else {
        onChange?.("");
      }
      setOpen(false);
    },
    [onChange]
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange?.("");
      setOpen(false);
    },
    [onChange]
  );

  const handleToday = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange?.(format(new Date(), "dd/MM/yyyy"));
      setOpen(false);
    },
    [onChange]
  );

  // Exibição: data formatada ou placeholder
  const displayValue =
    selectedDate && isValid(selectedDate)
      ? format(selectedDate, "dd/MM/yyyy")
      : placeholder;

  return (
    <div className={`relative w-full ${className}`}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`
          flex w-full items-center gap-2
          px-5 py-2.5
          bg-[#F0F4F8] border border-transparent rounded-full
          text-sm text-[#333333] text-left
          focus:outline-none focus:ring-2 focus:ring-[#4B5FBF] transition-all
          disabled:opacity-50 disabled:cursor-not-allowed
          ${open ? "ring-2 ring-[#4B5FBF] border-transparent" : ""}
          ${!selectedDate || !isValid(selectedDate) ? "text-[#94A3B8]" : ""}
        `}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <CalendarIcon className="h-4 w-4 text-[#94A3B8] flex-shrink-0" />
        <span className="flex-1 truncate">{displayValue}</span>
        {selectedDate && isValid(selectedDate) && (
          <X
            className="h-3.5 w-3.5 text-[#94A3B8] hover:text-[#4B5FBF] transition-colors flex-shrink-0"
            onClick={handleClear}
          />
        )}
      </button>

      {/* Calendário */}
      {open && (
        <div
          role="dialog"
          aria-label="Selecionar data"
          className={`
            absolute z-[100]
            bg-white rounded-xl
            border border-[#E2E8F0]
            shadow-lg
            ${vertical === "top" ? "bottom-full mb-1" : "top-full mt-1"}
            ${horizontal === "right" ? "right-0" : "left-0"}
          `}
        >
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            locale={ptBR}
            showOutsideDays
            classNames={{
              // Container raiz
              root: "p-3",

              // Caption (mês + navegação)
              month_caption: "flex justify-center pt-1 relative items-center mb-3",
              caption_label: "text-sm font-semibold text-[#333333]",

              // Navegação
              nav: "flex items-center gap-1",
              button_previous:
                "absolute left-1 h-7 w-7 bg-transparent p-0 rounded-md border border-[#E2E8F0] flex items-center justify-center hover:bg-[#F0F4F8] transition-colors",
              button_next:
                "absolute right-1 h-7 w-7 bg-transparent p-0 rounded-md border border-[#E2E8F0] flex items-center justify-center hover:bg-[#F0F4F8] transition-colors",

              // Grid — container flex, filhos com w-9 fixo (NUNCA flex-1)
              month_grid: "w-full border-collapse",
              weekdays: "flex",
              weekday:
                "w-9 m-0.5 text-[#94A3B8] font-normal text-[0.8rem] text-center whitespace-nowrap",
              week: "flex w-full mt-1",

              // Célula dos dias — w-9 fixo para alinhar com weekday
              day: "w-9 h-9 m-0.5 text-center text-sm p-0 relative",
              day_button:
                "h-9 w-9 p-0 font-normal rounded-md hover:bg-[#EEF1FB] hover:text-[#4B5FBF] focus:outline-none focus:ring-2 focus:ring-[#4B5FBF] focus:ring-offset-1 aria-selected:bg-[#4B5FBF] aria-selected:text-white aria-selected:opacity-100 transition-colors",

              // Estados especiais do day_button (v9 usa classes separadas)
              selected: "bg-[#4B5FBF] text-white hover:bg-[#4040B0] hover:text-white font-semibold",
              today: "bg-[#F0F4F8] font-semibold text-[#4B5FBF]",
              outside: "text-[#C4C6CC]",
              disabled: "text-[#94A3B8] opacity-50 cursor-not-allowed",
              hidden: "invisible",
            }}
          />

          {/* Footer com Limpar + Hoje */}
          <div className="flex items-center justify-between border-t border-[#E2E8F0] px-3 pb-3 pt-2">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-[#94A3B8] hover:text-[#4B5FBF] transition-colors px-2 py-1 rounded"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="text-xs text-[#4B5FBF] hover:text-[#4040B0] font-semibold transition-colors px-2 py-1 rounded"
            >
              Hoje
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
