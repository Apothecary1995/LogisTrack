import { Link, Outlet } from "react-router-dom";

import UserMenu from "../components/UserMenu";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import Sidebar from "../components/Sidebar";

function MainLayout() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="content-shell">
        <header className="topbar">
          <div>
            <p className="topbar-label">{t("company")}</p>
            <p className="topbar-company">{user?.company_name || "-"}</p>
          </div>
          <div className="topbar-actions">
            <Link to="/" className="ghost-button">
              {t("app_name")}
            </Link>
            <UserMenu user={user} onLogout={logout} />
          </div>
        </header>
        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
