import { Redirect, Route, Switch } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { BarChart3, ClipboardCheck, FileClock, Home, Landmark, LayoutDashboard, ReceiptIndianRupee, Search, Settings, Store, Tags, UserCog, Users, X } from 'lucide-react';
import AdminLayout from '../layouts/AdminLayout.jsx';
import DataTable from '../components/DataTable.jsx';
import FormField from '../components/FormField.jsx';
import ImageUploadField from '../components/ImageUploadField.jsx';
import StatCard from '../components/StatCard.jsx';
import StateBlock from '../components/StateBlock.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { endpoints, unwrap } from '../services/api.js';
import { money } from '../utils/format.js';
import { resolveMediaUrl } from '../utils/media.js';

const nav = [
  { label: 'Dashboard', href: '/admin/home', icon: Home },
  { label: 'KYC', href: '/admin/kyc', icon: ClipboardCheck },
  { label: 'Commissions', href: '/admin/commissions', icon: ReceiptIndianRupee },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Categories', href: '/admin/categories', icon: Tags },
  { label: 'Shops/POS', href: '/admin/shops', icon: Store },
  { label: 'Finance', href: '/admin/finance', icon: Landmark },
  { label: 'CMS', href: '/admin/cms', icon: LayoutDashboard },
  { label: 'Disputes', href: '/admin/disputes', icon: UserCog },
  { label: 'Audit', href: '/admin/audit', icon: FileClock },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

function AdminSettings() {
  const [mapAddress, setMapAddress] = useState('');
  const [mapLat, setMapLat] = useState('');
  const [mapLng, setMapLng] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data: siteConfig } = useApi(() => endpoints.siteConfig(), { map: { mapLat: 16.5062, mapLng: 80.6480, mapAddress: 'Vijayawada, Andhra Pradesh' } }, []);

  const loadFromConfig = () => {
    const mapCfg = siteConfig?.map;
    if (mapCfg) {
      setMapAddress(mapCfg.mapAddress || '');
      setMapLat(mapCfg.mapLat != null ? String(mapCfg.mapLat) : '');
      setMapLng(mapCfg.mapLng != null ? String(mapCfg.mapLng) : '');
    }
  };

  useEffect(() => {
    loadFromConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteConfig]);

  const searchLocation = async () => {
    if (!mapAddress.trim()) {
      setError('Please enter an address to search.');
      return;
    }
    setError('');
    try {
      const encoded = encodeURIComponent(mapAddress);
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encoded}`, {
        headers: { 'User-Agent': 'Aswamithra-Admin' },
      });
      const results = await response.json();
      if (results && results.length > 0) {
        const first = results[0];
        setMapLat(first.lat);
        setMapLng(first.lon);
        setSuccess('Location found and coordinates updated.');
      } else {
        setError('No results found for the given address.');
      }
    } catch (err) {
      setError('Geocoding failed. Please try again.');
    }
  };

  const saveSettings = async () => {
    if (!mapLat || !mapLng) {
      setError('Latitude and Longitude are required.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await endpoints.updateSiteConfig({
        mapLat: Number(mapLat),
        mapLng: Number(mapLng),
        mapAddress: mapAddress || undefined,
      });
      setSuccess('Map settings saved successfully!');
    } catch (err) {
      setError('Failed to save settings. Check the server logs.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="panel">
      <h2>Footer Map Configuration</h2>
      <p className="muted">Set the address shown in the landing page footer map. You can search by address to auto-fill coordinates.</p>

                  <div className="flex flex-col sm:flex-row sm:items-end gap-2">
        <FormField
          name="mapAddress"
          label="Search Address"
          placeholder="Enter address, city, or landmark"
          value={mapAddress}
          onChange={(e) => setMapAddress(e.target.value)}
        />
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button
            type="button"
            onClick={searchLocation}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-md transition-all text-sm shadow-sm hover:shadow whitespace-nowrap cursor-pointer h-10 flex items-center justify-center gap-2"
          >
            <Search size={16} />
            <span>Search Location</span>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ marginTop: '12px' }}>
        <FormField
          name="mapLat"
          label="Latitude"
          type="number"
          step="any"
          value={mapLat}
          onChange={(e) => setMapLat(e.target.value)}
        />
        <FormField
          name="mapLng"
          label="Longitude"
          type="number"
          step="any"
          value={mapLng}
          onChange={(e) => setMapLng(e.target.value)}
        />
      </div>

      {mapLat && mapLng ? (
        <div className="landing-map-wrapper">
          <iframe
            title="Map Preview"
            width="100%"
            height="240"
            frameBorder="0"
            scrolling="no"
            marginHeight={0}
            marginWidth={0}
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(mapLng) - 0.005},${Number(mapLat) - 0.005},${Number(mapLng) + 0.005},${Number(mapLat) + 0.005}&layer=mapnik&marker=${mapLat},${mapLng}`}
            style={{ border: 0, borderRadius: '8px' }}
          />
        </div>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      <div className="modal-actions" style={{ marginTop: '16px' }}>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors text-sm shadow-sm" onClick={saveSettings} disabled={saving}>
          {saving ? 'Saving...' : 'Save Map Settings'}
        </button>
      </div>
    </section>
  );
}

function AdminHome() {
  const { data } = useApi(() => endpoints.adminAnalytics(), { totalSales: 160, activeFarmers: 3, pendingKyc: 0 }, []);
  return <><div className="dashboard-grid stats"><StatCard label="Total sales" value={money(data.totalSales || data.revenue || 160)} icon={BarChart3} tone="dark" /><StatCard label="Active farmers" value={data.activeFarmers || 3} icon={Store} tone="dark" /><StatCard label="Pending KYC" value={data.pendingKyc || 0} icon={ClipboardCheck} tone="dark" /></div><section className="panel"><h2>Admin operations</h2>{['KYC review', 'Commission slabs', 'Shop and POS setup', 'Finance and payouts', 'CMS banners', 'Disputes and audit'].map((item, index) => <div className="step-line" key={item}><span>{index + 1}</span>{item}</div>)}</section></>;
}

function statusPill(status) {
  return <span className={`status-pill ${status || 'pending'}`}>{status || 'pending'}</span>;
}

function displayValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

function KycDetailItem({ label, value }) {
  return (
    <div className="kyc-detail-item">
      <span>{label}</span>
      <strong>{displayValue(value)}</strong>
    </div>
  );
}

function pickKyc(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
}

