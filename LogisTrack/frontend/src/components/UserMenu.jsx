import { useState } from "react";
import { Link } from "react-router-dom";

import { useLanguage } from "../context/LanguageContext";

function UserMenu({ user, onLogout }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <div className="user-menu" onMouseLeave={() => setOpen(false)}>
      <button type="button" className="ghost-button user-menu-button" onClick={() => setOpen((prev) => !prev)}>
        {user?.full_name || t("profile")}
      </button>
      {open ? (
        <div className="user-menu-dropdown">
          <Link to="/profile" className="user-menu-item" onClick={() => setOpen(false)}>
            {t("profile")}
          </Link>
          <Link to="/settings" className="user-menu-item" onClick={() => setOpen(false)}>
            {t("settings")}
          </Link>
          <button
            type="button"
            className="user-menu-item"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            {t("logout")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default UserMenu;
