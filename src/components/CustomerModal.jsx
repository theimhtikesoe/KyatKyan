"use client";

import React, { useState } from 'react';

const money = new Intl.NumberFormat("en-US");

function formatMoney(value) {
  return `${money.format(Number(value || 0))} Ks`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function CustomerModal({ customer, onClose, onRefresh, isSubmitting, setIsSubmitting, showAlert }) {
  const [activeTab, setActiveTab] = useState('pending');

  // Filter ledgers by type
  // CREDIT = Debt (Pending if not balanced by a DEBIT)
  // DEBIT = Payment (Settled)
  const pendingList = (customer.ledgers || []).filter(l => l.type === "CREDIT");
  const paidList = (customer.ledgers || []).filter(l => l.type === "DEBIT");
  const totalDebt = customer.current_balance;

  const handleQuickPay = async (amount, note = "Quick Pay") => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/customers/${customer.id}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'DEBIT', 
          amount, 
          note,
          saleType: 'RETAIL'
        })
      });
      
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Payment failed");
      
      showAlert(`ငွေပမာဏ ${formatMoney(amount)} အောင်မြင်စွာ ပေးချေပြီးပါပြီ။`, "success");
      await onRefresh();
      onClose();
    } catch (error) {
      showAlert(error.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-2xl animate-in fade-in zoom-in duration-200">
        
        {/* Header Section */}
        <div className="flex items-start justify-between border-b border-slate-800 p-6 bg-slate-950/50">
          <div>
            <h2 className="text-2xl font-bold text-white">{customer.name}</h2>
            <p className="mt-1 text-sm text-slate-400">
              {[customer.phone, customer.routeTag].filter(Boolean).join(" / ") || "အချက်အလက်မရှိပါ"}
            </p>
          </div>
          <div className="text-right">
            <span className="mb-1 block text-xs font-medium text-slate-400 uppercase tracking-wider">လက်ရှိအကြွေးကျန်</span>
            <span className={`inline-block rounded-lg px-4 py-2 text-xl font-black shadow-inner ${
              totalDebt > 0 ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-400"
            }`}>
              {formatMoney(totalDebt)}
            </span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/30">
          <button 
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-4 text-center text-sm font-semibold transition-all ${
              activeTab === 'pending' 
                ? 'bg-slate-900 text-cyan-400 border-b-2 border-cyan-400' 
                : 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-300'
            }`}
          >
            📉 အကြွေးစာရင်း ({pendingList.length})
          </button>
          <button 
            onClick={() => setActiveTab('paid')}
            className={`flex-1 py-4 text-center text-sm font-semibold transition-all ${
              activeTab === 'paid' 
                ? 'bg-slate-900 text-emerald-400 border-b-2 border-emerald-400' 
                : 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-300'
            }`}
          >
            ✅ ရှင်းပြီးစာရင်း ({paidList.length})
          </button>
        </div>

        {/* Tab Content / Lists */}
        <div className="flex-1 overflow-y-auto p-6 max-h-[400px] bg-slate-900/50">
          {activeTab === 'pending' ? (
            pendingList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <div className="mb-3 text-4xl">🎉</div>
                <p>အကြွေးစာရင်း မရှိပါ</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingList.map((item) => (
                  <div key={item.id} className="group flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-4 transition-colors hover:border-slate-700">
                    <div>
                      <p className="text-lg font-bold text-white">{formatMoney(item.amount)}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(item.date)} • {item.note || 'မှတ်ချက်မရှိ'}
                      </p>
                    </div>
                    <button 
                      onClick={() => handleQuickPay(item.amount, `Payment for: ${item.note || formatMoney(item.amount)}`)}
                      className="rounded-md bg-cyan-600 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-cyan-500 hover:shadow-lg hover:shadow-cyan-600/20 disabled:opacity-50"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "..." : "ဘေလ်ချေမည်"}
                    </button>
                  </div>
                ))}
              </div>
            )
          ) : (
            paidList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <p>ရှင်းပြီးသားစာရင်း မရှိသေးပါ</p>
              </div>
            ) : (
              <div className="space-y-3">
                {paidList.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border border-emerald-900/20 bg-emerald-950/10 p-4">
                    <div>
                      <p className="text-lg font-bold text-emerald-400">-{formatMoney(item.amount)}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(item.date)} • {item.note || 'မှတ်ချက်မရှိ'}
                      </p>
                    </div>
                    <span className="rounded bg-emerald-400/10 px-2 py-1 text-[10px] font-black text-emerald-400 uppercase tracking-tighter border border-emerald-400/20">
                      PAID
                    </span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 border-t border-slate-800 bg-slate-950 p-6">
          <button 
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
            disabled={isSubmitting}
          >
            ပိတ်မည်
          </button>
          {totalDebt > 0 && (
            <button 
              onClick={() => handleQuickPay(totalDebt, "Full Balance Payment")}
              className="flex-1 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500 hover:shadow-emerald-600/40 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Processing..." : `🤝 အကြွေးအားလုံးရှင်းမည် (${formatMoney(totalDebt)})`}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
