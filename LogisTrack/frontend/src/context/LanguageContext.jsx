import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { useAuth } from "./AuthContext";

const LANGUAGE_STORAGE_KEY = "logitarget_language";

const translations = {
  tr: {
    app_name: "LogiTarget",
    tagline: "Kisellestirilebilir Hizli Lojistik Takip Sistemi",
    login: "Giris",
    register: "Kayit Ol",
    profile: "Profil",
    settings: "Ayarlar",
    logout: "Cikis",
    company: "Sirket",
    member_since: "Uyelik Tarihi",
    registered_user_count: "Kayitli Kullanici Sayisi",
    open_dashboard: "Panele Git",
    operation: "Operasyonel",
    technic_finance: "Teknik & Finans",
    system: "Sistem",
    dashboard: "Dashboard",
    archive: "Sefer Arsivi",
    fleet_manager: "Filo Yonetimi",
    service_repair: "Servis & Bakim",
    fuel_tracking: "Yakit Takibi",
    payroll: "Muhasebe / Bordro",
    employee_cards: "Personel Kartlari",
    erp_config: "ERP Konfigurasyonu",
    language: "Dil",
    notifications: "Bildirimler",
    email_notifications: "E-posta Bildirimleri",
    push_notifications: "Push Bildirimleri",
    save_settings: "Ayarlari Kaydet",
    change_password: "Sifre Degistir",
    current_password: "Mevcut Sifre",
    new_password: "Yeni Sifre",
    update_password: "Sifreyi Guncelle",
    home_subtitle: "Sirketinize ozel hizli lojistik operasyon yonetimi.",
  },
  en: {
    app_name: "LogiTarget",
    tagline: "Customizable Fast Logistics Tracking System",
    login: "Login",
    register: "Register",
    profile: "Profile",
    settings: "Settings",
    logout: "Logout",
    company: "Company",
    member_since: "Membership Date",
    registered_user_count: "Registered User Count",
    open_dashboard: "Open Dashboard",
    operation: "Operation",
    technic_finance: "Technic & Finance",
    system: "System",
    dashboard: "Dashboard",
    archive: "Archive",
    fleet_manager: "Fleet Manager",
    service_repair: "Service & Repair",
    fuel_tracking: "Fuel Tracking",
    payroll: "Payroll",
    employee_cards: "Employee Records",
    erp_config: "ERP Configuration",
    language: "Language",
    notifications: "Notifications",
    email_notifications: "Email Notifications",
    push_notifications: "Push Notifications",
    save_settings: "Save Settings",
    change_password: "Change Password",
    current_password: "Current Password",
    new_password: "New Password",
    update_password: "Update Password",
    home_subtitle: "Fast logistics operation management customized for your company.",
  },
  bs: {
    app_name: "LogiTarget",
    tagline: "Prilagodljiv Brzi Sistem za Pracenje Logistike",
    login: "Prijava",
    register: "Registracija",
    profile: "Profil",
    settings: "Postavke",
    logout: "Odjava",
    company: "Kompanija",
    member_since: "Datum Clanstva",
    registered_user_count: "Broj Registrovanih Korisnika",
    open_dashboard: "Otvori Panel",
    operation: "Operacije",
    technic_finance: "Tehnika i Finansije",
    system: "Sistem",
    dashboard: "Kontrolna Tabla",
    archive: "Arhiva",
    fleet_manager: "Upravljanje Vozilima",
    service_repair: "Servis i Popravka",
    fuel_tracking: "Pracenje Goriva",
    payroll: "Plata i Racunovodstvo",
    employee_cards: "Evidencija Osoblja",
    erp_config: "ERP Konfiguracija",
    language: "Jezik",
    notifications: "Obavijesti",
    email_notifications: "Email Obavijesti",
    push_notifications: "Push Obavijesti",
    save_settings: "Sacuvaj Postavke",
    change_password: "Promijeni Lozinku",
    current_password: "Trenutna Lozinka",
    new_password: "Nova Lozinka",
    update_password: "Azuriraj Lozinku",
    home_subtitle: "Brzo upravljanje logistickim operacijama prilagodeno vasoj kompaniji.",
  },
};

const LanguageContext = createContext(null);

function loadStoredLanguage() {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY) || "tr";
  } catch {
    return "tr";
  }
}

export function LanguageProvider({ children }) {
  const { user, isAuthenticated, updatePreferences } = useAuth();
  const [language, setLanguageState] = useState(loadStoredLanguage());

  const setLanguage = useCallback((nextLanguage) => {
    const safeLanguage = ["tr", "en", "bs"].includes(nextLanguage) ? nextLanguage : "tr";
    setLanguageState(safeLanguage);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, safeLanguage);
  }, []);

  useEffect(() => {
    if (user?.preferred_language && user.preferred_language !== language) {
      setLanguage(user.preferred_language);
    }
  }, [user?.preferred_language, language, setLanguage]);

  const changeLanguage = useCallback(
    async (nextLanguage) => {
      setLanguage(nextLanguage);
      if (isAuthenticated) {
        await updatePreferences({ preferred_language: nextLanguage });
      }
    },
    [isAuthenticated, setLanguage, updatePreferences]
  );

  const t = useCallback(
    (key) => {
      return translations[language]?.[key] || translations.tr[key] || key;
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      changeLanguage,
      t,
      languages: [
        { code: "tr", label: "Turkce" },
        { code: "en", label: "English" },
        { code: "bs", label: "Bosanski" },
      ],
    }),
    [language, changeLanguage, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return context;
}
