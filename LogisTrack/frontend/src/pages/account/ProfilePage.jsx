import PageHeader from "../../components/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { formatDate } from "../../lib/formatters";

function ProfilePage() {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <section className="page-section">
      <PageHeader title={t("profile")} subtitle={`${t("app_name")} kullanici profili`} />

      <article className="panel-card profile-grid">
        <div>
          <p className="profile-label">Email</p>
          <h3>{user?.email || "-"}</h3>
        </div>
        <div>
          <p className="profile-label">Ad Soyad</p>
          <h3>{user?.full_name || "-"}</h3>
        </div>
        <div>
          <p className="profile-label">{t("company")}</p>
          <h3>{user?.company_name || "-"}</h3>
        </div>
        <div>
          <p className="profile-label">{t("member_since")}</p>
          <h3>{formatDate(user?.date_joined)}</h3>
        </div>
      </article>
    </section>
  );
}

export default ProfilePage;
