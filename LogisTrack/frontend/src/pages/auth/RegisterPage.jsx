import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";

const initialForm = {
  email: "",
  full_name: "",
  password: "",
  company_name: "",
};

function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { t } = useLanguage();
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const onChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await register(form);
      navigate("/operation/dashboard", { replace: true });
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1>Hesap Olustur</h1>
        <p>E-Posta, Ad Soyad, Sifre ve Sirket bilgisiyle yeni kullanici olusturun.</p>

        <form onSubmit={onSubmit} className="form-grid">
          <label>
            Email
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={onChange}
              required
            />
          </label>

          <label>
            Full Name
            <input
              type="text"
              name="full_name"
              value={form.full_name}
              onChange={onChange}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={onChange}
              minLength={8}
              required
            />
          </label>

          <label>
            Company Name
            <input
              type="text"
              name="company_name"
              value={form.company_name}
              onChange={onChange}
              required
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button type="submit" disabled={isSubmitting} className="primary-button">
            {isSubmitting ? "Olusturuluyor..." : t("register")}
          </button>

          <Link to="/signin" className="link-button">
            Giris ekranina don
          </Link>
          <Link to="/" className="link-button">
            {t("app_name")}
          </Link>
        </form>
      </div>
    </div>
  );
}

export default RegisterPage;
