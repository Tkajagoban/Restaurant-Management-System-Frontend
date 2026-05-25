import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/pages/login/Login";
import Dashboard from "./components/pages/DashboardOverview/Dashboard";
import ForgotPassword from "./components/pages/ForgotPassword/ForgotPassword";
import { OrderNotificationProvider } from "./contexts/OrderNotificationContext";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./api/ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OrderNotificationProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          </Routes>
        </OrderNotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
