"use client";

import { useEffect, useMemo, useState } from "react";

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
  const [editForm, setEditForm] = useState({ name: "", phone: "" });
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", current_balance: "" });
  const [ledgerForm, setLedgerForm] = useState({ type: "DEBIT", amount: "", note: "" });
  const [showAddCustomer, setShowAddCustomer] = useState(true);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadDashboard() {
    setLoading(true);
    const [customerRows, kpayRows] = await Promise.all([
      api(`/api/customers${search ? `?q=${encodeURIComponent(search)}` : ""}`),
      api("/api/unverified-kpay?status=PENDING"),
    ]);
    setCustomers(customerRows);
    setPendingKpay(kpayRows);
    setLoading(false);
  }

  async function loadCustomer(id = selectedCustomerId) {
    if (!id) {
      setSelectedCustomer(null);
      return;
    }

    const customer = await api(`/api/customers/${id}`);
    setSelectedCustomer(customer);
    setSelectedCustomerId(customer.id);
  }

  useEffect(() => {
    loadDashboard().catch((error) => setMessage(error.message));
  }, [search]);

  useEffect(() => {
    loadCustomer().catch((error) => setMessage(error.message));
  }, [selectedCustomerId]);

  const totalPending = useMemo(
    () => pendingKpay.reduce((sum, item) => sum + item.amount, 0),
    [pendingKpay],
  );

  async function createCustomer(event) {
    event.preventDefault();
    try {
      setMessage("");
      const customer = await api("/api/customers", {
        method: "POST",
        body: JSON.stringify({
          ...newCustomer,
          current_balance: Number(newCustomer.current_balance || 0),
        }),
      });
      setNewCustomer({ name: "", phone: "", current_balance: "" });
      setSelectedCustomerId(customer.id);
      setShowAddCustomer(false);
      await loadDashboard();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function createLedgerTransaction(event) {
    event.preventDefault();
    if (!selectedCustomerId) return;

    try {
      setMessage("");
      await api(`/api/customers/${selectedCustomerId}/transactions`, {
        method: "POST",
        body: JSON.stringify({
          type: ledgerForm.type,
          amount: Number(ledgerForm.amount),
          note: ledgerForm.note,
        }),
      });
      setLedgerForm({ type: "DEBIT", amount: "", note: "" });
      await Promise.all([loadDashboard(), loadCustomer(selectedCustomerId)]);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function matchKpay(event) {
    event.preventDefault();
    if (!matchingKpay || !matchCustomerId) return;

    try {
      setMessage("");
      await api("/api/kpay-match", {
        method: "POST",
        body: JSON.stringify({
          unverifiedKpayId: matchingKpay.id,
          customerId: Number(matchCustomerId),
        }),
      });
      const customerId = Number(matchCustomerId);
      setMatchingKpay(null);
      setMatchCustomerId("");
      setSelectedCustomerId(customerId);
      await Promise.all([loadDashboard(), loadCustomer(customerId)]);
    } catch (error) {
      setMessage(error.message);
    }
  }

  function openEditCustomer(customer) {
    setEditingCustomer(customer);
    setEditForm({
      name: customer.name || "",
      phone: customer.phone || "",
    });
  }

  async function updateCustomer(event) {
    event.preventDefault();
    if (!editingCustomer) return;

    try {
      setMessage("");
      const customer = await api(`/api/customers/${editingCustomer.id}`, {
        method: "PATCH",
        body: JSON.stringify(editForm),
      });
      setEditingCustomer(null);
      setEditForm({ name: "", phone: "" });
      await loadDashboard();
      if (selectedCustomerId === customer.id) {
        await loadCustomer(customer.id);
      }
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function deleteCustomer() {
    if (!deletingCustomer) return;

    try {
      setMessage("");
      await api(`/api/customers/${deletingCustomer.id}`, {
        method: "DELETE",
      });
      if (selectedCustomerId === deletingCustomer.id) {
        setSelectedCustomerId(null);
        setSelectedCustomer(null);
      }
      setDeletingCustomer(null);
      await loadDashboard();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <main className="min-h-screen bg-[#080a0f] text-slate-100">
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
            <form className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4" onSubmit={createCustomer}>
              <input
                className="min-h-12 rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-base text-white outline-none focus:border-cyan-400"
                placeholder="အမည်"
                value={newCustomer.name}
                onChange={(event) => setNewCustomer({ ...newCustomer, name: event.target.value })}
                required
              />
              <input
                className="min-h-12 rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-base text-white outline-none focus:border-cyan-400"
                inputMode="tel"
                placeholder="ဖုန်းနံပါတ်"
                value={newCustomer.phone}
                onChange={(event) => setNewCustomer({ ...newCustomer, phone: event.target.value })}
              />
              <input
                className="min-h-12 rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-base text-white outline-none focus:border-cyan-400"
                inputMode="numeric"
                placeholder="အစ လက်ကျန်အကြွေး"
                value={newCustomer.current_balance}
                onChange={(event) =>
                  setNewCustomer({ ...newCustomer, current_balance: event.target.value })
                }
              />
              <button className="min-h-12 rounded-md bg-cyan-400 px-5 py-3 text-base font-semibold text-slate-950 hover:bg-cyan-300">
                Add
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
              className="min-h-11 rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-cyan-500 hover:text-cyan-200"
              onClick={() => loadDashboard().catch((error) => setMessage(error.message))}
            >
              Refresh
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
                  <button
                    className="mt-4 w-full rounded-md bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
                    onClick={() => {
                      setMatchingKpay(item);
                      setMatchCustomerId(selectedCustomerId || "");
                    }}
                  >
                    လူနာမည်နှင့် တွဲမည်
                  </button>
                </article>
              ))
            ) : (
              <p className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">
                Pending KPay မရှိသေးပါ။
              </p>
            )}
          </div>
        </section>

        <section className="grid gap-6">
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 sm:p-5">
            <div>
              <h2 className="text-lg font-semibold text-white">Customer List</h2>
              <p className="mt-1 text-sm text-slate-400">
                အကြွေးကျန်ရှိသူများကို ဘယ်ဘက်အနီလိုင်းဖြင့်ပြသထားသည်
              </p>
            </div>
            <input
              className="mt-4 min-h-12 w-full rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-base text-white outline-none focus:border-cyan-400"
              placeholder="အမည် သို့မဟုတ် ဖုန်းနံပါတ် ရှာရန်"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <div className="mt-4 grid max-h-[58vh] grid-cols-1 gap-3 overflow-auto pr-1 sm:max-h-[520px] sm:grid-cols-2 md:grid-cols-3">
              {customers.map((customer) => {
                const active = selectedCustomerId === customer.id;
                const hasDebt = customer.current_balance > 0;
                return (
                  <div
                    key={customer.id}
                    className={`group rounded-lg border border-l-4 p-3 text-left transition ${
                      active
                        ? "border-cyan-400 bg-cyan-400/10"
                        : "border-slate-800 bg-slate-900/40 hover:border-slate-600"
                    } ${hasDebt ? "border-l-rose-500" : "border-l-emerald-500"}`}
                  >
                    <button
                      className="w-full text-left"
                      onClick={() => setSelectedCustomerId(customer.id)}
                    >
                      <div className="flex min-h-14 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{customer.name}</p>
                          <p className="mt-1 truncate text-xs text-slate-400">
                            {customer.phone || "No phone"}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p
                            className={`text-sm font-semibold ${
                              hasDebt ? "text-rose-200" : "text-emerald-200"
                            }`}
                          >
                            {formatMoney(customer.current_balance)}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500">Balance</p>
                        </div>
                      </div>
                    </button>
                    <div className="mt-2 flex justify-end gap-1 border-t border-slate-800 pt-2 opacity-100 transition sm:opacity-60 sm:group-hover:opacity-100">
                      <button
                        className="rounded-md px-2 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-cyan-200"
                        onClick={() => openEditCustomer(customer)}
                        aria-label={`Edit ${customer.name}`}
                      >
                        Edit
                      </button>
                      <button
                        className="rounded-md px-2 py-1 text-xs font-medium text-rose-300 hover:bg-rose-950/60 hover:text-rose-100"
                        onClick={() => setDeletingCustomer(customer)}
                        aria-label={`Delete ${customer.name}`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 sm:p-5">
            {selectedCustomer ? (
              <>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-white">{selectedCustomer.name}</h2>
                    <p className="mt-1 text-sm text-slate-400">{selectedCustomer.phone || "No phone"}</p>
                    <div className="mt-3 flex gap-2">
                      <button
                        className="min-h-11 rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:border-cyan-400 hover:text-cyan-200"
                        onClick={() => openEditCustomer(selectedCustomer)}
                      >
                        Edit
                      </button>
                      <button
                        className="min-h-11 rounded-md border border-rose-900/70 px-4 py-2 text-sm font-medium text-rose-200 hover:border-rose-400 hover:text-rose-100"
                        onClick={() => setDeletingCustomer(selectedCustomer)}
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
                    className="min-h-12 rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-base outline-none focus:border-cyan-400 md:text-sm"
                    value={ledgerForm.type}
                    onChange={(event) => setLedgerForm({ ...ledgerForm, type: event.target.value })}
                  >
                    <option value="DEBIT">အကြွေးတိုး</option>
                    <option value="CREDIT">ငွေချေ</option>
                  </select>
                  <input
                    className="min-h-12 rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-base outline-none focus:border-cyan-400 md:text-sm"
                    inputMode="numeric"
                    placeholder="ငွေပမာဏ"
                    value={ledgerForm.amount}
                    onChange={(event) => setLedgerForm({ ...ledgerForm, amount: event.target.value })}
                  />
                  <input
                    className="min-h-12 rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-base outline-none focus:border-cyan-400 md:text-sm"
                    placeholder="မှတ်ချက်"
                    value={ledgerForm.note}
                    onChange={(event) => setLedgerForm({ ...ledgerForm, note: event.target.value })}
                  />
                  <button className="min-h-12 rounded-md bg-cyan-400 px-4 py-3 text-base font-semibold text-slate-950 hover:bg-cyan-300 md:text-sm">
                    Save
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
                      {selectedCustomer.transactions.map((transaction) => (
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
                      {!selectedCustomer.transactions.length ? (
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
      </div>

      {editingCustomer ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-3 pb-3 sm:items-center sm:px-4 sm:pb-0">
          <form
            className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-950 p-4 shadow-2xl sm:p-5"
            onSubmit={updateCustomer}
          >
            <h2 className="text-lg font-semibold text-white">Customer ပြင်မည်</h2>
            <div className="mt-4 grid gap-3">
              <input
                className="min-h-12 rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-base outline-none focus:border-cyan-400"
                placeholder="အမည်"
                value={editForm.name}
                onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
                required
              />
              <input
                className="min-h-12 rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-base outline-none focus:border-cyan-400"
                inputMode="tel"
                placeholder="ဖုန်း"
                value={editForm.phone}
                onChange={(event) => setEditForm({ ...editForm, phone: event.target.value })}
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="min-h-12 rounded-md border border-slate-700 px-5 py-3 text-base text-slate-200 hover:border-slate-500"
                onClick={() => setEditingCustomer(null)}
              >
                Cancel
              </button>
              <button className="min-h-12 rounded-md bg-cyan-400 px-5 py-3 text-base font-semibold text-slate-950 hover:bg-cyan-300">
                Save
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {deletingCustomer ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-3 pb-3 sm:items-center sm:px-4 sm:pb-0">
          <div className="w-full max-w-md rounded-lg border border-rose-900/70 bg-slate-950 p-4 shadow-2xl sm:p-5">
            <h2 className="text-lg font-semibold text-white">Customer ဖျက်မည်</h2>
            <p className="mt-2 text-sm text-slate-300">
              {deletingCustomer.name} ကိုဖျက်ပါမည်။ Transaction history များလည်း ဖျက်သွားမည်။
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="min-h-12 rounded-md border border-slate-700 px-5 py-3 text-base text-slate-200 hover:border-slate-500"
                onClick={() => setDeletingCustomer(null)}
              >
                Cancel
              </button>
              <button
                className="min-h-12 rounded-md bg-rose-500 px-5 py-3 text-base font-semibold text-white hover:bg-rose-400"
                onClick={deleteCustomer}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {matchingKpay ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-3 pb-3 sm:items-center sm:px-4 sm:pb-0">
          <form
            className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-950 p-4 shadow-2xl sm:p-5"
            onSubmit={matchKpay}
          >
            <h2 className="text-lg font-semibold text-white">KPay ကို Customer နှင့် တွဲမည်</h2>
            <p className="mt-2 text-sm text-slate-400">
              {formatMoney(matchingKpay.amount)} ဝင်ငွေကို customer အကြွေးထဲမှ နှုတ်ပါမည်။
            </p>
            <select
              className="mt-4 min-h-12 w-full rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-base outline-none focus:border-cyan-400"
              value={matchCustomerId}
              onChange={(event) => setMatchCustomerId(event.target.value)}
              required
            >
              <option value="">Customer ရွေးပါ</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} - {formatMoney(customer.current_balance)}
                </option>
              ))}
            </select>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="min-h-12 rounded-md border border-slate-700 px-5 py-3 text-base text-slate-200 hover:border-slate-500"
                onClick={() => setMatchingKpay(null)}
              >
                Cancel
              </button>
              <button className="min-h-12 rounded-md bg-cyan-400 px-5 py-3 text-base font-semibold text-slate-950 hover:bg-cyan-300">
                Match
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}
