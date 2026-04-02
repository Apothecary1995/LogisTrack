import { useEffect, useState } from "react";

import PageHeader from "../../components/PageHeader";
import TableWrap from "../../components/TableWrap";
import { useAuth } from "../../context/AuthContext";
import { formatDate, formatNumber } from "../../lib/formatters";

const driverInitial = {
  full_name: "",
  phone: "",
  notes: "",
  is_active: true,
};

const leaveInitial = {
  driver: "",
  start_date: "",
  end_date: "",
  notes: "",
};

function EmployeePage() {
  const { authRequest } = useAuth();
  const [metric, setMetric] = useState("most_km");
  const [drivers, setDrivers] = useState([]);
  const [insight, setInsight] = useState({ drivers: [], leaves: [] });
  const [driverForm, setDriverForm] = useState(driverInitial);
  const [leaveForm, setLeaveForm] = useState(leaveInitial);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = async (currentMetric = metric) => {
    setError("");
    try {
      const [driverResponse, insightResponse] = await Promise.all([
        authRequest("/drivers/"),
        authRequest(`/employees/insights/?metric=${currentMetric}`),
      ]);
      setDrivers(driverResponse || []);
      setInsight(insightResponse || { drivers: [], leaves: [] });
      if (!leaveForm.driver && driverResponse?.length) {
        setLeaveForm((prev) => ({ ...prev, driver: String(driverResponse[0].id) }));
      }
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onMetricChange = async (event) => {
    const nextMetric = event.target.value;
    setMetric(nextMetric);
    await loadData(nextMetric);
  };

  const onDriverChange = (event) => {
    const { name, value, type, checked } = event.target;
    setDriverForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const onLeaveChange = (event) => {
    setLeaveForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const onDriverSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      await authRequest("/drivers/", {
        method: "POST",
        body: JSON.stringify(driverForm),
      });
      setSuccess("Surucu kaydi olusturuldu.");
      setDriverForm(driverInitial);
      await loadData();
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  const onLeaveSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      await authRequest("/driver-leaves/", {
        method: "POST",
        body: JSON.stringify({
          ...leaveForm,
          driver: Number(leaveForm.driver),
        }),
      });
      setSuccess("Izin kaydi olusturuldu.");
      setLeaveForm((prev) => ({ ...leaveInitial, driver: prev.driver }));
      await loadData();
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  return (
    <section className="page-section">
      <PageHeader
        title="Personel Kartlari"
        subtitle="Surucu performansi, verimlilik ve izin yonetimi."
      />

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      <article className="panel-card">
        <h2>Performance Filters</h2>
        <label>
          Filter
          <select value={metric} onChange={onMetricChange}>
            <option value="most_km">Most KM Driven</option>
            <option value="least_km">Least KM Driven</option>
            <option value="most_efficient">Most Efficient Drivers</option>
            <option value="least_efficient">Least Efficient Drivers</option>
          </select>
        </label>

        <TableWrap>
          <table>
            <thead>
              <tr>
                <th>Driver</th>
                <th>Total KM</th>
                <th>Total Amount</th>
                <th>Efficiency (TRY/KM)</th>
              </tr>
            </thead>
            <tbody>
              {(insight.drivers || []).map((row) => (
                <tr key={row.driver_name}>
                  <td>{row.driver_name}</td>
                  <td>{formatNumber(row.total_km, 2)}</td>
                  <td>{formatNumber(row.total_amount, 2)}</td>
                  <td>{formatNumber(row.efficiency, 4)}</td>
                </tr>
              ))}
              {!insight.drivers?.length ? (
                <tr>
                  <td colSpan={4} className="empty-row">
                    Surucu performans verisi yok.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </TableWrap>
      </article>

      <div className="panel-grid two-columns">
        <article className="panel-card">
          <h2>Surucu Kaydi</h2>
          <form className="form-grid" onSubmit={onDriverSubmit}>
            <label>
              Full Name
              <input name="full_name" value={driverForm.full_name} onChange={onDriverChange} required />
            </label>
            <label>
              Phone
              <input name="phone" value={driverForm.phone} onChange={onDriverChange} />
            </label>
            <label>
              Notes
              <textarea name="notes" rows={2} value={driverForm.notes} onChange={onDriverChange} />
            </label>
            <label className="checkbox-field">
              <input
                type="checkbox"
                name="is_active"
                checked={driverForm.is_active}
                onChange={onDriverChange}
              />
              Active
            </label>
            <button type="submit" className="primary-button">
              Kaydet
            </button>
          </form>
        </article>

        <article className="panel-card">
          <h2>Driver Leave / Vacation</h2>
          <form className="form-grid" onSubmit={onLeaveSubmit}>
            <label>
              Driver
              <select name="driver" value={leaveForm.driver} onChange={onLeaveChange} required>
                <option value="">Seciniz</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.full_name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Start Date
              <input type="date" name="start_date" value={leaveForm.start_date} onChange={onLeaveChange} required />
            </label>
            <label>
              End Date
              <input type="date" name="end_date" value={leaveForm.end_date} onChange={onLeaveChange} required />
            </label>
            <label>
              Notes
              <textarea name="notes" rows={2} value={leaveForm.notes} onChange={onLeaveChange} />
            </label>
            <button type="submit" className="primary-button">
              Izin Ekle
            </button>
          </form>
        </article>
      </div>

      <article className="panel-card">
        <h2>Izin Kayitlari</h2>
        <TableWrap>
          <table>
            <thead>
              <tr>
                <th>Surucu</th>
                <th>Baslangic</th>
                <th>Bitis</th>
                <th>Not</th>
              </tr>
            </thead>
            <tbody>
              {(insight.leaves || []).map((leave) => (
                <tr key={leave.id}>
                  <td>{leave.driver_name}</td>
                  <td>{formatDate(leave.start_date)}</td>
                  <td>{formatDate(leave.end_date)}</td>
                  <td>{leave.notes || "-"}</td>
                </tr>
              ))}
              {!insight.leaves?.length ? (
                <tr>
                  <td colSpan={4} className="empty-row">
                    Izin kaydi bulunamadi.
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

export default EmployeePage;
