"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { createPortal } from "react-dom";

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
    const [buttonElement, setButtonElement] = React.useState<HTMLButtonElement | null>(null);
    const [position, setPosition] = React.useState({ top: 0, left: 0 });

    const handleDateSelect = (date: Date | undefined) => {
      if (date) {
        onChange(date);
        setIsOpen(false);
      }
    };

    const handleCalendarClick = (e: React.MouseEvent) => {
      // Prevent the calendar from closing when clicking inside it
      e.stopPropagation();
    };

    const toggleCalendar = () => {
      if (!disabled) {
        if (!isOpen && buttonElement) {
          const rect = buttonElement.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const viewportWidth = window.innerWidth;
          
          // Calculate position, ensuring calendar stays within viewport
          let top = rect.bottom + window.scrollY + 4;
          let left = rect.left + window.scrollX;
          
          // Adjust if calendar would go off-screen vertically
          if (rect.bottom + 300 > viewportHeight) {
            top = rect.top + window.scrollY - 300 - 4; // Show above button
          }
          
          // Adjust if calendar would go off-screen horizontally  
          if (rect.left + 300 > viewportWidth) {
            left = viewportWidth - 300 - 10; // Adjust to fit
          }
          
          setPosition({ top, left });
        }
        setIsOpen(!isOpen);
      }
    };

    // Close calendar when clicking outside
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (isOpen) {
          const target = event.target as Node;
          const calendarElement = document.querySelector('[data-calendar-picker]');
          
          // Don't close if clicking on the button or inside the calendar
          if (buttonElement?.contains(target) || calendarElement?.contains(target)) {
            return;
          }
          
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }
    }, [isOpen, buttonElement]);

    // Close on escape key
    React.useEffect(() => {
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && isOpen) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
      }
    }, [isOpen]);

    const calendarPortal = isOpen && typeof window !== 'undefined' ? createPortal(
      <div 
        data-calendar-picker
        className="fixed z-[9999] w-auto p-0 rounded-md border bg-popover shadow-lg"
        style={{
          top: position.top,
          left: position.left,
        }}
        onClick={handleCalendarClick}
      >
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleDateSelect}
          initialFocus
        />
      </div>,
      document.body
    ) : null;

    return (
      <>
        <Button
          ref={(el) => {
            setButtonElement(el);
            if (ref) {
              if (typeof ref === 'function') {
                ref(el);
              } else {
                ref.current = el;
              }
            }
          }}
          variant="outline"
          size="lg"
          disabled={disabled}
          onClick={toggleCalendar}
          className={cn(
            "w-full justify-start text-left font-normal px-3",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "PPP") : <span>{placeholder}</span>}
        </Button>
        {calendarPortal}
      </>
    );
  }
);

DatePicker.displayName = "DatePicker";