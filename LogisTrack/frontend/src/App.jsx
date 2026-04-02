import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import MainLayout from "./layouts/MainLayout";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/account/ProfilePage";
import SettingsPage from "./pages/account/SettingsPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import RegisterPage from "./pages/auth/RegisterPage";
import SignInPage from "./pages/auth/SignInPage";
import ArchivePage from "./pages/operation/ArchivePage";
import DashboardPage from "./pages/operation/DashboardPage";
import FleetManagerPage from "./pages/operation/FleetManagerPage";
import EmployeePage from "./pages/system/EmployeePage";
import ErpPage from "./pages/system/ErpPage";
import FuelPage from "./pages/technicfinance/FuelPage";
import PayrollPage from "./pages/technicfinance/PayrollPage";
import ServiceRepairPage from "./pages/technicfinance/ServiceRepairPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />

        <Route path="/operation" element={<Navigate to="/operation/dashboard" replace />} />
        <Route path="/operation/dashboard" element={<DashboardPage />} />
        <Route path="/operation/archive" element={<ArchivePage />} />
        <Route path="/operation/fleet-manager" element={<FleetManagerPage />} />

        <Route path="/technicfinance" element={<Navigate to="/technicfinance/service-repair" replace />} />
        <Route path="/technicfinance/service-repair" element={<ServiceRepairPage />} />
        <Route path="/technicfinance/fuel" element={<FuelPage />} />
        <Route path="/technicfinance/payroll" element={<PayrollPage />} />

        <Route path="/system" element={<Navigate to="/system/employee" replace />} />
        <Route path="/employee" element={<Navigate to="/system/employee" replace />} />
        <Route path="/system/employee" element={<EmployeePage />} />
        <Route path="/system/employee-information" element={<Navigate to="/system/employee" replace />} />
        <Route path="/erp" element={<Navigate to="/system/erp" replace />} />
        <Route path="/system/erp" element={<ErpPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
