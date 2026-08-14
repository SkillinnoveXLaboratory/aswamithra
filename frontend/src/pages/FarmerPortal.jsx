import { Redirect, Route, Switch } from 'react-router-dom';
import { ClipboardCheck, Home, PackagePlus, Send, Sprout, Store, UserCheck, Wallet, Wheat } from 'lucide-react';
import { useEffect, useState } from 'react';
import FarmerLayout from '../layouts/FarmerLayout.jsx';
import DataTable from '../components/DataTable.jsx';
import FormField from '../components/FormField.jsx';
import ImageUploadField from '../components/ImageUploadField.jsx';
import StatCard from '../components/StatCard.jsx';
import StateBlock from '../components/StateBlock.jsx';
import { useApi } from '../hooks/useApi.js';
import { api, endpoints, unwrap } from '../services/api.js';
import { money } from '../utils/format.js';
import { resolveMediaUrl } from '../utils/media.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Edit2, Trash2, X } from 'lucide-react';

const nav = [
  { label: 'Dashboard', href: '/farmer/home', icon: Home },
  { label: 'My Shop', href: '/farmer/my-shop', icon: Store },
  { label: 'Products', href: '/farmer/products', icon: Wheat },
  { label: 'Orders', href: '/farmer/orders', icon: ClipboardCheck },
  { label: 'Earnings', href: '/farmer/earnings', icon: Wallet },
  { label: 'KYC/Profile', href: '/farmer/profile', icon: UserCheck },
  { label: 'RFQs', href: '/farmer/rfqs', icon: Send },
];

function FarmerHome() {
  const { user } = useAuth();
  const { data } = useApi(() => endpoints.farmerDashboard(user?.id), { todayOrders: 0, pendingOrders: 0, monthlyEarnings: 0 }, [user?.id]);
  return (
    <>
      <div className="dashboard-grid stats">
        <StatCard label="Today orders" value={data.todayOrders ?? 0} icon={ClipboardCheck} tone="orange" />
        <StatCard label="Pending deliveries" value={data.pendingOrders ?? 0} icon={PackagePlus} tone="orange" />
        <StatCard label="Monthly earnings" value={money(data.monthlyEarnings ?? 0)} icon={Wallet} tone="orange" />
      </div>
      <section className="panel">
        <h2>Farmer work queue</h2>
        {['Check KYC status', 'Keep product stock updated', 'Accept new orders quickly', 'Pack and dispatch', 'Review payout statement'].map((item, index) => (
          <div className="step-line" key={item}><span>{index + 1}</span>{item}</div>
        ))}
      </section>
    </>
  );
}

function buildEmptyProductForm(categories = [], units = [], village = 'Kankipadu') {
  return {
    name: '',
    category: categories[0]?.name || '',
    price: '',
    unit: units[0]?.code || '',
    stock: '',
    minQty: '1',
    village,
    imageUrl: '',
  };
}

