import { useEffect, useState } from "react";

import PageHeader from "../../components/PageHeader";
import StatCard from "../../components/StatCard";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency, formatNumber } from "../../lib/formatters";

const quickTripInitial = {
  vehicle: "",
  origin: "",
  destination: "",
  departure_time: "",
  arrival_time: "",
  total_duration: "",
  cargo_type: "",
  quantity: "",
  waybill_no: "",
  customer: "",
  price: "",
  extra_km: "",
  total_amount: "",
  bridge_canakkale: false,
  bridge_osmangazi: false,
  invoice_no: "",
  invoice_date: "",
  notes: "",
};

function DashboardPage() {
  const { authRequest } = useAuth();
  const [summary, setSummary] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTripPanelOpen, setIsTripPanelOpen] = useState(false);
  const [quickTripForm, setQuickTripForm] = useState(quickTripInitial);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const loadData = async () => {
    setError("");
    try {
      const [summaryResponse, vehiclesResponse] = await Promise.all([
        authRequest("/dashboard/summary/"),
        authRequest("/vehicles/"),
      ]);
      setSummary(summaryResponse);
      setVehicles(vehiclesResponse || []);
      if (!quickTripForm.vehicle && vehiclesResponse?.length) {
        setQuickTripForm((prev) => ({ ...prev, vehicle: String(vehiclesResponse[0].id) }));
      }
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onQuickTripChange = (event) => {
    const { name, value, type, checked } = event.target;
    setQuickTripForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const onQuickTripSubmit = async (event) => {
    event.preventDefault();
    setStatusText("");
    setError("");

    const payload = {
      ...quickTripForm,
      vehicle: Number(quickTripForm.vehicle),
      quantity: quickTripForm.quantity || null,
      departure_time: quickTripForm.departure_time || null,
      arrival_time: quickTripForm.arrival_time || null,
      price: quickTripForm.price || 0,
      extra_km: quickTripForm.extra_km || 0,
      total_amount: quickTripForm.total_amount || 0,
      invoice_date: quickTripForm.invoice_date || null,
    };

    try {
      await authRequest("/trips/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setStatusText("Sefer eklendi.");
      setQuickTripForm((prev) => ({ ...quickTripInitial, vehicle: prev.vehicle }));
      await loadData();
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  const onRouteUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError("");
    setStatusText("");
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await authRequest("/routes/upload/", {
        method: "POST",
        body: formData,
      });
      setStatusText(
        `${response.message} (Upsert: ${response.upserted}, Skip: ${response.skipped})`
      );
      await loadData();
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  return (
    <section className="page-section">
      <PageHeader
        title="Genel Durum"
        subtitle="Filo performans ve finansal hakedis ozetleri."
        actions={
          <>
            <button type="button" className="ghost-button" onClick={loadData}>
              Verileri Tazele
            </button>
            <button
              type="button"
              className="danger-button"
              onClick={() => setIsTripPanelOpen((prev) => !prev)}
            >
              Hizli Sefer Ekle
            </button>
          </>
        }
      />

      {isLoading ? <p>Veriler yukleniyor...</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {statusText ? <p className="form-success">{statusText}</p> : null}

      <div className="stat-grid">
        <StatCard
          label="Aylik Toplam Ciro"
          value={formatCurrency(summary?.monthly_revenue || 0)}
          accent="green"
        />
        <StatCard
          label="Bekleyen Bakim"
          value={formatNumber(summary?.pending_maintenance || 0)}
          accent="orange"
        />
        <StatCard label="Toplam Sefer" value={formatNumber(summary?.total_trips || 0)} />
        <StatCard
          label="Toplam KM (CCI + Fazla)"
          value={`${formatNumber(summary?.total_kilometers || 0, 2)} KM`}
          accent="cyan"
        />
      </div>

      <article className="panel-card">
        <div className="panel-header-row">
          <div>
            <h2>Excel Senkronizasyon Motoru</h2>
            <p>
              Origin-Destination ve KM tablosunu yukleyin. Sefer olusturma sirasinda CCI KM
              otomatik hesaplanir.
            </p>
          </div>
          <span className="chip">Excel Aktif: {summary?.routes_in_database || 0} rota</span>
        </div>

        <label className="upload-button" htmlFor="route-upload-input">
          {isUploading ? "Yukleniyor..." : "Master Excel Yukle (Route Database)"}
        </label>
        <input
          id="route-upload-input"
          type="file"
          accept=".xlsx"
          onChange={onRouteUpload}
          hidden
        />
      </article>

      {isTripPanelOpen ? (
        <article className="panel-card">
          <h2>Hizli Sefer Girisi</h2>
          <form className="form-grid two-columns" onSubmit={onQuickTripSubmit}>
            <label>
              Arac
              <select
                name="vehicle"
                value={quickTripForm.vehicle}
                onChange={onQuickTripChange}
                required
              >
                <option value="">Seciniz</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.plate_number} - {vehicle.driver_name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Origin
              <input name="origin" value={quickTripForm.origin} onChange={onQuickTripChange} required />
            </label>
            <label>
              Destination
              <input
                name="destination"
                value={quickTripForm.destination}
                onChange={onQuickTripChange}
                required
              />
            </label>
            <label>
              Departure Time
              <input
                type="datetime-local"
                name="departure_time"
                value={quickTripForm.departure_time}
                onChange={onQuickTripChange}
              />
            </label>
            <label>
              Arrival Time
              <input
                type="datetime-local"
                name="arrival_time"
                value={quickTripForm.arrival_time}
                onChange={onQuickTripChange}
              />
            </label>
            <label>
              Total Duration
              <input
                name="total_duration"
                value={quickTripForm.total_duration}
                onChange={onQuickTripChange}
                placeholder="7h 20m"
              />
            </label>
            <label>
              Cargo Type
              <input name="cargo_type" value={quickTripForm.cargo_type} onChange={onQuickTripChange} />
            </label>
            <label>
              Quantity
              <input name="quantity" type="number" step="0.01" value={quickTripForm.quantity} onChange={onQuickTripChange} />
            </label>
            <label>
              Waybill No
              <input name="waybill_no" value={quickTripForm.waybill_no} onChange={onQuickTripChange} />
            </label>
            <label>
              Customer
              <input name="customer" value={quickTripForm.customer} onChange={onQuickTripChange} />
            </label>
            <label>
              Price
              <input name="price" type="number" step="0.01" value={quickTripForm.price} onChange={onQuickTripChange} />
            </label>
            <label>
              Extra KM
              <input name="extra_km" type="number" step="0.01" value={quickTripForm.extra_km} onChange={onQuickTripChange} />
            </label>
            <label>
              Total Amount
              <input
                name="total_amount"
                type="number"
                step="0.01"
                value={quickTripForm.total_amount}
                onChange={onQuickTripChange}
              />
            </label>
            <label>
              Invoice No
              <input name="invoice_no" value={quickTripForm.invoice_no} onChange={onQuickTripChange} />
            </label>
            <label>
              Invoice Date
              <input
                type="date"
                name="invoice_date"
                value={quickTripForm.invoice_date}
                onChange={onQuickTripChange}
              />
            </label>
            <label className="checkbox-field">
              <input
                type="checkbox"
                name="bridge_canakkale"
                checked={quickTripForm.bridge_canakkale}
                onChange={onQuickTripChange}
              />
              Canakkale Koprusu
            </label>
            <label className="checkbox-field">
              <input
                type="checkbox"
                name="bridge_osmangazi"
                checked={quickTripForm.bridge_osmangazi}
                onChange={onQuickTripChange}
              />
              Osmangazi Koprusu
            </label>
            <label className="field-span-2">
              Notes
              <textarea name="notes" value={quickTripForm.notes} onChange={onQuickTripChange} rows={3} />
            </label>
            <button type="submit" className="primary-button field-span-2">
              Seferi Kaydet
            </button>
          </form>
        </article>
      ) : null}
    </section>
  );
}

export default DashboardPage;
