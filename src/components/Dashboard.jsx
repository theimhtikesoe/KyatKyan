"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
// import KPISummaryDashboard from "./KPISummaryDashboard";
import TransactionFilter from "./TransactionFilter";


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
  const [deletedCustomers, setDeletedCustomers] = useState([]);
  const [showRecycleBin, setShowRecycleBin] = useState(false);
  const [pendingKpay, setPendingKpay] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [search, setSearch] = useState("");
  const [matchingKpay, setMatchingKpay] = useState(null);
  const [matchCustomerId, setMatchCustomerId] = useState("");
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deletingCustomer, setDeletingCustomer] = useState(null);
  const [permanentDeletingCustomer, setPermanentDeletingCustomer] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", routeTag: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
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
    date: "",
    paymentType: "",
  });
  const [showAddCustomer, setShowAddCustomer] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingDeleted, setLoadingDeleted] = useState(false);
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [message, setMessage] = useState("");
  const [alert, setAlert] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filteredLedgers, setFilteredLedgers] = useState([]);


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

  const loadDeletedCustomers = useCallback(async () => {
    setLoadingDeleted(true);
    try {
      const deletedRows = await api("/api/customers?deleted=true");
      setDeletedCustomers(deletedRows);
    } catch (error) {
      showAlert(error.message, "error");
    } finally {
      setLoadingDeleted(false);
    }
  }, [showAlert]);

  useEffect(() => {
    if (showRecycleBin) {
      loadDeletedCustomers();
    }
  }, [showRecycleBin, loadDeletedCustomers]);

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

  // Pagination logic
  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return customers.slice(startIndex, endIndex);
  }, [customers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(customers.length / itemsPerPage);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

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
          paymentType: ledgerForm.paymentType || null,
          date: ledgerForm.date || null,
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
        date: "",
        paymentType: "",
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
          date: ledgerForm.date || null,
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
        date: "",
        paymentType: "",
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
      showAlert(`Customer "${customerName}" ကို အမှိုက်ပုံးထဲသို့ ရွှေ့လိုက်ပါပြီ။`, "success");
      if (showRecycleBin) loadDeletedCustomers();
    } catch (error) {
      setMessage(error.message);
      showAlert(error.message, "error");
      // Revert optimistic update on error
      await loadDashboard();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function restoreCustomer(customer) {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await api(`/api/customers/${customer.id}`, {
        method: "PATCH",
        body: JSON.stringify({ restore: true }),
      });
      
      setDeletedCustomers(prev => prev.filter(c => c.id !== customer.id));
      setCustomers(prev => [customer, ...prev]);
      showAlert(`Customer "${customer.name}" ကို ပြန်လည်ဆယ်ယူပြီးပါပြီ။`, "success");
    } catch (error) {
      showAlert(error.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function permanentDeleteCustomer() {
    if (!permanentDeletingCustomer || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await api(`/api/customers/${permanentDeletingCustomer.id}?permanent=true`, {
        method: "DELETE",
      });
      
      setDeletedCustomers(prev => prev.filter(c => c.id !== permanentDeletingCustomer.id));
      setPermanentDeletingCustomer(null);
      showAlert(`Customer "${permanentDeletingCustomer.name}" ကို အပြီးတိုင်ဖျက်လိုက်ပါပြီ။`, "success");
    } catch (error) {
      showAlert(error.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Export transaction data to CSV
  const exportToCSV = () => {
    const transactionsToExport = filteredLedgers.length > 0 ? filteredLedgers : (selectedCustomer?.ledgers || []);
    
    if (!selectedCustomer || transactionsToExport.length === 0) {
      showAlert("ထုတ်ယူရန် transaction မရှိပါ။", "error");
      return;
    }

    const headers = ["Date", "Type", "Amount", "Payment Type", "Note"];
    const rows = transactionsToExport.map(transaction => [
      formatDate(transaction.date),
      transaction.type === "CREDIT" ? "အကြွေးတိုး (Unpaid)" : "ငွေချေ (Paid)",
      transaction.amount,
      transaction.paymentType || "-",
      transaction.note || "-",
    ]);

    // Create CSV content
    const csvContent = [
      `"Customer: ${selectedCustomer.name}",,,,`,
      `"Phone: ${selectedCustomer.phone || "-"}",,,,`,
      `"Route Tag: ${selectedCustomer.routeTag || "-"}",,,,`,
      `"Current Balance: ${formatMoney(selectedCustomer.current_balance)}",,,,`,
      `"Export Date: ${new Date().toLocaleString('en-GB')}",,,,`,
      ",,,,",
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `${selectedCustomer.name}_transactions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showAlert(`"${selectedCustomer.name}" ရဲ့ transaction တွေ အောင်မြင်စွာ ထုတ်ယူပြီးပါပြီ။`, "success");
  };

  const computedSaleAmount = useMemo(() => {
    if (ledgerForm.type !== "CREDIT" || ledgerForm.saleType !== "RETAIL") return null;
    const cartons = Number(ledgerForm.cartons || 0);
    const rate = Number(ledgerForm.rate || 0);
    const deductions = Number(ledgerForm.deductions || 0);
    if (!cartons || !rate) return null;
    return cartons * rate - deductions;
  }, [ledgerForm.cartons, ledgerForm.rate, ledgerForm.deductions, ledgerForm.type, ledgerForm.saleType]);

  // Handle filter changes from TransactionFilter component
  const handleFilterChange = useCallback((filtered) => {
    setFilteredLedgers(filtered);
  }, []);

  // Reset filtered ledgers when selected customer changes
  useEffect(() => {
    setFilteredLedgers(selectedCustomer?.ledgers || []);
  }, [selectedCustomer]);

  return (
    <main className="min-h-screen bg-slate-950">
      {alert && (
        <AlertNotification message={alert.message} type={alert.type} onClose={hideAlert} />
      )}

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-3 py-3 sm:gap-6 sm:px-6 sm:py-6 lg:px-8">
        <header className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-cyan-300">LatYar Ledger Dashboard</p>
              <h1 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">
                Customer ငွေရှင်းတမ်း/အကြွေးရှင်းတမ်း
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowRecycleBin(true)}
                className="flex items-center gap-2 rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-900 transition-colors"
              >
                🗑️ Recycle Bin
              </button>
            </div>
          </div>
          {message ? (
            <p className="mt-4 rounded-md border border-rose-900 bg-rose-950/60 px-3 py-2 text-sm text-rose-200">
              {message}
            </p>
          ) : null}
        </header>

        {/* <KPISummaryDashboard /> */}

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
              className="w-full h-12 rounded-xl border border-slate-800 bg-slate-900 px-4 text-sm text-white outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all shadow-inner"
              placeholder="Customer ရှာဖွေရန် (အမည် သို့မဟုတ် ဖုန်းနံပါတ်)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-h-[600px] overflow-y-auto pr-2">
            {loading ? (
              <div className="col-span-full rounded-lg border border-slate-800 p-4 text-center text-slate-400">
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-cyan-400"></div>
                  <span>Customer များ ရှာဖွေနေသည်...</span>
                </div>
              </div>
            ) : customers.length ? (
              paginatedCustomers.map((customer) => (
                <div
                  key={`customer-${customer.id}`}
                  className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 shadow-sm ${
                    selectedCustomerId === customer.id
                      ? "border-cyan-500 bg-cyan-500/5 ring-1 ring-cyan-500/20"
                      : "border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60"
                  }`}
                  onClick={() => setSelectedCustomerId(customer.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-white text-sm hover:text-cyan-400 transition-colors">{customer.name}</h3>
                      <p className="text-[11px] text-slate-500">
                        {[customer.phone, customer.routeTag].filter(Boolean).join(" / ") || "No contact"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2.5 pt-2.5 border-t border-slate-800/50 flex items-center justify-between">
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

          {customers.length > 0 && totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between gap-2">
              <div className="text-sm text-slate-400">
                <span className="font-medium text-slate-300">{customers.length}</span> customers - Page <span className="font-medium text-slate-300">{currentPage}</span> of <span className="font-medium text-slate-300">{totalPages}</span>
              </div>
              <div className="flex gap-2">
                <button
                  className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-cyan-400 hover:text-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      className={`min-w-10 rounded-md px-2 py-2 text-sm font-medium ${
                        currentPage === page
                          ? "bg-cyan-400 text-slate-950"
                          : "border border-slate-700 text-slate-300 hover:border-cyan-400 hover:text-cyan-300"
                      }`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-cyan-400 hover:text-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 rounded-lg border border-slate-800 bg-slate-950 p-4 sm:p-5 min-h-[500px]">
            {loadingCustomer ? (
              <div className="flex min-h-[460px] items-center justify-center rounded-lg border border-dashed border-slate-700">
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
                        className="min-h-11 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                        onClick={exportToCSV}
                      >
                        Export to CSV
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-400">လက်ကျန်အကြွေး</p>
                    <p
                      className={`text-2xl font-bold sm:text-3xl ${
                        selectedCustomer.current_balance > 0 ? "text-rose-400" : "text-emerald-400"
                      }`}
                    >
                      {formatMoney(selectedCustomer.current_balance)}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-6 grid-cols-1 xl:grid-cols-2 items-start">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-6 shadow-sm h-full min-h-[400px]">
                    <h3 className="text-lg font-semibold text-white">စာရင်းအသစ်သွင်းရန်</h3>
                    <form className="mt-4 space-y-4" onSubmit={createLedgerTransaction}>
                      <div className="flex p-1 bg-slate-900/80 rounded-xl border border-slate-800 mb-4 shadow-inner">
                        <button
                          type="button"
                          className={`flex-1 py-2.5 text-sm font-semibold rounded-md transition-all ${
                            ledgerForm.type === "CREDIT"
                              ? "bg-rose-600 text-white shadow-lg"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                          onClick={() => setLedgerForm({ ...ledgerForm, type: "CREDIT" })}
                          disabled={isSubmitting}
                        >
                          အကြွေးတိုး (Unpaid)
                        </button>
                        <button
                          type="button"
                          className={`flex-1 py-2.5 text-sm font-semibold rounded-md transition-all ${
                            ledgerForm.type === "DEBIT"
                              ? "bg-emerald-600 text-white shadow-lg"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                          onClick={() => setLedgerForm({ ...ledgerForm, type: "DEBIT" })}
                          disabled={isSubmitting}
                        >
                          ငွေချေ (Paid)
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] uppercase tracking-wider font-bold text-slate-500 ml-1">ရက်စွဲ</label>
                          <div className="relative">
                            <input
                              type="date"
                              className="w-full h-12 rounded-lg border border-slate-700 bg-slate-900/50 px-4 text-sm text-white outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all appearance-none"
                              style={{ colorScheme: 'dark' }}
                              value={ledgerForm.date}
                              onChange={(e) => setLedgerForm({ ...ledgerForm, date: e.target.value })}
                              disabled={isSubmitting}
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] uppercase tracking-wider font-bold text-slate-500 ml-1">ပမာဏ (Ks)</label>
                          <input
                            type="number"
                            className="w-full h-12 rounded-lg border border-slate-700 bg-slate-900/50 px-4 text-sm text-white outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                            placeholder="0"
                            value={ledgerForm.amount}
                            onChange={(e) => setLedgerForm({ ...ledgerForm, amount: e.target.value })}
                            required
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>

                      {ledgerForm.type === "DEBIT" && (
                        <div className="space-y-1">
                          <label className="text-xs text-slate-400">ငွေပေးချေမှုပုံစံ</label>
                          <select
                            className="w-full h-12 rounded-lg border border-slate-700 bg-slate-900/50 px-4 text-sm text-white outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                            value={ledgerForm.paymentType}
                            onChange={(e) => setLedgerForm({ ...ledgerForm, paymentType: e.target.value })}
                            disabled={isSubmitting}
                          >
                            <option value="">Select Payment Type</option>
                            <option value="CASH">Cash</option>
                            <option value="KPAY">KPay</option>
                            <option value="BANK">Bank Transfer</option>
                            <option value="WAVE">Wave Money</option>
                          </select>
                        </div>
                      )}

                      <textarea
                        className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                        placeholder="မှတ်စု (Note)"
                        rows="2"
                        value={ledgerForm.note}
                        onChange={(e) => setLedgerForm({ ...ledgerForm, note: e.target.value })}
                        disabled={isSubmitting}
                      ></textarea>

                      <button 
                        className="w-full min-h-12 rounded-md bg-cyan-400 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Saving..." : "Save Transaction"}
                      </button>
                    </form>
                  </div>
                </div>

                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">စာရင်းမှတ်တမ်း (Transactions)</h3>
                  </div>
                  
                  <TransactionFilter 
                    transactions={selectedCustomer.ledgers || []} 
                    onFilterChange={handleFilterChange}
                  />

                  <div className="mt-4 overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="bg-slate-900 text-xs uppercase text-slate-400">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                          <th className="px-4 py-3">Payment</th>
                          <th className="px-4 py-3">Note</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 bg-slate-950">
                        {filteredLedgers.length ? (
                          filteredLedgers.map((ledger) => (
                            <tr key={ledger.id} className="hover:bg-slate-900/50">
                              <td className="whitespace-nowrap px-4 py-3 text-xs">
                                {formatDate(ledger.date)}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                    ledger.type === "CREDIT"
                                      ? "bg-rose-500/10 text-rose-400"
                                      : "bg-emerald-500/10 text-emerald-400"
                                  }`}
                                >
                                  {ledger.type === "CREDIT" ? "အကြွေးတိုး" : "ငွေချေ"}
                                </span>
                              </td>
                              <td
                                className={`px-4 py-3 text-right font-medium ${
                                  ledger.type === "CREDIT" ? "text-rose-200" : "text-emerald-200"
                                }`}
                              >
                                {formatMoney(ledger.amount)}
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-400">
                                {ledger.paymentType || "-"}
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-400 max-w-[200px] truncate">
                                {ledger.note || "-"}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                              Transaction မရှိသေးပါ။
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex min-h-[420px] items-center justify-center rounded-lg border border-dashed border-slate-800 bg-slate-950/50">
                <div className="text-center">
                  <p className="text-lg font-medium text-slate-500">Customer တစ်ယောက်ကို ရွေးချယ်ပါ</p>
                  <p className="mt-1 text-sm text-slate-600">အချက်အလက်များ ကြည့်ရှုရန်နှင့် စာရင်းသွင်းရန်</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Recycle Bin Modal */}
      {showRecycleBin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:p-5">
              <h3 className="text-xl font-semibold text-white">🗑️ Recycle Bin (ဖျက်ထားသော Customer များ)</h3>
              <button
                onClick={() => setShowRecycleBin(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-900 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {loadingDeleted ? (
                <div className="flex justify-center py-10">
                  <div className="h-8 w-8 animate-spin rounded-full border-3 border-slate-600 border-t-cyan-400"></div>
                </div>
              ) : deletedCustomers.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {deletedCustomers.map((customer) => (
                    <div key={customer.id} className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-white">{customer.name}</h4>
                          <p className="text-xs text-slate-400">{customer.phone || "No phone"}</p>
                          <p className="mt-2 text-xs text-rose-300">
                            Deleted on: {formatDate(customer.deletedAt)}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => restoreCustomer(customer)}
                            className="rounded-md bg-emerald-600/20 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-600/30"
                            disabled={isSubmitting}
                          >
                            Restore
                          </button>
                          <button
                            onClick={() => setPermanentDeletingCustomer(customer)}
                            className="rounded-md bg-rose-600/20 px-3 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-600/30"
                            disabled={isSubmitting}
                          >
                            Delete Forever
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center text-slate-500">
                  အမှိုက်ပုံးထဲတွင် ဘာမှမရှိပါ။
                </div>
              )}
            </div>
            <div className="border-t border-slate-800 p-4 text-right">
              <button
                onClick={() => setShowRecycleBin(false)}
                className="rounded-md bg-slate-800 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-white">Edit Customer</h3>
            <form className="mt-6 space-y-4" onSubmit={updateCustomer}>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Customer Name</label>
                <input
                  className="w-full h-12 rounded-xl border border-slate-800 bg-slate-900 px-4 text-sm text-white outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all shadow-inner"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Phone Number</label>
                <input
                  className="w-full h-12 rounded-xl border border-slate-800 bg-slate-900 px-4 text-sm text-white outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all shadow-inner"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Route / Tag</label>
                <input
                  className="w-full h-12 rounded-xl border border-slate-800 bg-slate-900 px-4 text-sm text-white outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all shadow-inner"
                  value={editForm.routeTag}
                  onChange={(e) => setEditForm({ ...editForm, routeTag: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  className="flex-1 rounded-md bg-slate-800 py-3 text-sm font-semibold text-white hover:bg-slate-700"
                  onClick={() => setEditingCustomer(null)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  className="flex-1 rounded-md bg-cyan-400 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Updating..." : "Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Soft Delete Confirmation Modal */}
      {deletingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
              🗑️
            </div>
            <h3 className="mt-4 text-xl font-semibold text-white">Delete Customer?</h3>
            <p className="mt-2 text-slate-400">
              &quot;{deletingCustomer.name}&quot; ကို ဖျက်ရန် သေချာပါသလား? ဖျက်လိုက်သော Customer များကို Recycle Bin ထဲတွင် ပြန်လည်ရှာဖွေနိုင်ပါသည်။
            </p>
            <div className="mt-6 flex gap-3">
              <button
                className="flex-1 rounded-md bg-slate-800 py-3 text-sm font-semibold text-white hover:bg-slate-700"
                onClick={() => setDeletingCustomer(null)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                className="flex-1 rounded-md bg-rose-600 py-3 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                onClick={deleteCustomer}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Deleting..." : "Move to Bin"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Modal */}
      {permanentDeletingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-rose-900/50 bg-slate-950 p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/20 text-rose-500">
              ⚠️
            </div>
            <h3 className="mt-4 text-xl font-semibold text-white">Permanent Delete?</h3>
            <p className="mt-2 text-slate-400">
              &quot;{permanentDeletingCustomer.name}&quot; ကို အပြီးတိုင်ဖျက်ရန် သေချာပါသလား? ဤလုပ်ဆောင်ချက်ကို ပြန်ပြင်၍မရပါ။ စာရင်းဇယားများအားလုံး ပျက်သွားပါလိမ့်မည်။
            </p>
            <div className="mt-6 flex gap-3">
              <button
                className="flex-1 rounded-md bg-slate-800 py-3 text-sm font-semibold text-white hover:bg-slate-700"
                onClick={() => setPermanentDeletingCustomer(null)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                className="flex-1 rounded-md bg-rose-600 py-3 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                onClick={permanentDeleteCustomer}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Deleting..." : "Delete Forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
