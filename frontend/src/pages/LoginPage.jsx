import { useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { ArrowRight, Leaf, LockKeyhole, Phone, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { roleHome } from '../utils/format.js';

const roles = [
  { key: 'customer', label: 'Customer', hint: 'Buy nearby fresh produce' },
  { key: 'farmer', label: 'Farmer', hint: 'Sell crops and manage orders' },
  { key: 'b2b', label: 'B2B', hint: 'Bulk buying and RFQs' },
  { key: 'admin', label: 'Admin', hint: 'Operations panel only' },
];

export default function LoginPage() {
  const [role, setRole] = useState('customer');
  const [mobile, setMobile] = useState('+919876543210');
  const [otp, setOtp] = useState('');
  const [pin, setPin] = useState('');
  const [step, setStep] = useState('mobile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { sendOtp, verifyOtp, loginPin, googleLogin } = useAuth();
  const history = useHistory();
  const location = useLocation();

  const redirectFor = (payload) => {
    const actualRole = payload.user?.role || role;
    if ((payload.isNewUser || payload.isPendingApproval) && actualRole !== 'admin' && actualRole !== 'customer') {
      history.push(`/pending/${actualRole}`);
      return;
    }
    if (payload.isNewUser && actualRole === 'customer') {
      history.push(`/onboarding/${actualRole}`);
      return;
    }
    if (payload.isNewUser) {
      history.push(`/onboarding/${actualRole}`);
      return;
    }
    if (payload.user?.status === 'pending_kyc' && actualRole !== 'customer') {
      history.push(`/pending/${actualRole}`);
      return;
    }
    history.push(location.state?.from || roleHome(actualRole));
  };

  const handleSendOtp = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await sendOtp({ mobile, role });
      setStep('otp');
      setMessage('OTP sent. For this development backend, any 6 digits will verify.');
    } catch (error) {
      setMessage(error?.response?.data?.message || 'Unable to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const payload = await verifyOtp({ mobile, otp, role });
      redirectFor(payload);
    } catch (error) {
      setMessage(error?.response?.data?.message || 'Unable to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginPin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const payload = await loginPin({ mobile, pin, role });
      redirectFor(payload);
    } catch (error) {
      setMessage(error?.response?.data?.message || 'Invalid mobile number or security PIN');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const payload = await googleLogin(role);
      redirectFor(payload);
    } catch (error) {
      setMessage(error?.response?.data?.message || 'Google login unavailable');
    } finally {
      setLoading(false);
    }
  };

  const heading =
    step === 'mobile' ? 'Choose role and enter mobile' : step === 'otp' ? 'Enter OTP' : 'Enter your 4-digit PIN';

  const onSubmit = step === 'mobile' ? handleSendOtp : step === 'otp' ? handleVerifyOtp : handleLoginPin;
  const submitLabel =
    loading ? 'Please wait...' : step === 'mobile' ? 'Send OTP' : step === 'otp' ? 'Verify and Continue' : 'Login with PIN';

  return (
    <main className="auth-screen">
      <section className="auth-visual">
        <div className="brand-script"><Leaf size={44} /> Aswamithra</div>
        <h1>Fresh harvest access for every role.</h1>
        <p>Customers buy simply. Farmers sell confidently. B2B buyers trade in bulk. Admins run the platform.</p>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-heading">
            <span><ShieldCheck size={19} /> Secure Login</span>
            <h2>{heading}</h2>
          </div>
          <div className="role-tabs">
            {roles.map((item) => (
              <button key={item.key} className={role === item.key ? 'active' : ''} type="button" onClick={() => setRole(item.key)}>
                <strong>{item.label}</strong>
                <span>{item.hint}</span>
              </button>
            ))}
          </div>
          <form onSubmit={onSubmit} className="auth-form">
            <label className="field icon-field">
              <span>Mobile number</span>
              <Phone size={18} />
              <input value={mobile} onChange={(event) => setMobile(event.target.value)} placeholder="+91 mobile number" required />
            </label>
            {step === 'otp' ? (
              <label className="field icon-field">
                <span>6 digit OTP</span>
                <LockKeyhole size={18} />
                <input value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="123456" minLength={4} required />
              </label>
            ) : null}
            {step === 'pin' ? (
              <label className="field icon-field">
                <span>4 digit security PIN</span>
                <LockKeyhole size={18} />
                <input
                  value={pin}
                  onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="1234"
                  inputMode="numeric"
                  minLength={4}
                  maxLength={4}
                  required
                />
              </label>
            ) : null}
            {message ? <div className="notice">{message}</div> : null}
            <button className="btn btn-primary full big" type="submit" disabled={loading}>
              {submitLabel} <ArrowRight size={20} />
            </button>
            {step === 'mobile' ? (
              <button className="btn btn-light full" type="button" onClick={() => { setStep('pin'); setMessage(''); }} disabled={loading}>
                Login with Security PIN
              </button>
            ) : null}
            {step === 'otp' ? (
              <button className="btn btn-light full" type="button" onClick={() => { setStep('pin'); setOtp(''); setMessage(''); }} disabled={loading}>
                Use Security PIN instead
              </button>
            ) : null}
            {step === 'pin' ? (
              <button className="btn btn-light full" type="button" onClick={() => { setStep('mobile'); setPin(''); setMessage(''); }} disabled={loading}>
                Back to OTP login
              </button>
            ) : null}
            <button className="btn btn-light full" type="button" onClick={handleGoogle} disabled={loading}>
              Continue with Google
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
