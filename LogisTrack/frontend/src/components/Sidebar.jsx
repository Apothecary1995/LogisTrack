import { NavLink } from "react-router-dom";

import { useLanguage } from "../context/LanguageContext";

function Sidebar() {
  const { t } = useLanguage();
  const navSections = [
    {
      title: t("operation"),
      items: [
        { to: "/operation/dashboard", label: t("dashboard") },
        { to: "/operation/archive", label: t("archive") },
        { to: "/operation/fleet-manager", label: t("fleet_manager") },
      ],
    },
    {
      title: t("technic_finance"),
      items: [
        { to: "/technicfinance/service-repair", label: t("service_repair") },
        { to: "/technicfinance/fuel", label: t("fuel_tracking") },
        { to: "/technicfinance/payroll", label: t("payroll") },
      ],
    },
    {
      title: t("system"),
      items: [
        { to: "/system/employee", label: t("employee_cards") },
        { to: "/system/erp", label: t("erp_config") },
      ],
    },
  ];

  return (
    <aside className="sidebar">
      <div className="brand-block">
        <div className="brand-logo">LT</div>
        <div>
          <p className="brand-name">{t("app_name").toUpperCase()}</p>
          <p className="brand-subtitle">Fleet ERP</p>
        </div>
      </div>

      {navSections.map((section) => (
        <section key={section.title} className="nav-section">
          <p className="nav-title">{section.title}</p>
          <div className="nav-list">
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  isActive ? "nav-link nav-link-active" : "nav-link"
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </section>
      ))}

      <div className="sidebar-footer">
        <p>Sistem Durumu: Aktif</p>
        <p>Surum: 1.0.0</p>
      </div>
    </aside>
  );
}

export default Sidebar;
