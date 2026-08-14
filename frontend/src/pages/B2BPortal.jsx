import { Redirect, Route, Switch, useHistory, useParams } from 'react-router-dom';
import { BadgeIndianRupee, CheckCircle, ClipboardCheck, ClipboardList, Edit2, FileText, Home, Landmark, PackagePlus, Send, Trash2, Truck, Wheat, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import B2BLayout from '../layouts/B2BLayout.jsx';
import DataTable from '../components/DataTable.jsx';
import FormField from '../components/FormField.jsx';
import ImageUploadField from '../components/ImageUploadField.jsx';
import StatCard from '../components/StatCard.jsx';
import StateBlock from '../components/StateBlock.jsx';
import { useApi } from '../hooks/useApi.js';
import { endpoints, unwrap } from '../services/api.js';
import { money } from '../utils/format.js';
import { useAuth } from '../context/AuthContext.jsx';

const ORDER_STATUSES = ['PLACED', 'CONFIRMED', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
const PAYMENT_STATUSES = ['PENDING', 'PAID'];

const nav = [
  { label: 'Dashboard', href: '/b2b/home', icon: Home },
  { label: 'Catalog', href: '/b2b/catalog', icon: Wheat },
  { label: 'New RFQ', href: '/b2b/rfq/new', icon: Send },
  { label: 'My RFQs', href: '/b2b/rfqs', icon: ClipboardList },
  { label: 'Products', href: '/b2b/products', icon: PackagePlus },
  { label: 'Orders', href: '/b2b/orders', icon: ClipboardCheck },
  { label: 'Payments & Delivery', href: '/b2b/payments', icon: Truck },
  { label: 'Invoices', href: '/b2b/invoices', icon: FileText },
  { label: 'Credit', href: '/b2b/credit', icon: Landmark },
  { label: 'Dispatch', href: '/b2b/dispatches', icon: Truck },
];

// Per-user local storage keeps a new B2B account completely empty until the
// user adds their own products/orders, while still persisting across reloads.
function userKey(user, kind) {
  return `b2b_${kind}_${user?.id || 'guest'}`;
}
function readList(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}
function writeList(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function B2BHome() {
  const { user } = useAuth();
  const products = readList(userKey(user, 'products'));
  const orders = readList(userKey(user, 'orders'));
  const { data: rfqs } = useApi(() => endpoints.b2bRfqs(user?.id), [], [user?.id]);
  const opened = (rfqs || []).filter((r) => r.status === 'OPEN').length;
  const delivered = orders.filter((o) => o.status === 'DELIVERED').length;
  return (
    <section className="panel">
      <h2>B2B dashboard</h2>
      <div className="dashboard-grid stats">
        <StatCard label="My products" value={products.length} icon={Wheat} tone="blue" />
        <StatCard label="Open RFQs" value={opened} icon={ClipboardList} tone="blue" />
        <StatCard label="Orders received" value={orders.length} icon={Truck} tone="blue" />
        <StatCard label="Delivered" value={delivered} icon={CheckCircle} tone="blue" />
      </div>
      <p className="notice">Your catalog, RFQs, products, orders, invoices and credit start empty. Upload bulk products from Products and raise RFQs from New RFQ.</p>
    </section>
  );
}

function emptyRfqForm() {
  return { cropName: '', quantityQuintals: '', targetPricePerQuintal: '' };
}

function NewRfq() {
  const { user } = useAuth();
  const [form, setForm] = useState(emptyRfqForm());
  const [msg, setMsg] = useState('');
  const history = useHistory();
  return (
    <section className="panel">
      <h2>Create RFQ</h2>
      <form className="form-grid" onSubmit={async (e) => {
        e.preventDefault();
        const payload = { ...form, buyerId: user?.id, buyerName: user?.name };
        try {
          const rfq = (await endpoints.createRfq(payload)).data.data;
          history.push(`/b2b/rfq/${rfq.id}`);
        } catch (err) {
          setMsg(err?.response?.data?.error?.message || 'Unable to create RFQ.');
        }
      }}>
        <FormField label="Crop name" name="cropName" value={form.cropName} onChange={(e) => setForm({ ...form, cropName: e.target.value })} required />
        <FormField label="Quantity (quintals)" name="quantityQuintals" type="number" value={form.quantityQuintals} onChange={(e) => setForm({ ...form, quantityQuintals: e.target.value })} required />
        <FormField label="Target price / quintal" name="targetPricePerQuintal" type="number" value={form.targetPricePerQuintal} onChange={(e) => setForm({ ...form, targetPricePerQuintal: e.target.value })} required />
        {msg ? <div className="notice">{msg}</div> : null}
        <button className="btn btn-primary form-submit"><Send size={18} /> Send RFQ</button>
      </form>
    </section>
  );
}

function B2BCatalog() {
  const { data } = useApi(() => endpoints.b2bCatalog(), [], []);
  return (
    <section className="panel">
      <h2>Wholesale catalog</h2>
      <DataTable
        rows={data || []}
        columns={[
          { key: 'name', label: 'Product', render: (row) => row.name || row.cropName || '—' },
          { key: 'b2bTierPrice', label: 'Tier price', render: (row) => money(row.b2bTierPrice || row.tierPricePerQuintal) },
          { key: 'unit', label: 'Unit' },
          { key: 'stock', label: 'Stock', render: (row) => row.stock || row.availableStockQuintals || '—' },
        ]}
        empty="No catalog items yet. Add products from Products."
      />
    </section>
  );
}

function B2BRfqList() {
  const { user } = useAuth();
  const history = useHistory();
  const { data } = useApi(() => endpoints.b2bRfqs(user?.id), [], [user?.id]);
  return (
    <section className="panel">
      <h2>My RFQs</h2>
      <DataTable
        rows={data || []}
        columns={[
          { key: 'cropName', label: 'Crop' },
          { key: 'quantityQuintals', label: 'Qty (quintals)' },
          { key: 'targetPricePerQuintal', label: 'Target price', render: (row) => money(row.targetPricePerQuintal) },
          { key: 'status', label: 'Status' },
        ]}
        actions={(row) => <button className="btn btn-light" onClick={() => history.push(`/b2b/rfq/${row.id}`)}>View quotes</button>}
        empty="No RFQs yet. Create one from New RFQ."
      />
    </section>
  );
}

function RfqDetail() {
  const { id } = useParams();
  const { data, setData } = useApi(() => endpoints.b2bRfq(id), { quotesReceived: [] }, [id]);
  const accept = async (row) => {
    await endpoints.acceptQuote(row.id);
    setData(unwrap(await endpoints.b2bRfq(id)));
  };
  return (
    <section className="panel">
      <h2>RFQ quote comparison</h2>
      <div className="profile-card">
        <strong>{data.cropName}</strong>
        <span>{data.quantityQuintals} quintals</span>
        <span className="pill warn">{data.status || 'OPEN'}</span>
      </div>
      <DataTable
        rows={data.quotesReceived || data.bids || []}
        columns={[
          { key: 'farmerName', label: 'Farmer' },
          { key: 'pricePerQuintal', label: 'Price', render: (row) => money(row.pricePerQuintal || row.bidPricePerKg) },
          { key: 'deliveryDate', label: 'Delivery', render: (row) => row.deliveryDate || '—' },
          { key: 'status', label: 'Status' },
        ]}
        actions={(row) => <button className="btn btn-primary" onClick={() => accept(row)}>Accept</button>}
        empty="No quotes received yet for this RFQ."
      />
    </section>
  );
}

function ProductModal({ title, values, setValues, onSubmit, onClose, error, submitting }) {
  const set = (e) => setValues((v) => ({ ...v, [e.target.name]: e.target.value }));
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="modal" role="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-only" type="button" onClick={onClose}><X size={18} /></button>
        </div>
        <form className="form-grid" onSubmit={onSubmit}>
          <FormField label="Product name" name="name" value={values.name || ''} onChange={set} required />
          <FormField label="Category" name="category" value={values.category || ''} onChange={set} required />
          <FormField label="Price" name="price" type="number" value={values.price || ''} onChange={set} required />
          <FormField label="Unit" name="unit" value={values.unit || ''} onChange={set} required />
          <FormField label="Stock (quintals)" name="stock" type="number" value={values.stock || ''} onChange={set} required />
          <FormField label="Min order qty" name="minQty" type="number" value={values.minQty || ''} onChange={set} />
          <FormField label="Description" name="description" type="textarea" value={values.description || ''} onChange={set} />
          <ImageUploadField
            label="Product photo"
            value={values.imageUrl || ''}
            onChange={(url) => setValues((v) => ({ ...v, imageUrl: url }))}
            required
          />
          {error ? <div className="notice">{error}</div> : null}
          <div className="modal-actions">
            <button className="btn btn-primary" type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
            <button className="btn btn-light" type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function emptyProductForm() {
  return { name: '', category: '', price: '', unit: 'quintal', stock: '', minQty: '1', description: '', imageUrl: '' };
}

function B2BProducts() {
  const { user } = useAuth();
  const key = userKey(user, 'products');
  const [products, setProducts] = useState(() => readList(key));
  const [form, setForm] = useState(emptyProductForm());
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => { setProducts(readList(key)); }, [key]);

  const save = (values) => {
    const list = readList(key);
    const idx = list.findIndex((p) => p.id === values.id);
    if (idx >= 0) list[idx] = values;
    else list.push(values);
    writeList(key, list);
    setProducts(list);
  };

  const create = (e) => {
    e.preventDefault();
    if (!form.imageUrl) { setFormError('Please upload a product photo before publishing.'); return; }
    setSubmitting(true);
    setFormError('');
    try {
      save({ id: 'b2b_p_' + Date.now(), ...form, price: Number(form.price || 0), stock: Number(form.stock || 0), sellerId: user?.id, sellerName: user?.name, status: 'active' });
      setCreating(false);
      setForm(emptyProductForm());
    } catch (err) { setFormError('Unable to publish product.'); } finally { setSubmitting(false); }
  };

  const update = (e) => {
    e.preventDefault();
    if (!editing.imageUrl) { setFormError('Please upload a product photo before saving.'); return; }
    setSubmitting(true);
    setFormError('');
    try {
      save({ ...editing, price: Number(editing.price || 0), stock: Number(editing.stock || 0) });
      setEditing(null);
    } catch (err) { setFormError('Unable to update product.'); } finally { setSubmitting(false); }
  };

  const remove = (id) => {
    const list = readList(key).filter((p) => p.id !== id);
    writeList(key, list);
    setProducts(list);
  };

  return (
    <>
      <section className="panel panel-products">
        <div className="panel-head-row">
          <h2>Your bulk products</h2>
          <button className="btn btn-primary" type="button" onClick={() => { setFormError(''); setForm(emptyProductForm()); setEditing(null); setCreating(true); }}><PackagePlus size={18} /> Add product</button>
        </div>
        <DataTable
          compact
          rows={products}
          columns={[
            { key: 'photo', label: 'Photo', render: (row) => (row.imageUrl ? <img className="product-table-thumb" src={row.imageUrl} alt={row.name || 'Product'} /> : <span className="muted">No photo</span>) },
            { key: 'name', label: 'Product' },
            { key: 'price', label: 'Price', render: (row) => `${money(row.price)} / ${row.unit}` },
            { key: 'stock', label: 'Stock' },
            { key: 'status', label: 'Status' },
          ]}
          actions={(row) => (
            <div className="action-row action-row-compact">
              <button className="btn btn-light btn-compact" type="button" onClick={() => { setFormError(''); setEditing({ ...row }); }}><Edit2 size={14} /> Edit</button>
              <button className="btn btn-light btn-compact" type="button" onClick={() => remove(row.id)}><Trash2 size={14} /> Delete</button>
            </div>
          )}
          empty="No products uploaded yet. Click Add product to create your first listing."
        />
      </section>
      {creating ? <ProductModal title="Add product" values={form} setValues={setForm} onSubmit={create} onClose={() => { setCreating(false); setFormError(''); }} error={formError} submitting={submitting} /> : null}
      {editing ? <ProductModal title="Edit product" values={editing} setValues={setEditing} onSubmit={update} onClose={() => { setEditing(null); setFormError(''); }} error={formError} submitting={submitting} /> : null}
    </>
  );
}

function B2BOrders() {
  const { user } = useAuth();
  const key = userKey(user, 'orders');
  const [orders, setOrders] = useState(() => readList(key));
  useEffect(() => { setOrders(readList(key)); }, [key]);
  const transition = (id, status) => {
    const next = readList(key).map((o) => (o.id === id ? { ...o, status } : o));
    writeList(key, next);
    setOrders(next);
  };
  const actionFor = (row) => {
    const buttons = [];
    if (row.status === 'PLACED') buttons.push({ label: 'Confirm', to: 'CONFIRMED' });
    if (row.status === 'CONFIRMED') buttons.push({ label: 'Pack', to: 'PACKED' });
    if (row.status === 'PACKED') buttons.push({ label: 'Dispatch', to: 'OUT_FOR_DELIVERY' });
    if (row.status === 'OUT_FOR_DELIVERY') buttons.push({ label: 'Mark delivered', to: 'DELIVERED' });
    return (
      <div className="action-row">
        {buttons.map((b) => <button key={b.to} className="btn btn-light" onClick={() => transition(row.id, b.to)}>{b.label}</button>)}
      </div>
    );
  };
  return (
    <section className="panel">
      <h2>Bulk orders</h2>
      <DataTable
        rows={orders}
        columns={[
          { key: 'id', label: 'Order' },
          { key: 'sellerName', label: 'Supplier', render: (row) => row.sellerName || row.buyerName || '—' },
          { key: 'totalAmount', label: 'Total', render: (row) => money(row.totalAmount) },
          { key: 'status', label: 'Status' },
        ]}
        actions={actionFor}
        empty="No bulk orders yet. Orders for your products will appear here."
      />
    </section>
  );
}

function B2BPayments() {
  const { user } = useAuth();
  const key = userKey(user, 'orders');
  const [orders, setOrders] = useState(() => readList(key));
  useEffect(() => { setOrders(readList(key)); }, [key]);
  const setField = (id, field, value) => {
    const next = readList(key).map((o) => (o.id === id ? { ...o, [field]: value } : o));
    writeList(key, next);
    setOrders(next);
  };
  const select = (row, field, options) => (
    <select value={row[field] || (field === 'status' ? 'PLACED' : 'PENDING')} onChange={(e) => setField(row.id, field, e.target.value)}>
      {options.map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  );
  return (
    <section className="panel">
      <h2>Payment & delivery</h2>
      <DataTable
        rows={orders}
        columns={[
          { key: 'id', label: 'Order' },
          { key: 'sellerName', label: 'Supplier', render: (row) => row.sellerName || row.buyerName || '—' },
          { key: 'totalAmount', label: 'Total', render: (row) => money(row.totalAmount) },
          { key: 'paymentStatus', label: 'Payment', render: (row) => select(row, 'paymentStatus', PAYMENT_STATUSES) },
          { key: 'status', label: 'Delivery', render: (row) => select(row, 'status', ORDER_STATUSES) },
        ]}
        empty="No orders to settle yet."
      />
    </section>
  );
}

function B2BInvoices() {
  const { user } = useAuth();
  const orders = readList(userKey(user, 'orders'));
  const [invoice, setInvoice] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = async (order) => {
    setBusy(true);
    setInvoice(null);
    try {
      setInvoice((await endpoints.b2bInvoice(order.id)).data.data);
    } catch {
      setInvoice({ orderId: order.id, invoiceNumber: `Not generated yet` });
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="panel">
      <h2>GST invoices</h2>
      {orders.length === 0 ? (
        <StateBlock type="soft" title="No invoices" message="Invoices are generated from your delivered orders." />
      ) : (
        <DataTable
          rows={orders}
          columns={[
            { key: 'id', label: 'Order' },
            { key: 'totalAmount', label: 'Amount', render: (row) => money(row.totalAmount) },
            { key: 'status', label: 'Status' },
          ]}
          actions={(row) => <button className="btn btn-light" onClick={() => load(row)} disabled={busy}>View invoice</button>}
        />
      )}
      {invoice ? (
        <div className="profile-card">
          <strong>{invoice.invoiceNumber || `INV-${invoice.orderId}`}</strong>
          <span>Order: {invoice.orderId}</span>
          <span>GSTIN: {invoice.gstinBuyer || invoice.buyerId || '—'}</span>
          <span>Total: {money(invoice.totalAmount)}</span>
        </div>
      ) : null}
    </section>
  );
}

function B2BCredit() {
  const { user } = useAuth();
  const { data } = useApi(() => endpoints.b2bCredit(), { totalApprovedCreditLimit: 0, utilizedCreditAmount: 0, availableCreditAmount: 0, nextPaymentDueDate: null }, [user?.id]);
  return (
    <section className="panel">
      <h2>Credit ledger</h2>
      <div className="dashboard-grid stats">
        <StatCard label="Credit limit" value={money(data.totalApprovedCreditLimit)} icon={Landmark} tone="blue" />
        <StatCard label="Used" value={money(data.utilizedCreditAmount)} icon={FileText} tone="blue" />
        <StatCard label="Available" value={money(data.availableCreditAmount)} icon={BadgeIndianRupee} tone="blue" />
      </div>
      <p className="notice">Next payment due: {data.nextPaymentDueDate || 'No active credit'}</p>
    </section>
  );
}

function DispatchPage() {
  const { user } = useAuth();
  const orders = readList(userKey(user, 'orders')).filter((o) => o.status === 'OUT_FOR_DELIVERY' || o.status === 'DELIVERED');
  return (
    <section className="panel">
      <h2>Dispatch tracking</h2>
      {orders.length === 0 ? (
        <StateBlock type="soft" title="No dispatches" message="Dispatched and delivered orders appear here with tracking details." />
      ) : (
        <DataTable
          rows={orders}
          columns={[
            { key: 'id', label: 'Order' },
            { key: 'status', label: 'Status' },
            { key: 'tracking', label: 'Tracking', render: (row) => `DLV-${row.id}` },
            { key: 'deliveredAt', label: 'Delivered at', render: (row) => row.deliveredAt || '—' },
          ]}
          empty="No dispatches yet."
        />
      )}
    </section>
  );
}

export default function B2BPortal() {
  return (
    <B2BLayout title="B2B Wholesale Portal" subtitle="Your wholesale catalog, RFQs, products, orders, invoices, and credit." nav={nav}>
      <Switch>
        <Route exact path="/b2b" render={() => <Redirect to="/b2b/home" />} />
        <Route path="/b2b/home" component={B2BHome} />
        <Route path="/b2b/catalog" component={B2BCatalog} />
        <Route path="/b2b/rfq/new" component={NewRfq} />
        <Route path="/b2b/rfqs" component={B2BRfqList} />
        <Route path="/b2b/rfq/:id" component={RfqDetail} />
        <Route path="/b2b/products" component={B2BProducts} />
        <Route path="/b2b/orders" component={B2BOrders} />
        <Route path="/b2b/payments" component={B2BPayments} />
        <Route path="/b2b/invoices" component={B2BInvoices} />
        <Route path="/b2b/credit" component={B2BCredit} />
        <Route path="/b2b/dispatches" component={DispatchPage} />
      </Switch>
    </B2BLayout>
  );
}
