"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "@/lib/lucide-icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export interface MultiSelectOption {
  value: string;
  label: string;
  email?: string;
  role?: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  dropdownDirection?: 'up' | 'down';
  id?: string;
  name?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select items...",
  className,
  dropdownDirection = 'down',
  id,
  name,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [mounted, setMounted] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleUnselect = React.useCallback((item: string) => {
    onChange(selected.filter((i) => i !== item));
  }, [onChange, selected]);

  const handleSelect = React.useCallback((value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value]
    );
  }, [onChange, selected]);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase())
  );

  // Handle clicks outside
  React.useEffect(() => {
    if (!open || !mounted) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    // Use capture phase to handle events before they bubble
    document.addEventListener('mousedown', handleClickOutside, true);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [open, mounted]);

  // Handle escape key
  React.useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(!open);
  };

  return (
    <div className="relative">
      {/* Hidden input for form semantics and accessibility */}
      <input type="hidden" name={name} value={JSON.stringify(selected)} />
      <Button
        ref={buttonRef}
        id={id}
        variant="outline"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn("w-full justify-between h-auto min-h-[2.5rem] py-1.5", className)}
        onClick={handleButtonClick}
        type="button"
      >
        <div className="flex gap-1 flex-wrap items-center flex-1 min-w-0">
          {selected.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : selected.length <= 2 ? (
            selected.map((item) => {
              const option = options.find((opt) => opt.value === item);
              return (
                <Badge
                  variant="secondary"
                  key={item}
                  className="mr-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnselect(item);
                  }}
                >
                  {option?.label}
                  <button
                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleUnselect(item);
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleUnselect(item);
                    }}
                    type="button"
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </Badge>
              );
            })
          ) : (
            <Badge 
              variant="secondary" 
              className="mr-1"
              title={selected.map(id => options.find(opt => opt.value === id)?.label).filter(Boolean).join(", ")}
            >
              {selected.length} selected
            </Badge>
          )}
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
      </Button>
      
      {mounted && open && (
        <div
          ref={dropdownRef}
          className={cn(
            "absolute z-[99999] w-full bg-popover rounded-md border shadow-lg",
            dropdownDirection === 'up' ? "bottom-full mb-2" : "mt-2"
          )}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col">
            <div className="flex items-center border-b px-3 py-2">
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                onClick={(e) => e.stopPropagation()}
                autoComplete="off"
              />
            </div>
            <div className="max-h-[240px] overflow-auto">
              {filteredOptions.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No items found.
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <div
                    key={option.value}
                    className={cn(
                      "relative flex cursor-pointer select-none items-center px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground transition-colors",
                      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(option.value);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <Check
                      className={cn(
                        "mr-3 h-4 w-4 flex-shrink-0",
                        selected.includes(option.value) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex items-center gap-x-2 w-full min-w-0">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-sm font-medium text-white flex-shrink-0">
                        {option.label.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm font-medium truncate">{option.label}</span>
                        {option.email && (
                          <span className="text-xs text-muted-foreground truncate">{option.email}</span>
                        )}
                      </div>
                      {option.role && (
                        <div className="flex-shrink-0">
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full font-medium",
                            option.role === 'ADMIN'
                              ? 'bg-red-100 text-red-700'
                              : option.role === 'MEMBER'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          )}>
                            {option.role}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}