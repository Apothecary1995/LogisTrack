import { useEffect, useState } from "react";

import PageHeader from "../../components/PageHeader";
import StatCard from "../../components/StatCard";
import TableWrap from "../../components/TableWrap";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency, formatDate } from "../../lib/formatters";
import { toQueryString } from "../../lib/apiClient";

const manualEntryInitial = {
  entry_type: "driver_wage",
  date: "",
  driver_name: "",
  customer: "",
  amount: "",
  description: "",
  source_module: "manual",
};

function PayrollPage() {
  const { authRequest } = useAuth();
  const [filters, setFilters] = useState({ start_date: "", end_date: "", view: "monthly" });
  const [overview, setOverview] = useState(null);
  const [entries, setEntries] = useState([]);
  const [manualForm, setManualForm] = useState(manualEntryInitial);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = async () => {
    setError("");
    try {
      const query = toQueryString(filters);
      const [overviewResponse, entriesResponse] = await Promise.all([
        authRequest(`/payroll/overview/${query}`),
        authRequest("/payroll-entries/"),
      ]);
      setOverview(overviewResponse);
      setEntries(entriesResponse || []);
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFilterChange = (event) => {
    setFilters((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const onManualChange = (event) => {
    setManualForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const onManualSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      await authRequest("/payroll-entries/", {
        method: "POST",
        body: JSON.stringify({
          ...manualForm,
          amount: manualForm.amount || 0,
        }),
      });
      setSuccess("Muhasebe kaydi olusturuldu.");
      setManualForm(manualEntryInitial);
      await loadData();
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  return (
    <section className="page-section">
      <PageHeader title="Muhasebe / Bordro" subtitle="Tum gelir-gider akislarini tarih bazinda izleyin." />

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      <article className="panel-card">
        <h2>Filtreleme</h2>
        <div className="form-grid three-columns">
          <label>
            Baslangic Tarihi
            <input type="date" name="start_date" value={filters.start_date} onChange={onFilterChange} />
          </label>
          <label>
            Bitis Tarihi
            <input type="date" name="end_date" value={filters.end_date} onChange={onFilterChange} />
          </label>
          <label>
            Gorunum
            <select name="view" value={filters.view} onChange={onFilterChange}>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
          <button type="button" className="primary-button" onClick={loadData}>
            Uygula
          </button>
        </div>
      </article>

      <div className="stat-grid">
        <StatCard label="Trip Income" value={formatCurrency(overview?.totals?.trip_income)} accent="green" />
        <StatCard label="Manual Income" value={formatCurrency(overview?.totals?.manual_income)} accent="cyan" />
        <StatCard
          label="Toplam Gider"
          value={formatCurrency(
            Number(overview?.totals?.service_expense || 0) +
              Number(overview?.totals?.fuel_expense || 0) +
              Number(overview?.totals?.manual_expense || 0)
          )}
          accent="orange"
        />
        <StatCard label="Net Bakiye" value={formatCurrency(overview?.totals?.net_balance)} accent="blue" />
      </div>

      <div className="panel-grid two-columns">
        <article className="panel-card">
          <h2>Driver Wages ({overview?.range?.view || "monthly"})</h2>
          <TableWrap>
            <table>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {(overview?.driver_wages || []).map((row) => (
                  <tr key={row.period}>
                    <td>{row.period}</td>
                    <td>{formatCurrency(row.amount)}</td>
                  </tr>
                ))}
                {!overview?.driver_wages?.length ? (
                  <tr>
                    <td colSpan={2} className="empty-row">
                      Veri yok.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </TableWrap>
        </article>

        <article className="panel-card">
          <h2>Customer Invoices ({overview?.range?.view || "monthly"})</h2>
          <TableWrap>
            <table>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {(overview?.customer_invoices || []).map((row) => (
                  <tr key={row.period}>
                    <td>{row.period}</td>
                    <td>{formatCurrency(row.amount)}</td>
                  </tr>
                ))}
                {!overview?.customer_invoices?.length ? (
                  <tr>
                    <td colSpan={2} className="empty-row">
                      Veri yok.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </TableWrap>
        </article>
      </div>

      <article className="panel-card">
        <h2>Manual Payroll/Accounting Entry</h2>
        <form className="form-grid three-columns" onSubmit={onManualSubmit}>
          <label>
            Entry Type
            <select name="entry_type" value={manualForm.entry_type} onChange={onManualChange}>
              <option value="driver_wage">Driver Wage</option>
              <option value="customer_invoice">Customer Invoice</option>
              <option value="other_income">Other Income</option>
              <option value="other_expense">Other Expense</option>
            </select>
          </label>
          <label>
            Date
            <input type="date" name="date" value={manualForm.date} onChange={onManualChange} required />
          </label>
          <label>
            Amount
            <input
              type="number"
              step="0.01"
              name="amount"
              value={manualForm.amount}
              onChange={onManualChange}
              required
            />
          </label>
          <label>
            Driver Name
            <input name="driver_name" value={manualForm.driver_name} onChange={onManualChange} />
          </label>
          <label>
            Customer
            <input name="customer" value={manualForm.customer} onChange={onManualChange} />
          </label>
          <label>
            Source Module
            <input name="source_module" value={manualForm.source_module} onChange={onManualChange} />
          </label>
          <label className="field-span-3">
            Description
            <textarea
              name="description"
              rows={2}
              value={manualForm.description}
              onChange={onManualChange}
            />
          </label>
          <button type="submit" className="primary-button field-span-3">
            Kayit Ekle
          </button>
        </form>
      </article>

      <article className="panel-card">
        <h2>Manuel Giris Kayitlari</h2>
        <TableWrap>
          <table>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Tip</th>
                <th>Driver</th>
                <th>Customer</th>
                <th>Tutar</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDate(entry.date)}</td>
                  <td>{entry.entry_type}</td>
                  <td>{entry.driver_name || "-"}</td>
                  <td>{entry.customer || "-"}</td>
                  <td>{formatCurrency(entry.amount)}</td>
                </tr>
              ))}
              {!entries.length ? (
                <tr>
                  <td colSpan={5} className="empty-row">
                    Kayit yok.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </TableWrap>
      </article>
    </section>
  );
}

export default PayrollPage;
