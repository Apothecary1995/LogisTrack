import { useEffect, useState } from "react";

import PageHeader from "../../components/PageHeader";
import TableWrap from "../../components/TableWrap";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency, formatDate } from "../../lib/formatters";

const initialForm = {
  vehicle: "",
  date: "",
  operation_details: "",
  entry_km: "",
  cost: "",
  notes: "",
};

function ServiceRepairPage() {
  const { authRequest } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = async () => {
    setError("");
    try {
      const [vehicleResponse, serviceResponse] = await Promise.all([
        authRequest("/vehicles/"),
        authRequest("/service-repairs/"),
      ]);
      setVehicles(vehicleResponse || []);
      setEntries(serviceResponse || []);
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
      await authRequest("/service-repairs/", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          vehicle: Number(form.vehicle),
          entry_km: form.entry_km || 0,
          cost: form.cost || 0,
        }),
      });
      setSuccess("Servis kaydi olusturuldu.");
      setForm((prev) => ({ ...initialForm, vehicle: prev.vehicle }));
      await loadData();
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  return (
    <section className="page-section">
      <PageHeader title="Servis & Bakim" subtitle="Arac bakim ve onarim kayitlari." />

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      <article className="panel-card">
        <h2>Service Entry</h2>
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
          <label className="field-span-2">
            Operation Details
            <textarea
              rows={3}
              name="operation_details"
              value={form.operation_details}
              onChange={onChange}
              required
            />
          </label>
          <label>
            Entry KM
            <input type="number" step="0.01" name="entry_km" value={form.entry_km} onChange={onChange} required />
          </label>
          <label>
            Cost
            <input type="number" step="0.01" name="cost" value={form.cost} onChange={onChange} required />
          </label>
          <label className="field-span-2">
            Notes
            <textarea rows={2} name="notes" value={form.notes} onChange={onChange} />
          </label>
          <button type="submit" className="primary-button field-span-2">
            Service Entry Ekle
          </button>
        </form>
      </article>

      <article className="panel-card">
        <h2>Servis Kayitlari</h2>
        <TableWrap>
          <table>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Plaka</th>
                <th>Detay</th>
                <th>KM</th>
                <th>Maliyet</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDate(entry.date)}</td>
                  <td>{entry.plate_number}</td>
                  <td>{entry.operation_details}</td>
                  <td>{entry.entry_km}</td>
                  <td>{formatCurrency(entry.cost)}</td>
                </tr>
              ))}
              {!entries.length ? (
                <tr>
                  <td colSpan={5} className="empty-row">
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

export default ServiceRepairPage;