function KycProfileSections({ profile, role }) {
  if (!profile) {
    return (
      <section className="kyc-section">
        <h3>Onboarding details</h3>
        <p className="muted">No KYC / onboarding details submitted yet.</p>
      </section>
    );
  }

  const d = profile.details || {};
  const isFarmer = role === 'farmer';
  const isB2b = role === 'b2b';
  const docs = profile.documents || [];
  const aadhaarDoc = pickKyc(profile.aadhaarDocumentUrl, d.aadhaarDocumentUrl, ...docs);
  const tradeDoc = pickKyc(profile.tradeLicenseDocument, d.tradeLicenseDocument, ...docs);

  return (
    <>
      {isFarmer ? (
        <>
          <section className="kyc-section">
            <h3>Onboarding details</h3>
            <div className="kyc-detail-grid">
              <KycDetailItem label="Full name" value={pickKyc(profile.name, d.fullName)} />
              <KycDetailItem label="Phone number" value={pickKyc(profile.mobile, d.mobile)} />
              <KycDetailItem label="Village" value={pickKyc(profile.village, d.village)} />
              <KycDetailItem label="Mandal" value={pickKyc(profile.mandal, d.mandal)} />
              <KycDetailItem label="District" value={pickKyc(profile.district, d.district)} />
              <KycDetailItem label="State" value={pickKyc(profile.state, d.state)} />
              <KycDetailItem label="Pincode" value={pickKyc(profile.pincode, d.pincode)} />
              <KycDetailItem label="Farm latitude" value={pickKyc(profile.lat, d.lat)} />
              <KycDetailItem label="Farm longitude" value={pickKyc(profile.lng, d.lng)} />
              <KycDetailItem label="Aadhaar number" value={pickKyc(profile.aadhaarNumber, d.aadhaarNumber, profile.aadhaarMasked)} />
              <KycDetailItem label="GSTIN (optional)" value={pickKyc(profile.gstin, d.gstin)} />
              <KycDetailItem label="Bank account name" value={pickKyc(profile.bankAccountName, d.bankAccountName)} />
              <KycDetailItem label="Bank account number" value={pickKyc(profile.bankAccountNumber, d.bankAccountNumber, profile.bankAccountMasked)} />
              <KycDetailItem label="IFSC code" value={pickKyc(profile.ifsc, d.ifscCode)} />
              <KycDetailItem label="Crops grown" value={pickKyc(profile.cropsGrown, d.cropsGrown)} />
              <KycDetailItem label="Land size in acres" value={pickKyc(profile.landSizeAcres, d.landSizeAcres)} />
            </div>
          </section>
          <section className="kyc-section">
            <h3>Aadhaar document</h3>
            {aadhaarDoc ? (
              <div className="kyc-docs">
                <a className="kyc-doc-card" href={resolveMediaUrl(aadhaarDoc)} target="_blank" rel="noreferrer">
                  {/\.(png|jpe?g|webp|gif)($|\?)/i.test(aadhaarDoc)
                    ? <img src={resolveMediaUrl(aadhaarDoc)} alt="Aadhaar document" />
                    : <span>Open Aadhaar document</span>}
                  <em>Aadhaar document</em>
                </a>
              </div>
            ) : (
              <p className="muted">No Aadhaar document uploaded</p>
            )}
          </section>
        </>
      ) : null}

      {isB2b ? (
        <>
                    <section className="kyc-section">
            <h3>Onboarding details</h3>
            <div className="kyc-detail-grid">
              <KycDetailItem label="Business name" value={pickKyc(profile.businessName, d.businessName, profile.name)} />
              <KycDetailItem label="Owner name" value={pickKyc(profile.ownerName, d.ownerName)} />
              <KycDetailItem label="Phone number" value={pickKyc(profile.mobile, d.mobile)} />
              <KycDetailItem label="Business email" value={pickKyc(profile.businessEmail, d.businessEmail)} />
              <KycDetailItem label="GSTIN (optional)" value={pickKyc(profile.gstin, d.gstin)} />
              <KycDetailItem label="Business type" value={pickKyc(profile.businessType, d.businessType)} />
              <KycDetailItem label="Business address" value={pickKyc(profile.address, d.address)} />
              <KycDetailItem label="Latitude" value={pickKyc(profile.lat, d.lat)} />
              <KycDetailItem label="Longitude" value={pickKyc(profile.lng, d.lng)} />
            </div>
          </section>

          {pickKyc(profile.lat, d.lat) && pickKyc(profile.lng, d.lng) ? (
            <section className="kyc-section">
              <h3>Location Map Preview</h3>
              <div className="landing-map-wrapper">
                <iframe
                  title="B2B KYC Map Preview"
                  width="100%"
                  height="200"
                  frameBorder="0"
                  scrolling="no"
                  marginHeight={0}
                  marginWidth={0}
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(pickKyc(profile.lng, d.lng)) - 0.005},${Number(pickKyc(profile.lat, d.lat)) - 0.005},${Number(pickKyc(profile.lng, d.lng)) + 0.005},${Number(pickKyc(profile.lat, d.lat)) + 0.005}&layer=mapnik&marker=${pickKyc(profile.lat, d.lat)},${pickKyc(profile.lng, d.lng)}`}
                  style={{ border: 0, borderRadius: '8px' }}
                />
              </div>
            </section>
          ) : null}

          <section className="kyc-section">
            <h3>Trade license document</h3>
            {tradeDoc ? (
              <div className="kyc-docs">
                <a className="kyc-doc-card" href={resolveMediaUrl(tradeDoc)} target="_blank" rel="noreferrer">
                  {/\.(png|jpe?g|webp|gif)($|\?)/i.test(tradeDoc)
                    ? <img src={resolveMediaUrl(tradeDoc)} alt="Trade license document" />
                    : <span>Open trade license</span>}
                  <em>Trade license document</em>
                </a>
              </div>
            ) : (
              <p className="muted">No trade license uploaded</p>
            )}
          </section>
        </>
      ) : null}
    </>
  );
}

function cleanEditValue(value) {
  if (value === null || value === undefined) return '';
  const text = String(value).trim();
  if (!text) return '';
  if (/^X{2,}/i.test(text)) return '';
  return text;
}

function mapUserToEditForm(details) {
  const kyc = details?.kyc || null;
  const d = kyc?.details || {};
  const role = details?.role;
  const base = {
    id: details.id,
    name: details.name || '',
    mobile: details.mobile || '',
    email: details.email || '',
    role: details.role || '',
    status: details.status || 'active',
    language: details.language || '',
    hasPin: Boolean(details.hasPin),
    pin: '',
  };

  if (role === 'farmer') {
    return {
      ...base,
      village: cleanEditValue(kyc?.village || d.village),
      mandal: cleanEditValue(kyc?.mandal || d.mandal),
      district: cleanEditValue(kyc?.district || d.district),
      state: cleanEditValue(kyc?.state || d.state) || 'Andhra Pradesh',
      pincode: cleanEditValue(kyc?.pincode || d.pincode),
      lat: cleanEditValue(kyc?.lat || d.lat),
      lng: cleanEditValue(kyc?.lng || d.lng),
      aadhaarNumber: cleanEditValue(kyc?.aadhaarNumber || d.aadhaarNumber),
      aadhaarDocumentUrl: cleanEditValue(kyc?.aadhaarDocumentUrl || d.aadhaarDocumentUrl || (kyc?.documents || [])[0]),
      gstin: cleanEditValue(kyc?.gstin || d.gstin),
      bankAccountName: cleanEditValue(kyc?.bankAccountName || d.bankAccountName),
      bankAccountNumber: cleanEditValue(kyc?.bankAccountNumber || d.bankAccountNumber),
      ifscCode: cleanEditValue(kyc?.ifsc || d.ifscCode),
      cropsGrown: cleanEditValue(kyc?.cropsGrown || d.cropsGrown),
      landSizeAcres: cleanEditValue(kyc?.landSizeAcres || d.landSizeAcres),
    };
  }

  if (role === 'b2b') {
    return {
      ...base,
      businessName: cleanEditValue(kyc?.businessName || d.businessName || details.name),
      ownerName: cleanEditValue(kyc?.ownerName || d.ownerName),
      businessEmail: cleanEditValue(kyc?.businessEmail || d.businessEmail || details.email),
      gstin: cleanEditValue(kyc?.gstin || d.gstin),
      businessType: cleanEditValue(kyc?.businessType || d.businessType) || 'Retailer',
      address: cleanEditValue(kyc?.address || d.address),
      lat: cleanEditValue(kyc?.lat || d.lat),
      lng: cleanEditValue(kyc?.lng || d.lng),
      tradeLicenseDocument: cleanEditValue(kyc?.tradeLicenseDocument || d.tradeLicenseDocument || (kyc?.documents || [])[0]),
    };
  }

  return base;
}

function KycQueue() {
  const { data, setData } = useApi(() => endpoints.adminKyc(), [], []);
  const [selected, setSelected] = useState(null);
  const refresh = async () => setData(unwrap(await endpoints.adminKyc()));

  const openDetails = async (row) => {
    const details = unwrap(await endpoints.adminKycDetail(row.id));
    setSelected(details);
  };

  const handleApprove = async (row) => {
    await endpoints.approveKyc(row.id);
    await refresh();
    if (selected?.id === row.id) setSelected(null);
  };

  const handleReject = async (row) => {
    await endpoints.rejectKyc(row.id);
    await refresh();
    if (selected?.id === row.id) setSelected(null);
  };

  const isFarmer = selected?.role === 'farmer';
  const isB2b = selected?.role === 'b2b';

  return (
    <>
      <section className="panel">
        <h2>KYC review queue</h2>
        <DataTable
          rows={data || []}
          columns={[
            { key: 'name', label: 'Applicant' },
            { key: 'role', label: 'Role' },
            { key: 'district', label: 'District', render: (row) => row.district || '-' },
            { key: 'submittedAt', label: 'Submitted' },
            { key: 'status', label: 'Status', render: (row) => statusPill(row.status) },
          ]}
          actions={(row) => (
            <div className="action-row">
              <button className="btn btn-light" onClick={() => openDetails(row)}>View</button>
              {row.status === 'pending' || row.status === 'reupload_requested' ? (
                <>
                  <button className="btn btn-primary" onClick={() => handleApprove(row)}>Approve</button>
                  <button className="btn btn-light" onClick={() => handleReject(row)}>Reject</button>
                </>
              ) : null}
            </div>
          )}
        />
      </section>
      {selected ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelected(null)}>
          <section className="modal kyc-modal" role="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <p className="eyebrow">{isFarmer ? 'Farmer onboarding KYC' : isB2b ? 'B2B onboarding KYC' : 'KYC review'}</p>
                <h2>{selected.name || 'Applicant'}</h2>
                <div className="kyc-modal-tags">
                  {statusPill(selected.status)}
                  <span className="pill soft">{selected.role}</span>
                </div>
              </div>
              <button className="icon-only" type="button" onClick={() => setSelected(null)}><X size={18} /></button>
            </div>

            <div className="kyc-modal-body">
              <KycProfileSections profile={selected} role={selected.role} />
            </div>

            <div className="modal-actions">
              {selected.status === 'pending' || selected.status === 'reupload_requested' ? (
                <>
                  <button className="btn btn-primary" onClick={async () => { await handleApprove(selected); }}>Approve</button>
                  <button className="btn btn-light" onClick={async () => { await handleReject(selected); }}>Reject</button>
                </>
              ) : null}
              <button className="btn btn-light" type="button" onClick={() => setSelected(null)}>Close</button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function UserManager() {
  const { user: currentUser, setUser } = useAuth();
  const { data, setData } = useApi(() => endpoints.adminUsers(), [], []);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [pinDraft, setPinDraft] = useState({ pin: '', confirm: '' });
  const [pinBusy, setPinBusy] = useState(false);
  const [pinMessage, setPinMessage] = useState('');
  const [pinError, setPinError] = useState('');

  const refresh = async () => setData(unwrap(await endpoints.adminUsers()));

  const isSelf = (row) => currentUser?.id === row?.id;

  const resetPinDraft = () => {
    setPinDraft({ pin: '', confirm: '' });
    setPinMessage('');
    setPinError('');
    setPinBusy(false);
  };

  const openDetails = async (row) => {
    resetPinDraft();
    const details = unwrap(await endpoints.adminUser(row.id));
    setSelected(details);
  };

  const openEdit = async (row) => {
    setFormError('');
    resetPinDraft();
    const details = unwrap(await endpoints.adminUser(row.id));
    setEditing(mapUserToEditForm(details));
    setSelected(null);
  };

  const applyPinStatus = (userId, hasPin) => {
    setSelected((current) => (current?.id === userId ? { ...current, hasPin } : current));
    setEditing((current) => (current?.id === userId ? { ...current, hasPin, pin: '', pinConfirm: '' } : current));
    setData((current) => (Array.isArray(current)
      ? current.map((row) => (row.id === userId ? { ...row, hasPin } : row))
      : current));
  };

  const saveSecurityPin = async (userId, pin, confirmPin) => {
    const nextPin = String(pin || '').trim();
    const nextConfirm = String(confirmPin || '').trim();
    if (!/^\d{4}$/.test(nextPin)) {
      throw new Error('Enter a 4-digit security PIN.');
    }
    if (nextPin !== nextConfirm) {
      throw new Error('PIN and confirm PIN do not match.');
    }
    await endpoints.setPin({ userId, pin: nextPin });
    applyPinStatus(userId, true);
  };

    const searchEditingLocation = async () => {
    const query = editing?.role === 'farmer'
      ? [editing.village, editing.mandal, editing.district, editing.state, editing.pincode].filter(Boolean).join(', ')
      : editing?.address;
    if (!query?.trim()) {
      setFormError(editing?.role === 'farmer' ? 'Please enter farm location details to search.' : 'Please enter a business address to search.');
      return;
    }
    setFormError('');
    try {
      const encoded = encodeURIComponent(query);
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encoded}`, {
        headers: { 'User-Agent': 'Aswamithra-Admin' },
      });
      const results = await response.json();
      if (results && results.length > 0) {
        const first = results[0];
        setEditing({
          ...editing,
          lat: first.lat,
          lng: first.lon,
          ...(editing.role === 'farmer' ? {} : { address: first.display_name || editing.address }),
        });
      } else {
        setFormError('No results found for the given address.');
      }
    } catch (err) {
      setFormError('Geocoding failed. Please try again.');
    }
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    if (!editing?.id) return;
    setSaving(true);
    setFormError('');
    try {
      const {
        pin,
        hasPin,
        id,
        role,
        village,
        mandal,
        district,
        state,
        pincode,
        lat,
        lng,
        aadhaarNumber,
        aadhaarDocumentUrl,
        gstin,
        bankAccountName,
        bankAccountNumber,
        ifscCode,
        cropsGrown,
        landSizeAcres,
        businessName,
        ownerName,
        businessEmail,
        businessType,
        address,
        tradeLicenseDocument,
        name,
        mobile,
        email,
        status,
        language,
      } = editing;

      const profile = { name, mobile, email, status, language };
      const payload = { ...profile };

      if (role === 'farmer') {
        payload.name = name;
        payload.kycProfile = {
          name,
          mobile,
          village,
          mandal,
          district,
          state,
          pincode,
          lat,
          lng,
          aadhaarNumber,
          aadhaarDocumentUrl,
          gstin,
          bankAccountName,
          bankAccountNumber,
          ifscCode,
          cropsGrown,
          landSizeAcres,
        };
      } else if (role === 'b2b') {
        payload.name = businessName || name;
        payload.email = businessEmail || email;
        payload.kycProfile = {
          businessName,
          ownerName,
          mobile,
          businessEmail,
          gstin,
          businessType,
          address,
          lat,
          lng,
          tradeLicenseDocument,
        };
      }

      await endpoints.updateAdminUser(id, payload);
      if (pin && String(pin).length === 4) {
        await endpoints.setPin({ userId: id, pin: String(pin) });
      }
      if (isSelf({ id })) {
        const next = { ...currentUser, ...profile, name: payload.name, email: payload.email || email };
        setUser(next);
        localStorage.setItem('aswamithra_user', JSON.stringify(next));
      }
      setEditing(null);
      await refresh();
    } catch (error) {
      setFormError(error?.response?.data?.error?.message || 'Unable to save user details.');
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (id) => {
    if (isSelf({ id })) return;
    await endpoints.deleteAdminUser(id, currentUser?.id);
    if (selected?.id === id) setSelected(null);
    if (editing?.id === id) setEditing(null);
    await refresh();
  };

  const rows = data || [];
  const selectedKyc = selected?.kyc || null;
  const selectedRole = selected?.role;
  const isFarmerSelected = selectedRole === 'farmer';
  const isB2bSelected = selectedRole === 'b2b';

  return (
    <>
      <section className="panel">
        <h2>All users</h2>
        <DataTable
          rows={rows}
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'mobile', label: 'Mobile' },
            { key: 'role', label: 'Role' },
            { key: 'status', label: 'Status', render: (row) => statusPill(row.status === 'pending_kyc' ? 'pending' : row.status) },
            { key: 'language', label: 'Language' },
            { key: 'createdAt', label: 'Created' },
          ]}
          actions={(row) => (
            <div className="action-row">
              <button className="btn btn-light" onClick={() => openDetails(row)}>View</button>
              <button className="btn btn-light" onClick={() => openEdit(row)}>Edit</button>
              {!isSelf(row) ? <button className="btn btn-light" onClick={() => deleteUser(row.id)}>Delete</button> : null}
            </div>
          )}
        />
      </section>

      {selected ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelected(null)}>
          <section className="modal kyc-modal" role="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <p className="eyebrow">
                  {isFarmerSelected ? 'Farmer user profile' : isB2bSelected ? 'B2B user profile' : 'User profile'}
                </p>
                <h2>{selected.name || 'User'}</h2>
                <div className="kyc-modal-tags">
                  {statusPill(selected.status === 'pending_kyc' ? 'pending' : selected.status)}
                  <span className="pill soft">{selected.role}</span>
                  {selectedKyc?.status ? <span className="pill soft">KYC: {selectedKyc.status}</span> : null}
                </div>
              </div>
              <button className="icon-only" type="button" onClick={() => setSelected(null)}><X size={18} /></button>
            </div>

            <div className="kyc-modal-body">
              <section className="kyc-section">
                <h3>Account</h3>
                <div className="kyc-detail-grid">
                  <KycDetailItem label="Name" value={selected.name} />
                  <KycDetailItem label="Phone number" value={selected.mobile} />
                  <KycDetailItem label="Email" value={selected.email} />
                  <KycDetailItem label="Role" value={selected.role} />
                  <KycDetailItem label="Status" value={selected.status} />
                  <KycDetailItem label="Language" value={selected.language} />
                  <KycDetailItem label="Security PIN" value={selected.hasPin ? 'Set' : 'Not set'} />
                  <KycDetailItem label="Created" value={selected.createdAt} />
                </div>
              </section>

              {isFarmerSelected || isB2bSelected ? (
                <KycProfileSections profile={selectedKyc} role={selectedRole} />
              ) : null}
            </div>

            <div className="modal-actions">
              <button className="btn btn-primary" type="button" onClick={() => openEdit(selected)}>Edit</button>
              {!isSelf(selected) ? <button className="btn btn-light" type="button" onClick={async () => { await deleteUser(selected.id); }}>Delete</button> : null}
              <button className="btn btn-light" type="button" onClick={() => setSelected(null)}>Close</button>
            </div>
          </section>
        </div>
      ) : null}

      {editing ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setEditing(null)}>
          <section className="modal kyc-modal" role="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <p className="eyebrow">{isSelf(editing) ? 'Your admin profile' : 'Edit user'}</p>
                <h2>{editing.name || editing.businessName || 'User'}</h2>
                <div className="kyc-modal-tags">
                  {statusPill(editing.status === 'pending_kyc' ? 'pending' : editing.status)}
                  <span className="pill soft">{editing.role}</span>
                </div>
              </div>
              <button className="icon-only" type="button" onClick={() => setEditing(null)}><X size={18} /></button>
            </div>
            <form className="kyc-modal-body" onSubmit={saveEdit}>
              <section className="kyc-section">
                <h3>Account</h3>
                <div className="form-grid single">
                  {editing.role === 'b2b' ? null : (
                    <FormField label="Name" name="name" value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required />
                  )}
                  <FormField label="Phone number" name="mobile" value={editing.mobile || ''} onChange={(e) => setEditing({ ...editing, mobile: e.target.value })} required />
                  {editing.role === 'b2b' ? null : (
                    <FormField label="Email" name="email" value={editing.email || ''} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
                  )}
                  <FormField label="Role" name="role" value={editing.role || ''} disabled />
                  <FormField
                    label="Status"
                    name="status"
                    type="select"
                    options={['active', 'pending_kyc', 'needs_onboarding', 'suspended']}
                    value={editing.status || ''}
                    onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                    required
                  />
                  <FormField label="Language" name="language" value={editing.language || ''} onChange={(e) => setEditing({ ...editing, language: e.target.value })} />
                  <FormField
                    label="Security PIN"
                    name="pin"
                    type="password"
                    value={editing.pin || ''}
                    onChange={(e) => setEditing({ ...editing, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                    placeholder={editing.hasPin ? 'Enter new 4-digit PIN to change' : 'Set a new 4-digit PIN'}
                  />
                </div>
              </section>

              {editing.role === 'farmer' ? (
                <section className="kyc-section">
                  <h3>Onboarding details</h3>
                  <div className="form-grid single">
                    <FormField label="Village" name="village" value={editing.village || ''} onChange={(e) => setEditing({ ...editing, village: e.target.value })} />
                    <FormField label="Mandal" name="mandal" value={editing.mandal || ''} onChange={(e) => setEditing({ ...editing, mandal: e.target.value })} />
                    <FormField label="District" name="district" value={editing.district || ''} onChange={(e) => setEditing({ ...editing, district: e.target.value })} />
                    <FormField label="State" name="state" value={editing.state || ''} onChange={(e) => setEditing({ ...editing, state: e.target.value })} />
                    <FormField label="Pincode" name="pincode" value={editing.pincode || ''} onChange={(e) => setEditing({ ...editing, pincode: e.target.value })} />
                    <div className="w-full">
                      <label className="field-label" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: 7 }}>
                        Farm location <span style={{ color: 'var(--danger)' }}>*</span>
                      </label>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full">
                        <div className="field flex-1 w-full min-w-0" style={{ alignSelf: 'stretch' }}>
                          <input
                            type="text"
                            value={[editing.village, editing.mandal, editing.district, editing.state, editing.pincode].filter(Boolean).join(', ')}
                            onChange={(e) => setEditing({ ...editing, village: e.target.value })}
                            placeholder="Search village, mandal, district, state, or pincode"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={searchEditingLocation}
                          className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-all text-sm shadow-sm flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                          style={{ height: 48 }}
                        >
                          <Search size={16} />
                          <span>Search Location</span>
                        </button>
                      </div>
                    </div>
                    <FormField label="Farm latitude" name="lat" type="number" value={editing.lat || ''} onChange={(e) => setEditing({ ...editing, lat: e.target.value })} />
                    <FormField label="Farm longitude" name="lng" type="number" value={editing.lng || ''} onChange={(e) => setEditing({ ...editing, lng: e.target.value })} />
                    {editing.lat && editing.lng ? (
                      <div className="landing-map-wrapper" style={{ marginTop: '8px' }}>
                        <iframe
                          title="Farm Map Preview"
                          width="100%"
                          height="200"
                          frameBorder="0"
                          scrolling="no"
                          marginHeight={0}
                          marginWidth={0}
                          src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(editing.lng) - 0.005},${Number(editing.lat) - 0.005},${Number(editing.lng) + 0.005},${Number(editing.lat) + 0.005}&layer=mapnik&marker=${editing.lat},${editing.lng}`}
                          style={{ border: 0, borderRadius: '8px' }}
                        />
                      </div>
                    ) : null}
                    <FormField label="Aadhaar number" name="aadhaarNumber" value={editing.aadhaarNumber || ''} onChange={(e) => setEditing({ ...editing, aadhaarNumber: e.target.value })} />
                    <ImageUploadField
                      label="Aadhaar document"
                      value={editing.aadhaarDocumentUrl || ''}
                      onChange={(aadhaarDocumentUrl) => setEditing({ ...editing, aadhaarDocumentUrl })}
                      folder="kyc"
                      accept="document"
                      helpText="Upload a clear Aadhaar photo or PDF."
                    />
                    <FormField label="GSTIN (optional)" name="gstin" value={editing.gstin || ''} onChange={(e) => setEditing({ ...editing, gstin: e.target.value })} />
                    <FormField label="Bank account name" name="bankAccountName" value={editing.bankAccountName || ''} onChange={(e) => setEditing({ ...editing, bankAccountName: e.target.value })} />
                    <FormField label="Bank account number" name="bankAccountNumber" value={editing.bankAccountNumber || ''} onChange={(e) => setEditing({ ...editing, bankAccountNumber: e.target.value })} />
                    <FormField label="IFSC code" name="ifscCode" value={editing.ifscCode || ''} onChange={(e) => setEditing({ ...editing, ifscCode: e.target.value })} />
                    <FormField label="Crops grown" name="cropsGrown" value={editing.cropsGrown || ''} onChange={(e) => setEditing({ ...editing, cropsGrown: e.target.value })} />
                    <FormField label="Land size in acres" name="landSizeAcres" type="number" value={editing.landSizeAcres || ''} onChange={(e) => setEditing({ ...editing, landSizeAcres: e.target.value })} />
                  </div>
                </section>
              ) : null}

              {editing.role === 'b2b' ? (
                <section className="kyc-section">
                  <h3>Onboarding details & Location</h3>
                  <div className="form-grid single">
                    <FormField label="Business name" name="businessName" value={editing.businessName || ''} onChange={(e) => setEditing({ ...editing, businessName: e.target.value })} required />
                    <FormField label="Owner name" name="ownerName" value={editing.ownerName || ''} onChange={(e) => setEditing({ ...editing, ownerName: e.target.value })} />
                    <FormField label="Business email" name="businessEmail" value={editing.businessEmail || ''} onChange={(e) => setEditing({ ...editing, businessEmail: e.target.value })} />
                    <FormField label="GSTIN (optional)" name="gstin" value={editing.gstin || ''} onChange={(e) => setEditing({ ...editing, gstin: e.target.value })} />
                    <FormField label="Business type" name="businessType" type="select" options={['Retailer', 'Hotel', 'Mill', 'Wholesaler']} value={editing.businessType || ''} onChange={(e) => setEditing({ ...editing, businessType: e.target.value })} />

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
                            value={editing.address || ''}
                            onChange={(e) => setEditing({ ...editing, address: e.target.value })}
                            placeholder="Enter business address (e.g. Deganga, West Bengal, India)"
                            required
                          />
                        </div>
                        <button
                          type="button"
                          onClick={searchEditingLocation}
                          className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-all text-sm shadow-sm flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                          style={{ height: 48 }}
                        >
                          <Search size={16} />
                          <span>Search Location</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField label="Latitude" name="lat" type="number" step="any" value={editing.lat || ''} onChange={(e) => setEditing({ ...editing, lat: e.target.value })} />
                      <FormField label="Longitude" name="lng" type="number" step="any" value={editing.lng || ''} onChange={(e) => setEditing({ ...editing, lng: e.target.value })} />
                    </div>

                    {editing.lat && editing.lng ? (
                      <div className="landing-map-wrapper" style={{ marginTop: '8px' }}>
                        <iframe
                          title="B2B Map Preview"
                          width="100%"
                          height="200"
                          frameBorder="0"
                          scrolling="no"
                          marginHeight={0}
                          marginWidth={0}
                          src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(editing.lng) - 0.005},${Number(editing.lat) - 0.005},${Number(editing.lng) + 0.005},${Number(editing.lat) + 0.005}&layer=mapnik&marker=${editing.lat},${editing.lng}`}
                          style={{ border: 0, borderRadius: '8px' }}
                        />
                      </div>
                    ) : null}

                    <ImageUploadField
                      label="Trade license document"
                      value={editing.tradeLicenseDocument || ''}
                      onChange={(tradeLicenseDocument) => setEditing({ ...editing, tradeLicenseDocument })}
                      folder="kyc"
                      accept="document"
                      helpText="Upload a clear trade license photo or PDF."
                    />
                  </div>
                </section>
              ) : null}

              {formError ? <div className="notice">{formError}</div> : null}
              {isSelf(editing) ? <p className="muted">You can update your account details and PIN. Your admin account cannot be deleted.</p> : null}

              <div className="modal-actions">
                <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>
                <button className="btn btn-light" type="button" onClick={() => setEditing(null)}>Cancel</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}

