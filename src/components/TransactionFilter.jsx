"use client";

import React, { useState, useMemo, useEffect } from "react";

/**
 * TransactionFilter Component
 *
 * Provides robust client-side filtering for transactions with multiple predefined scopes
 * and custom date range selection. Optimized for performance with useMemo.
 */

export default function TransactionFilter({
  transactions = [],
  onFilterChange,
  extraActions,
}) {
  const [filterType, setFilterType] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  /**
   * Filtering Logic wrapped in useMemo for optimal client-side performance
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

      if (filterType === "custom") {
        const txDate = new Date(t.date);
        txDate.setHours(0, 0, 0, 0);

        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          start.setHours(0, 0, 0, 0);
          end.setHours(0, 0, 0, 0);
          return txDate >= start && txDate <= end;
        }
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          return txDate >= start;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(0, 0, 0, 0);
          return txDate <= end;
        }
      }

      return true; // default 'all'
    });
  }, [transactions, filterType, startDate, endDate]);

  /**
   * Trigger parent state update whenever filtered data changes
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
  const handleQuickFilter = (type) => {
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
  const handleStartDateChange = (e) => {
    setFilterType("custom");
    setStartDate(e.target.value);
  };

  /**
   * Handle end date change - automatically switch to custom filter
   */
  const handleEndDateChange = (e) => {
    setFilterType("custom");
    setEndDate(e.target.value);
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-white border border-slate-200 rounded-xl w-full">
      {/* Quick Action Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => handleQuickFilter("all")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            filterType === "all"
              ? "bg-indigo-600 text-white"
              : "text-slate-700 hover:text-white hover:bg-slate-300"
          }`}
        >
          အားလုံး
        </button>
        <button
          onClick={() => handleQuickFilter("today")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            filterType === "today"
              ? "bg-indigo-600 text-white"
              : "text-slate-700 hover:text-white hover:bg-slate-300"
          }`}
        >
          ဒီနေ့
        </button>
        <button
          onClick={() => handleQuickFilter("month")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            filterType === "month"
              ? "bg-indigo-600 text-white"
              : "text-slate-700 hover:text-white hover:bg-slate-300"
          }`}
        >
          ဒီလအတွက်ပဲ
        </button>
      </div>

      {/* Custom Date Range Selectors */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-slate-700 font-medium">
            Custom Range:
          </label>
          <input
            type="date"
            value={startDate}
            onChange={handleStartDateChange}
            className="flex-1 min-w-[130px] bg-white border border-slate-300 text-sm text-slate-900 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            placeholder="Start Date"
          />
          <span className="text-slate-700 text-sm font-medium">မှ</span>
          <input
            type="date"
            value={endDate}
            onChange={handleEndDateChange}
            className="flex-1 min-w-[130px] bg-white border border-slate-300 text-sm text-slate-900 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
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

      {/* Extra Actions (e.g., Export Button) */}
      {extraActions && <div className="flex items-center">{extraActions}</div>}
    </div>
  );
}
