import { Redirect, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { roleHome } from '../utils/format.js';

export default function ProtectedRoute({ allowedRoles, children, allowOnboarding = false }) {
  const { isAuthenticated, isPendingApproval, needsOnboarding, user } = useAuth();
  const location = useLocation();
  const onOnboardingPath = location.pathname.startsWith('/onboarding');
  const onPendingPath = location.pathname.startsWith('/pending');

  if (!isAuthenticated) {
    return <Redirect to={{ pathname: '/login', state: { from: location.pathname } }} />;
  }

  // Active accounts should never be trapped on pending/onboarding gates.
  if (user?.status === 'active') {
    if (allowedRoles?.length && !allowedRoles.includes(user?.role)) {
      return <Redirect to={roleHome(user.role)} />;
    }
    return children;
  }

  if (needsOnboarding && user?.role && user.role !== 'customer' && !onOnboardingPath && !allowOnboarding) {
    return <Redirect to={`/onboarding/${user.role}`} />;
  }

  if (isPendingApproval && user?.role && user.role !== 'customer' && !onPendingPath && !onOnboardingPath) {
    return <Redirect to={`/pending/${user.role}`} />;
  }

  if (allowedRoles?.length && !allowedRoles.includes(user?.role)) {
    return <Redirect to={roleHome(user?.role)} />;
  }

  return children;
}
