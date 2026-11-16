import { Navigate, Route, Routes } from 'react-router-dom';
import ToastProvider from './components/ui/ToastProvider.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import { ProtectedRoute, RoleRoute } from './router/Guards.jsx';
import { homeForRole } from './router/routeMeta.js';
import LoginPage from './features/auth/LoginPage.jsx';
import ProfilePage from './features/auth/ProfilePage.jsx';
import ChangePasswordPage from './features/auth/ChangePasswordPage.jsx';
import ForbiddenPage from './pages/ForbiddenPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import AdminDashboardPage from './features/admin/AdminDashboardPage.jsx';
import AssignmentsPage from './features/admin/AssignmentsPage.jsx';
import CategoriesPage from './features/admin/CategoriesPage.jsx';
import DepartmentsPage from './features/admin/DepartmentsPage.jsx';
import EmployeeDetailPage from './features/admin/EmployeeDetailPage.jsx';
import EmployeesPage from './features/admin/EmployeesPage.jsx';
import ReportsPage from './features/admin/ReportsPage.jsx';
import UsersPage from './features/admin/UsersPage.jsx';
import AssetsPage from './features/assets/AssetsPage.jsx';
import AssetDetailPage from './features/assets/AssetDetailPage.jsx';
import EmployeeDashboardPage from './features/employee/EmployeeDashboardPage.jsx';
import EmployeeAssetsPage from './features/employee/EmployeeAssetsPage.jsx';
import NewRequestPage from './features/requests/NewRequestPage.jsx';
import RequestDetailPage from './features/requests/RequestDetailPage.jsx';
import RequestsListPage from './features/requests/RequestsListPage.jsx';
import MaintenanceDetailPage from './features/maintenance/MaintenanceDetailPage.jsx';
import MaintenanceListPage from './features/maintenance/MaintenanceListPage.jsx';
import TechnicianDashboardPage from './features/technician/TechnicianDashboardPage.jsx';

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={homeForRole(user.role)} replace />;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomeRedirect />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="change-password" element={<ChangePasswordPage />} />
              <Route path="403" element={<ForbiddenPage />} />

              <Route element={<RoleRoute roles={['admin']} />}>
                <Route path="admin/dashboard" element={<AdminDashboardPage />} />
                <Route path="admin/assets" element={<AssetsPage />} />
                <Route path="admin/assets/:id" element={<AssetDetailPage />} />
                <Route path="admin/assignments" element={<AssignmentsPage />} />
                <Route path="admin/requests" element={<RequestsListPage />} />
                <Route path="admin/requests/:id" element={<RequestDetailPage />} />
                <Route path="admin/maintenance" element={<MaintenanceListPage />} />
                <Route path="admin/maintenance/:id" element={<MaintenanceDetailPage />} />
                <Route path="admin/employees" element={<EmployeesPage />} />
                <Route path="admin/employees/:id" element={<EmployeeDetailPage />} />
                <Route path="admin/users" element={<UsersPage />} />
                <Route path="admin/departments" element={<DepartmentsPage />} />
                <Route path="admin/categories" element={<CategoriesPage />} />
                <Route path="admin/reports" element={<ReportsPage />} />
              </Route>

              <Route element={<RoleRoute roles={['employee']} />}>
                <Route path="me/dashboard" element={<EmployeeDashboardPage />} />
                <Route path="me/assets" element={<EmployeeAssetsPage />} />
                <Route path="me/assets/:id" element={<AssetDetailPage />} />
                <Route path="me/requests" element={<RequestsListPage />} />
                <Route path="me/requests/new" element={<NewRequestPage />} />
                <Route path="me/requests/:id" element={<RequestDetailPage />} />
              </Route>

              <Route element={<RoleRoute roles={['technician']} />}>
                <Route path="tech/dashboard" element={<TechnicianDashboardPage />} />
                <Route path="tech/assets" element={<AssetsPage />} />
                <Route path="tech/assets/:id" element={<AssetDetailPage />} />
                <Route path="tech/requests" element={<RequestsListPage />} />
                <Route path="tech/requests/:id" element={<RequestDetailPage />} />
                <Route path="tech/maintenance" element={<MaintenanceListPage />} />
                <Route path="tech/maintenance/:id" element={<MaintenanceDetailPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}
