import { Link, Redirect, Route, Switch, useHistory, useParams } from 'react-router-dom';
import { ClipboardList, Home, LifeBuoy, MapPin, PiggyBank, Search, ShoppingCart, User, WalletCards } from 'lucide-react';
import CustomerLayout from '../layouts/CustomerLayout.jsx';
import ProductCard from '../components/ProductCard.jsx';
import DataTable from '../components/DataTable.jsx';
import FormField from '../components/FormField.jsx';
import StatCard from '../components/StatCard.jsx';
import StateBlock from '../components/StateBlock.jsx';
import { useApi } from '../hooks/useApi.js';
import { endpoints, unwrap } from '../services/api.js';
import { money, todayLabel } from '../utils/format.js';
import { resolveMediaUrl } from '../utils/media.js';
import { buildCartPayload } from '../utils/cart.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useState } from 'react';

const nav = [
  { label: 'Home', href: '/customer/home', icon: Home },
  { label: 'Browse', href: '/customer/browse', icon: Search },
  { label: 'Cart', href: '/customer/cart', icon: ShoppingCart },
  { label: 'Orders', href: '/customer/orders', icon: ClipboardList },
  { label: 'Savings', href: '/customer/savings', icon: PiggyBank },
  { label: 'Profile', href: '/customer/profile', icon: User },
  { label: 'Support', href: '/customer/disputes', icon: LifeBuoy },
];

function useCustomerProducts(query = {}) {
  return useApi(
    () => endpoints.productsRadius({ lat: 16.5062, lng: 80.648, radiusKm: query.radius || 50, category: query.category || 'all', search: query.search || '' }),
    { products: [], total: 0 },
    [query.radius, query.category, query.search],
  );
}

