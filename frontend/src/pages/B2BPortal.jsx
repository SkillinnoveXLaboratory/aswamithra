import { Redirect, Route, Switch, useHistory, useParams } from 'react-router-dom';
import { BadgeIndianRupee, ClipboardList, FileText, Home, Landmark, Send, Truck } from 'lucide-react';
import { useState } from 'react';
import B2BLayout from '../layouts/B2BLayout.jsx';
import DataTable from '../components/DataTable.jsx';
import FormField from '../components/FormField.jsx';
import StatCard from '../components/StatCard.jsx';
import StateBlock from '../components/StateBlock.jsx';
import { useApi } from '../hooks/useApi.js';
import { endpoints } from '../services/api.js';
import { money } from '../utils/format.js';

const nav = [
  { label: 'Catalog', href: '/b2b/home', icon: Home },
  { label: 'New RFQ', href: '/b2b/rfq/new', icon: Send },
  { label: 'Quotes', href: '/b2b/rfq/rfq_101', icon: ClipboardList },
  { label: 'Invoices', href: '/b2b/invoices', icon: FileText },
  { label: 'Credit', href: '/b2b/credit', icon: Landmark },
  { label: 'Dispatch', href: '/b2b/dispatches/ord_889210', icon: Truck },
];

function B2BCatalog() {
  const { data } = useApi(() => endpoints.b2bCatalog(), [], []);
  const { data: rfqs } = useApi(() => endpoints.b2bRfqs(), [], []);
  return <><div className="dashboard-grid stats"><StatCard label="Bulk products" value={(data || []).length} icon={BadgeIndianRupee} tone="blue" /><StatCard label="Open RFQs" value={(rfqs || []).filter((r) => r.status === 'OPEN').length} icon={ClipboardList} tone="blue" /></div><section className="panel"><h2>Bulk catalog</h2><DataTable rows={data || []} columns={[{ key: 'name', label: 'Product', render: (row) => row.name || row.cropName }, { key: 'b2bTierPrice', label: 'Tier price', render: (row) => money(row.b2bTierPrice || row.tierPricePerQuintal) }, { key: 'stock', label: 'Stock', render: (row) => row.stock || row.availableStockQuintals }, { key: 'unit', label: 'Unit' }]} /></section></>;
}

function NewRfq() {
  const [form, setForm] = useState({ cropName: 'Sona Masoori Rice', quantityQuintals: '50', targetPricePerQuintal: '4600' });
  const history = useHistory();
  return <section className="panel"><h2>Create RFQ</h2><form className="form-grid" onSubmit={async (e) => { e.preventDefault(); const rfq = (await endpoints.createRfq(form)).data.data; history.push(`/b2b/rfq/${rfq.id}`); }}>{['cropName', 'quantityQuintals', 'targetPricePerQuintal'].map((name) => <FormField key={name} name={name} label={name.replace(/([A-Z])/g, ' $1')} value={form[name]} onChange={(e) => setForm({ ...form, [name]: e.target.value })} required />)}<button className="btn btn-primary form-submit"><Send size={18} /> Send RFQ</button></form></section>;
}

function RfqDetail() {
  const { id } = useParams();
  const { data } = useApi(() => endpoints.b2bRfq(id), { quotesReceived: [] }, [id]);
  return <section className="panel"><h2>RFQ quote comparison</h2><div className="profile-card"><strong>{data.cropName}</strong><span>{data.quantityQuintals} quintals</span><span className="pill warn">{data.status}</span></div><DataTable rows={data.quotesReceived || data.bids || []} columns={[{ key: 'farmerName', label: 'Farmer' }, { key: 'pricePerQuintal', label: 'Price', render: (row) => money(row.pricePerQuintal || row.bidPricePerKg) }, { key: 'deliveryDate', label: 'Delivery' }, { key: 'status', label: 'Status' }]} actions={(row) => <button className="btn btn-primary" onClick={() => endpoints.acceptQuote(row.id)}>Accept</button>} /></section>;
}

function B2BInvoices() {
  const { data } = useApi(() => endpoints.b2bInvoice('ord_889210'), {}, []);
  return <section className="panel"><h2>GST invoice</h2><div className="profile-card"><strong>{data.invoiceNumber || 'INV-2026-00481'}</strong><span>Order: {data.orderId || 'ord_889210'}</span><span>Buyer GSTIN: {data.gstinBuyer || '37AAAAA0000A1Z5'}</span></div></section>;
}

function B2BCredit() {
  const { data } = useApi(() => endpoints.b2bCredit(), {}, []);
  return <section className="panel"><h2>Credit ledger</h2><div className="dashboard-grid stats"><StatCard label="Credit limit" value={money(data.totalApprovedCreditLimit)} icon={Landmark} tone="blue" /><StatCard label="Used" value={money(data.utilizedCreditAmount)} icon={FileText} tone="blue" /><StatCard label="Available" value={money(data.availableCreditAmount)} icon={BadgeIndianRupee} tone="blue" /></div><p className="notice">Next payment due: {data.nextPaymentDueDate}</p></section>;
}

export default function B2BPortal() {
  return (
    <B2BLayout title="B2B Wholesale Portal" subtitle="Bulk catalog, RFQs, invoices, credit, and dispatch tracking." nav={nav}>
      <Switch>
        <Route exact path="/b2b" render={() => <Redirect to="/b2b/home" />} />
        <Route path="/b2b/home" component={B2BCatalog} />
        <Route path="/b2b/rfq/new" component={NewRfq} />
        <Route path="/b2b/rfq/:id" component={RfqDetail} />
        <Route path="/b2b/invoices" component={B2BInvoices} />
        <Route path="/b2b/credit" component={B2BCredit} />
        <Route path="/b2b/dispatches/:id" render={() => <section className="panel"><h2>Dispatch tracking</h2><StateBlock type="success" title="Dispatch scheduled" message="Bulk tracking is ready for backend dispatch records." /></section>} />
      </Switch>
    </B2BLayout>
  );
}