function ShopManager() {
  const { data, setData } = useApi(() => endpoints.shops(), [], []);
  const refresh = async () => setData(unwrap(await endpoints.shops()));

  return (
    <section className="panel">
      <div className="panel-head-row">
        <h2>Farmer shops</h2>
      </div>
      <p className="muted">Shops are created and managed by farmers from their dashboard. Admin can review and delete shops only.</p>
      <DataTable
        rows={data || []}
        columns={[
          { key: 'name', label: 'Shop' },
          { key: 'farmerName', label: 'Farmer' },
          { key: 'address', label: 'Address' },
          { key: 'radiusKm', label: 'Radius (km)' },
          { key: 'productCount', label: 'Products', render: (row) => row.productCount ?? 0 },
          { key: 'status', label: 'Status' },
        ]}
        actions={(row) => (
          <div className="action-row">
            <button className="btn btn-light" onClick={async () => { await endpoints.deleteShop(row.id); await refresh(); }}>Delete</button>
          </div>
        )}
        empty="No farmer shops yet"
      />
    </section>
  );
}

function FinanceManager() {
  const { data: transactions, setData: setTransactions } = useApi(() => endpoints.finance(), [], []);
  const { data: summary, setData: setSummary } = useApi(() => endpoints.financeSummary(), { platformCommissionRevenue: 0, totalGmvAmount: 0, totalOrdersCount: 0 }, []);
  const { data: commissionSettings, setData: setCommissionSettings } = useApi(() => endpoints.commissionSettings(), { commissionRatePercent: 4.5 }, []);
  const [editingRate, setEditingRate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEditingRate(String(commissionSettings?.commissionRatePercent ?? 4.5));
  }, [commissionSettings]);

  const refresh = async () => {
    setTransactions(unwrap(await endpoints.finance()));
    setSummary(unwrap(await endpoints.financeSummary()));
    setCommissionSettings(unwrap(await endpoints.commissionSettings()));
  };

  const saveRate = async () => {
    setSaving(true);
    try {
      await endpoints.updateCommissionSettings({ commissionRatePercent: Number(editingRate) || 4.5 });
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  const rows = Array.isArray(transactions) ? transactions : transactions?.items || [];
  const earned = Number(summary?.platformCommissionRevenue || 0);

  return (
    <>
      <section className="panel">
        <div className="panel-head-row">
          <h2>Commission settings</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Admin earnings" value={money(earned)} icon={Landmark} tone="dark" />
          <StatCard label="Total orders" value={summary?.totalOrdersCount || 0} icon={ReceiptIndianRupee} tone="dark" />
          <StatCard label="GMV" value={money(summary?.totalGmvAmount || 0)} icon={BarChart3} tone="dark" />
        </div>
        <div style={{ marginTop: 16 }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            label="Commission percentage"
            name="commissionRatePercent"
            type="number"
            step="0.1"
            value={editingRate}
            onChange={(e) => setEditingRate(e.target.value)}
          />
          <div style={{ alignSelf: 'end' }} className="modal-actions">
            <button className="btn btn-primary" type="button" onClick={saveRate} disabled={saving}>
              {saving ? 'Saving...' : 'Save commission'}
            </button>
          </div>
        </div>
        <p className="muted" style={{ marginTop: 8 }}>
          This percentage is used for new orders and payments. Platform commission is stored in the database and shown below.
        </p>
      </section>

      <ManageList
        title="Finance transactions"
        loader={() => endpoints.finance()}
        fallback={[]}
        columns={[
          { key: 'id', label: 'Payment' },
          { key: 'amount', label: 'Amount', render: (row) => money(row.amount) },
          { key: 'platformCommission', label: 'Commission', render: (row) => money(row.platformCommission) },
          { key: 'status', label: 'Status' },
        ]}
        detailRenderer={(item, close) => (
          <>
            <div className="modal-head">
              <h2>Payment details</h2>
              <button className="icon-only" onClick={close}><X size={18} /></button>
            </div>
            <div className="detail-grid">
              <div><span>Payment</span><strong>{item.id}</strong></div>
              <div><span>Order</span><strong>{item.orderId}</strong></div>
              <div><span>Amount</span><strong>{money(item.amount)}</strong></div>
              <div><span>Commission</span><strong>{money(item.platformCommission)}</strong></div>
              <div><span>Status</span><strong>{item.status}</strong></div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={async () => { await endpoints.refundPayment({ orderId: item.orderId, amount: item.amount }); close(); }}>
                Refund
              </button>
            </div>
          </>
        )}
        extraActions={() => <button className="btn btn-light" onClick={async () => { await endpoints.processPayouts(); await refresh(); }}>Process payouts</button>}
      />
    </>
  );
}

function CommissionManager() {
  const { data: slabs, setData: setSlabs } = useApi(() => endpoints.commissions(), [], []);
  const { data: commissionSettings, setData: setCommissionSettings } = useApi(() => endpoints.commissionSettings(), { commissionRatePercent: 4.5 }, []);
  const [rate, setRate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRate(String(commissionSettings?.commissionRatePercent ?? 4.5));
  }, [commissionSettings]);

  const refresh = async () => {
    setSlabs(unwrap(await endpoints.commissions()));
    setCommissionSettings(unwrap(await endpoints.commissionSettings()));
  };

  const saveRate = async () => {
    setSaving(true);
    try {
      await endpoints.updateCommissionSettings({ commissionRatePercent: Number(rate) || 4.5 });
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  const rows = Array.isArray(slabs) ? slabs : [];

  return (
    <>
      <section className="panel">
        <h2>Commission rate</h2>
        <p className="muted">This is the live platform commission used for new orders and payments.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Current commission %" value={`${rate || commissionSettings?.commissionRatePercent || 4.5}%`} icon={ReceiptIndianRupee} tone="dark" />
          <FormField
            label="Change commission %"
            name="commissionRatePercent"
            type="number"
            step="0.1"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
          <div style={{ alignSelf: 'end' }} className="modal-actions">
            <button className="btn btn-primary" type="button" onClick={saveRate} disabled={saving}>
              {saving ? 'Saving...' : 'Save rate'}
            </button>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>Commission slabs</h2>
        {rows.length ? (
          <DataTable
            rows={rows}
            columns={[
              { key: 'minAmount', label: 'Min', render: (row) => money(row.minAmount) },
              { key: 'maxAmount', label: 'Max', render: (row) => money(row.maxAmount) },
              { key: 'ratePercent', label: 'Rate %' },
              { key: 'applicableRegion', label: 'Region' },
            ]}
          />
        ) : (
          <div className="notice">No slab records yet. The live commission rate is the value above.</div>
        )}
      </section>
    </>
  );
}

function AdminTable({ title, loader, fallback, columns }) {
  const { data } = useApi(loader, fallback, []);
  return <section className="panel"><h2>{title}</h2><DataTable rows={Array.isArray(data) ? data : data?.items || []} columns={columns} /></section>;
}

function ManageList({ title, loader, fallback, columns, detailLoader, createLabel, createFields = [], saveCreate, saveUpdate, removeItem, detailRenderer, extraActions }) {
  const { data, setData } = useApi(loader, fallback, []);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const refresh = async () => setData(unwrap(await loader()));
  const rows = Array.isArray(data) ? data : data?.items || [];

  const openDetail = async (row) => {
    if (!detailLoader) return setSelected(row);
    setSelected(unwrap(await detailLoader(row.id || row.slug)));
  };

  return (
    <>
      <section className="panel">
        <div className="panel-head-row">
          <h2>{title}</h2>
          {createLabel ? <button className="btn btn-primary" onClick={() => setCreating({})}>{createLabel}</button> : null}
        </div>
        <DataTable
          rows={rows}
          columns={columns}
          actions={(row) => (
            <div className="action-row">
              <button className="btn btn-light" onClick={() => openDetail(row)}>View</button>
              {saveUpdate ? <button className="btn btn-light" onClick={() => setEditing({ ...row })}>Edit</button> : null}
              {removeItem ? <button className="btn btn-light" onClick={async () => { await removeItem(row); await refresh(); }}>Delete</button> : null}
              {extraActions ? extraActions(row, refresh) : null}
            </div>
          )}
        />
      </section>
      {selected ? <section className="modal-backdrop" role="presentation" onClick={() => setSelected(null)}><div className="modal" role="dialog" onClick={(e) => e.stopPropagation()}>{detailRenderer ? detailRenderer(selected, () => setSelected(null)) : <pre>{JSON.stringify(selected, null, 2)}</pre>}</div></section> : null}
      {editing && saveUpdate ? <section className="modal-backdrop" role="presentation" onClick={() => setEditing(null)}><div className="modal" role="dialog" onClick={(e) => e.stopPropagation()}><h2>Edit {title}</h2><form onSubmit={async (e) => { e.preventDefault(); await saveUpdate(editing); setEditing(null); await refresh(); }} className="form-grid single">{createFields.map((field) => <FormField key={field.name} {...field} value={editing[field.name] || ''} onChange={(e) => setEditing({ ...editing, [field.name]: e.target.value })} />)}<div className="modal-actions"><button className="btn btn-primary" type="submit">Save</button><button className="btn btn-light" type="button" onClick={() => setEditing(null)}>Cancel</button></div></form></div></section> : null}
      {creating && saveCreate ? <section className="modal-backdrop" role="presentation" onClick={() => setCreating(false)}><div className="modal" role="dialog" onClick={(e) => e.stopPropagation()}><h2>Create {title}</h2><form onSubmit={async (e) => { e.preventDefault(); await saveCreate(creating); setCreating(false); await refresh(); }} className="form-grid single">{createFields.map((field) => <FormField key={field.name} {...field} value={creating[field.name] || ''} onChange={(e) => setCreating({ ...creating, [field.name]: e.target.value })} />)}<div className="modal-actions"><button className="btn btn-primary" type="submit">Create</button><button className="btn btn-light" type="button" onClick={() => setCreating(false)}>Cancel</button></div></form></div></section> : null}
    </>
  );
}

export default function AdminPortal() {
  return (
    <AdminLayout title="Admin Command Center" subtitle="KYC, finance, shops, content, disputes, and platform controls." nav={nav}>
      <Switch>
        <Route exact path="/admin" render={() => <Redirect to="/admin/home" />} />
        <Route path="/admin/home" component={AdminHome} />
        <Route path="/admin/kyc" component={KycQueue} />
        <Route path="/admin/users" component={UserManager} />
        <Route path="/admin/commissions" component={CommissionManager} />
        <Route path="/admin/categories" render={() => (
          <ManageList
            title="Product categories"
            loader={() => endpoints.categories()}
            fallback={[]}
            columns={[
              { key: 'icon', label: 'Icon', render: (row) => row.icon || '-' },
              { key: 'name', label: 'Name' },
              { key: 'slug', label: 'Slug' },
            ]}
            detailLoader={(id) => endpoints.category(id)}
            createLabel="Add category"
            createFields={[
              { name: 'name', label: 'Category name', placeholder: 'e.g. Dairy & Milk' },
              { name: 'slug', label: 'URL slug', placeholder: 'e.g. dairy-milk (optional)' },
              { name: 'icon', label: 'Icon emoji', placeholder: 'e.g. 🥛' },
            ]}
            saveCreate={(payload) => endpoints.createCategory(payload)}
            saveUpdate={(payload) => endpoints.updateCategory(payload.id, payload)}
            removeItem={(row) => endpoints.deleteCategory(row.id)}
            detailRenderer={(item, close) => (
              <>
                <div className="modal-head">
                  <h2>Category details</h2>
                  <button className="icon-only" type="button" onClick={close}><X size={18} /></button>
                </div>
                <div className="detail-grid">
                  <div><span>Icon</span><strong>{item.icon || '-'}</strong></div>
                  <div><span>Name</span><strong>{item.name}</strong></div>
                  <div><span>Slug</span><strong>{item.slug}</strong></div>
                </div>
              </>
            )}
          />
        )} />
        <Route path="/admin/shops" component={ShopManager} />
        <Route path="/admin/finance" component={FinanceManager} />
        <Route path="/admin/cms" render={() => (
          <ManageList
            title="CMS banners"
            loader={() => endpoints.adminBanners()}
            fallback={[]}
            columns={[{ key: 'title', label: 'Banner' }, { key: 'audience', label: 'Audience' }, { key: 'status', label: 'Status' }]}
            detailLoader={(id) => endpoints.adminBanner(id)}
            createLabel="Create Banner"
            createFields={[{ name: 'title', label: 'Title' }, { name: 'imageUrl', label: 'Image URL' }, { name: 'linkUrl', label: 'Link URL' }, { name: 'audience', label: 'Audience' }, { name: 'status', label: 'Status' }]}
            saveCreate={(payload) => endpoints.createBanner(payload)}
            saveUpdate={(payload) => endpoints.updateBanner(payload.id, payload)}
            removeItem={(row) => endpoints.deleteBanner(row.id)}
            detailRenderer={(item, close) => (<><div className="modal-head"><h2>Banner details</h2><button className="icon-only" onClick={close}><X size={18} /></button></div><div className="detail-grid"><div><span>Title</span><strong>{item.title}</strong></div><div><span>Audience</span><strong>{item.audience}</strong></div><div><span>Status</span><strong>{item.status}</strong></div><div><span>Link</span><strong>{item.linkUrl}</strong></div></div></>)}
          />
        )} />
        <Route path="/admin/disputes" render={() => (
          <ManageList
            title="Dispute resolution"
            loader={() => endpoints.adminDisputes()}
            fallback={[]}
            columns={[
              { key: 'orderId', label: 'Order' },
              { key: 'customerName', label: 'Customer' },
              { key: 'farmerName', label: 'Farmer' },
              { key: 'orderTotal', label: 'Order total', render: (row) => money(row.orderTotal || 0) },
              { key: 'status', label: 'Status' },
            ]}
            detailLoader={(id) => endpoints.adminDispute(id)}
            createFields={[
              { name: 'orderId', label: 'Order ID', disabled: true },
              { name: 'customerName', label: 'Customer', disabled: true },
              { name: 'farmerName', label: 'Farmer', disabled: true },
              { name: 'reason', label: 'Reason', type: 'textarea' },
              {
                name: 'status',
                label: 'Status',
                type: 'select',
                options: [
                  { value: 'OPEN', label: 'Open' },
                  { value: 'RESOLVED', label: 'Resolved' },
                  { value: 'REJECTED', label: 'Rejected' },
                ],
              },
              {
                name: 'resolution',
                label: 'Resolution',
                type: 'select',
                options: [
                  { value: '', label: 'None' },
                  { value: 'full_refund', label: 'Full refund' },
                  { value: 'partial_refund', label: 'Partial refund' },
                  { value: 'replacement', label: 'Replacement' },
                  { value: 'rejected', label: 'Rejected' },
                ],
              },
            ]}
            saveUpdate={(payload) => endpoints.updateAdminDispute(payload.id, payload)}
            removeItem={(row) => endpoints.deleteDispute(row.id)}
            detailRenderer={(item, close) => (
              <>
                <div className="modal-head"><h2>Dispute details</h2><button className="icon-only" onClick={close}><X size={18} /></button></div>
                <div className="detail-grid">
                  <div><span>Order</span><strong>{item.orderId}</strong></div>
                  <div><span>Customer</span><strong>{item.customerName}</strong></div>
                  <div><span>Customer ID</span><strong>{item.customerId}</strong></div>
                  <div><span>Farmer</span><strong>{item.farmerName}</strong></div>
                  <div><span>Farmer ID</span><strong>{item.farmerId}</strong></div>
                  <div><span>Order total</span><strong>{money(item.orderTotal || item.order?.totalAmount || 0)}</strong></div>
                  <div><span>Reason</span><strong>{item.reason}</strong></div>
                  <div><span>Status</span><strong>{item.status}</strong></div>
                  <div><span>Resolution</span><strong>{item.resolution || '-'}</strong></div>
                  <div><span>Submitted</span><strong>{item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}</strong></div>
                </div>
                {item.order?.items?.length ? (
                  <div style={{ marginTop: '16px' }}>
                    <strong>Order items</strong>
                    {item.order.items.map((line) => (
                      <div className="step-line" key={`${line.productId}-${line.name}`}>
                        <span>{line.qty}</span>
                        {line.name} · {money(line.price)} / {line.unit}
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="modal-actions">
                  <button className="btn btn-primary" onClick={async () => { await endpoints.resolveDispute(item.id, { resolution: 'full_refund' }); close(); }}>Resolve</button>
                </div>
              </>
            )}
          />
        )} />
        <Route path="/admin/audit" render={() => <AdminTable title="Audit logs and permissions" loader={() => endpoints.audit()} fallback={[]} columns={[{ key: 'id', label: 'ID' }, { key: 'action', label: 'Action' }, { key: 'entity', label: 'Entity' }, { key: 'at', label: 'Time' }]} />} />
        <Route path="/admin/settings" render={() => <AdminSettings />} />
        <Route render={() => <StateBlock title="Admin screen not found" />} />
      </Switch>
    </AdminLayout>
  );
}
