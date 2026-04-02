import { useEffect, useMemo, useState } from "react";

import PageHeader from "../../components/PageHeader";
import TableWrap from "../../components/TableWrap";
import { useAuth } from "../../context/AuthContext";
import { formatDate, formatDateTime } from "../../lib/formatters";

const vehicleInitial = {
  plate_number: "",
  trailer_plate: "",
  driver_name: "",
  vehicle_model: "",
  last_inspection_date: "",
  year: "",
  notes: "",
};

const tripInitial = {
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

function FleetManagerPage() {
  const { authRequest } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [vehicleForm, setVehicleForm] = useState(vehicleInitial);
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [tripForm, setTripForm] = useState(tripInitial);
  const [tripVehicle, setTripVehicle] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === tripVehicle) || null,
    [tripVehicle, vehicles]
  );

  const loadVehicles = async () => {
    setError("");
    try {
      const response = await authRequest("/vehicles/");
      setVehicles(response || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onVehicleChange = (event) => {
    setVehicleForm((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  const onTripChange = (event) => {
    const { name, value, type, checked } = event.target;
    setTripForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const resetVehicleForm = () => {
    setVehicleForm(vehicleInitial);
    setEditingVehicleId(null);
  };

  const onVehicleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      const payload = {
        ...vehicleForm,
        year: Number(vehicleForm.year),
      };

      if (editingVehicleId) {
        await authRequest(`/vehicles/${editingVehicleId}/`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setSuccess("Arac guncellendi.");
      } else {
        await authRequest("/vehicles/", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setSuccess("Arac kaydi olusturuldu.");
      }

      resetVehicleForm();
      await loadVehicles();
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  const onEditVehicle = (vehicle) => {
    setEditingVehicleId(vehicle.id);
    setVehicleForm({
      plate_number: vehicle.plate_number,
      trailer_plate: vehicle.trailer_plate,
      driver_name: vehicle.driver_name,
      vehicle_model: vehicle.vehicle_model,
      last_inspection_date: vehicle.last_inspection_date,
      year: String(vehicle.year),
      notes: vehicle.notes,
    });
  };

  const onDeleteVehicle = async (vehicleId) => {
    setError("");
    setSuccess("");

    try {
      await authRequest(`/vehicles/${vehicleId}/`, { method: "DELETE" });
      setSuccess("Arac kaydi silindi.");
      if (editingVehicleId === vehicleId) {
        resetVehicleForm();
      }
      await loadVehicles();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  const onOpenTripPanel = (vehicleId) => {
    setTripVehicle(vehicleId);
    setTripForm(tripInitial);
  };

  const onTripSubmit = async (event) => {
    event.preventDefault();
    if (!tripVehicle) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await authRequest(`/vehicles/${tripVehicle}/create-trip/`, {
        method: "POST",
        body: JSON.stringify({
          ...tripForm,
          departure_time: tripForm.departure_time || null,
          arrival_time: tripForm.arrival_time || null,
          quantity: tripForm.quantity || null,
          price: tripForm.price || 0,
          extra_km: tripForm.extra_km || 0,
          total_amount: tripForm.total_amount || 0,
          invoice_date: tripForm.invoice_date || null,
        }),
      });

      setSuccess("Sefer kaydi olusturuldu.");
      setTripVehicle(null);
      setTripForm(tripInitial);
    } catch (tripError) {
      setError(tripError.message);
    }
  };

  return (
    <section className="page-section">
      <PageHeader
        title="Filo Yonetimi"
        subtitle="Arac kaydi, duzenleme ve arac bazli sefer olusturma islemleri."
      />

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      <article className="panel-card">
        <h2>Vehicle Registration</h2>
        <form className="form-grid two-columns" onSubmit={onVehicleSubmit}>
          <label>
            Plate Number
            <input name="plate_number" value={vehicleForm.plate_number} onChange={onVehicleChange} required />
          </label>
          <label>
            Trailer Plate
            <input name="trailer_plate" value={vehicleForm.trailer_plate} onChange={onVehicleChange} />
          </label>
          <label>
            Driver Name
            <input name="driver_name" value={vehicleForm.driver_name} onChange={onVehicleChange} required />
          </label>
          <label>
            Vehicle Model
            <input name="vehicle_model" value={vehicleForm.vehicle_model} onChange={onVehicleChange} required />
          </label>
          <label>
            Last Inspection Date
            <input
              type="date"
              name="last_inspection_date"
              value={vehicleForm.last_inspection_date}
              onChange={onVehicleChange}
              required
            />
          </label>
          <label>
            Year
            <input type="number" name="year" value={vehicleForm.year} onChange={onVehicleChange} required />
          </label>
          <label className="field-span-2">
            Optional Notes
            <textarea name="notes" rows={3} value={vehicleForm.notes} onChange={onVehicleChange} />
          </label>
          <div className="button-row field-span-2">
            <button type="submit" className="primary-button">
              {editingVehicleId ? "Araci Guncelle" : "Arac Kaydet"}
            </button>
            {editingVehicleId ? (
              <button type="button" className="ghost-button" onClick={resetVehicleForm}>
                Vazgec
              </button>
            ) : null}
          </div>
        </form>
      </article>

      <article className="panel-card">
        <h2>Kayitli Araclar</h2>
        {isLoading ? <p>Arac listesi yukleniyor...</p> : null}

        <TableWrap>
          <table>
            <thead>
              <tr>
                <th>Plaka</th>
                <th>Surucu</th>
                <th>Model</th>
                <th>Muayene</th>
                <th>Olusturma</th>
                <th>Islem</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id}>
                  <td>{vehicle.plate_number}</td>
                  <td>{vehicle.driver_name}</td>
                  <td>{vehicle.vehicle_model}</td>
                  <td>{formatDate(vehicle.last_inspection_date)}</td>
                  <td>{formatDateTime(vehicle.created_at)}</td>
                  <td>
                    <div className="button-row">
                      <button type="button" className="tiny-button" onClick={() => onOpenTripPanel(vehicle.id)}>
                        Create Trip
                      </button>
                      <button type="button" className="tiny-button" onClick={() => onEditVehicle(vehicle)}>
                        Edit
                      </button>
                      <button type="button" className="tiny-button danger" onClick={() => onDeleteVehicle(vehicle.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!vehicles.length && !isLoading ? (
                <tr>
                  <td colSpan={6} className="empty-row">
                    Kayitli arac bulunamadi.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </TableWrap>
      </article>

      {selectedVehicle ? (
        <article className="panel-card">
          <h2>Create Trip - {selectedVehicle.plate_number}</h2>
          <form className="form-grid two-columns" onSubmit={onTripSubmit}>
            <label>
              Plate (Auto)
              <input value={selectedVehicle.plate_number} disabled />
            </label>
            <label>
              Origin
              <input name="origin" value={tripForm.origin} onChange={onTripChange} required />
            </label>
            <label>
              Destination
              <input name="destination" value={tripForm.destination} onChange={onTripChange} required />
            </label>
            <label>
              Departure Time
              <input
                type="datetime-local"
                name="departure_time"
                value={tripForm.departure_time}
                onChange={onTripChange}
              />
            </label>
            <label>
              Arrival Time
              <input
                type="datetime-local"
                name="arrival_time"
                value={tripForm.arrival_time}
                onChange={onTripChange}
              />
            </label>
            <label>
              Total Duration
              <input name="total_duration" value={tripForm.total_duration} onChange={onTripChange} />
            </label>
            <label>
              Cargo Type
              <input name="cargo_type" value={tripForm.cargo_type} onChange={onTripChange} />
            </label>
            <label>
              Quantity
              <input name="quantity" type="number" step="0.01" value={tripForm.quantity} onChange={onTripChange} />
            </label>
            <label>
              Waybill No
              <input name="waybill_no" value={tripForm.waybill_no} onChange={onTripChange} />
            </label>
            <label>
              Customer
              <input name="customer" value={tripForm.customer} onChange={onTripChange} />
            </label>
            <label>
              Price
              <input name="price" type="number" step="0.01" value={tripForm.price} onChange={onTripChange} />
            </label>
            <label>
              Extra KM
              <input name="extra_km" type="number" step="0.01" value={tripForm.extra_km} onChange={onTripChange} />
            </label>
            <label>
              Total Amount
              <input
                name="total_amount"
                type="number"
                step="0.01"
                value={tripForm.total_amount}
                onChange={onTripChange}
              />
            </label>
            <label>
              Invoice No
              <input name="invoice_no" value={tripForm.invoice_no} onChange={onTripChange} />
            </label>
            <label>
              Invoice Date
              <input type="date" name="invoice_date" value={tripForm.invoice_date} onChange={onTripChange} />
            </label>
            <label className="checkbox-field">
              <input
                type="checkbox"
                name="bridge_canakkale"
                checked={tripForm.bridge_canakkale}
                onChange={onTripChange}
              />
              Canakkale Koprusu
            </label>
            <label className="checkbox-field">
              <input
                type="checkbox"
                name="bridge_osmangazi"
                checked={tripForm.bridge_osmangazi}
                onChange={onTripChange}
              />
              Osmangazi Koprusu
            </label>
            <label className="field-span-2">
              Notes
              <textarea rows={3} name="notes" value={tripForm.notes} onChange={onTripChange} />
            </label>
            <div className="button-row field-span-2">
              <button type="submit" className="primary-button">
                Seferi Kaydet
              </button>
              <button type="button" className="ghost-button" onClick={() => setTripVehicle(null)}>
                Kapat
              </button>
            </div>
          </form>
        </article>
      ) : null}
    </section>
  );
}

export default FleetManagerPage;
