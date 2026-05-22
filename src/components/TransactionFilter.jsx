"use client";

import React, { useState, useMemo, useEffect } from "react";

/**
 * TransactionFilter Component
 *
 * Provides robust client-side filtering for transactions with multiple predefined scopes
 * and custom date range selection. Optimized for performance with useMemo.
 *
 * Features:
 * - Quick filter buttons: All, Today, This Month
 * - Custom date range picker with inclusive end-of-day filtering
 * - Real-time filtered data computation
 * - Clean dark UI with Tailwind CSS
 * - Callback to parent component on filter changes
 */

interface Transaction {
  id: string;
  date: string; // ISO String format or "YYYY-MM-DD"
  type: string;
  amount: number;
  [key: string]: any; // Allow additional properties
}

interface TransactionFilterProps {
  transactions?: Transaction[];
  onFilterChange?: (filteredData: Transaction[]) => void;
}

type FilterType = "all" | "today" | "month" | "custom";

export default function TransactionFilter({
  transactions = [],
  onFilterChange,
}: TransactionFilterProps) {
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  /**
   * Filtering Logic wrapped in useMemo for optimal client-side performance
   * Recalculates only when dependencies change
   */
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const tDate = new Date(t.date);
      const today = new Date();

      // Normalize today to start of day for comparison
      today.setHours(0, 0, 0, 0);
      tDate.setHours(0, 0, 0, 0);

      if (filterType === "today") {
        return tDate.getTime() === today.getTime();
      }

      if (filterType === "month") {
        return (
          tDate.getMonth() === today.getMonth() &&
          tDate.getFullYear() === today.getFullYear()
        );
      }

      if (filterType === "custom" && startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        // Set to absolute end of the chosen day (23:59:59.999)
        end.setHours(23, 59, 59, 999);
        start.setHours(0, 0, 0, 0);

        // Parse transaction date properly
        const txDate = new Date(t.date);
        return txDate >= start && txDate <= end;
      }

      return true; // default 'all'
    });
  }, [transactions, filterType, startDate, endDate]);

  /**
   * Trigger parent state update whenever filtered data changes
   * This allows parent component to react to filter changes
   */
  useEffect(() => {
    if (onFilterChange) {
      onFilterChange(filteredTransactions);
    }
  }, [filteredTransactions, onFilterChange]);

  /**
   * Handle reset of custom date range
   */
  const handleResetCustom = () => {
    setFilterType("all");
    setStartDate("");
    setEndDate("");
  };

  /**
   * Handle quick filter button click
   */
  const handleQuickFilter = (type: FilterType) => {
    setFilterType(type);
    // Clear custom date inputs when switching to quick filters
    if (type !== "custom") {
      setStartDate("");
      setEndDate("");
    }
  };

  /**
   * Handle start date change - automatically switch to custom filter
   */
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterType("custom");
    setStartDate(e.target.value);
  };

  /**
   * Handle end date change - automatically switch to custom filter
   */
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterType("custom");
    setEndDate(e.target.value);
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-slate-900/50 border border-slate-800 rounded-xl w-full">
      {/* Quick Action Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => handleQuickFilter("all")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            filterType === "all"
              ? "bg-indigo-600 text-white"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          အားလုံး
        </button>
        <button
          onClick={() => handleQuickFilter("today")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            filterType === "today"
              ? "bg-indigo-600 text-white"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          ဒီနေ့
        </button>
        <button
          onClick={() => handleQuickFilter("month")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            filterType === "month"
              ? "bg-indigo-600 text-white"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          ဒီလအတွက်ပဲ
        </button>
      </div>

      {/* Custom Date Range Selectors */}
      <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <label className="text-xs text-slate-400 font-medium">
            Custom Range:
          </label>
          <input
            type="date"
            value={startDate}
            onChange={handleStartDateChange}
            className="bg-slate-800 border border-slate-700 text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            placeholder="Start Date"
          />
          <span className="text-slate-500 text-sm font-medium">မှ</span>
          <input
            type="date"
            value={endDate}
            onChange={handleEndDateChange}
            className="bg-slate-800 border border-slate-700 text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            placeholder="End Date"
          />
        </div>

        {/* Reset Button - Only show when custom filter is active */}
        {filterType === "custom" && (startDate || endDate) && (
          <button
            onClick={handleResetCustom}
            className="text-xs text-rose-400 hover:text-rose-300 font-medium transition-colors underline underline-offset-2"
          >
            Reset
          </button>
        )}
      </div>

      {/* Filter Summary */}
      <div className="text-xs text-slate-400 flex items-center gap-2">
        <span>
          Showing{" "}
          <span className="font-semibold text-slate-300">
            {filteredTransactions.length}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-slate-300">
            {transactions.length}
          </span>{" "}
          transactions
        </span>
        {filterType !== "all" && (
          <span className="text-indigo-400">
            ({filterType === "today" && "Today"}
            {filterType === "month" && "This Month"}
            {filterType === "custom" && "Custom Range"})
          </span>
        )}
      </div>
    </div>
  );
}
