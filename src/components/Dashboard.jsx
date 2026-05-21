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

  async function loadDashboard() {
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
  }

  async function loadCustomer(id = selectedCustomerId) {
    if (!id) {
      setSelectedCustomer(null);
      return;
    }

    try {
      const customer = await api(`/api/customers/${id}`);
      setSelectedCustomer(customer);
      setSelectedCustomerId(customer.id);
    } catch (error) {
      setMessage(error.message);
      showAlert(error.message, "error");
    }
  }

  useEffect(() => {
    loadDashboard().catch((error) => {
      setMessage(error.message);
      showAlert(error.message, "error");
    });
  }, [search]);

  useEffect(() => {
    loadCustomer().catch((error) => {
      setMessage(error.message);
      showAlert(error.message, "error");
    });
  }, [selectedCustomerId]);

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

  async function loadReport(date = reportDate) {
    try {
      const data = await api(`/api/reports?date=${encodeURIComponent(date)}`);
      setReport(data);
    } catch (error) {
      setMessage(error.message);
      showAlert(error.message, "error");
    }
  }

  useEffect(() => {
    if (showExtraTools) {
      loadReport(reportDate);
    }
  }, [reportDate, showExtraTools]);

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
              <p className="text-sm text-cyan-300">LatYar Ledger & KPay Automation</p>
              <h1 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">
                KPay ဝင်ငွေစစ်ဆေးရေး Dashboard
              </h1>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-md border border-slate-800 px-4 py-3">
                <p className="text-slate-400">Pending KPay</p>
                <p className="mt-1 text-lg font-semibold text-amber-300">{pendingKpay.length}</p>
              </div>
              <div className="rounded-md border border-slate-800 px-4 py-3">
                <p className="text-slate-400">Pending Total</p>
                <p className="mt-1 text-lg font-semibold text-cyan-300">
                  {formatMoney(totalPending)}
                </p>
              </div>
              <div className="rounded-md border border-slate-800 px-4 py-3">
                <p className="text-slate-400">Status</p>
                <p className="mt-1 text-lg font-semibold text-emerald-300">
                  {loading ? "Loading" : "Online"}
                </p>
              </div>
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Unverified KPay Bucket</h2>
              <p className="text-sm text-slate-400">
                MacroDroid webhook မှဝင်လာပြီး customer နဲ့ မတွဲရသေးသောငွေများ
              </p>
            </div>
            <button
              className="min-h-11 rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-cyan-500 hover:text-cyan-200 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => loadDashboard()}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {pendingKpay.length ? (
              pendingKpay.map((item) => (
                <article
                  key={item.id}
                  className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xl font-semibold text-amber-200">
                        {formatMoney(item.amount)}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">{formatDate(item.createdAt)}</p>
                    </div>
                    <span className="rounded-full bg-amber-400/10 px-2 py-1 text-xs text-amber-200">
                      PENDING
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm text-slate-300">
                    {item.raw_text}
                  </p>
                  {item.suggestedCustomer ? (
                    <p className="mt-3 rounded-md border border-cyan-500/30 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100">
                      {item.suggestedCustomer.name} နှင့် တွဲရန် အကြံပြုထားပါသည်
                    </p>
                  ) : null}
                  <button
                    className="mt-3 w-full rounded-md border border-cyan-500/50 bg-cyan-400/10 px-3 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-400/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setMatchingKpay(item)}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Processing..." : "Match"}
                  </button>
                </article>
              ))
            ) : (
              <p className="rounded-lg border border-slate-800 p-4 text-sm text-slate-400">
                Pending KPay မရှိပါ။
              </p>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-slate-800 bg-slate-950 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {customers.length ? (
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
            )}
          </div>

          <div className="mt-6 rounded-lg border border-slate-800 bg-slate-950 p-4 sm:p-5">
            {selectedCustomer ? (
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
                  className="mt-6 grid gap-3 rounded-lg border border-slate-800 p-3 sm:p-4 md:grid-cols-[160px_1fr_1fr_auto]"
                  onSubmit={createLedgerTransaction}
                >
                  <select
                    className="min-h-12 rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-base outline-none focus:border-cyan-400 md:text-sm disabled:opacity-50"
                    value={ledgerForm.type}
                    onChange={(event) => setLedgerForm({ ...ledgerForm, type: event.target.value })}
                    disabled={isSubmitting}
                  >
                    <option value="CREDIT">အကြွေးတိုး</option>
                    <option value="DEBIT">ငွေချေ</option>
                  </select>
                  <input
                    className="min-h-12 rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-base outline-none focus:border-cyan-400 md:text-sm disabled:opacity-50"
                    inputMode="numeric"
                    placeholder="ငွေပမာဏ"
                    value={ledgerForm.amount}
                    onChange={(event) => setLedgerForm({ ...ledgerForm, amount: event.target.value })}
                    disabled={isSubmitting}
                  />
                  <input
                    className="min-h-12 rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-base outline-none focus:border-cyan-400 md:text-sm disabled:opacity-50"
                    placeholder="မှတ်ချက်"
                    value={ledgerForm.note}
                    onChange={(event) => setLedgerForm({ ...ledgerForm, note: event.target.value })}
                    disabled={isSubmitting}
                  />
                  <button 
                    className="min-h-12 rounded-md bg-cyan-400 px-4 py-3 text-base font-semibold text-slate-950 hover:bg-cyan-300 md:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : "Save"}
                  </button>
                </form>

                <div className="mt-6 overflow-x-auto rounded-lg border border-slate-800">
                  <table className="w-full min-w-[620px] border-collapse text-sm">
                    <thead className="bg-slate-900 text-left text-slate-300">
                      <tr>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Type</th>
                        <th className="px-4 py-3 text-right font-medium">Amount</th>
                        <th className="px-4 py-3 font-medium">Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {(selectedCustomer.ledgers || []).map((transaction) => (
                        <tr key={transaction.id} className="bg-slate-950">
                          <td className="px-4 py-3 text-slate-300">{formatDate(transaction.date)}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2 py-1 text-xs ${
                                transaction.type === "CREDIT"
                                  ? "bg-emerald-400/10 text-emerald-200"
                                  : "bg-rose-400/10 text-rose-200"
                              }`}
                            >
                              {transaction.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-white">
                            {formatMoney(transaction.amount)}
                          </td>
                          <td className="px-4 py-3 text-slate-400">{transaction.note || "-"}</td>
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
            )}
          </div>
        </section>

        <section className="rounded-lg border border-slate-800 bg-slate-950 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Tools & Reports</h2>
            <button
              className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:border-cyan-500 hover:bg-cyan-950/30"
              onClick={() => setShowExtraTools(!showExtraTools)}
            >
              {showExtraTools ? "Hide Extra Tools" : "Show Extra Tools"}
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {[
              ["kpay", "KPay Auto-Suggestion"],
              ...(showExtraTools ? [
                ["sales", "လက်လီ/လက်ကား အဝင်ဖောင်"],
                ["reports", "စက်ရုံချုပ် စာရင်းချုပ်"]
              ] : [])
            ].map(([id, label]) => (
              <button
                key={id}
                className={`min-h-12 rounded-md border px-3 py-2 text-sm font-medium transition ${
                  activeTab === id
                    ? "border-cyan-400 bg-cyan-400/10 text-cyan-100"
                    : "border-slate-800 bg-slate-900/50 text-slate-300 hover:border-slate-600"
                }`}
                onClick={() => {
                  setActiveTab(id);
                  if (id === "reports" && !report) loadReport(reportDate);
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === "sales" ? (
            <form className="mt-4 grid gap-3 lg:grid-cols-4" onSubmit={createSalesLedger}>
              <select
                className="min-h-12 rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-base outline-none focus:border-cyan-400 disabled:opacity-50"
                value={ledgerForm.saleType}
                onChange={(event) => setLedgerForm({ ...ledgerForm, saleType: event.target.value })}
                disabled={isSubmitting}
              >
                <option value="RETAIL">လက်လီ</option>
                <option value="WHOLESALE">လက်ကား</option>
              </select>
              <select
                className="min-h-12 rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-base outline-none focus:border-cyan-400 disabled:opacity-50"
                value={ledgerForm.itemSize}
                onChange={(event) => setLedgerForm({ ...ledgerForm, itemSize: event.target.value })}
                disabled={isSubmitting}
              >
                <option value="">ပစ္စည်း Size</option>
                <option value=".5">.5</option>
                <option value=".85">.85</option>
                <option value="1L">1L</option>
                <option value="20L">20L</option>
              </select>
              <input
                className="min-h-12 rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-base outline-none focus:border-cyan-400 disabled:opacity-50"
                placeholder="ကတ် အရေအတွက်"
                inputMode="numeric"
                value={ledgerForm.cartons}
                onChange={(event) => setLedgerForm({ ...ledgerForm, cartons: event.target.value })}
                disabled={isSubmitting}
              />
              <input
                className="min-h-12 rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-base outline-none focus:border-cyan-400 disabled:opacity-50"
                placeholder="တစ်ကတ်နှုန်း"
                inputMode="numeric"
                value={ledgerForm.rate}
                onChange={(event) => setLedgerForm({ ...ledgerForm, rate: event.target.value })}
                disabled={isSubmitting}
              />
              <input
                className="min-h-12 rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-base outline-none focus:border-cyan-400 disabled:opacity-50"
                placeholder="Tube/ကား/အိတ် စရိတ်"
                inputMode="numeric"
                value={ledgerForm.deductions}
                onChange={(event) => setLedgerForm({ ...ledgerForm, deductions: event.target.value })}
                disabled={isSubmitting}
              />
              <input
                className="min-h-12 rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-base outline-none focus:border-cyan-400 disabled:opacity-50"
                placeholder="မှတ်ချက်"
                value={ledgerForm.note}
                onChange={(event) => setLedgerForm({ ...ledgerForm, note: event.target.value })}
                disabled={isSubmitting}
              />
              <div className="rounded-md border border-slate-800 px-4 py-3">
                <p className="text-xs text-slate-400">အသားတင် အကြွေးတိုး</p>
                <p className="mt-1 text-lg font-semibold text-cyan-200">{formatMoney(computedSaleAmount)}</p>
              </div>
              <button 
                className="min-h-12 rounded-md bg-cyan-400 px-5 py-3 text-base font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save Sale"}
              </button>
            </form>
          ) : null}

          {activeTab === "kpay" ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {pendingKpay.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{formatMoney(item.amount)}</p>
                      <p className="mt-1 text-sm text-slate-400">{item.kpayName || "Unknown KPay name"}</p>
                    </div>
                    <span className="rounded-md bg-amber-400/10 px-2 py-1 text-xs text-amber-200">PENDING</span>
                  </div>
                  {item.suggestedCustomer ? (
                    <p className="mt-3 rounded-md border border-cyan-500/30 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100">
                      {item.suggestedCustomer.name} နှင့် တွဲရန် အကြံပြုထားပါသည်
                    </p>
                  ) : null}
                  <button
                    className="mt-3 w-full rounded-md border border-cyan-500/50 bg-cyan-400/10 px-3 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-400/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setMatchingKpay(item)}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Processing..." : "Match"}
                  </button>
                </div>
              ))}
              {!pendingKpay.length ? (
                <p className="rounded-lg border border-slate-800 p-4 text-sm text-slate-400">Pending KPay မရှိပါ။</p>
              ) : null}
            </div>
          ) : null}

          {activeTab === "reports" ? (
            <div className="mt-4">
              <div className="mb-4 flex items-end gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300">Report Date</label>
                  <input
                    type="date"
                    className="mt-1 min-h-11 rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-white outline-none focus:border-cyan-400"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                  />
                </div>
              </div>

              {report ? (
                <div className="rounded-lg border border-slate-800 p-4">
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                    <div className="rounded-md border border-slate-700 p-3">
                      <p className="text-xs text-slate-400">Total Credit</p>
                      <p className="mt-1 text-lg font-semibold text-emerald-200">
                        {formatMoney(report.totalCredit || 0)}
                      </p>
                    </div>
                    <div className="rounded-md border border-slate-700 p-3">
                      <p className="text-xs text-slate-400">Total Debit</p>
                      <p className="mt-1 text-lg font-semibold text-rose-200">
                        {formatMoney(report.totalDebit || 0)}
                      </p>
                    </div>
                    <div className="rounded-md border border-slate-700 p-3">
                      <p className="text-xs text-slate-400">Net Balance</p>
                      <p className="mt-1 text-lg font-semibold text-cyan-200">
                        {formatMoney((report.totalCredit || 0) - (report.totalDebit || 0))}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="rounded-lg border border-slate-800 p-4 text-sm text-slate-400">
                  Loading report...
                </p>
              )}
            </div>
          ) : null}
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
                သည် "{deletingCustomer.name}" ကို ဖျက်မည် သည်။ ဒီလုပ်ဆောင်ချက်ကို ပြန်လည်ပြင်ဆင်၍ မရပါ။
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
