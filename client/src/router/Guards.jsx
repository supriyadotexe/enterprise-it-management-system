import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { PageLoader } from '../components/ui/States.jsx';

export function ProtectedRoute() {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <PageLoader label="Restoring your session…" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  return <Outlet />;
}

export function RoleRoute({ roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/403" replace />;
  return <Outlet />;
}
