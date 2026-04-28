"use client";

import { useState, useRef, useCallback, useEffect, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { DayPicker } from "react-day-picker";
import { format, isValid, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import { useFloatingPosition } from "@/hooks/useFloatingPosition";

interface DatePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  dropdownHeight?: number;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "dd/mm/aaaa",
  disabled = false,
  className = "",
  dropdownHeight = 280,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  const { vertical, horizontal } = useFloatingPosition(triggerRef, open, dropdownHeight);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateCalendarPosition = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const viewportPadding = 8;
    const margin = 4;
    const calendarWidth = calendarRef.current?.offsetWidth ?? 320;
    const calendarHeight = calendarRef.current?.offsetHeight ?? dropdownHeight;

    let top = vertical === "top" ? rect.top - calendarHeight - margin : rect.bottom + margin;
    let left = horizontal === "right" ? rect.right - calendarWidth : rect.left;

    left = Math.max(viewportPadding, Math.min(left, window.innerWidth - calendarWidth - viewportPadding));
    top = Math.max(viewportPadding, Math.min(top, window.innerHeight - calendarHeight - viewportPadding));

    setMenuStyle({
      position: "fixed",
      top,
      left,
      zIndex: 10000,
    });
  }, [dropdownHeight, horizontal, vertical]);

  useEffect(() => {
    if (!open) return;

    updateCalendarPosition();
    const handleViewportChange = () => updateCalendarPosition();

    window.addEventListener("resize", handleViewportChange, { passive: true });
    window.addEventListener("scroll", handleViewportChange, { passive: true });

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange);
    };
  }, [open, updateCalendarPosition]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const isInsideTrigger = rootRef.current?.contains(target);
      const isInsideCalendar = calendarRef.current?.contains(target);
      if (!isInsideTrigger && !isInsideCalendar) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selectedDate = value ? parse(value, "dd/MM/yyyy", new Date()) : undefined;

  const handleSelect = useCallback((date: Date | undefined) => {
    if (date && isValid(date)) {
      onChange?.(format(date, "dd/MM/yyyy"));
    } else {
      onChange?.("");
    }
    setOpen(false);
  }, [onChange]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.("");
    setOpen(false);
  }, [onChange]);

  const handleToday = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.(format(new Date(), "dd/MM/yyyy"));
    setOpen(false);
  }, [onChange]);

  const displayValue = selectedDate && isValid(selectedDate) ? format(selectedDate, "dd/MM/yyyy") : placeholder;

  return (
    <div ref={rootRef} className={`relative w-full ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`
          flex w-full items-center gap-2
          px-5 py-2.5
          bg-[var(--bg-input)] border border-transparent rounded-full
          text-sm text-[var(--text-primary)] text-left
          focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all
          disabled:opacity-50 disabled:cursor-not-allowed
          ${open ? "ring-2 ring-[var(--brand-primary)] border-transparent" : ""}
          ${!selectedDate || !isValid(selectedDate) ? "text-[var(--text-muted)]" : ""}
        `}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <CalendarIcon className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
        <span className="flex-1 truncate">{displayValue}</span>
        {selectedDate && isValid(selectedDate) && (
          <X
            className="h-3.5 w-3.5 text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors flex-shrink-0"
            onClick={handleClear}
          />
        )}
      </button>

      {open && mounted && menuStyle && createPortal(
        <div
          ref={calendarRef}
          role="dialog"
          aria-label="Selecionar data"
          style={menuStyle}
          className="
            bg-white rounded-xl
            border border-[var(--border-default)]
            shadow-lg
          "
        >
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            locale={ptBR}
            showOutsideDays
            classNames={{
              root: "p-3",
              month_caption: "flex justify-center pt-1 relative items-center mb-3",
              caption_label: "text-sm font-semibold text-[var(--text-primary)]",
              nav: "flex items-center gap-1",
              button_previous:
                "absolute left-1 h-7 w-7 bg-transparent p-0 rounded-md border border-[var(--border-default)] flex items-center justify-center hover:bg-[var(--bg-input)] transition-colors",
              button_next:
                "absolute right-1 h-7 w-7 bg-transparent p-0 rounded-md border border-[var(--border-default)] flex items-center justify-center hover:bg-[var(--bg-input)] transition-colors",
              month_grid: "w-full border-collapse",
              weekdays: "flex",
              weekday:
                "w-9 m-0.5 text-[var(--text-muted)] font-normal text-[0.8rem] text-center whitespace-nowrap",
              week: "flex w-full mt-1",
              day: "w-9 h-9 m-0.5 text-center text-sm p-0 relative",
              day_button:
                "h-9 w-9 p-0 font-normal rounded-md hover:bg-[var(--bg-hover)] hover:text-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-1 aria-selected:bg-[var(--brand-primary)] aria-selected:text-white aria-selected:opacity-100 transition-colors",
              selected: "bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-hover)] hover:text-white font-semibold",
              today: "bg-[var(--bg-input)] font-semibold text-[var(--brand-primary)]",
              outside: "text-[var(--text-subtle)]",
              disabled: "text-[var(--text-muted)] opacity-50 cursor-not-allowed",
              hidden: "invisible",
            }}
          />

          <div className="flex items-center justify-between border-t border-[var(--border-default)] px-3 pb-3 pt-2">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors px-2 py-1 rounded"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="text-xs text-[var(--brand-primary)] hover:text-[var(--brand-primary-hover)] font-semibold transition-colors px-2 py-1 rounded"
            >
              Hoje
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
