"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

function toDatetimeLocalValue(dateValue) {
  const date = dateValue ? new Date(dateValue) : new Date();
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function createInitialTransactionForm() {
  return {
    amount: "",
    merchant: "",
    category_id: "",
    type: "expense",
    transaction_date: toDatetimeLocalValue(),
  };
}

function formatCurrency(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatShortDate(value) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function Card({ eyebrow, title, value, hint, tone = "neutral" }) {
  const tones = {
    neutral: "border-zinc-200 bg-white",
    blue: "border-blue-100 bg-blue-50/70",
    green: "border-emerald-100 bg-emerald-50/70",
    amber: "border-amber-100 bg-amber-50/70",
  };

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${tones[tone]}`}>
      <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
        {eyebrow}
      </p>
      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-600">{title}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">
            {value}
          </p>
        </div>
      </div>
      {hint ? <p className="mt-4 text-sm text-zinc-500">{hint}</p> : null}
    </div>
  );
}

export default function TransactionsManager({ userId }) {
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [categorySaving, setCategorySaving] = useState(false);
  const [transactionForm, setTransactionForm] = useState(
    createInitialTransactionForm(),
  );
  const [transactionSaving, setTransactionSaving] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState(null);

  const categoryMap = useMemo(
    () =>
      categories.reduce((map, category) => {
        map[category.id] = category.name;
        return map;
      }, {}),
    [categories],
  );

  const dashboard = useMemo(() => {
    const totalIncome = transactions
      .filter((transaction) => transaction.type === "income")
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

    const totalExpense = transactions
      .filter((transaction) => transaction.type !== "income")
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

    const net = totalIncome - totalExpense;
    const recentTransactions = transactions.slice(0, 5);

    const categoryTotals = transactions
      .filter((transaction) => transaction.type !== "income")
      .reduce((accumulator, transaction) => {
        const categoryName = transaction.category_id
          ? categoryMap[transaction.category_id] || "Unknown"
          : "Uncategorized";
        accumulator[categoryName] =
          (accumulator[categoryName] || 0) + Number(transaction.amount || 0);
        return accumulator;
      }, {});

    const categoryBreakdown = Object.entries(categoryTotals)
      .map(([name, amount]) => ({ name, amount }))
      .sort((left, right) => right.amount - left.amount)
      .slice(0, 4);

    const monthMap = transactions.reduce((accumulator, transaction) => {
      const monthKey = new Intl.DateTimeFormat("en-US", {
        month: "short",
        year: "2-digit",
      }).format(new Date(transaction.transaction_date));

      const current = accumulator.get(monthKey) || {
        label: monthKey,
        expense: 0,
      };
      if (transaction.type !== "income") {
        current.expense += Number(transaction.amount || 0);
      }
      accumulator.set(monthKey, current);
      return accumulator;
    }, new Map());

    const monthlySpending = Array.from(monthMap.values()).slice(-6);
    const highestMonthlySpending = Math.max(
      ...monthlySpending.map((month) => month.expense),
      1,
    );

    return {
      totalIncome,
      totalExpense,
      net,
      recentTransactions,
      categoryBreakdown,
      monthlySpending,
      highestMonthlySpending,
    };
  }, [transactions, categoryMap]);

  const loadData = async () => {
    setLoading(true);
    setError("");

    const [categoriesResult, transactionsResult] = await Promise.all([
      supabase
        .from("categories")
        .select("id, name, created_at")
        .order("created_at", { ascending: true }),
      supabase
        .from("transactions")
        .select(
          "id, amount, merchant, category_id, type, transaction_date, external_id, created_at",
        )
        .order("transaction_date", { ascending: false }),
    ]);

    if (categoriesResult.error) {
      setError(categoriesResult.error.message);
    }

    if (transactionsResult.error) {
      setError(transactionsResult.error.message);
    }

    setCategories(categoriesResult.data ?? []);
    setTransactions(transactionsResult.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!userId) {
      return;
    }

    loadData();
  }, [userId]);

  const resetTransactionForm = () => {
    setTransactionForm(createInitialTransactionForm());
    setEditingTransactionId(null);
  };

  const handleCreateCategory = async (event) => {
    event.preventDefault();

    const trimmedName = categoryName.trim();
    if (!trimmedName) {
      setError("Category name is required.");
      return;
    }

    setCategorySaving(true);
    setError("");

    const { error: insertError } = await supabase.from("categories").insert({
      user_id: userId,
      name: trimmedName,
    });

    if (insertError) {
      setError(insertError.message);
      setCategorySaving(false);
      return;
    }

    setCategoryName("");
    await loadData();
    setCategorySaving(false);
  };

  const handleTransactionSubmit = async (event) => {
    event.preventDefault();

    if (!transactionForm.amount.trim()) {
      setError("Amount is required.");
      return;
    }

    if (!transactionForm.transaction_date) {
      setError("Transaction date is required.");
      return;
    }

    const amountValue = Number(transactionForm.amount);
    if (Number.isNaN(amountValue)) {
      setError("Amount must be a valid number.");
      return;
    }

    setTransactionSaving(true);
    setError("");

    const payload = {
      user_id: userId,
      amount: amountValue,
      merchant: transactionForm.merchant.trim() || null,
      category_id: transactionForm.category_id || null,
      type: transactionForm.type,
      transaction_date: new Date(
        transactionForm.transaction_date,
      ).toISOString(),
    };

    const request = editingTransactionId
      ? supabase
          .from("transactions")
          .update(payload)
          .eq("id", editingTransactionId)
      : supabase.from("transactions").insert(payload);

    const { error: writeError } = await request;

    if (writeError) {
      setError(writeError.message);
      setTransactionSaving(false);
      return;
    }

    resetTransactionForm();
    await loadData();
    setTransactionSaving(false);
  };

  const startEdit = (transaction) => {
    setEditingTransactionId(transaction.id);
    setTransactionForm({
      amount: String(transaction.amount ?? ""),
      merchant: transaction.merchant ?? "",
      category_id: transaction.category_id ?? "",
      type: transaction.type ?? "expense",
      transaction_date: toDatetimeLocalValue(transaction.transaction_date),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteTransaction = async (transactionId) => {
    const confirmed = window.confirm("Delete this transaction?");
    if (!confirmed) {
      return;
    }

    setError("");
    const { error: deleteError } = await supabase
      .from("transactions")
      .delete()
      .eq("id", transactionId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await loadData();
  };

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card
          eyebrow="Overview"
          title="Income"
          value={formatCurrency(dashboard.totalIncome)}
          hint="All income transactions currently in the database."
          tone="green"
        />
        <Card
          eyebrow="Overview"
          title="Expenses"
          value={formatCurrency(dashboard.totalExpense)}
          hint="Expense total from manual entries."
          tone="amber"
        />
        <Card
          eyebrow="Overview"
          title="Net"
          value={formatCurrency(dashboard.net)}
          hint={
            dashboard.net >= 0
              ? "You are in positive territory."
              : "Expenses are ahead of income."
          }
          tone="blue"
        />
        <Card
          eyebrow="Overview"
          title="Transactions"
          value={transactions.length}
          hint="Visible in your current account only."
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="grid gap-6">
          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
                  Spending
                </p>
                <h3 className="mt-1 text-lg font-semibold text-zinc-950">
                  Monthly expense trend
                </h3>
              </div>
              <button
                type="button"
                onClick={loadData}
                className="inline-flex items-center justify-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <p className="mt-6 text-sm text-zinc-500">Loading dashboard...</p>
            ) : dashboard.monthlySpending.length === 0 ? (
              <p className="mt-6 text-sm text-zinc-500">
                Add a few transactions to see your spending trend here.
              </p>
            ) : (
              <div className="mt-6 space-y-4">
                {dashboard.monthlySpending.map((month) => {
                  const width = Math.max(
                    8,
                    (month.expense / dashboard.highestMonthlySpending) * 100,
                  );

                  return (
                    <div
                      key={month.label}
                      className="grid grid-cols-[76px_1fr_96px] items-center gap-3"
                    >
                      <span className="text-sm text-zinc-500">
                        {month.label}
                      </span>
                      <div className="h-2 rounded-full bg-zinc-100">
                        <div
                          className="h-2 rounded-full bg-zinc-900"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <span className="text-right text-sm font-medium text-zinc-700">
                        {formatCurrency(month.expense)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
              Categories
            </p>
            <h3 className="mt-1 text-lg font-semibold text-zinc-950">
              Where the money goes
            </h3>

            {dashboard.categoryBreakdown.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">
                Category totals will appear after you assign transactions.
              </p>
            ) : (
              <div className="mt-5 space-y-4">
                {dashboard.categoryBreakdown.map((category) => {
                  const width = Math.max(
                    10,
                    (category.amount / dashboard.categoryBreakdown[0].amount) *
                      100,
                  );

                  return (
                    <div key={category.name} className="space-y-2">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium text-zinc-700">
                          {category.name}
                        </span>
                        <span className="text-zinc-500">
                          {formatCurrency(category.amount)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-zinc-100">
                        <div
                          className="h-2 rounded-full bg-zinc-700"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6">
          <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
              Quick add
            </p>
            <h3 className="mt-1 text-lg font-semibold text-zinc-950">
              Categories and transactions
            </h3>

            <form onSubmit={handleCreateCategory} className="mt-5 flex gap-3">
              <input
                type="text"
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                placeholder="Add category"
                className="min-w-0 flex-1 rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-900"
              />
              <button
                type="submit"
                disabled={categorySaving}
                className="rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {categorySaving ? "Saving..." : "Add"}
              </button>
            </form>

            <div className="mt-4 flex flex-wrap gap-2">
              {categories.length === 0 ? (
                <p className="text-sm text-zinc-500">No categories yet.</p>
              ) : (
                categories.map((category) => (
                  <span
                    key={category.id}
                    className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm text-zinc-700"
                  >
                    {category.name}
                  </span>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-zinc-950">
              {editingTransactionId ? "Edit transaction" : "New transaction"}
            </h3>
            <form
              onSubmit={handleTransactionSubmit}
              className="mt-4 grid gap-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-zinc-700">
                  Amount
                  <input
                    type="number"
                    step="0.01"
                    value={transactionForm.amount}
                    onChange={(event) =>
                      setTransactionForm((current) => ({
                        ...current,
                        amount: event.target.value,
                      }))
                    }
                    placeholder="12000"
                    className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-900"
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium text-zinc-700">
                  Type
                  <select
                    value={transactionForm.type}
                    onChange={(event) =>
                      setTransactionForm((current) => ({
                        ...current,
                        type: event.target.value,
                      }))
                    }
                    className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </label>
              </div>

              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                Date and time
                <input
                  type="datetime-local"
                  value={transactionForm.transaction_date}
                  onChange={(event) =>
                    setTransactionForm((current) => ({
                      ...current,
                      transaction_date: event.target.value,
                    }))
                  }
                  className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                Merchant
                <input
                  type="text"
                  value={transactionForm.merchant}
                  onChange={(event) =>
                    setTransactionForm((current) => ({
                      ...current,
                      merchant: event.target.value,
                    }))
                  }
                  placeholder="Coffee shop, supermarket, etc."
                  className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-900"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                Category
                <select
                  value={transactionForm.category_id}
                  onChange={(event) =>
                    setTransactionForm((current) => ({
                      ...current,
                      category_id: event.target.value,
                    }))
                  }
                  className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
                >
                  <option value="">Uncategorized</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={transactionSaving}
                  className="rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {transactionSaving
                    ? "Saving..."
                    : editingTransactionId
                      ? "Update transaction"
                      : "Create transaction"}
                </button>
                {editingTransactionId ? (
                  <button
                    type="button"
                    onClick={resetTransactionForm}
                    className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                  >
                    Cancel edit
                  </button>
                ) : null}
              </div>
            </form>
          </section>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
              Activity
            </p>
            <h3 className="mt-1 text-lg font-semibold text-zinc-950">
              Recent transactions
            </h3>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center justify-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-zinc-500">Loading transactions...</p>
        ) : transactions.length === 0 ? (
          <p className="mt-6 text-sm text-zinc-500">
            No transactions yet. Create your first one above.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.2em] text-zinc-400">
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Merchant</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="rounded-2xl bg-zinc-50/80 text-sm text-zinc-700"
                  >
                    <td className="px-3 py-4 whitespace-nowrap">
                      {formatShortDate(transaction.transaction_date)}
                    </td>
                    <td className="px-3 py-4">{transaction.merchant || "-"}</td>
                    <td className="px-3 py-4">
                      {transaction.category_id
                        ? categoryMap[transaction.category_id] || "Unknown"
                        : "Uncategorized"}
                    </td>
                    <td className="px-3 py-4">
                      <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                        {transaction.type || "-"}
                      </span>
                    </td>
                    <td className="px-3 py-4 font-medium text-zinc-950">
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(transaction)}
                          className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteTransaction(transaction.id)
                          }
                          className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {error ? (
        <p className="text-sm font-medium text-red-600">{error}</p>
      ) : null}
    </div>
  );
}