function CustomerHome() {
  const { data: productData } = useCustomerProducts({ radius: 50 });
  const { data: savings } = useApi(() => endpoints.savings(), { totalSavings: 0, entries: [] }, []);
  const { data: orders } = useApi(() => endpoints.orders(), [], []);
  return (
    <>
      <div className="dashboard-grid stats">
        <StatCard label="Nearby products" value={productData.total || productData.products?.length || 0} icon={MapPin} note="Within selected radius" />
        <StatCard label="Saved so far" value={money(savings.totalSavings || savings.lifetimeSavings || 80)} icon={PiggyBank} note="Compared with market price" />
        <StatCard label="Orders" value={(orders || []).length} icon={ClipboardList} note="Track every delivery" />
      </div>
      <div className="content-split">
        <section className="panel">
          <h2>Fresh near you</h2>
          <div className="products-grid compact-products">
            {(productData.products || []).slice(0, 4).map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        </section>
        <section className="panel">
          <h2>Easy order steps</h2>
          {['Set your location', 'Choose fresh products', 'Add to cart', 'Pay or COD', 'Track delivery'].map((item, index) => (
            <div className="step-line" key={item}><span>{index + 1}</span>{item}</div>
          ))}
        </section>
      </div>
    </>
  );
}

function BrowseProducts() {
  const [filters, setFilters] = useState({ search: '', category: 'all', radius: 50 });
  const { data, loading } = useCustomerProducts(filters);
  const history = useHistory();
  const addToCart = async (product) => {
    await endpoints.addCartItem(buildCartPayload(product));
    history.push('/customer/cart');
  };
  return (
    <section className="panel">
      <div className="toolbar">
        <label className="toolbar-field"><Search size={18} /><input placeholder="Search rice, tomato, mango" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /></label>
        <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
          <option value="all">All categories</option>
          <option>Organic Veggies</option>
          <option>Tree-Ripe Fruits</option>
          <option>Dairy & Ghee</option>
          <option>Spices & Pulses</option>
        </select>
        <select value={filters.radius} onChange={(e) => setFilters({ ...filters, radius: e.target.value })}>
          <option value="5">5 km</option>
          <option value="10">10 km</option>
          <option value="25">25 km</option>
          <option value="50">50 km</option>
        </select>
      </div>
      {loading ? <StateBlock type="loading" title="Finding farmers near you" /> : null}
      <div className="products-grid">
        {(data.products || []).map((product) => <ProductCard key={product.id} product={product} onAdd={addToCart} />)}
      </div>
    </section>
  );
}

function ProductDetail() {
  const { id } = useParams();
  const history = useHistory();
  const { data: product, loading } = useApi(() => endpoints.product(id), null, [id]);
  if (loading) return <StateBlock type="loading" title="Loading product" />;
  if (!product) return <StateBlock title="Product not found" />;
  return (
    <section className="detail-grid">
      <img className="detail-photo" src={resolveMediaUrl(product.images?.[0]) || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=900'} alt={product.name} />
      <div className="panel">
        <span className="pill good">{product.category}</span>
        <h2>{product.name}</h2>
        <p>{product.description || 'Freshly listed by a verified Aswamithra farmer.'}</p>
        <div className="price-row large"><strong>{money(product.price)} / {product.unit}</strong><small>{money(product.marketReferencePrice)}</small></div>
        <p className="muted">Farmer: {product.farmer?.name || product.sellerName} from {product.farmer?.village || product.village}</p>
        <button className="btn btn-primary big" onClick={async () => { await endpoints.addCartItem(buildCartPayload(product)); history.push('/customer/cart'); }}>Add to cart</button>
      </div>
    </section>
  );
}

function CartPage() {
  const { user } = useAuth();
  const { data: cart, setData } = useApi(() => endpoints.cart(), { groups: [], subtotal: 0, itemsCount: 0, deliveryFeeTotal: 0, grandTotal: 0, totalSavings: 0 }, []);
  const history = useHistory();
  const remove = async (id) => {
    await endpoints.removeCartItem(id);
    const next = unwrap(await endpoints.cart());
    setData(next);
  };
  const items = cart.groups?.flatMap((group) => group.items.map((item) => ({ ...item, farmerName: group.farmerName }))) || [];
  return (
    <div className="content-split">
      <section className="panel">
        <h2>Your cart</h2>
        {items.map((item) => (
          <div className="cart-line cart-line-rich" key={item.id}>
            <img className="cart-thumb" src={resolveMediaUrl(item.image) || 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=900'} alt={item.name} />
            <div className="cart-line-body">
              <strong>{item.name}</strong>
              <span className="muted">{item.category || 'Fresh produce'} · {item.farmerName || 'Verified farmer'}</span>
              <span>{item.qty} {item.unit} × {money(item.price)}</span>
              {item.marketReferencePrice > item.price ? <span className="muted">MRP {money(item.marketReferencePrice)} · Save {money(item.savings || 0)}</span> : null}
            </div>
            <div className="cart-line-side">
              <strong>{money(item.total)}</strong>
              <button className="btn btn-light" type="button" onClick={() => remove(item.id)}>Remove</button>
            </div>
          </div>
        ))}
        {!cart.itemsCount ? <StateBlock title="Cart is empty" message="Add products from Browse or the home page." action={<Link className="btn btn-primary" to="/customer/browse">Browse products</Link>} /> : null}
      </section>
      <section className="panel summary-panel">
        <h2>Checkout</h2>
        <p>Items subtotal: <strong>{money(cart.subtotal)}</strong></p>
        <p>Delivery fee: <strong>{money(cart.deliveryFeeTotal || 0)}</strong></p>
        <p>Projected savings: <strong>{money(cart.totalSavings || 0)}</strong></p>
        <p>Grand total: <strong>{money(cart.grandTotal || cart.subtotal)}</strong></p>
        <button className="btn btn-primary full big" disabled={!cart.itemsCount} onClick={async () => {
          const firstGroup = cart.groups?.[0];
          await endpoints.createOrder({
            buyerId: user?.id,
            sellerId: firstGroup?.farmerId,
            sellerName: firstGroup?.farmerName,
            items: firstGroup?.items?.map((item) => ({
              productId: item.productId,
              qty: item.qty,
              name: item.name,
              price: item.price,
              unit: item.unit,
              sellerId: item.farmerId || firstGroup?.farmerId,
              sellerName: item.farmerName || firstGroup?.farmerName,
            })) || [],
            paymentMode: 'cod',
          });
          history.push('/customer/orders');
        }}>Place COD order</button>
      </section>
    </div>
  );
}

function OrdersPage() {
  const { user } = useAuth();
  const { data: orders } = useApi(() => endpoints.orders(user?.id), [], [user?.id]);
  return <section className="panel"><h2>Order history</h2><DataTable rows={orders || []} columns={[
    { key: 'id', label: 'Order' }, { key: 'sellerName', label: 'Farmer' }, { key: 'totalAmount', label: 'Total', render: (row) => money(row.totalAmount) }, { key: 'status', label: 'Status' }, { key: 'createdAt', label: 'Date', render: (row) => todayLabel(row.createdAt) },
  ]} /></section>;
}

function SavingsPage() {
  const { data } = useApi(() => endpoints.savings(), { totalSavings: 80, entries: [] }, []);
  return <section className="panel"><h2>Savings dashboard</h2><div className="dashboard-grid stats"><StatCard label="Lifetime saved" value={money(data.totalSavings || data.lifetimeSavings || 80)} icon={PiggyBank} /><StatCard label="This month" value={money(data.monthlySavings || 80)} icon={WalletCards} /></div><DataTable rows={data.entries || data.history || []} columns={[{ key: 'orderId', label: 'Order' }, { key: 'paidValue', label: 'Paid', render: (row) => money(row.paidValue) }, { key: 'savedAmount', label: 'Saved', render: (row) => money(row.savedAmount) }, { key: 'date', label: 'Date' }]} /></section>;
}

function ProfilePage() {
  const { user } = useAuth();
  const { data: addresses } = useApi(() => endpoints.addresses(), [], []);
  return <section className="panel"><h2>Profile and addresses</h2><div className="profile-card"><strong>{user?.name}</strong><span>{user?.mobile}</span><span className="pill good">{user?.role}</span></div><DataTable rows={addresses || []} columns={[{ key: 'name', label: 'Name' }, { key: 'street', label: 'Address' }, { key: 'city', label: 'City' }, { key: 'pincode', label: 'Pincode' }]} empty="No saved addresses yet" /></section>;
}

function DisputePage() {
  const { user } = useAuth();
  const { data: orders } = useApi(() => endpoints.orders(user?.id), [], [user?.id]);
  const { data: disputes, setData: setDisputes } = useApi(() => endpoints.disputes(user?.id), [], [user?.id]);
  const [form, setForm] = useState({ orderId: '', reason: '' });
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await endpoints.createDispute({
        orderId: form.orderId,
        reason: form.reason,
        customerId: user?.id,
        customerName: user?.name,
      });
      setSent(true);
      setForm({ orderId: '', reason: '' });
      setDisputes(unwrap(await endpoints.disputes(user?.id)));
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Unable to send support request.');
    }
  };

  return (
    <section className="panel">
      <h2>Support and disputes</h2>
      <form className="form-grid single" onSubmit={submit}>
        <FormField
          label="Order ID"
          name="orderId"
          type="select"
          options={[
            { value: '', label: 'Select your order' },
            ...(orders || []).map((order) => ({
              value: order.id,
              label: `${order.id} · ${order.sellerName} · ${money(order.totalAmount)}`,
            })),
          ]}
          value={form.orderId}
          onChange={(e) => setForm({ ...form, orderId: e.target.value })}
          required
        />
        <FormField label="Problem details" name="reason" type="textarea" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required />
        {error ? <div className="notice">{error}</div> : null}
        <button className="btn btn-primary form-submit" type="submit">Send to support</button>
      </form>
      {sent ? <StateBlock type="success" title="Support request sent" message="Admin will review your order dispute." /> : null}
      <h3 style={{ marginTop: '24px' }}>Your support requests</h3>
      <DataTable
        rows={disputes || []}
        columns={[
          { key: 'orderId', label: 'Order' },
          { key: 'farmerName', label: 'Farmer' },
          { key: 'reason', label: 'Issue' },
          { key: 'status', label: 'Status' },
        ]}
        empty="No support requests yet"
      />
    </section>
  );
}

export default function CustomerPortal() {
  return (
    <CustomerLayout title="Customer Marketplace" subtitle="Find fresh products near you, order easily, and track savings." nav={nav}>
      <Switch>
        <Route exact path="/customer" render={() => <Redirect to="/customer/home" />} />
        <Route path="/customer/home" component={CustomerHome} />
        <Route path="/customer/browse" component={BrowseProducts} />
        <Route path="/customer/product/:id" component={ProductDetail} />
        <Route path="/customer/cart" component={CartPage} />
        <Route path="/customer/orders" component={OrdersPage} />
        <Route path="/customer/savings" component={SavingsPage} />
        <Route path="/customer/profile" component={ProfilePage} />
        <Route path="/customer/disputes" component={DisputePage} />
      </Switch>
    </CustomerLayout>
  );
}