function FarmerProducts() {
  const { user } = useAuth();
  const { data: shopData } = useApi(() => endpoints.farmerShop(user?.id), null, [user?.id]);
  const shop = shopData?.id ? shopData : null;
  const { data, setData } = useApi(() => endpoints.farmerProducts(user?.id), [], [user?.id]);
  const { data: categoryRows } = useApi(() => endpoints.categories(), [], []);
  const { data: unitRows } = useApi(() => endpoints.units(), [], []);
  const categories = Array.isArray(categoryRows) ? categoryRows : [];
  const units = Array.isArray(unitRows) ? unitRows : [];
  const categoryOptions = categories.map((item) => ({ value: item.name, label: `${item.icon ? `${item.icon} ` : ''}${item.name}` }));
  const unitOptions = units.map((item) => ({ value: item.code, label: item.label }));
  const [form, setForm] = useState(buildEmptyProductForm());
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!categories.length && !units.length) return;
    setForm((current) => ({
      ...current,
      category: current.category || categories[0]?.name || '',
      unit: current.unit || units[0]?.code || '',
    }));
  }, [categories, units]);
  const shopProducts = (data || []).filter((product) => !shop?.id || product.shopId === shop.id || !product.shopId);
  const create = async (event) => {
    event.preventDefault();
    if (!form.imageUrl) {
      setFormError('Please upload a product photo before publishing.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const payload = {
        name: form.name,
        category: form.category,
        price: form.price,
        unit: form.unit,
        stock: form.stock,
        minQty: form.minQty,
        village: form.village,
        images: [form.imageUrl],
        sellerId: user?.id,
        sellerName: user?.name,
        shopId: shop?.id,
        marketReferencePrice: Number(form.price || 0) * 1.2,
        lat: shop?.location?.lat || 16.452,
        lng: shop?.location?.lng || 80.723,
      };
      await endpoints.createProduct(payload);
      setData(unwrap(await endpoints.farmerProducts(user?.id)));
      setForm(buildEmptyProductForm(categories, units, form.village || 'Kankipadu'));
      setCreating(false);
    } catch (error) {
      setFormError(error?.response?.data?.error?.message || 'Unable to publish product.');
    } finally {
      setSubmitting(false);
    }
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    if (!editing.imageUrl) {
      setFormError('Please upload a product photo before saving.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const payload = {
        name: editing.name,
        category: editing.category,
        price: editing.price,
        unit: editing.unit,
        stock: editing.stock,
        minQty: editing.minQty,
        village: editing.village,
        description: editing.description,
        images: [editing.imageUrl],
        sellerId: user?.id,
        sellerName: user?.name,
      };
      await endpoints.updateProduct(editing.id, payload);
      setData(unwrap(await endpoints.farmerProducts(user?.id)));
      setEditing(null);
    } catch (error) {
      setFormError(error?.response?.data?.error?.message || 'Unable to update product.');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteProduct = async (id) => {
    await api.delete(`/products/${id}`);
    setData(unwrap(await endpoints.farmerProducts(user?.id)));
  };

  const openCreate = () => {
    setFormError('');
    setForm(buildEmptyProductForm(categories, units, form.village || 'Kankipadu'));
    setCreating(true);
  };

  return (
    <>
      <section className="panel panel-products">
        <div className="panel-head-row">
          <h2>Your products{shop?.name ? ` · ${shop.name}` : ''}</h2>
          <button className="btn btn-primary" type="button" onClick={openCreate} disabled={!shop}>
            <PackagePlus size={18} /> Add product
          </button>
        </div>
        {!shop ? (
          <StateBlock title="Create your shop first" message="Go to My Shop and create your shop before adding products." />
        ) : null}
        <DataTable compact rows={shopProducts} columns={[
          {
            key: 'photo',
            label: 'Photo',
            render: (row) => {
              const src = resolveMediaUrl(row.images?.[0] || row.imageUrl || '');
              return src ? (
                <img className="product-table-thumb" src={src} alt={row.name || 'Product'} />
              ) : (
                <span className="muted">No photo</span>
              );
            },
          },
          { key: 'name', label: 'Product' },
          { key: 'price', label: 'Price', render: (row) => `${money(row.price)} / ${row.unit}` },
          { key: 'stock', label: 'Stock' },
          { key: 'status', label: 'Status' },
        ]} actions={(row) => (
          <div className="action-row action-row-compact">
            <button className="btn btn-light btn-compact" type="button" onClick={() => { setFormError(''); setEditing({ ...row, imageUrl: row.images?.[0] || '' }); }}><Edit2 size={14} /> Edit</button>
            <button className="btn btn-light btn-compact" type="button" onClick={async () => { await endpoints.updateProductStatus(row.id, row.status === 'active' ? 'paused' : 'active'); setData(unwrap(await endpoints.farmerProducts(user?.id))); }}>{row.status === 'active' ? 'Pause' : 'Activate'}</button>
            <button className="btn btn-light btn-compact" type="button" onClick={async () => { await deleteProduct(row.id); }}><Trash2 size={14} /> Delete</button>
          </div>
        )} />
      </section>
      {creating ? (
        <div className="modal-backdrop" role="presentation" onClick={() => { setCreating(false); setFormError(''); }}>
          <section className="modal" role="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Add product{shop?.name ? ` to ${shop.name}` : ''}</h2>
              <button className="icon-only" type="button" onClick={() => { setCreating(false); setFormError(''); }}><X size={18} /></button>
            </div>
            <form className="form-grid single" onSubmit={create}>
              <FormField label="Product name" name="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Fresh cow milk" required />
              <FormField label="Category" name="category" type="select" options={categoryOptions} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required disabled={!categoryOptions.length} />
              <FormField label="Price" name="price" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="e.g. 60" required />
              <FormField label="Unit" name="unit" type="select" options={unitOptions} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} required disabled={!unitOptions.length} />
              <FormField label="Stock" name="stock" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="e.g. 100" required />
              <FormField label="Minimum quantity" name="minQty" type="number" value={form.minQty} onChange={(e) => setForm({ ...form, minQty: e.target.value })} placeholder="e.g. 1" required />
              <FormField label="Village" name="village" value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} placeholder="e.g. Kankipadu" required />
              <ImageUploadField
                label="Product photo"
                value={form.imageUrl}
                onChange={(imageUrl) => setForm({ ...form, imageUrl })}
                required
              />
              {formError ? <div className="notice">{formError}</div> : null}
              <div className="modal-actions">
                <button className="btn btn-primary" type="submit" disabled={!shop || submitting}><Sprout size={18} /> {submitting ? 'Publishing...' : 'Publish product'}</button>
                <button className="btn btn-light" type="button" onClick={() => { setCreating(false); setFormError(''); }}>Cancel</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
      {editing ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setEditing(null)}>
          <section className="modal" role="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Edit product</h2>
              <button className="icon-only" type="button" onClick={() => setEditing(null)}><X size={18} /></button>
            </div>
            <form className="form-grid single" onSubmit={saveEdit}>
              <FormField label="Product name" name="name" value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. Fresh cow milk" required />
              <FormField label="Category" name="category" type="select" options={categoryOptions} value={editing.category || ''} onChange={(e) => setEditing({ ...editing, category: e.target.value })} required />
              <FormField label="Price" name="price" type="number" value={editing.price || ''} onChange={(e) => setEditing({ ...editing, price: e.target.value })} placeholder="e.g. 60" required />
              <FormField label="Unit" name="unit" type="select" options={unitOptions} value={editing.unit || ''} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} required />
              <FormField label="Stock" name="stock" type="number" value={editing.stock || ''} onChange={(e) => setEditing({ ...editing, stock: e.target.value })} required />
              <FormField label="Minimum quantity" name="minQty" type="number" value={editing.minQty || ''} onChange={(e) => setEditing({ ...editing, minQty: e.target.value })} />
              <FormField label="Village" name="village" value={editing.village || ''} onChange={(e) => setEditing({ ...editing, village: e.target.value })} />
              <FormField label="Description" name="description" type="textarea" value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              <ImageUploadField
                label="Product photo"
                value={editing.imageUrl || ''}
                onChange={(imageUrl) => setEditing({ ...editing, imageUrl })}
                required
              />
              {formError ? <div className="notice">{formError}</div> : null}
              <div className="modal-actions">
                <button className="btn btn-primary" type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save changes'}</button>
                <button className="btn btn-light" type="button" onClick={() => { setEditing(null); setFormError(''); }}>Cancel</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}

function FarmerOrders() {
  const { user } = useAuth();
  const { data, setData } = useApi(() => endpoints.farmerOrders(user?.id), [], [user?.id]);
  const refresh = async () => setData(unwrap(await endpoints.farmerOrders(user?.id)));
  const actionFor = (row) => (
    <div className="action-row">
      <button className="btn btn-light" onClick={async () => { await endpoints.acceptOrder(row.id); await refresh(); }}>Accept</button>
      <button className="btn btn-light" onClick={async () => { await endpoints.packOrder(row.id); await refresh(); }}>Pack</button>
      <button className="btn btn-light" onClick={async () => { await endpoints.outForDelivery(row.id); await refresh(); }}>Dispatch</button>
    </div>
  );
  return <section className="panel"><h2>Orders to handle</h2><DataTable rows={data || []} columns={[{ key: 'id', label: 'Order' }, { key: 'totalAmount', label: 'Total', render: (row) => money(row.totalAmount) }, { key: 'farmerPayoutAmount', label: 'Payout', render: (row) => money(row.farmerPayoutAmount) }, { key: 'status', label: 'Status' }]} actions={actionFor} /></section>;
}

function FarmerEarnings() {
  const { user } = useAuth();
  const { data } = useApi(() => endpoints.farmerEarnings(user?.id), { totalExtraIncomeEarned: 0 }, [user?.id]);
  const { data: payouts } = useApi(() => endpoints.farmerPayouts(user?.id), [], [user?.id]);
  const earned = data.totalExtraIncomeEarned ?? data.extraEarnedLifetime ?? data.totalEarnings ?? 0;
  return <section className="panel"><h2>Earnings and payouts</h2><div className="dashboard-grid stats"><StatCard label="Earned via Aswamithra" value={money(earned)} icon={Wallet} tone="orange" /><StatCard label="Payout records" value={(payouts || []).length} icon={ClipboardCheck} tone="orange" /></div><DataTable rows={payouts || []} columns={[{ key: 'id', label: 'Payout' }, { key: 'netCredit', label: 'Net credit', render: (row) => money(row.netCredit) }, { key: 'utr', label: 'UTR' }, { key: 'status', label: 'Status' }]} /></section>;
}

function FarmerMyShop() {
  const { user } = useAuth();
  const { data, setData } = useApi(() => endpoints.farmerShop(user?.id), null, [user?.id]);
  const shop = data?.id ? data : null;
  const [form, setForm] = useState({ name: '', address: '', radiusKm: '10', operatingHours: '07:00 AM - 09:00 PM' });
  const [editing, setEditing] = useState(false);

  const refresh = async () => {
    const next = unwrap(await endpoints.farmerShop(user?.id));
    setData(next?.id ? next : null);
  };

  const createShop = async (event) => {
    event.preventDefault();
    const created = unwrap(await endpoints.createFarmerShop({ ...form, farmerId: user?.id, farmerName: user?.name }));
    setEditing(false);
    setData(created?.id ? created : null);
    await refresh();
  };

  const saveShop = async (event) => {
    event.preventDefault();
    const updated = unwrap(await endpoints.updateFarmerShop(shop.id, { ...form, farmerId: user?.id, farmerName: user?.name }));
    setEditing(false);
    setData(updated?.id ? updated : shop);
    await refresh();
  };

  const startCreate = () => {
    setForm({ name: '', address: '', radiusKm: '10', operatingHours: '07:00 AM - 09:00 PM' });
    setEditing(true);
  };

  const startEdit = () => {
    setForm({
      name: shop?.name || '',
      address: shop?.address || '',
      radiusKm: String(shop?.radiusKm || '10'),
      operatingHours: shop?.operatingHours || '07:00 AM - 09:00 PM',
    });
    setEditing(true);
  };

  const removeShop = async () => {
    await endpoints.deleteFarmerShop(shop.id, user?.id);
    setData(null);
    setEditing(false);
  };

  return (
    <div className="content-split">
      <section className="panel">
        <div className="panel-head-row">
          <h2>My shop</h2>
          {!shop ? <button className="btn btn-primary" onClick={startCreate}>Create Shop</button> : null}
        </div>
        {shop ? (
          <>
            <div className="profile-card">
              <strong>{shop.name}</strong>
              <span>{shop.address}</span>
              <span>Radius: {shop.radiusKm ?? '-'} km</span>
              <span>Products listed: {shop.productCount ?? 0}</span>
              <span>Hours: {shop.operatingHours || '-'}</span>
              <span className={`pill ${shop.status === 'active' ? 'good' : 'warn'}`}>{shop.status}</span>
            </div>
            <div className="action-row" style={{ marginTop: 16 }}>
              <button className="btn btn-light" onClick={startEdit}>Edit shop</button>
              <button className="btn btn-light" onClick={removeShop}>Delete shop</button>
            </div>
          </>
        ) : (
          <StateBlock title="No shop yet" message="Create your shop here to start listing products. Each farmer can have one shop." />
        )}
      </section>
      {editing ? (
        <section className="panel">
          <h2>{shop ? 'Edit shop' : 'Create shop'}</h2>
          <form className="form-grid single" onSubmit={shop ? saveShop : createShop}>
            <FormField label="Shop name" name="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <FormField label="Address" name="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
            <FormField label="Radius km" name="radiusKm" value={form.radiusKm} onChange={(e) => setForm({ ...form, radiusKm: e.target.value })} />
            <FormField label="Operating hours" name="operatingHours" value={form.operatingHours} onChange={(e) => setForm({ ...form, operatingHours: e.target.value })} />
            <div className="modal-actions">
              <button className="btn btn-primary" type="submit">Save shop</button>
              <button className="btn btn-light" type="button" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </form>
        </section>
      ) : null}
    </div>
  );
}

function FarmerProfile() {
  const { user } = useAuth();
  const { data } = useApi(() => endpoints.kycStatus(user?.id), { kycStatus: 'approved', bankAccountVerified: true }, [user?.id]);
  return <section className="panel"><h2>KYC and farm profile</h2><div className="profile-card"><strong>{user?.name}</strong><span>{user?.mobile}</span><span className="pill warn">KYC: {data.kycStatus}</span><span className="pill good">Bank: {data.bankAccountVerified ? 'Verified' : 'Pending'}</span></div></section>;
}

function FarmerRfqs() {
  const { user } = useAuth();
  const { data } = useApi(() => endpoints.farmerRfqs(), [], []);
  const [sent, setSent] = useState('');
  return <section className="panel"><h2>Bulk RFQs</h2><DataTable rows={data || []} columns={[{ key: 'id', label: 'RFQ' }, { key: 'cropName', label: 'Crop' }, { key: 'quantityQuintals', label: 'Qty' }, { key: 'status', label: 'Status' }]} actions={(row) => <button className="btn btn-primary" onClick={async () => { await endpoints.submitQuote(row.id, { farmerId: user?.id, farmerName: user?.name, pricePerQuintal: 4600 }); setSent(row.id); }}>Quote</button>} />{sent ? <StateBlock type="success" title={`Quote submitted for ${sent}`} /> : null}</section>;
}

export default function FarmerPortal() {
  return (
    <FarmerLayout title="Farmer Seller Portal" subtitle="Manage crops, orders, KYC, earnings, and bulk RFQs." nav={nav}>
      <Switch>
        <Route exact path="/farmer" render={() => <Redirect to="/farmer/home" />} />
        <Route path="/farmer/home" component={FarmerHome} />
        <Route path="/farmer/my-shop" component={FarmerMyShop} />
        <Route path="/farmer/products" component={FarmerProducts} />
        <Route path="/farmer/orders" component={FarmerOrders} />
        <Route path="/farmer/earnings" component={FarmerEarnings} />
        <Route path="/farmer/payouts" component={FarmerEarnings} />
        <Route path="/farmer/profile" component={FarmerProfile} />
        <Route path="/farmer/rfqs" component={FarmerRfqs} />
      </Switch>
    </FarmerLayout>
  );
}
