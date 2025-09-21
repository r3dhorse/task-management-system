"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "@/lib/lucide-icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface AssigneeOption {
  value: string;
  label: string;
  email?: string;
  role?: string;
}

interface AssigneeSelectProps {
  options: AssigneeOption[];
  selected: string;
  onChange: (selected: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  allowUnassigned?: boolean;
}

export function AssigneeSelect({
  options,
  selected,
  onChange,
  placeholder = "Select assignee...",
  className,
  disabled = false,
  allowUnassigned = true,
}: AssigneeSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [mounted, setMounted] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Create unassigned option
  const unassignedOption: AssigneeOption = {
    value: "unassigned",
    label: "Unassigned",
    email: "No assignee selected",
  };

  // Combine unassigned option with regular options
  const allOptions = allowUnassigned ? [unassignedOption, ...options] : options;

  const filteredOptions = allOptions.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase()) ||
    (option.email && option.email.toLowerCase().includes(search.toLowerCase()))
  );

  const selectedOption = allOptions.find(opt => opt.value === selected);

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
    if (!disabled) {
      setOpen(!open);
    }
  };

  const handleSelect = (value: string) => {
    onChange(value);
    setOpen(false);
  };

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className={cn("w-full justify-between h-auto min-h-[2.5rem] py-1.5", className)}
        onClick={handleButtonClick}
        type="button"
        disabled={disabled}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {selectedOption ? (
            <>
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium text-white flex-shrink-0",
                selectedOption.value === "unassigned"
                  ? "bg-gray-200 text-gray-600"
                  : "bg-gradient-to-br from-green-500 to-green-600"
              )}>
                {selectedOption.value === "unassigned" ? "?" : selectedOption.label.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0 flex-1 text-left">
                <span className="text-sm font-medium truncate">{selectedOption.label}</span>
                {selectedOption.email && (
                  <span className="text-xs text-muted-foreground truncate">{selectedOption.email}</span>
                )}
              </div>
              {selectedOption.role && selectedOption.value !== "unassigned" && (
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0",
                  selectedOption.role === 'ADMIN'
                    ? 'bg-red-100 text-red-700'
                    : selectedOption.role === 'MEMBER'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700'
                )}>
                  {selectedOption.role}
                </span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {mounted && open && (
        <div
          ref={dropdownRef}
          className="absolute z-[99999] w-full bg-popover rounded-md border shadow-lg mt-2"
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
                        selected === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex items-center gap-x-2 w-full min-w-0">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium text-white flex-shrink-0",
                        option.value === "unassigned"
                          ? "bg-gray-200 text-gray-600"
                          : "bg-gradient-to-br from-green-500 to-green-600"
                      )}>
                        {option.value === "unassigned" ? "?" : option.label.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm font-medium truncate">{option.label}</span>
                        {option.email && (
                          <span className="text-xs text-muted-foreground truncate">{option.email}</span>
                        )}
                      </div>
                      {option.role && option.value !== "unassigned" && (
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