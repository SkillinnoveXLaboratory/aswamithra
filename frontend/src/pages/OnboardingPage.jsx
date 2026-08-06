import { useState } from 'react';
import { Redirect, useHistory, useParams } from 'react-router-dom';
import { CheckCircle2, MapPin } from 'lucide-react';
import FormField from '../components/FormField.jsx';
import StateBlock from '../components/StateBlock.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { endpoints, unwrap } from '../services/api.js';
import { roleHome } from '../utils/format.js';

const forms = {
  customer: [
    ['name', 'Full name', 'text'], ['address', 'Address', 'textarea'], ['landmark', 'Landmark', 'text'], ['pincode', 'Pincode', 'text'],
    ['city', 'City', 'text'], ['state', 'State', 'text'], ['lat', 'Latitude', 'number'], ['lng', 'Longitude', 'number'], ['language', 'Preferred language', 'select'],
  ],
  farmer: [
    ['name', 'Full name', 'text'], ['village', 'Village', 'text'], ['mandal', 'Mandal', 'text'], ['district', 'District', 'text'], ['state', 'State', 'text'],
    ['pincode', 'Pincode', 'text'], ['lat', 'Farm latitude', 'number'], ['lng', 'Farm longitude', 'number'], ['aadhaarNumber', 'Aadhaar number', 'text'],
    ['aadhaarDocumentUrl', 'Aadhaar document URL', 'text'], ['bankAccountName', 'Bank account name', 'text'], ['bankAccountNumber', 'Bank account number', 'text'],
    ['ifscCode', 'IFSC code', 'text'], ['cropsGrown', 'Crops grown', 'text'], ['landSizeAcres', 'Land size in acres', 'number'],
  ],
  b2b: [
    ['businessName', 'Business name', 'text'], ['ownerName', 'Owner name', 'text'], ['businessEmail', 'Business email', 'email'], ['gstin', 'GSTIN', 'text'],
    ['businessType', 'Business type', 'select'], ['address', 'Business address', 'textarea'], ['lat', 'Latitude', 'number'], ['lng', 'Longitude', 'number'],
    ['tradeLicenseDocument', 'Trade license document URL', 'text'],
  ],
};

const defaults = {
  state: 'Andhra Pradesh',
  city: 'Vijayawada',
  lat: '16.5062',
  lng: '80.6480',
  language: 'Telugu',
  businessType: 'Retailer',
};

export default function OnboardingPage() {
  const { role } = useParams();
  const { user, setUser } = useAuth();
  const history = useHistory();
  const [form, setForm] = useState({ ...defaults, name: user?.name || '', mobile: user?.mobile || '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!forms[role] || role === 'admin') return <Redirect to={roleHome(user?.role)} />;

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    const payload = { ...form, mobile: user?.mobile, userId: user?.id };
    try {
      if (role === 'customer') await endpoints.customerOnboarding(payload);
      if (role === 'farmer') await endpoints.farmerOnboarding(payload);
      if (role === 'b2b') await endpoints.b2bOnboarding(payload);
      const nextUser = { ...user, name: form.name || form.businessName || user.name, status: role === 'customer' ? 'active' : 'pending_kyc' };
      localStorage.setItem('aswamithra_user', JSON.stringify(nextUser));
      setUser(nextUser);
      setDone(true);
      setTimeout(() => history.push(role === 'customer' ? roleHome(role) : `/pending/${role}`), 900);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="onboarding-screen">
      <section className="onboarding-card">
        <div className="section-heading compact">
          <span className="eyebrow"><MapPin size={17} /> Finish setup</span>
          <h1>{role === 'b2b' ? 'B2B business onboarding' : `${role} onboarding`}</h1>
          <p>Fill the required details once. The backend saves it and opens the right dashboard.</p>
        </div>
        {done ? <StateBlock type="success" title="Submitted successfully" message="Redirecting you now." /> : null}
        <form onSubmit={handleSubmit} className="form-grid">
          {forms[role].map(([name, label, type]) => (
            <FormField
              key={name}
              name={name}
              label={label}
              type={type}
              value={form[name]}
              onChange={handleChange}
              required={['name', 'businessName', 'address', 'pincode', 'village', 'gstin'].includes(name)}
              options={name === 'language' ? ['Telugu', 'Hindi', 'English'] : ['Retailer', 'Hotel', 'Mill', 'Wholesaler']}
            />
          ))}
          <button className="btn btn-primary big form-submit" type="submit" disabled={loading}>
            <CheckCircle2 size={20} /> {loading ? 'Submitting...' : 'Submit onboarding'}
          </button>
        </form>
      </section>
    </main>
  );
}
