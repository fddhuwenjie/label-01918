import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Contracts from './pages/Contracts';
import ContractDetail from './pages/ContractDetail';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Consultants from './pages/Consultants';
import ConsultantDetail from './pages/ConsultantDetail';
import Users from './pages/Users';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Logs from './pages/Logs';
import Approvals from './pages/Approvals';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="contracts" element={<Contracts />} />
        <Route path="contracts/:id" element={<ContractDetail />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="consultants" element={<Consultants />} />
        <Route path="consultants/:id" element={<ConsultantDetail />} />
        <Route path="users" element={<Users />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="reports" element={<Reports />} />
        <Route path="approvals" element={<Approvals />} />
        <Route path="settings" element={<Settings />} />
        <Route path="logs" element={<Logs />} />
      </Route>
    </Routes>
  );
}
