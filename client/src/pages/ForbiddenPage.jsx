import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { homeForRole } from '../router/routeMeta.js';
import Button from '../components/ui/Button.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

export default function ForbiddenPage() {
  useDocumentTitle('Access denied');
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-rose-600">403</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
        You do not have access to this area
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-500">
        This route is outside your assigned role. The API would reject the underlying requests as
        well; the navigation restriction is only a usability aid.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link to={homeForRole(user?.role)}>
          <Button>Return to my dashboard</Button>
        </Link>
        <Link to="/profile">
          <Button variant="secondary">View my profile</Button>
        </Link>
      </div>
    </div>
  );
}
