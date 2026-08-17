import { useEffect, useState } from 'react';
import { Redirect, useHistory, useParams } from 'react-router-dom';
import { CheckCircle2, MapPin, Search } from 'lucide-react';
import FormField from '../components/FormField.jsx';
import ImageUploadField from '../components/ImageUploadField.jsx';
import StateBlock from '../components/StateBlock.jsx';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { endpoints, unwrap } from '../services/api.js';
import { roleHome } from '../utils/format.js';

const forms = {
  customer: [
    ['name', 'Full name', 'text'], ['email', 'Email', 'email'], ['address', 'Address', 'textarea'], ['landmark', 'Landmark', 'text'], ['pincode', 'Pincode', 'text'],
    ['city', 'City', 'text'], ['state', 'State', 'text'], ['lat', 'Latitude', 'number'], ['lng', 'Longitude', 'number'], ['language', 'Preferred language', 'select'],
  ],
  farmer: [
    ['name', 'Full name', 'text'], ['mobile', 'Phone number', 'tel'], ['village', 'Village', 'text'], ['mandal', 'Mandal', 'text'],
    ['district', 'District', 'text'], ['state', 'State', 'text'], ['pincode', 'Pincode', 'text'], ['aadhaarDocumentUrl', 'Aadhaar document', 'upload'],
    ['bankAccountName', 'Bank account name', 'text'], ['bankAccountNumber', 'Bank account number', 'text'],
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
  'name', 'village', 'mandal', 'district', 'state', 'pincode',
  'bankAccountName', 'bankAccountNumber', 'ifscCode', 'cropsGrown', 'landSizeAcres',
];

function uniqueOptions(rows, key) {
  return Array.from(new Set((rows || []).map((row) => String(row?.[key] || '').trim()).filter(Boolean))).sort();
}

function matchLocations(rows, filters) {
  return (rows || []).filter((row) => {
    if (filters.state && row.state !== filters.state) return false;
    if (filters.district && row.district !== filters.district) return false;
    if (filters.city && row.city !== filters.city) return false;
    return true;
  });
}

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

function addressString(parts) {
  return parts.filter(Boolean).join(', ');
}

function locationLabel(row) {
  return [row?.city, row?.district, row?.state, row?.pincode].filter(Boolean).join(' - ');
}

function locationKey(row) {
  return [row?.state, row?.district, row?.city, row?.pincode].map((part) => String(part || '').trim()).join('||');
}

function nonEmptyRow(row) {
  return Boolean(String(row?.state || '').trim());
}

function norm(value) {
  return String(value || '').trim().toLowerCase();
}

function compact(value) {
  return norm(value).replace(/[^a-z0-9]/g, '');
}

function editDistance(a, b) {
  const left = compact(a);
  const right = compact(b);
  if (!left) return right.length;
  if (!right) return left.length;
  const dp = Array.from({ length: left.length + 1 }, () => Array(right.length + 1).fill(0));
  for (let i = 0; i <= left.length; i += 1) dp[i][0] = i;
  for (let j = 0; j <= right.length; j += 1) dp[0][j] = j;
  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[left.length][right.length];
}

function findBestLocationMatch(rows, query) {
  const needle = compact(query);
  if (!needle) return null;
  let best = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const row of rows || []) {
    const parts = [row.state, row.district, row.city, row.pincode].filter(Boolean);
    for (const part of parts) {
      const hay = compact(part);
      if (!hay) continue;
      if (hay.includes(needle) || needle.includes(hay)) {
        return row;
      }
      const distance = editDistance(needle, hay);
      if (distance < bestScore) {
        bestScore = distance;
        best = row;
      }
    }
  }

  return bestScore <= 2 ? best : null;
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
  return { ...defaults, name: cleanValue(user?.name), email: cleanValue(kyc?.email) || cleanValue(d.email) || cleanValue(user?.email), mobile: cleanValue(user?.mobile) };
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
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const { data: locationsData } = useApi(() => endpoints.serviceLocations(), [], []);

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
          setForm({ ...defaults, name: user?.name || '', email: user?.email || '', mobile: user?.mobile || '' });
          setLocationQuery('');
          setLoadingExisting(false);
        }
        return;
      }

      if (!token || !user?.id) {
        if (active) {
          setForm({ ...defaults, name: user?.name || '', email: user?.email || '', mobile: user?.mobile || '' });
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
          email: user?.email || '',
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

  const searchLocation = async (query) => {
    const target = String(query || '').trim();
    if (!target) {
      setSearchError('Please enter an address to search.');
      return;
    }
    setSearchError('');
    setSearchingLocation(true);
    try {
      const tryGeocode = async (value) => {
        const encoded = encodeURIComponent(value);
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&countrycodes=in&limit=5`, {
          headers: { 'User-Agent': 'Aswamithra-App' },
        });
        return response.json();
      };

      let results = await tryGeocode(target);
      if (!results || results.length === 0) {
        results = await tryGeocode(`${target}, India`);
      }
      if (!results || results.length === 0) {
        const localMatch = findBestLocationMatch(locations, target);
        if (localMatch) {
          const adminQuery = [localMatch.city, localMatch.district, localMatch.state, localMatch.pincode, 'India'].filter(Boolean).join(', ');
          results = await tryGeocode(adminQuery);
          if (!results || results.length === 0) {
            setForm((current) => ({
              ...current,
              state: localMatch.state || current.state,
              district: localMatch.district || current.district,
              village: localMatch.city || current.village,
              mandal: localMatch.district || current.mandal,
              pincode: localMatch.pincode || current.pincode,
              lat: localMatch.lat ?? current.lat,
              lng: localMatch.lng ?? current.lng,
              address: role !== 'farmer' ? [localMatch.city, localMatch.district, localMatch.state, localMatch.pincode].filter(Boolean).join(', ') : current.address,
            }));
            setLocationQuery([localMatch.city, localMatch.district, localMatch.state, localMatch.pincode].filter(Boolean).join(', '));
            return;
          }
        }
      }
      if (results && results.length > 0) {
        const first = results[0];
        setForm((current) => {
          const next = {
            ...current,
            lat: first.lat,
            lng: first.lon,
          };
          if (role !== 'farmer') {
            next.address = first.display_name || current.address;
          }
          return next;
        });
        setLocationQuery(first.display_name || target);
      } else {
        setSearchError('No results found. Try a more specific address or nearby city name.');
      }
    } catch (err) {
      setSearchError('Geocoding failed. Please try again.');
    } finally {
      setSearchingLocation(false);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setSearchError('Live location is not supported by this browser.');
      return;
    }
    setSearchError('');
    setSearchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = Number(position.coords.latitude).toFixed(6);
        const lng = Number(position.coords.longitude).toFixed(6);
        setForm((current) => ({ ...current, lat, lng }));
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
            headers: { 'User-Agent': 'Aswamithra-App' },
          });
          const result = await response.json();
          const displayAddress = result?.display_name || `Lat ${lat}, Lng ${lng}`;
          setForm((current) => ({
            ...current,
            lat,
            lng,
            address: role !== 'farmer' ? displayAddress : current.address,
          }));
          setLocationQuery(displayAddress);
        } catch (_error) {
          setLocationQuery(`Lat ${lat}, Lng ${lng}`);
        } finally {
          setSearchingLocation(false);
        }
      },
      () => {
        setSearchError('Unable to read your current location.');
        setSearchingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
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

  const customerAddressQuery = addressString([form.address, form.landmark, form.city, form.state, form.pincode]);
  const farmerAddressQuery = addressString([form.village, form.mandal, form.district, form.state, form.pincode]);
  const locations = Array.isArray(locationsData) ? locationsData.filter(nonEmptyRow) : [];
  const farmerStateOptions = uniqueOptions(locations, 'state');
  const farmerDistrictOptions = uniqueOptions(locations.filter((row) => norm(row.state) === norm(form.state) && String(row.district || '').trim()), 'district');
  const farmerCityRows = locations.filter((row) => norm(row.state) === norm(form.state) && norm(row.district) === norm(form.district) && String(row.city || '').trim());
  const farmerCityOptions = uniqueOptions(farmerCityRows, 'city');
  const farmerPincodeOptions = uniqueOptions(farmerCityRows, 'pincode');

  const setFarmerField = (name, value) => {
    setForm((current) => {
      const next = { ...current, [name]: value };
      if (name === 'state') {
        next.district = '';
        next.mandal = '';
        next.village = '';
        next.pincode = '';
      }
      if (name === 'district') {
        next.mandal = value;
        next.village = '';
        next.pincode = '';
      }
      if (name === 'village') {
        next.pincode = '';
      }
      return next;
    });
  };

  const syncFarmerLocation = (field, value) => {
    setForm((current) => {
      const next = { ...current, [field]: value };
      const selected = locations.find((row) => norm(row.state) === norm(field === 'state' ? value : next.state)
        && norm(row.district) === norm(field === 'district' ? value : next.district)
        && norm(row.city) === norm(field === 'village' ? value : next.village));
      if (selected) {
        if (selected.pincode) next.pincode = selected.pincode;
        if (selected.district) {
          next.district = selected.district;
          next.mandal = selected.district;
        }
        if (selected.city) next.village = selected.city;
        if (selected.state) next.state = selected.state;
      }
      if (field === 'state') {
        next.district = '';
        next.mandal = '';
        next.village = '';
        next.pincode = '';
      } else if (field === 'district') {
        next.mandal = value;
        next.village = '';
        next.pincode = '';
      } else if (field === 'village') {
        next.pincode = '';
      }
      return next;
    });
  };

  const renderLocationSearch = (label, query, placeholder) => (
    <div className="w-full">
      <label className="field-label" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: 7 }}>
        {label} <span style={{ color: 'var(--danger)' }}>*</span>
      </label>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full">
        <div className="field flex-1 w-full min-w-0" style={{ alignSelf: 'stretch' }}>
          <input
            type="text"
            name="addressSearch"
            value={query}
            onChange={(e) => setLocationQuery(e.target.value)}
            placeholder={placeholder}
            required
          />
        </div>
        <button
          type="button"
          onClick={() => searchLocation(locationQuery || query)}
          className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-all text-sm shadow-sm flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          style={{ height: 48 }}
          disabled={searchingLocation}
        >
          <Search size={16} />
          <span>{searchingLocation ? 'Searching...' : 'Search Location'}</span>
        </button>
      </div>
    </div>
  );

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
            {role === 'customer' ? (
              <>
                {forms[role].slice(0, 6).map(([name, label, type]) => (
                  type === 'upload' ? null : (
                    <FormField
                      key={name}
                      name={name}
                      label={label}
                      type={type}
                      value={form[name] || ''}
                      onChange={handleChange}
                      options={name === 'language' ? ['Telugu', 'Hindi', 'English'] : undefined}
                      required={['name', 'address', 'pincode', 'city', 'state'].includes(name)}
                    />
                  )
                ))}
                {renderLocationSearch('Delivery address', locationQuery || customerAddressQuery || form.address, 'Enter house, street, landmark, city, state, or pincode')}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  <FormField label="Latitude" name="lat" type="number" step="any" value={form.lat || defaults.lat} onChange={handleChange} required />
                  <FormField label="Longitude" name="lng" type="number" step="any" value={form.lng || defaults.lng} onChange={handleChange} required />
                </div>
                {form.lat && form.lng ? (
                  <div className="landing-map-wrapper w-full overflow-hidden rounded-lg shadow-sm" style={{ marginTop: '8px' }}>
                    <iframe
                      title="Customer Location Map Preview"
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
              </>
            ) : role === 'farmer' ? (
              <>
                <label className="field">
                  <span>State *</span>
                  <select value={form.state || ''} onChange={(e) => syncFarmerLocation('state', e.target.value)} required>
                    <option value="">Choose state</option>
                    {farmerStateOptions.map((state) => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </label>
                <p className="text-xs text-slate-500 -mt-2">
                  This list comes from the locations added by admin.
                </p>
                <label className="field">
                  <span>District *</span>
                  <select value={form.district || ''} onChange={(e) => syncFarmerLocation('district', e.target.value)} required disabled={!form.state}>
                    <option value="">{form.state ? 'Choose district' : 'Select state first'}</option>
                    {farmerDistrictOptions.map((district) => (
                      <option key={district} value={district}>{district}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>City / Area *</span>
                  <select value={form.village || ''} onChange={(e) => syncFarmerLocation('village', e.target.value)} required disabled={!form.district}>
                    <option value="">{form.district ? 'Choose city / area' : 'Select district first'}</option>
                    {farmerCityOptions.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Pincode *</span>
                  <select value={form.pincode || ''} onChange={(e) => setFarmerField('pincode', e.target.value)} required disabled={!form.village}>
                    <option value="">{form.village ? 'Choose pincode' : 'Select city first'}</option>
                    {farmerPincodeOptions.map((pincode) => (
                      <option key={pincode} value={pincode}>{pincode}</option>
                    ))}
                  </select>
                </label>
                {(form.state || form.district || form.village || form.pincode) ? (
                  <div className="notice" style={{ marginTop: 2 }}>
                    Selected location: {[form.state, form.district, form.village, form.pincode].filter(Boolean).join(' > ')}
                  </div>
                ) : null}
                {forms[role].filter(([name]) => !['village', 'mandal', 'district', 'state', 'pincode', 'aadhaarDocumentUrl'].includes(name)).map(([name, label, type]) => (
                  type === 'upload' ? null : (
                    <FormField
                      key={name}
                      name={name}
                      label={label}
                      type={type}
                      value={form[name] || ''}
                      onChange={handleChange}
                      options={name === 'language' ? ['Telugu', 'Hindi', 'English'] : undefined}
                      required={farmerRequired.includes(name)}
                    />
                  )
                ))}
                {renderLocationSearch('Farm location', locationQuery || farmerAddressQuery || form.village, 'Enter village, mandal, district, state, or pincode')}
                <ImageUploadField
                  label="Aadhaar document"
                  value={form.aadhaarDocumentUrl || ''}
                  onChange={(url) => setForm((current) => ({ ...current, aadhaarDocumentUrl: url }))}
                  required
                  folder="kyc"
                  accept="document"
                  helpText="Upload a clear Aadhaar photo or PDF for KYC verification."
                />
              </>
            ) : role === 'b2b' ? (
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
                      onClick={() => searchLocation(customerAddressQuery || form.address)}
                      className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-all text-sm shadow-sm flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                      style={{ height: 48 }}
                      disabled={searchingLocation}
                    >
                      <Search size={16} />
                      <span>{searchingLocation ? 'Searching...' : 'Search Location'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={useCurrentLocation}
                      className="w-full sm:w-auto px-4 py-2 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 font-medium rounded-md transition-all text-sm shadow-sm flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                      style={{ height: 48 }}
                      disabled={searchingLocation}
                    >
                      <MapPin size={16} />
                      <span>Use my location</span>
                    </button>
                  </div>
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
