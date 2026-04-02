import { useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";

function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setIsSubmitting(true);

    try {
      const response = await forgotPassword(email);
      setMessage(response?.message || "Reset talebi alindi.");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1>Sifre Sifirlama</h1>
        <p>E-posta adresinizi girin. Sistem reset talebini olusturur.</p>

        <form onSubmit={onSubmit} className="form-grid">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          {message ? <p className="form-success">{message}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}

          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? "Gonderiliyor..." : "Reset Linki Gonder"}
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

export default ForgotPasswordPage;
