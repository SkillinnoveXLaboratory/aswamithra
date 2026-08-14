import { Link, Redirect, useParams } from 'react-router-dom';
import { FilePenLine, ShieldAlert } from 'lucide-react';
import StateBlock from '../components/StateBlock.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { roleHome } from '../utils/format.js';

export default function PendingPage() {
  const { role } = useParams();
  const { user, isPendingApproval, needsOnboarding } = useAuth();
  const actualRole = user?.role || role;

  // Approved / active farmers should never stay on the waiting page.
  if (user && user.status === 'active') {
    return <Redirect to={roleHome(actualRole)} />;
  }

  if (needsOnboarding && actualRole) {
    return <Redirect to={`/onboarding/${actualRole}`} />;
  }

  if (user && !isPendingApproval && user.status !== 'pending_kyc') {
    return <Redirect to={roleHome(actualRole)} />;
  }

  return (
    <main className="pending-screen">
      <StateBlock
        type="success"
        title="Your account is waiting for approval"
        message={`${String(actualRole || role || 'farmer').toUpperCase()} access is currently pending KYC approval. You can log in, but the dashboard stays locked until admin approves your account.`}
        action={
          <div className="pending-actions">
            <div className="pill warn">Status: {user?.status || 'pending_kyc'}</div>
            <div className="notice"><ShieldAlert size={16} /> Please wait for admin approval before using the dashboard.</div>
            {(actualRole === 'farmer' || actualRole === 'b2b') ? (
              <Link className="btn btn-primary" to={`/onboarding/${actualRole}`}>
                <FilePenLine size={18} /> Update KYC details
              </Link>
            ) : null}
          </div>
        }
      />
    </main>
  );
}
