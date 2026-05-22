"use client";

import { useEffect, useMemo, useState, useCallback } from "react";


const money = new Intl.NumberFormat("en-US");
const today = new Date().toISOString().slice(0, 10);

function formatMoney(value) {
  return `${money.format(Number(value || 0))} Ks`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

async function api(path, options) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const text = await response.text();
  let body = {};

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { error: text };
    }
  }

  if (!response.ok) {
    throw new Error(body.error || `Request failed with status ${response.status}`);
  }

  return body.data;
}

// Alert notification component
function AlertNotification({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === "success" ? "bg-emerald-950/60 border-emerald-900" : "bg-rose-950/60 border-rose-900";
  const textColor = type === "success" ? "text-emerald-200" : "text-rose-200";

  return (
    <div className={`fixed top-4 right-4 z-40 rounded-md border px-4 py-3 text-sm ${bgColor} ${textColor} shadow-lg`}>
      {message}
    </div>
  );
}

export default function Dashboard() {
  const [customers, setCustomers] = useState([]);
  const [pendingKpay, setPendingKpay] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [search, setSearch] = useState("");
  const [matchingKpay, setMatchingKpay] = useState(null);
  const [matchCustomerId, setMatchCustomerId] = useState("");
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deletingCustomer, setDeletingCustomer] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", routeTag: "" });
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    routeTag: "",
    current_balance: "",
  });
  const [ledgerForm, setLedgerForm] = useState({
    type: "CREDIT",
    saleType: "RETAIL",
    itemSize: "",
    cartons: "",
    rate: "",
    deductions: "",
    amount: "",
    note: "",
  });
  const [activeTab, setActiveTab] = useState("kpay");
  const [reportDate, setReportDate] = useState(today);
  const [report, setReport] = useState(null);
  const [showAddCustomer, setShowAddCustomer] = useState(true);
  const [showExtraTools, setShowExtraTools] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [message, setMessage] = useState("");
  const [alert, setAlert] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);


  // Show alert notification
  const showAlert = useCallback((msg, type = "success") => {
    setAlert({ message: msg, type });
  }, []);

  // Hide alert notification
  const hideAlert = useCallback(() => {
    setAlert(null);
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [customerRows, kpayRows] = await Promise.all([
        api(`/api/customers${search ? `?q=${encodeURIComponent(search)}` : ""}`),
        api("/api/unverified-kpay?status=PENDING"),
      ]);
      setCustomers(customerRows);
      setPendingKpay(kpayRows);
      setMessage("");
    } catch (error) {
      setMessage(error.message);
      showAlert(error.message, "error");
    } finally {
      setLoading(false);
    }
  }, [search, showAlert]);

  // Trigger search when search input changes
  useEffect(() => {
    const timer = setTimeout(() => {
      loadDashboard();
    }, 300); // Debounce search by 300ms
    return () => clearTimeout(timer);
  }, [search, loadDashboard]);

  const loadCustomer = useCallback(async (id = selectedCustomerId) => {
    if (!id) {
      setSelectedCustomer(null);
      return;
    }

    setLoadingCustomer(true);
    try {
      const customer = await api(`/api/customers/${id}`);
      setSelectedCustomer(customer);
      setSelectedCustomerId(customer.id);
    } catch (error) {
      setMessage(error.message);
      showAlert(error.message, "error");
    } finally {
      setLoadingCustomer(false);
    }
  }, [selectedCustomerId, showAlert]);

  useEffect(() => {
    loadDashboard().catch((error) => {
      setMessage(error.message);
      showAlert(error.message, "error");
    });
  }, [loadDashboard, showAlert]);

  useEffect(() => {
    loadCustomer().catch((error) => {
      setMessage(error.message);
      showAlert(error.message, "error");
    });
  }, [loadCustomer, showAlert]);

  const totalPending = useMemo(
    () => pendingKpay.reduce((sum, item) => sum + item.amount, 0),
    [pendingKpay],
  );

  async function createCustomer(event) {
    event.preventDefault();
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      setMessage("");
      const customer = await api("/api/customers", {
        method: "POST",
        body: JSON.stringify({
          ...newCustomer,
          current_balance: Number(newCustomer.current_balance || 0),
        }),
      });
      
      // Optimistic Update: Add new customer to the list immediately
      setCustomers(prev => [customer, ...prev]);
      setNewCustomer({ name: "", phone: "", routeTag: "", current_balance: "" });
      setSelectedCustomerId(customer.id);
      setShowAddCustomer(false);
      showAlert(`Customer "${customer.name}" အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ။`, "success");
    } catch (error) {
      setMessage(error.message);
      showAlert(error.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function createLedgerTransaction(event) {
    event.preventDefault();
    if (!selectedCustomerId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      setMessage("");
      const amount = Number(ledgerForm.amount);
      const type = ledgerForm.type;
      
      // Calculate new balance optimistically
      const balanceDelta = type === "CREDIT" ? amount : -amount;
      const newBalance = (selectedCustomer?.current_balance || 0) + balanceDelta;
      
      // Optimistic Update: Update balance immediately
      setSelectedCustomer(prev => ({
        ...prev,
        current_balance: newBalance,
      }));
      
      // Update customer in list
      setCustomers(prev =>
        prev.map(c => c.id === selectedCustomerId ? { ...c, current_balance: newBalance } : c)
      );
      
      const result = await api(`/api/customers/${selectedCustomerId}/transactions`, {
        method: "POST",
        body: JSON.stringify({
          type: ledgerForm.type,
          saleType: ledgerForm.saleType,
          itemSize: ledgerForm.itemSize,
          cartons: Number(ledgerForm.cartons || 0) || null,
          rate: Number(ledgerForm.rate || 0) || null,
          deductions: Number(ledgerForm.deductions || 0),
          amount: Number(ledgerForm.amount),
          note: ledgerForm.note,
        }),
      });
      
      // Add new transaction to the list optimistically
      if (result && result.ledger) {
        setSelectedCustomer(prev => ({
          ...prev,
          ledgers: [result.ledger, ...(prev.ledgers || [])],
        }));
      }
      
      // Clear form immediately after successful submission
      setLedgerForm({
        type: "CREDIT",
        saleType: "RETAIL",
        itemSize: "",
        cartons: "",
        rate: "",
        deductions: "",
        amount: "",
        note: "",
      });
      
      showAlert("Transaction အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ။", "success");
    } catch (error) {
      setMessage(error.message);
      showAlert(error.message, "error");
      // Revert optimistic update on error
      await loadCustomer(selectedCustomerId);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function createSalesLedger(event) {
    event.preventDefault();
    if (!selectedCustomerId || isSubmitting) {
      if (!selectedCustomerId) {
        showAlert("Customer တစ်ယောက်ကို အရင်ရွေးပါ။", "error");
      }
      return;
    }

    const amount = computedSaleAmount || Number(ledgerForm.amount || 0);

    setIsSubmitting(true);
    try {
      setMessage("");
      
      // Optimistic Update: Calculate and update balance immediately
      const newBalance = (selectedCustomer?.current_balance || 0) + amount;
      setSelectedCustomer(prev => ({
        ...prev,
        current_balance: newBalance,
      }));
      
      // Update customer in list
      setCustomers(prev =>
        prev.map(c => c.id === selectedCustomerId ? { ...c, current_balance: newBalance } : c)
      );
      
      const result = await api(`/api/customers/${selectedCustomerId}/transactions`, {
        method: "POST",
        body: JSON.stringify({
          ...ledgerForm,
          type: "CREDIT",
          amount,
          cartons: Number(ledgerForm.cartons || 0) || null,
          rate: Number(ledgerForm.rate || 0) || null,
          deductions: Number(ledgerForm.deductions || 0),
        }),
      });
      
      // Add new transaction to the list
      if (result && result.ledger) {
        setSelectedCustomer(prev => ({
          ...prev,
          ledgers: [result.ledger, ...(prev.ledgers || [])],
        }));
      }
      
      setLedgerForm({
        type: "CREDIT",
        saleType: "RETAIL",
        itemSize: "",
        cartons: "",
        rate: "",
        deductions: "",
        amount: "",
        note: "",
      });
      
      showAlert("Sales လက်ခြင်းအောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ။", "success");
    } catch (error) {
      setMessage(error.message);
      showAlert(error.message, "error");
      // Revert optimistic update on error
      await loadCustomer(selectedCustomerId);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function matchKpay(event) {
    event.preventDefault();
    if (!matchingKpay || !matchCustomerId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      setMessage("");
      await api("/api/kpay-match", {
        method: "POST",
        body: JSON.stringify({
          unverifiedKpayId: matchingKpay.id,
          customerId: matchCustomerId,
          kpayName: matchingKpay.kpayName,
          amount: matchingKpay.amount,
        }),
      });
      
      const customerId = matchCustomerId;
      const kpayAmount = matchingKpay.amount;
      
      // Optimistic Update: Remove matched KPay from pending list
      setPendingKpay(prev => prev.filter(k => k.id !== matchingKpay.id));
      
      // Update customer balance optimistically
      setCustomers(prev =>
        prev.map(c => 
          c.id === customerId 
            ? { ...c, current_balance: c.current_balance - kpayAmount } 
            : c
        )
      );
      
      setMatchingKpay(null);
      setMatchCustomerId("");
      setSelectedCustomerId(customerId);
      
      showAlert(`KPay ${formatMoney(kpayAmount)} အောင်မြင်စွာ တွဲဆက်ပြီးပါပြီ။`, "success");
    } catch (error) {
      setMessage(error.message);
      showAlert(error.message, "error");
      // Reload data on error
      await Promise.all([loadDashboard(), loadCustomer(matchCustomerId)]);
    } finally {
      setIsSubmitting(false);
    }
  }

  function openEditCustomer(customer) {
    setEditingCustomer(customer);
    setEditForm({
      name: customer.name || "",
      phone: customer.phone || "",
      routeTag: customer.routeTag || "",
    });
  }

  async function updateCustomer(event) {
    event.preventDefault();
    if (!editingCustomer || isSubmitting) return;

    setIsSubmitting(true);
    try {
      setMessage("");
      
      // Optimistic Update: Update customer in list immediately
      setCustomers(prev =>
        prev.map(c =>
          c.id === editingCustomer.id
            ? { ...c, ...editForm }
            : c
        )
      );
      
      const customer = await api(`/api/customers/${editingCustomer.id}`, {
        method: "PATCH",
        body: JSON.stringify(editForm),
      });
      
      setEditingCustomer(null);
      setEditForm({ name: "", phone: "", routeTag: "" });
      
      if (selectedCustomerId === customer.id) {
        setSelectedCustomer(prev => ({ ...prev, ...customer }));
      }
      
      showAlert(`Customer "${customer.name}" အောင်မြင်စွာ အဆင့်မြှင့်တင်ပြီးပါပြီ။`, "success");
    } catch (error) {
      setMessage(error.message);
      showAlert(error.message, "error");
      // Revert optimistic update on error
      await loadDashboard();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteCustomer() {
    if (!deletingCustomer || isSubmitting) return;

    setIsSubmitting(true);
    try {
      setMessage("");
      const customerName = deletingCustomer.name;
      
      // Optimistic Update: Remove customer from list immediately
      setCustomers(prev => prev.filter(c => c.id !== deletingCustomer.id));
      
      await api(`/api/customers/${deletingCustomer.id}`, {
        method: "DELETE",
      });
      
      if (selectedCustomerId === deletingCustomer.id) {
        setSelectedCustomerId(null);
        setSelectedCustomer(null);
      }
      
      setDeletingCustomer(null);
      showAlert(`Customer "${customerName}" အောင်မြင်စွာ ဖျက်ပြီးပါပြီ။`, "success");
    } catch (error) {
      setMessage(error.message);
      showAlert(error.message, "error");
      // Revert optimistic update on error
      await loadDashboard();
    } finally {
      setIsSubmitting(false);
    }
  }

  const loadReport = useCallback(async (date = reportDate) => {
    try {
      const data = await api(`/api/reports?date=${encodeURIComponent(date)}`);
      setReport(data);
    } catch (error) {
      setMessage(error.message);
      showAlert(error.message, "error");
    }
  }, [reportDate, showAlert]);

  useEffect(() => {
    if (showExtraTools) {
      loadReport(reportDate);
    }
  }, [reportDate, showExtraTools, loadReport]);

  const computedSaleAmount = Math.max(
    0,
    Math.round(Number(ledgerForm.cartons || 0) * Number(ledgerForm.rate || 0)) -
      Math.round(Number(ledgerForm.deductions || 0)),
  );

  return (
    <main className="min-h-screen bg-[#080a0f] text-slate-100">
      {alert && (
        <AlertNotification
          message={alert.message}
          type={alert.type}
          onClose={hideAlert}
        />
      )}
      


      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-3 py-3 sm:gap-6 sm:px-6 sm:py-6 lg:px-8">
        <header className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-cyan-300">LatYar Ledger Dashboard</p>
              <h1 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">
                Customer စာရင်းချုပ်
              </h1>
            </div>
          </div>
          {message ? (
            <p className="mt-4 rounded-md border border-rose-900 bg-rose-950/60 px-3 py-2 text-sm text-rose-200">
              {message}
            </p>
          ) : null}
        </header>

        <section className="rounded-lg border border-cyan-500/30 bg-slate-950 p-4">
          <button
            className="flex min-h-12 w-full items-center justify-between gap-3 text-left"
            onClick={() => setShowAddCustomer((value) => !value)}
          >
            <div>
              <h2 className="text-base font-semibold text-white">Customer အသစ်ထည့်ရန်</h2>
              <p className="mt-1 text-sm text-slate-400">ဖုန်းမှ အမြန်စာရင်းသွင်းရန်</p>
            </div>
            <span className="rounded-md border border-slate-700 px-3 py-2 text-sm text-cyan-200">
              {showAddCustomer ? "Hide" : "Add"}
            </span>
          </button>

          {showAddCustomer ? (
            <form className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4" onSubmit={createCustomer}>
              <input
                className="min-h-12 rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-base text-white outline-none focus:border-cyan-400"
                placeholder="အမည်"
                value={newCustomer.name}
                onChange={(event) => setNewCustomer({ ...newCustomer, name: event.target.value })}
                required
                disabled={isSubmitting}
              />
              <input
                className="min-h-12 rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-base text-white outline-none focus:border-cyan-400"
                inputMode="tel"
                placeholder="ဖုန်းနံပါတ်"
                value={newCustomer.phone}
                onChange={(event) => setNewCustomer({ ...newCustomer, phone: event.target.value })}
                disabled={isSubmitting}
              />
              <input
                className="min-h-12 rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-base text-white outline-none focus:border-cyan-400"
                inputMode="numeric"
                placeholder="အစ လက်ကျန်အကြွေး"
                value={newCustomer.current_balance}
                onChange={(event) =>
                  setNewCustomer({ ...newCustomer, current_balance: event.target.value })
                }
                disabled={isSubmitting}
              />
              <button 
                className="min-h-12 rounded-md bg-cyan-400 px-5 py-3 text-base font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Adding..." : "Add"}
              </button>
            </form>
          ) : null}
        </section>



        <section className="rounded-lg border border-slate-800 bg-slate-950 p-4 sm:p-5">
          <div className="mb-4">
            <input
              type="text"
              className="w-full min-h-12 rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-base text-white outline-none focus:border-cyan-400"
              placeholder="Customer ရှာဖွေရန် (အမည် သို့မဟုတ် ဖုန်းနံပါတ်)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {loading ? (
              <div className="col-span-full rounded-lg border border-slate-800 p-4 text-center text-slate-400">
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-cyan-400"></div>
                  <span>Customer များ ရှာဖွေနေသည်...</span>
                </div>
              </div>
            ) : customers.length ? (
              customers.map((customer) => (
                <div
                  key={customer.id}
                  className={`cursor-pointer rounded-lg border p-4 transition ${
                    selectedCustomerId === customer.id
                      ? "border-cyan-400 bg-cyan-400/10"
                      : "border-slate-800 bg-slate-900/50 hover:border-slate-600"
                  }`}
                  onClick={() => setSelectedCustomerId(customer.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-white hover:text-cyan-400 transition-colors">{customer.name}</h3>
                      <p className="mt-1 text-xs text-slate-400">
                        {[customer.phone, customer.routeTag].filter(Boolean).join(" / ") || "No contact"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-slate-400">Balance</p>
                    <p
                      className={`text-sm font-semibold ${
                        customer.current_balance > 0 ? "text-rose-200" : "text-emerald-200"
                      }`}
                    >
                      {formatMoney(customer.current_balance)}
                    </p>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      className="flex-1 rounded-md px-2 py-1 text-xs font-medium text-cyan-300 hover:bg-cyan-950/60"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditCustomer(customer);
                      }}
                      disabled={isSubmitting}
                    >
                      Edit
                    </button>
                    <button
                      className="flex-1 rounded-md px-2 py-1 text-xs font-medium text-rose-300 hover:bg-rose-950/60"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingCustomer(customer);
                      }}
                      disabled={isSubmitting}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-slate-800 p-4 text-sm text-slate-400">
                Customer မရှိသေးပါ။
              </p>
            )
            )}
          </div>

          <div className="mt-6 rounded-lg border border-slate-800 bg-slate-950 p-4 sm:p-5">
            {loadingCustomer ? (
              <div className="flex min-h-[420px] items-center justify-center rounded-lg border border-dashed border-slate-700">
                <div className="text-center">
                  <div className="flex justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-3 border-slate-600 border-t-cyan-400"></div>
                  </div>
                  <p className="mt-4 text-slate-400">Customer အချက်အလက် ရယူနေသည်...</p>
                </div>
              </div>
            ) : selectedCustomer ? (
              <>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-white">{selectedCustomer.name}</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      {[selectedCustomer.phone, selectedCustomer.routeTag].filter(Boolean).join(" / ") ||
                        "No phone"}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        className="min-h-11 rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:border-cyan-400 hover:text-cyan-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => openEditCustomer(selectedCustomer)}
                        disabled={isSubmitting}
                      >
                        Edit
                      </button>
                      <button
                        className="min-h-11 rounded-md border border-rose-900/70 px-4 py-2 text-sm font-medium text-rose-200 hover:border-rose-400 hover:text-rose-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => setDeletingCustomer(selectedCustomer)}
                        disabled={isSubmitting}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-800 px-4 py-3">
                    <p className="text-sm text-slate-400">လက်ရှိအကြွေးကျန်ငွေ</p>
                    <p
                      className={`mt-1 text-2xl font-semibold ${
                        selectedCustomer.current_balance > 0 ? "text-rose-200" : "text-emerald-200"
                      }`}
                    >
                      {formatMoney(selectedCustomer.current_balance)}
                    </p>
                  </div>
                </div>

                <form
                  className="mt-6 grid gap-3 rounded-lg border border-slate-800 p-3 sm:p-4"
                  onSubmit={createLedgerTransaction}
                >
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <select
                      className="min-h-12 rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-base outline-none focus:border-cyan-400 md:text-sm disabled:opacity-50"
                      value={ledgerForm.type}
                      onChange={(event) => setLedgerForm({ ...ledgerForm, type: event.target.value })}
                      disabled={isSubmitting}
                    >
                      <option value="CREDIT">အကြွေးတိုး (Unpaid)</option>
                      <option value="DEBIT">ငွေချေ (Paid)</option>
                    </select>
                    <input
                      className="min-h-12 rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-base outline-none focus:border-cyan-400 md:text-sm disabled:opacity-50"
                      inputMode="numeric"
                      placeholder="ငွေပမာဏ"
                      value={ledgerForm.amount}
                      onChange={(event) => setLedgerForm({ ...ledgerForm, amount: event.target.value })}
                      disabled={isSubmitting}
                      required
                    />
                    <input
                      type="date"
                      className="min-h-12 rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-base outline-none focus:border-cyan-400 md:text-sm disabled:opacity-50"
                      value={ledgerForm.date}
                      onChange={(event) => setLedgerForm({ ...ledgerForm, date: event.target.value })}
                      disabled={isSubmitting}
                    />
                    <input
                      className="min-h-12 rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-base outline-none focus:border-cyan-400 md:text-sm disabled:opacity-50"
                      placeholder="မှတ်ချက်"
                      value={ledgerForm.note}
                      onChange={(event) => setLedgerForm({ ...ledgerForm, note: event.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    {ledgerForm.type === "DEBIT" && (
                      <select
                        className="min-h-12 rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-base outline-none focus:border-cyan-400 md:text-sm disabled:opacity-50"
                        value={ledgerForm.paymentType || ""}
                        onChange={(event) => setLedgerForm({ ...ledgerForm, paymentType: event.target.value })}
                        disabled={isSubmitting}
                      >
                        <option value="">Payment Type ရွေးပါ...</option>
                        <option value="KPay">KPay</option>
                        <option value="Wave Money">Wave Money</option>
                        <option value="Mobile Banking">Mobile Banking</option>
                      </select>
                    )}
                    <button 
                      className="min-h-12 rounded-md bg-cyan-400 px-8 py-3 text-base font-semibold text-slate-950 hover:bg-cyan-300 md:text-sm disabled:opacity-50 disabled:cursor-not-allowed md:ml-auto"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Saving..." : "Save"}
                    </button>
                  </div>
                </form>

                <div className="mt-6 overflow-x-auto rounded-lg border border-slate-800">
                  <table className="w-full min-w-[620px] border-collapse text-sm">
                    <thead className="bg-slate-900 text-left text-slate-300">
                      <tr>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Type</th>
                        <th className="px-4 py-3 text-right font-medium">Amount</th>
                        <th className="px-4 py-3 font-medium">Payment/Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {(selectedCustomer?.ledgers || []).map((transaction) => (
                        <tr key={transaction.id} className="bg-slate-950">
                          <td className="px-4 py-3 text-slate-300">{formatDate(transaction.date)}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                transaction.type === "CREDIT"
                                  ? "bg-rose-400/10 text-rose-300"
                                  : "bg-emerald-400/10 text-emerald-300"
                              }`}
                            >
                              {transaction.type === "CREDIT" ? "အကြွေးတိုး (Unpaid)" : "ငွေချေ (Paid)"}
                            </span>
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-semibold ${
                              transaction.type === "CREDIT" ? "text-rose-200" : "text-emerald-200"
                            }`}
                          >
                            {formatMoney(transaction.amount)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-0.5">
                              {transaction.paymentType && (
                                <span className="text-[10px] font-medium text-cyan-300">
                                  [{transaction.paymentType}]
                                </span>
                              )}
                              <span className="text-slate-400">{transaction.note || "-"}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!(selectedCustomer.ledgers || []).length ? (
                        <tr>
                          <td className="px-4 py-5 text-center text-slate-400" colSpan="4">
                            Transaction မရှိသေးပါ။
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="flex min-h-[420px] items-center justify-center rounded-lg border border-dashed border-slate-700 text-center text-slate-400">
                Customer တစ်ယောက်ကို ရွေးပါ။
              </div>
            )
            )}
          </div>
        </section>



        {editingCustomer ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-6">
              <h3 className="text-lg font-semibold text-white">Edit Customer</h3>
              <form className="mt-4 grid gap-3" onSubmit={updateCustomer}>
                <input
                  className="min-h-11 rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none focus:border-cyan-400"
                  placeholder="အမည်"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                  disabled={isSubmitting}
                />
                <input
                  className="min-h-11 rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none focus:border-cyan-400"
                  inputMode="tel"
                  placeholder="ဖုန်းနံပါတ်"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  disabled={isSubmitting}
                />
                <input
                  className="min-h-11 rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none focus:border-cyan-400"
                  placeholder="Route Tag"
                  value={editForm.routeTag}
                  onChange={(e) => setEditForm({ ...editForm, routeTag: e.target.value })}
                  disabled={isSubmitting}
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="flex-1 rounded-md border border-slate-700 px-4 py-2 text-slate-300 hover:border-slate-600 disabled:opacity-50"
                    onClick={() => setEditingCustomer(null)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    className="flex-1 rounded-md bg-cyan-400 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {deletingCustomer ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-6">
              <h3 className="text-lg font-semibold text-white">Delete Customer?</h3>
              <p className="mt-2 text-sm text-slate-400">
                သည် &quot;{deletingCustomer.name}&quot; ကို ဖျက်မည် သည်။ ဒီလုပ်ဆောင်ချက်ကို ပြန်လည်ပြင်ဆင်၍ မရပါ။
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  className="flex-1 rounded-md border border-slate-700 px-4 py-2 text-slate-300 hover:border-slate-600 disabled:opacity-50"
                  onClick={() => setDeletingCustomer(null)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 rounded-md bg-rose-600 px-4 py-2 font-semibold text-white hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={deleteCustomer}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {matchingKpay ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-6">
              <h3 className="text-lg font-semibold text-white">Match KPay to Customer</h3>
              <p className="mt-2 text-sm text-slate-400">
                {formatMoney(matchingKpay.amount)} ကို customer နှင့် တွဲဆက်ပါ။
              </p>
              <form className="mt-4 grid gap-3" onSubmit={matchKpay}>
                <select
                  className="min-h-11 rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none focus:border-cyan-400"
                  value={matchCustomerId}
                  onChange={(e) => setMatchCustomerId(e.target.value)}
                  required
                  disabled={isSubmitting}
                >
                  <option value="">Customer ရွေးပါ...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="flex-1 rounded-md border border-slate-700 px-4 py-2 text-slate-300 hover:border-slate-600 disabled:opacity-50"
                    onClick={() => setMatchingKpay(null)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    className="flex-1 rounded-md bg-cyan-400 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Matching..." : "Match"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
