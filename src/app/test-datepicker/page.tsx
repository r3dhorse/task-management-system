"use client";

import { useState } from "react";
import { DatePicker } from "@/components/date-picker";
import { DayPicker } from "react-day-picker";

export default function TestDatePickerPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [directDate, setDirectDate] = useState<Date | undefined>(undefined);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Date Picker</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Custom DatePicker */}
        <div className="max-w-md">
          <h2 className="text-lg font-semibold mb-2">Custom DatePicker</h2>
          <label className="block text-sm font-medium mb-2">
            Select a date:
          </label>
          <DatePicker
            value={selectedDate}
            onChange={(date) => {
              console.log('Custom DatePicker: Date selected:', date);
              setSelectedDate(date);
            }}
            placeholder="Pick a date"
          />
          
          {selectedDate && (
            <p className="mt-4 text-sm text-green-600">
              Selected: {selectedDate.toDateString()}
            </p>
          )}
        </div>

        {/* Direct DayPicker */}
        <div className="max-w-md">
          <h2 className="text-lg font-semibold mb-2">Direct DayPicker</h2>
          <div className="border rounded-md p-3 bg-white">
            <DayPicker
              mode="single"
              selected={directDate}
              onSelect={(date) => {
                console.log('Direct DayPicker: Date selected:', date);
                setDirectDate(date);
              }}
            />
          </div>
          
          {directDate && (
            <p className="mt-4 text-sm text-green-600">
              Direct Selected: {directDate.toDateString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}