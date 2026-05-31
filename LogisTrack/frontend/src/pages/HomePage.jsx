import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import UserMenu from "../components/UserMenu";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { publicRequest } from "../lib/apiClient";

function HomePage() {
  const { isAuthenticated, user, logout } = useAuth();
  const { t } = useLanguage();
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    publicRequest("/users/count/")
      .then((response) => {
        if (mounted) {
          setUserCount(response?.registered_user_count || 0);
        }
      })
      .catch(() => {
        if (mounted) {
          setUserCount(0);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="home-shell">
      <header className="home-topbar">
        <div className="home-brand">
          <div className="brand-logo">LT</div>
          <div>
            <p className="brand-name">{t("app_name")}</p>
            <p className="brand-subtitle">{t("tagline")}</p>
          </div>
        </div>

        <div className="home-actions">
          {isAuthenticated ? (
            <>
              <Link className="danger-button" to="/operation/dashboard">
                {t("open_dashboard")}
              </Link>
              <UserMenu user={user} onLogout={logout} />
            </>
          ) : (
            <>
              <Link className="ghost-button" to="/signin">
                {t("login")}
              </Link>
              <Link className="danger-button" to="/register">
                {t("register")}
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="home-hero">
        <p className="home-kicker">{t("app_name")}</p>
        <h1>{t("tagline")}</h1>
        <p>{t("home_subtitle")}</p>

        <div className="home-stat">
          <p>{t("registered_user_count")}</p>
          <h2>{userCount}</h2>
        </div>
      </main>
    </div>
  );
}

export default HomePage;
