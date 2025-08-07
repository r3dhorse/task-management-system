"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "@/lib/lucide-icons";

import { cn } from "@/lib/utils"
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";

interface DatePickerProps {
  value: Date | undefined;
  onChange: (date: Date) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
};

export const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
  ({ value, onChange, className, placeholder = "Select Date", disabled }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [mounted, setMounted] = React.useState(false);
    const calendarRef = React.useRef<HTMLDivElement>(null);
    const buttonRef = React.useRef<HTMLButtonElement>(null);

    React.useEffect(() => {
      setMounted(true);
    }, []);

    const handleDateSelect = (date: Date | undefined) => {
      if (date) {
        onChange(date);
        setIsOpen(false);
      }
    };

    const handleButtonClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsOpen(!isOpen);
      }
    };

    // Handle clicks outside
    React.useEffect(() => {
      if (!isOpen || !mounted) return;

      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node;
        
        if (
          calendarRef.current && 
          !calendarRef.current.contains(target) &&
          buttonRef.current &&
          !buttonRef.current.contains(target)
        ) {
          setIsOpen(false);
        }
      };

      // Use capture phase to handle events before they bubble
      document.addEventListener('mousedown', handleClickOutside, true);
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside, true);
      };
    }, [isOpen, mounted]);

    // Handle escape key
    React.useEffect(() => {
      if (!isOpen) return;

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsOpen(false);
          buttonRef.current?.focus();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen]);

    return (
      <div className="relative">
        <Button
          ref={(el) => {
            if (ref) {
              if (typeof ref === 'function') {
                ref(el);
              } else {
                ref.current = el;
              }
            }
            (buttonRef as React.MutableRefObject<HTMLButtonElement | null>).current = el;
          }}
          variant="outline"
          size="lg"
          disabled={disabled}
          onClick={handleButtonClick}
          type="button"
          className={cn(
            "w-full justify-start text-left font-normal px-3",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "PPP") : <span>{placeholder}</span>}
        </Button>
        
        {mounted && isOpen && (
          <div 
            ref={calendarRef}
            className="absolute z-[99999] mt-2 bg-popover rounded-md border shadow-lg p-0 left-0 w-auto"
            style={{ minWidth: '280px' }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Calendar
              mode="single"
              selected={value}
              onSelect={handleDateSelect}
              initialFocus
              className="rounded-md"
            />
          </div>
        )}
      </div>
    );
  }
);

DatePicker.displayName = "DatePicker";