import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";

function SignInPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { t } = useLanguage();
  const [form, setForm] = useState({ email: "", password: "" });
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
      await signIn(form);
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
        <h1>{t("app_name")} {t("login")}</h1>
        <p>Filo operasyon, teknik-finans ve ERP yonetimini tek panelden yonetin.</p>

        <form onSubmit={onSubmit} className="form-grid">
          <label>
            E-Posta
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={onChange}
              placeholder="ornek@sirket.com"
              required
            />
          </label>

          <label>
            Sifre
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={onChange}
              placeholder="Sifrenizi girin"
              required
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button type="submit" disabled={isSubmitting} className="primary-button">
            {isSubmitting ? "Giris yapiliyor..." : "Login"}
          </button>

          <div className="auth-links">
            <Link className="link-button" to="/forgot-password">
              Forgot Password
            </Link>
            <Link className="link-button" to="/register">
              {t("register")}
            </Link>
          </div>
          <Link className="link-button" to="/">
            {t("app_name")}
          </Link>
        </form>
      </div>
    </div>
  );
}

export default SignInPage;
