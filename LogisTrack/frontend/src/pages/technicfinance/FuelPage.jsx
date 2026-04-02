import { useEffect, useState } from "react";

import PageHeader from "../../components/PageHeader";
import TableWrap from "../../components/TableWrap";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency, formatDate } from "../../lib/formatters";

const initialForm = {
  vehicle: "",
  date: "",
  liters: "",
  amount: "",
  notes: "",
};

function FuelPage() {
  const { authRequest } = useAuth();
  const [entryType, setEntryType] = useState("fuel");
  const [vehicles, setVehicles] = useState([]);
  const [mergedRows, setMergedRows] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = async () => {
    setError("");
    try {
      const [vehicleResponse, mergedResponse] = await Promise.all([
        authRequest("/vehicles/"),
        authRequest("/fuel-entries/merged/"),
      ]);
      setVehicles(vehicleResponse || []);
      setMergedRows(mergedResponse || []);
      if (!form.vehicle && vehicleResponse?.length) {
        setForm((prev) => ({ ...prev, vehicle: String(vehicleResponse[0].id) }));
      }
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      await authRequest("/fuel-entries/", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          vehicle: Number(form.vehicle),
          entry_type: entryType,
          liters: form.liters || 0,
          amount: form.amount || 0,
        }),
      });
      setSuccess(entryType === "fuel" ? "Fuel Entry eklendi." : "AdBlue Entry eklendi.");
      setForm((prev) => ({ ...initialForm, vehicle: prev.vehicle }));
      await loadData();
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  return (
    <section className="page-section">
      <PageHeader title="Yakit Takibi" subtitle="Fuel ve AdBlue kayitlari ayni gun bazinda birlestirilir." />

      <div className="button-row">
        <button
          type="button"
          className={entryType === "fuel" ? "primary-button" : "ghost-button"}
          onClick={() => setEntryType("fuel")}
        >
          Fuel Entry
        </button>
        <button
          type="button"
          className={entryType === "adblue" ? "primary-button" : "ghost-button"}
          onClick={() => setEntryType("adblue")}
        >
          AdBlue Entry
        </button>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      <article className="panel-card">
        <h2>{entryType === "fuel" ? "Fuel Entry" : "AdBlue Entry"}</h2>
        <form className="form-grid two-columns" onSubmit={onSubmit}>
          <label>
            Plate
            <select name="vehicle" value={form.vehicle} onChange={onChange} required>
              <option value="">Seciniz</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.plate_number}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input type="date" name="date" value={form.date} onChange={onChange} required />
          </label>
          <label>
            Liters
            <input type="number" step="0.01" name="liters" value={form.liters} onChange={onChange} required />
          </label>
          <label>
            Amount
            <input type="number" step="0.01" name="amount" value={form.amount} onChange={onChange} required />
          </label>
          <label className="field-span-2">
            Notes
            <textarea name="notes" rows={2} value={form.notes} onChange={onChange} />
          </label>
          <button type="submit" className="primary-button field-span-2">
            Kaydet
          </button>
        </form>
      </article>

      <article className="panel-card">
        <h2>Birlesik Gunluk Kayitlar (Fuel + AdBlue)</h2>
        <TableWrap>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Plate</th>
                <th>Fuel (L)</th>
                <th>Fuel Amount</th>
                <th>AdBlue (L)</th>
                <th>AdBlue Amount</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {mergedRows.map((row) => (
                <tr key={`${row.date}-${row.plate_number}`}>
                  <td>{formatDate(row.date)}</td>
                  <td>{row.plate_number}</td>
                  <td>{row.fuel_liters}</td>
                  <td>{formatCurrency(row.fuel_amount)}</td>
                  <td>{row.adblue_liters}</td>
                  <td>{formatCurrency(row.adblue_amount)}</td>
                  <td>{row.notes || "-"}</td>
                </tr>
              ))}
              {!mergedRows.length ? (
                <tr>
                  <td colSpan={7} className="empty-row">
                    Kayit bulunamadi.
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

export default FuelPage;
