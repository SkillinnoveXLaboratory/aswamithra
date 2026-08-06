import { useParams } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import StateBlock from '../components/StateBlock.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function PendingPage() {
  const { role } = useParams();
  const { user } = useAuth();
  return (
    <main className="pending-screen">
      <StateBlock
        type="success"
        title="Your account is waiting for approval"
        message={`${role?.toUpperCase()} access is currently pending KYC approval. You can log in, but the dashboard stays locked until admin approves your account.`}
        action={
          <div className="pending-actions">
            <div className="pill warn">Status: {user?.status || 'pending_kyc'}</div>
            <div className="notice"><ShieldAlert size={16} /> Please wait for admin approval before using the dashboard.</div>
          </div>
        }
      />
    </main>
  );
}
