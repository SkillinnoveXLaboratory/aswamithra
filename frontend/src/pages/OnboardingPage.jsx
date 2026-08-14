import { useEffect, useState } from 'react';
import { Redirect, useHistory, useParams } from 'react-router-dom';
import { CheckCircle2, MapPin, Search } from 'lucide-react';
import FormField from '../components/FormField.jsx';
import ImageUploadField from '../components/ImageUploadField.jsx';
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
    ['name', 'Full name', 'text'], ['mobile', 'Phone number', 'tel'], ['village', 'Village', 'text'], ['mandal', 'Mandal', 'text'],
    ['district', 'District', 'text'], ['state', 'State', 'text'], ['pincode', 'Pincode', 'text'], ['lat', 'Farm latitude', 'number'],
    ['lng', 'Farm longitude', 'number'], ['aadhaarNumber', 'Aadhaar number', 'text'], ['aadhaarDocumentUrl', 'Aadhaar document', 'upload'],
    ['gstin', 'GSTIN (optional)', 'text'], ['bankAccountName', 'Bank account name', 'text'], ['bankAccountNumber', 'Bank account number', 'text'],
    ['ifscCode', 'IFSC code', 'text'], ['cropsGrown', 'Crops grown', 'text'], ['landSizeAcres', 'Land size in acres', 'number'],
  ],
  b2b: [
    ['businessName', 'Business name', 'text'], ['ownerName', 'Owner name', 'text'], ['businessEmail', 'Business email', 'email'],
    ['gstin', 'GSTIN (optional)', 'text'], ['businessType', 'Business type', 'select'], ['address', 'Business address', 'text'],
    ['lat', 'Latitude', 'number'], ['lng', 'Longitude', 'number'], ['tradeLicenseDocument', 'Trade license document', 'upload'],
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

const farmerRequired = [
  'name', 'village', 'mandal', 'district', 'state', 'pincode', 'lat', 'lng',
  'aadhaarNumber', 'bankAccountName', 'bankAccountNumber', 'ifscCode', 'cropsGrown', 'landSizeAcres',
];

function cleanValue(value) {
  if (value === null || value === undefined) return '';
  const text = String(value).trim();
  if (!text) return '';
  // Do not put masked KYC values back into editable fields.
  if (/^X{2,}/i.test(text)) return '';
  return text;
}

function firstDoc(kyc, detailsKey) {
  const details = kyc?.details || {};
  return cleanValue(details[detailsKey]) || cleanValue((kyc?.documents || [])[0]);
}

function mapKycToForm(kyc, role, user) {
  const d = kyc?.details || {};
  if (role === 'farmer') {
    return {
      name: cleanValue(kyc?.name) || cleanValue(d.fullName) || cleanValue(user?.name) || '',
      mobile: cleanValue(kyc?.mobile) || cleanValue(d.mobile) || cleanValue(user?.mobile) || '',
      village: cleanValue(kyc?.village) || cleanValue(d.village),
      mandal: cleanValue(kyc?.mandal) || cleanValue(d.mandal),
      district: cleanValue(kyc?.district) || cleanValue(d.district),
      state: cleanValue(kyc?.state) || cleanValue(d.state) || defaults.state,
      pincode: cleanValue(kyc?.pincode) || cleanValue(d.pincode),
      lat: cleanValue(kyc?.lat) || cleanValue(d.lat) || defaults.lat,
      lng: cleanValue(kyc?.lng) || cleanValue(d.lng) || defaults.lng,
      aadhaarNumber: cleanValue(kyc?.aadhaarNumber) || cleanValue(d.aadhaarNumber),
      aadhaarDocumentUrl: firstDoc(kyc, 'aadhaarDocumentUrl'),
      gstin: cleanValue(kyc?.gstin) || cleanValue(d.gstin),
      bankAccountName: cleanValue(kyc?.bankAccountName) || cleanValue(d.bankAccountName),
      bankAccountNumber: cleanValue(kyc?.bankAccountNumber) || cleanValue(d.bankAccountNumber),
      ifscCode: cleanValue(kyc?.ifsc) || cleanValue(d.ifscCode),
      cropsGrown: cleanValue(kyc?.cropsGrown) || cleanValue(d.cropsGrown),
      landSizeAcres: cleanValue(kyc?.landSizeAcres) || cleanValue(d.landSizeAcres),
    };
  }
  if (role === 'b2b') {
    return {
      businessName: cleanValue(kyc?.businessName) || cleanValue(d.businessName) || cleanValue(kyc?.name),
      ownerName: cleanValue(kyc?.ownerName) || cleanValue(d.ownerName),
      businessEmail: cleanValue(kyc?.businessEmail) || cleanValue(d.businessEmail),
      gstin: cleanValue(kyc?.gstin) || cleanValue(d.gstin),
      businessType: cleanValue(kyc?.businessType) || cleanValue(d.businessType) || defaults.businessType,
      address: cleanValue(kyc?.address) || cleanValue(d.address),
      lat: cleanValue(kyc?.lat) || cleanValue(d.lat) || defaults.lat,
      lng: cleanValue(kyc?.lng) || cleanValue(d.lng) || defaults.lng,
      tradeLicenseDocument: firstDoc(kyc, 'tradeLicenseDocument'),
      mobile: cleanValue(kyc?.mobile) || cleanValue(d.mobile) || cleanValue(user?.mobile),
    };
  }
  return { ...defaults, name: cleanValue(user?.name), mobile: cleanValue(user?.mobile) };
}

export default function OnboardingPage() {
  const { role } = useParams();
  const { user, setUser, token } = useAuth();
  const history = useHistory();
    const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [loadedFromKyc, setLoadedFromKyc] = useState(false);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadExisting() {
      setLoadingExisting(true);
      setError('');

      if (!forms[role] || role === 'admin') {
        if (active) setLoadingExisting(false);
        return;
      }

      if (role === 'customer') {
        if (active) {
          setForm({ ...defaults, name: user?.name || '', mobile: user?.mobile || '' });
          setLoadingExisting(false);
        }
        return;
      }

      if (!token || !user?.id) {
        if (active) {
          setForm({ ...defaults, name: user?.name || '', mobile: user?.mobile || '' });
          setLoadingExisting(false);
        }
        return;
      }

      try {
        const existing = unwrap(await endpoints.myKycSubmission(user.id));
        if (!active) return;
        if (existing && (existing.id || existing.userId)) {
          setForm(mapKycToForm(existing, role, user));
          setLoadedFromKyc(true);
        } else {
          setForm({
            ...defaults,
            name: role === 'farmer' ? (user?.name || '') : '',
            mobile: user?.mobile || '',
            businessName: role === 'b2b' ? (user?.name || '') : '',
          });
          setLoadedFromKyc(false);
        }
      } catch (err) {
        if (!active) return;
        setForm({
          ...defaults,
          name: user?.name || '',
          mobile: user?.mobile || '',
        });
        setError(err?.response?.data?.error?.message || 'Could not load existing KYC. You can still fill and submit.');
        setLoadedFromKyc(false);
      } finally {
        if (active) setLoadingExisting(false);
      }
    }
    loadExisting();
    return () => { active = false; };
  }, [role, token, user?.id]);

  if (!forms[role] || role === 'admin') return <Redirect to={roleHome(user?.role)} />;
  if (user?.role && user.role !== role) {
    // Never send a farmer/B2B user to admin (or any mismatched portal).
    if (user.role === 'farmer' || user.role === 'b2b') {
      return <Redirect to={user.status === 'pending_kyc' ? `/pending/${user.role}` : user.status === 'needs_onboarding' ? `/onboarding/${user.role}` : roleHome(user.role)} />;
    }
    return <Redirect to={roleHome(user.role)} />;
  }

    const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const searchLocation = async () => {
    if (!form.address?.trim()) {
      setSearchError('Please enter a business address to search.');
      return;
    }
    setSearchError('');
    try {
      const encoded = encodeURIComponent(form.address);
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encoded}`, {
        headers: { 'User-Agent': 'Aswamithra-App' },
      });
      const results = await response.json();
      if (results && results.length > 0) {
        const first = results[0];
        setForm((current) => ({
          ...current,
          address: first.display_name || current.address,
          lat: first.lat,
          lng: first.lon,
        }));
      } else {
        setSearchError('No results found for the given address.');
      }
    } catch (err) {
      setSearchError('Geocoding failed. Please try again.');
    }
  };



  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!user?.id) {
      setError('Your login session is missing. Please log in again and retry onboarding.');
      return;
    }

    if (role === 'farmer') {
      for (const field of farmerRequired) {
        if (!String(form[field] || '').trim()) {
          setError(`Please fill ${field.replace(/([A-Z])/g, ' $1').toLowerCase()} before submitting.`);
          return;
        }
      }
      if (!form.aadhaarDocumentUrl) {
        setError('Please upload your Aadhaar document before submitting.');
        return;
      }
    }
    if (role === 'b2b' && !form.tradeLicenseDocument) {
      setError('Please upload your trade license document before submitting.');
      return;
    }

    setLoading(true);
    const payload = {
      ...form,
      mobile: user.mobile,
      userId: user.id,
      name: form.name || form.businessName || user.name,
    };
    try {
      let saved = null;
      if (role === 'customer') saved = unwrap(await endpoints.customerOnboarding(payload));
      if (role === 'farmer') saved = unwrap(await endpoints.farmerOnboarding(payload));
      if (role === 'b2b') saved = unwrap(await endpoints.b2bOnboarding(payload));

      if (role === 'farmer' && saved && !(saved.details?.state || saved.state)) {
        throw new Error('KYC save incomplete. Please try submitting again.');
      }

      const nextUser = {
        ...user,
        name: form.name || form.businessName || user.name,
        status: role === 'customer' ? 'active' : 'pending_kyc',
      };
      localStorage.setItem('aswamithra_user', JSON.stringify(nextUser));
      localStorage.removeItem('aswamithra_needs_onboarding');
      if (role === 'customer') localStorage.removeItem('aswamithra_pending_approval');
      else localStorage.setItem('aswamithra_pending_approval', 'true');
      setUser(nextUser);
      setDone(true);
      setTimeout(() => history.push(role === 'customer' ? roleHome(role) : `/pending/${role}`), 900);
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || 'Onboarding submission failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
        <main className="onboarding-screen px-4 sm:px-6 py-8">
      <section className="onboarding-card max-w-2xl mx-auto w-full">
        <div className="section-heading compact">
          <span className="eyebrow"><MapPin size={17} /> Finish setup</span>
          <h1>{role === 'b2b' ? 'B2B business onboarding' : `${role} onboarding`}</h1>
          <p>
            {loadedFromKyc
              ? 'Your previously submitted KYC details are loaded below. Update anything needed, then submit again.'
              : 'Fill every required detail. These exact values are shown to admin in KYC review.'}
          </p>
        </div>
        {loadingExisting ? <StateBlock title="Loading your KYC form..." message="Fetching previously submitted details." /> : null}
        {done ? <StateBlock type="success" title="Submitted successfully" message="Redirecting you now." /> : null}
        {error ? <div className="notice">{error}</div> : null}
        {!loadingExisting ? (
          <form onSubmit={handleSubmit} className="form-grid w-full">
            {role === 'b2b' ? (
              <>
                {forms[role].slice(0, 5).map(([name, label, type]) => (
                  type === 'upload' ? (
                    <ImageUploadField
                      key={name}
                      label={label}
                      value={form[name] || ''}
                      onChange={(url) => setForm((current) => ({ ...current, [name]: url }))}
                      required={name === 'tradeLicenseDocument'}
                      folder="kyc"
                      accept="document"
                      helpText="Upload a clear trade license photo or PDF for verification."
                    />
                  ) : (
                    <FormField
                      key={name}
                      name={name}
                      label={label}
                      type={type}
                      value={form[name] || ''}
                      onChange={handleChange}
                      options={name === 'businessType' ? ['Retailer', 'Hotel', 'Mill', 'Wholesaler'] : undefined}
                      required={name === 'businessName'}
                    />
                  )
                ))}
                                {/* Standard Form Field Styled Business Address with Search Button */}
                <div className="w-full">
                  <label className="field-label" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: 7 }}>
                    Business address <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full">
                    <div className="field flex-1 w-full min-w-0" style={{ alignSelf: 'stretch' }}>
                      <input
                        type="text"
                        name="address"
                        value={form.address || ''}
                        onChange={handleChange}
                        placeholder="Enter business address (e.g. Deganga, West Bengal, India)"
                        required
                      />
                    </div>
                    <button
                      type="button"
                      onClick={searchLocation}
                      className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-all text-sm shadow-sm flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                      style={{ height: 48 }}
                    >
                      <Search size={16} />
                      <span>Search Location</span>
                    </button>
                  </div>
                </div>

                {/* Responsive Latitude & Longitude Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  <FormField
                    label="Latitude"
                    name="lat"
                    type="number"
                    step="any"
                    value={form.lat || defaults.lat}
                    onChange={handleChange}
                    required
                  />
                  <FormField
                    label="Longitude"
                    name="lng"
                    type="number"
                    step="any"
                    value={form.lng || defaults.lng}
                    onChange={handleChange}
                    required
                  />
                </div>

                {form.lat && form.lng ? (
                  <div className="landing-map-wrapper w-full overflow-hidden rounded-lg shadow-sm" style={{ marginTop: '8px' }}>
                    <iframe
                      title="Business Location Map Preview"
                      width="100%"
                      height="200"
                      frameBorder="0"
                      scrolling="no"
                      marginHeight={0}
                      marginWidth={0}
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(form.lng) - 0.005},${Number(form.lat) - 0.005},${Number(form.lng) + 0.005},${Number(form.lat) + 0.005}&layer=mapnik&marker=${form.lat},${form.lng}`}
                      style={{ border: 0, borderRadius: '8px', width: '100%' }}
                    />
                  </div>
                ) : null}

                {searchError ? <p className="form-error text-red-600 text-sm mt-1">{searchError}</p> : null}

                <ImageUploadField
                  label="Trade license document *"
                  value={form.tradeLicenseDocument || ''}
                  onChange={(url) => setForm((current) => ({ ...current, tradeLicenseDocument: url }))}
                  folder="kyc"
                  accept="document"
                  helpText="Upload a clear trade license photo or PDF for verification."
                />
              </>
            ) : (
              forms[role].map(([name, label, type]) => (
                type === 'upload' ? (
                  <ImageUploadField
                    key={name}
                    label={label}
                    value={form[name] || ''}
                    onChange={(url) => setForm((current) => ({ ...current, [name]: url }))}
                    required={name === 'aadhaarDocumentUrl' || name === 'tradeLicenseDocument'}
                    folder="kyc"
                    accept="document"
                    helpText={
                      name === 'aadhaarDocumentUrl'
                        ? 'Upload a clear Aadhaar photo or PDF for KYC verification.'
                        : 'Upload a clear trade license photo or PDF for verification.'
                    }
                  />
                ) : (
                  <FormField
                    key={name}
                    name={name}
                    label={label}
                    type={type}
                    value={form[name] || ''}
                    onChange={handleChange}
                    disabled={name === 'mobile'}
                    required={role === 'farmer' ? farmerRequired.includes(name) : ['name', 'businessName', 'address', 'pincode', 'village'].includes(name)}
                    options={name === 'language' ? ['Telugu', 'Hindi', 'English'] : ['Retailer', 'Hotel', 'Mill', 'Wholesaler']}
                  />
                )
              ))
            )}
            <button className="btn btn-primary big form-submit w-full mt-4 flex items-center justify-center gap-2" type="submit" disabled={loading}>
              <CheckCircle2 size={20} /> {loading ? 'Submitting...' : loadedFromKyc ? 'Update KYC details' : 'Submit onboarding'}
            </button>
          </form>
        ) : null}
      </section>
    </main>
  );
}
