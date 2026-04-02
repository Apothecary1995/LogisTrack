import { useEffect, useState } from "react";

import PageHeader from "../../components/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { formatDateTime } from "../../lib/formatters";

const initialForm = {
  vat_rate: "",
  bonus_threshold_km: "",
  bonus_formula: "",
};

function ErpPage() {
  const { authRequest, user } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [updatedAt, setUpdatedAt] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadSettings = async () => {
    setError("");
    try {
      const response = await authRequest("/erp/settings/");
      setForm({
        vat_rate: String(response.vat_rate ?? ""),
        bonus_threshold_km: String(response.bonus_threshold_km ?? ""),
        bonus_formula: response.bonus_formula ?? "",
      });
      setUpdatedAt(response.updated_at);
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  useEffect(() => {
    loadSettings();
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
      const response = await authRequest("/erp/settings/", {
        method: "PUT",
        body: JSON.stringify({
          vat_rate: form.vat_rate || 0,
          bonus_threshold_km: form.bonus_threshold_km || 0,
          bonus_formula: form.bonus_formula,
        }),
      });
      setUpdatedAt(response.updated_at);
      setSuccess("ERP ayarlari guncellendi.");
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  return (
    <section className="page-section">
      <PageHeader
        title="ERP Konfigurasyonu"
        subtitle="KDV orani, bonus esigi ve bonus formulu tanimlari."
      />

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      <article className="panel-card">
        <h2>ERP Settings</h2>
        <p>
          Guncelleyen: {user?.full_name} | Son Degisiklik: {updatedAt ? formatDateTime(updatedAt) : "-"}
        </p>

        <form className="form-grid" onSubmit={onSubmit}>
          <label>
            VAT (KDV) Rate
            <input
              name="vat_rate"
              type="number"
              step="0.01"
              value={form.vat_rate}
              onChange={onChange}
              required
            />
          </label>

          <label>
            Bonus Threshold (KM)
            <input
              name="bonus_threshold_km"
              type="number"
              step="0.01"
              value={form.bonus_threshold_km}
              onChange={onChange}
              required
            />
          </label>

          <label>
            Bonus Formula (Admin-defined)
            <textarea
              rows={4}
              name="bonus_formula"
              value={form.bonus_formula}
              onChange={onChange}
              placeholder="Ornek: Bonus = (ToplamKM - EsikKM) * 2.5"
            />
          </label>

          <button type="submit" className="primary-button">
            Ayarlari Kaydet
          </button>
        </form>
      </article>
    </section>
  );
}

export default ErpPage;
