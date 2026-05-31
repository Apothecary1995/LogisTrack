import { useEffect, useState } from "react";

import PageHeader from "../../components/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";

function SettingsPage() {
  const { user, updatePreferences, changePassword } = useAuth();
  const { language, changeLanguage, t, languages } = useLanguage();

  const [notifyEmail, setNotifyEmail] = useState(Boolean(user?.notify_email));
  const [notifyPush, setNotifyPush] = useState(Boolean(user?.notify_push));
  const [passwordForm, setPasswordForm] = useState({ current_password: "", new_password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setNotifyEmail(Boolean(user?.notify_email));
    setNotifyPush(Boolean(user?.notify_push));
  }, [user?.notify_email, user?.notify_push]);

  const onSavePreferences = async () => {
    setError("");
    setSuccess("");

    try {
      await updatePreferences({ notify_email: notifyEmail, notify_push: notifyPush });
      setSuccess("Tercihler guncellendi.");
    } catch (saveError) {
      setError(saveError.message);
    }
  };

  const onLanguageChange = async (event) => {
    const nextLanguage = event.target.value;
    setError("");
    setSuccess("");

    try {
      await changeLanguage(nextLanguage);
      setSuccess("Dil tercihi guncellendi.");
    } catch (languageError) {
      setError(languageError.message);
    }
  };

  const onPasswordChange = (event) => {
    setPasswordForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const onPasswordSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      await changePassword(passwordForm);
      setPasswordForm({ current_password: "", new_password: "" });
      setSuccess("Sifre basariyla guncellendi.");
    } catch (passwordError) {
      setError(passwordError.message);
    }
  };

  return (
    <section className="page-section">
      <PageHeader title={t("settings")} subtitle="Dil, bildirim ve guvenlik ayarlari" />

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      <article className="panel-card">
        <h2>{t("language")}</h2>
        <label>
          {t("language")}
          <select value={language} onChange={onLanguageChange}>
            {languages.map((entry) => (
              <option key={entry.code} value={entry.code}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
      </article>

      <article className="panel-card">
        <h2>{t("notifications")}</h2>
        <div className="form-grid">
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={notifyEmail}
              onChange={(event) => setNotifyEmail(event.target.checked)}
            />
            {t("email_notifications")}
          </label>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={notifyPush}
              onChange={(event) => setNotifyPush(event.target.checked)}
            />
            {t("push_notifications")}
          </label>
          <button type="button" className="primary-button" onClick={onSavePreferences}>
            {t("save_settings")}
          </button>
        </div>
      </article>

      <article className="panel-card">
        <h2>{t("change_password")}</h2>
        <form className="form-grid" onSubmit={onPasswordSubmit}>
          <label>
            {t("current_password")}
            <input
              type="password"
              name="current_password"
              value={passwordForm.current_password}
              onChange={onPasswordChange}
              required
            />
          </label>
          <label>
            {t("new_password")}
            <input
              type="password"
              name="new_password"
              value={passwordForm.new_password}
              onChange={onPasswordChange}
              required
              minLength={8}
            />
          </label>
          <button type="submit" className="primary-button">
            {t("update_password")}
          </button>
        </form>
      </article>
    </section>
  );
}

export default SettingsPage;
