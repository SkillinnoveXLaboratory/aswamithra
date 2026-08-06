import { Redirect, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, isPendingApproval, user } = useAuth();
  const location = useLocation();

  if (isPendingApproval && user?.role && user.role !== 'customer') {
    return <Redirect to={`/pending/${user.role}`} />;
  }

  if (!isAuthenticated) {
    return <Redirect to={{ pathname: '/login', state: { from: location.pathname } }} />;
  }

  if (allowedRoles?.length && !allowedRoles.includes(user?.role)) {
    return <Redirect to={`/${user?.role || 'customer'}/home`} />;
  }

  return children;
}
