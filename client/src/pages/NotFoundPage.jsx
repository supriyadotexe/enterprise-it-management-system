import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { homeForRole } from '../router/routeMeta.js';
import Button from '../components/ui/Button.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

export default function NotFoundPage() {
  useDocumentTitle('Page not found');
  const { user } = useAuth();
  const target = user ? homeForRole(user.role) : '/login';

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-6">
      <div className="max-w-md text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Page not found
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          The page you requested does not exist or has moved.
        </p>
        <Link to={target} className="mt-6 inline-flex">
          <Button>{user ? 'Return to dashboard' : 'Go to sign in'}</Button>
        </Link>
      </div>
    </main>
  );
}
