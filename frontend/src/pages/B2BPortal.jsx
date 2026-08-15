import { Redirect, Route, Switch, useHistory, useParams } from 'react-router-dom';
import {
  BadgeIndianRupee,
  CheckCircle,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Home,
  Landmark,
  Send,
  ShoppingCart,
  Truck,
  Wheat,
  X,
  MapPin,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import B2BLayout from '../layouts/B2BLayout.jsx';
import DataTable from '../components/DataTable.jsx';
import FormField from '../components/FormField.jsx';
import StatCard from '../components/StatCard.jsx';
import StateBlock from '../components/StateBlock.jsx';
import { useApi } from '../hooks/useApi.js';
import { endpoints, unwrap } from '../services/api.js';
import { money } from '../utils/format.js';
import { useAuth } from '../context/AuthContext.jsx';

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(true), { once: true });
      existing.addEventListener('error', () => resolve(false), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const nav = [
  { group: 'Overview', label: 'Dashboard', href: '/b2b/home', icon: Home, hint: 'Bulk activity, RFQs, and orders' },
  { group: 'Buying', label: 'Catalog', href: '/b2b/catalog', icon: Wheat, hint: 'Nearby farmer products by radius' },
  { group: 'Buying', label: 'New RFQ', href: '/b2b/rfq/new', icon: Send, hint: 'Request quotes from nearby sellers' },
  { group: 'Buying', label: 'My RFQs', href: '/b2b/rfqs', icon: ClipboardList, hint: 'Compare and accept quotes' },
  { group: 'Orders', label: 'Orders', href: '/b2b/orders', icon: ClipboardCheck, hint: 'COD orders and delivery status' },
  { group: 'Orders', label: 'Dispatch', href: '/b2b/dispatches', icon: Truck, hint: 'Track outgoing deliveries' },
  { group: 'Finance', label: 'Invoices', href: '/b2b/invoices', icon: FileText, hint: 'Open GST invoices and billing' },
  { group: 'Finance', label: 'Credit', href: '/b2b/credit', icon: Landmark, hint: 'Monitor credit usage and due dates' },
];

function B2BHome() {
  const { user } = useAuth();
  const { data: orders } = useApi(() => endpoints.orders(user?.id), [], [user?.id]);
  const { data: rfqs } = useApi(() => endpoints.b2bRfqs(user?.id), [], [user?.id]);
  const opened = (rfqs || []).filter((r) => r.status === 'OPEN').length;
  const delivered = (orders || []).filter((o) => o.status === 'DELIVERED').length;

  return (
    <section className="panel">
      <h2>B2B dashboard</h2>
      <div className="dashboard-grid stats">
        <StatCard label="Open RFQs" value={opened} icon={ClipboardList} tone="blue" />
        <StatCard label="Orders placed" value={(orders || []).length} icon={Truck} tone="blue" />
        <StatCard label="Delivered" value={delivered} icon={CheckCircle} tone="blue" />
      </div>
      <p className="notice">Browse nearby farmer products by location radius, place COD bulk orders, or raise an RFQ for larger quantities.</p>
    </section>
  );
}

function NewRfq() {
  const { user } = useAuth();
  const [form, setForm] = useState({ cropName: '', quantityQuintals: '', targetPricePerQuintal: '' });
  const [msg, setMsg] = useState('');
  const history = useHistory();

  return (
    <section className="panel">
      <h2>Create RFQ</h2>
      <form
        className="form-grid"
        onSubmit={async (e) => {
          e.preventDefault();
          const payload = { ...form, buyerId: user?.id, buyerName: user?.name };
          try {
            const rfq = (await endpoints.createRfq(payload)).data.data;
            history.push(`/b2b/rfq/${rfq.id}`);
          } catch (err) {
            setMsg(err?.response?.data?.error?.message || 'Unable to create RFQ.');
          }
        }}
      >
        <FormField label="Crop name" name="cropName" value={form.cropName} onChange={(e) => setForm({ ...form, cropName: e.target.value })} required />
        <FormField label="Quantity (quintals)" name="quantityQuintals" type="number" value={form.quantityQuintals} onChange={(e) => setForm({ ...form, quantityQuintals: e.target.value })} required />
        <FormField label="Target price / quintal" name="targetPricePerQuintal" type="number" value={form.targetPricePerQuintal} onChange={(e) => setForm({ ...form, targetPricePerQuintal: e.target.value })} required />
        {msg ? <div className="notice">{msg}</div> : null}
        <button className="btn btn-primary form-submit" type="submit">
          <Send size={18} /> Send RFQ
        </button>
      </form>
    </section>
  );
}

function B2BCatalog() {
  const { user } = useAuth();
  const [catalog, setCatalog] = useState([]);
  const [radius, setRadius] = useState(10);
  const [locationStatus, setLocationStatus] = useState('Requesting location access...');
  const [selected, setSelected] = useState(null);
  const [orderQty, setOrderQty] = useState('');
  const [orderError, setOrderError] = useState('');
  const [ordering, setOrdering] = useState(false);
  const [paymentMode, setPaymentMode] = useState('cod');

  useEffect(() => {
    let active = true;

    const loadCatalog = async (lat, lng) => {
      const payload = lat && lng ? { lat, lng, radiusKm: radius } : {};
      const response = await endpoints.b2bCatalog(payload);
      if (!active) return;
      setCatalog(unwrap(response) || []);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocationStatus(`Showing products within ${radius} km of your live location`);
          loadCatalog(latitude, longitude).catch(() => {
            if (active) setLocationStatus('Location found, but catalog could not be loaded.');
          });
        },
        () => {
          setLocationStatus('Location access denied. Showing all active farmer products.');
          loadCatalog().catch(() => {});
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    } else {
      setLocationStatus('Geolocation unavailable. Showing all active farmer products.');
      loadCatalog().catch(() => {});
    }

    return () => {
      active = false;
    };
  }, [radius]);

  const openOrderModal = (row) => {
    setSelected(row);
    setOrderQty(String(row.minQty || 1));
    setOrderError('');
  };

  const placeOrder = async (event) => {
    event.preventDefault();
    if (!selected) return;
    const qty = Number(orderQty);
    if (!qty || qty <= 0) {
      setOrderError('Enter a valid quantity.');
      return;
    }

    setOrdering(true);
    setOrderError('');
    try {
      const orderResp = await endpoints.createOrder({
        buyerId: user?.id,
        sellerId: selected.sellerId || selected.farmer?.id,
        sellerName: selected.sellerName || selected.farmerName || selected.farmer?.name,
        paymentMode: paymentMode === 'razorpay' ? 'online' : 'cod',
        items: [
          {
            productId: selected.id,
            qty,
            name: selected.name,
            unit: selected.unit,
            price: Number(selected.b2bTierPrice || selected.price || selected.tierPricePerQuintal || 0),
            sellerId: selected.sellerId || selected.farmer?.id,
            sellerName: selected.sellerName || selected.farmerName || selected.farmer?.name,
          },
        ],
      });
      const order = orderResp.data?.data || orderResp.data;
      if (paymentMode === 'razorpay') {
        const scriptReady = await loadRazorpayScript();
        if (!scriptReady || !window.Razorpay) {
          throw new Error('Razorpay checkout failed to load.');
        }
        const rz = await endpoints.createRazorpayOrder({ amount: order.totalAmount });
        const rzData = rz.data?.data || rz.data;
        const options = {
          key: rzData.keyId,
          amount: Math.round(Number(rzData.amount) * 100),
          currency: rzData.currency || 'INR',
          name: 'Aswamithra',
          description: 'B2B bulk checkout',
          order_id: rzData.razorpayOrderId,
          handler: async (response) => {
            await endpoints.verifyRazorpayPayment({
              razorpayPaymentId: response.razorpay_payment_id,
              orderId: order.id,
            });
            setSelected(null);
            window.dispatchEvent(new CustomEvent('aswamithra-orders-updated'));
          },
          modal: {
            ondismiss: () => setOrdering(false),
          },
          prefill: {
            name: user?.name || '',
            contact: user?.mobile || '',
          },
          theme: { color: '#2563eb' },
        };
        const rzCheckout = new window.Razorpay(options);
        rzCheckout.on('payment.failed', () => setOrdering(false));
        rzCheckout.open();
        return;
      }
      setSelected(null);
      window.dispatchEvent(new CustomEvent('aswamithra-orders-updated'));
    } catch (error) {
      setOrderError(error?.response?.data?.error?.message || 'Unable to place bulk order.');
    } finally {
      setOrdering(false);
    }
  };

  return (
    <section className="panel">
      <div className="panel-head-row">
        <h2>Wholesale catalog</h2>
        <div className="action-row">
          <span className="pill soft">
            <MapPin size={14} /> {locationStatus}
          </span>
          <label className="toolbar-field" style={{ minWidth: 180 }}>
            <span className="muted" style={{ paddingLeft: 0 }}>Radius</span>
            <select value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
              <option value="5">5 km</option>
              <option value="10">10 km</option>
              <option value="25">25 km</option>
              <option value="50">50 km</option>
            </select>
          </label>
        </div>
      </div>
      <DataTable
        rows={catalog || []}
        columns={[
          { key: 'name', label: 'Product', render: (row) => row.name || row.cropName || '-' },
          { key: 'sellerName', label: 'Farmer', render: (row) => row.sellerName || row.farmerName || '-' },
          { key: 'price', label: 'Price', render: (row) => money(row.b2bTierPrice || row.price || row.tierPricePerQuintal) },
          { key: 'unit', label: 'Unit' },
          { key: 'stock', label: 'Stock', render: (row) => row.stock || row.availableStockQuintals || '-' },
          { key: 'minQty', label: 'Min qty', render: (row) => row.minQty || row.minimumOrderQty || 1 },
        ]}
        actions={(row) => (
          <button className="btn btn-primary" type="button" onClick={() => openOrderModal(row)}>
            <ShoppingCart size={16} /> Order
          </button>
        )}
        empty="No active farmer products available in your radius."
      />

      {selected ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelected(null)}>
          <section className="modal" role="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Bulk order</h2>
              <button className="icon-only" type="button" onClick={() => setSelected(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="profile-card">
              <strong>{selected.name}</strong>
              <span>{selected.sellerName || selected.farmerName}</span>
              <span>{money(selected.b2bTierPrice || selected.price || selected.tierPricePerQuintal)} / {selected.unit}</span>
              <span>Stock: {selected.stock || selected.availableStockQuintals || '-'}</span>
            </div>
            <form className="form-grid single" onSubmit={placeOrder}>
              <FormField label="Quantity" name="orderQty" type="number" value={orderQty} onChange={(e) => setOrderQty(e.target.value)} required />
              <div className="form-grid single">
                <label className="field-label"><input type="radio" checked={paymentMode === 'cod'} onChange={() => setPaymentMode('cod')} /> Cash on Delivery</label>
                <label className="field-label"><input type="radio" checked={paymentMode === 'razorpay'} onChange={() => setPaymentMode('razorpay')} /> Razorpay</label>
              </div>
              {orderError ? <div className="notice">{orderError}</div> : null}
              <div className="modal-actions">
                <button className="btn btn-primary" type="submit" disabled={ordering}>
                  {ordering ? 'Placing...' : paymentMode === 'razorpay' ? 'Pay now' : 'Place COD order'}
                </button>
                <button className="btn btn-light" type="button" onClick={() => setSelected(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
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
        actions={(row) => (
          <button className="btn btn-light" type="button" onClick={() => history.push(`/b2b/rfq/${row.id}`)}>
            View quotes
          </button>
        )}
        empty="No RFQs yet. Create one from New RFQ."
      />
    </section>
  );
}

function RfqDetail() {
  const { id } = useParams();
  const { data, setData } = useApi(() => endpoints.b2bRfq(id), { quotesReceived: [] }, [id]);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [placing, setPlacing] = useState(false);

  const refresh = async () => setData(unwrap(await endpoints.b2bRfq(id)));

  const placeOrder = async (row) => {
    setPlacing(true);
    try {
      await endpoints.placeOrderFromQuote(row.id);
      await refresh();
      setSelectedQuote(null);
    } finally {
      setPlacing(false);
    }
  };

  const cancelOrder = async (row) => {
    setPlacing(true);
    try {
      await endpoints.cancelQuoteOrder(row.id);
      await refresh();
      setSelectedQuote(null);
    } finally {
      setPlacing(false);
    }
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
          { key: 'message', label: 'Message', render: (row) => row.message || '—' },
          { key: 'requestOrder', label: 'Request order', render: (row) => row.requestOrder ? 'Yes' : 'No' },
          { key: 'status', label: 'Status' },
        ]}
        actions={(row) => (
          <button className="btn btn-primary" type="button" onClick={() => setSelectedQuote(row)}>
            View quote
          </button>
        )}
        empty="No quotes received yet for this RFQ."
      />
      {selectedQuote ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelectedQuote(null)}>
          <section className="modal" role="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Quote Details</h2>
              <button className="icon-only" type="button" onClick={() => setSelectedQuote(null)}><X size={18} /></button>
            </div>
            <div className="profile-card">
              <strong>{selectedQuote.farmerName}</strong>
              <span>Price: {money(selectedQuote.pricePerQuintal || selectedQuote.bidPricePerKg)}</span>
              <span>Delivery: {selectedQuote.deliveryDate || '—'}</span>
              <span>Request order: {selectedQuote.requestOrder ? 'Yes' : 'No'}</span>
              <span>Order: {selectedQuote.orderStatus || selectedQuote.order_status || selectedQuote.orderId || selectedQuote.order_id ? 'Placed' : 'Not yet'}</span>
              <span className="pill soft">{selectedQuote.status}</span>
            </div>
            <div className="notice" style={{ whiteSpace: 'pre-wrap' }}>{selectedQuote.message || 'No message provided.'}</div>
            {selectedQuote.requestOrder ? (
              <div className="notice">Farmer requested an order. Place it to convert this quote into a live COD bulk order.</div>
            ) : null}
            <div className="modal-actions">
              {selectedQuote.status === 'REJECTED' ? null : selectedQuote.orderStatus === 'PLACED' || selectedQuote.order_status === 'PLACED' || selectedQuote.orderId || selectedQuote.order_id ? (
                <button className="btn btn-light" type="button" onClick={() => cancelOrder(selectedQuote)} disabled={placing}>
                  {placing ? 'Working...' : 'Cancel order'}
                </button>
              ) : selectedQuote.status === 'ACCEPTED' || selectedQuote.requestOrder ? (
                <button className="btn btn-primary" type="button" onClick={() => placeOrder(selectedQuote)} disabled={placing}>
                  {placing ? 'Placing...' : 'Place order'}
                </button>
              ) : (
                <button className="btn btn-primary" type="button" onClick={async () => { await endpoints.acceptQuote(selectedQuote.id); await refresh(); setSelectedQuote(null); }}>
                  Accept
                </button>
              )}
              <button className="btn btn-light" type="button" onClick={() => setSelectedQuote(null)}>Close</button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function B2BOrders() {
  const { user } = useAuth();
  const { data } = useApi(() => endpoints.orders(user?.id), [], [user?.id]);

  return (
    <section className="panel">
      <h2>Bulk orders</h2>
      <DataTable
        rows={(data || []).filter((row) => row.paymentMode === 'cod')}
        columns={[
          { key: 'id', label: 'Order' },
          { key: 'sellerName', label: 'Supplier', render: (row) => row.sellerName || row.buyerName || '—' },
          { key: 'totalAmount', label: 'Total', render: (row) => money(row.totalAmount) },
          { key: 'paymentMode', label: 'Mode', render: () => <span className="pill warn">COD only</span> },
          { key: 'status', label: 'Status' },
        ]}
        empty="No bulk COD orders yet."
      />
    </section>
  );
}

function B2BPayments() {
  const { user } = useAuth();
  const { data } = useApi(() => endpoints.orders(user?.id), [], [user?.id]);

  return (
    <section className="panel">
      <h2>Payment & delivery</h2>
      <DataTable
        rows={(data || []).filter((row) => row.paymentMode === 'cod')}
        columns={[
          { key: 'id', label: 'Order' },
          { key: 'sellerName', label: 'Supplier', render: (row) => row.sellerName || row.buyerName || '—' },
          { key: 'totalAmount', label: 'Total', render: (row) => money(row.totalAmount) },
          { key: 'paymentMode', label: 'Payment', render: () => <span className="pill warn">COD only</span> },
          { key: 'status', label: 'Delivery', render: (row) => row.status },
        ]}
        empty="No COD orders yet."
      />
    </section>
  );
}

function B2BInvoices() {
  const { user } = useAuth();
  const orders = (useApi(() => endpoints.orders(user?.id), [], [user?.id]).data || []).filter((row) => row.paymentMode === 'cod');
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
          actions={(row) => (
            <button className="btn btn-light" type="button" onClick={() => load(row)} disabled={busy}>
              View invoice
            </button>
          )}
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
  const { data } = useApi(() => endpoints.orders(user?.id), [], [user?.id]);
  const orders = (data || []).filter((o) => o.paymentMode === 'cod' && (o.status === 'OUT_FOR_DELIVERY' || o.status === 'DELIVERED'));

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
    <B2BLayout title="B2B Wholesale Portal" subtitle="Manage catalog, RFQs, orders, invoices, and credit in one place." nav={nav}>
      <Switch>
        <Route exact path="/b2b" render={() => <Redirect to="/b2b/home" />} />
        <Route path="/b2b/home" component={B2BHome} />
        <Route path="/b2b/catalog" component={B2BCatalog} />
        <Route path="/b2b/rfq/new" component={NewRfq} />
        <Route path="/b2b/rfqs" component={B2BRfqList} />
        <Route path="/b2b/rfq/:id" component={RfqDetail} />
        <Route path="/b2b/orders" component={B2BOrders} />
        <Route path="/b2b/payments" component={B2BPayments} />
        <Route path="/b2b/invoices" component={B2BInvoices} />
        <Route path="/b2b/credit" component={B2BCredit} />
        <Route path="/b2b/dispatches" component={DispatchPage} />
      </Switch>
    </B2BLayout>
  );
}
