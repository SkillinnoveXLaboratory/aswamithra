import { Redirect, Route, Switch } from 'react-router-dom';
import { useState } from 'react';
import { BarChart3, ClipboardCheck, FileClock, Home, Landmark, LayoutDashboard, ReceiptIndianRupee, Store, Tags, UserCog, Users, X } from 'lucide-react';
import AdminLayout from '../layouts/AdminLayout.jsx';
import DataTable from '../components/DataTable.jsx';
import FormField from '../components/FormField.jsx';
import StatCard from '../components/StatCard.jsx';
import StateBlock from '../components/StateBlock.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { endpoints, unwrap } from '../services/api.js';
import { money } from '../utils/format.js';

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
];

function AdminHome() {
  const { data } = useApi(() => endpoints.adminAnalytics(), { totalSales: 160, activeFarmers: 3, pendingKyc: 0 }, []);
  return <><div className="dashboard-grid stats"><StatCard label="Total sales" value={money(data.totalSales || data.revenue || 160)} icon={BarChart3} tone="dark" /><StatCard label="Active farmers" value={data.activeFarmers || 3} icon={Store} tone="dark" /><StatCard label="Pending KYC" value={data.pendingKyc || 0} icon={ClipboardCheck} tone="dark" /></div><section className="panel"><h2>Admin operations</h2>{['KYC review', 'Commission slabs', 'Shop and POS setup', 'Finance and payouts', 'CMS banners', 'Disputes and audit'].map((item, index) => <div className="step-line" key={item}><span>{index + 1}</span>{item}</div>)}</section></>;
}

function statusPill(status) {
  return <span className={`status-pill ${status || 'pending'}`}>{status || 'pending'}</span>;
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

  return (
    <>
      <section className="panel">
        <h2>KYC review queue</h2>
        <DataTable
          rows={data || []}
          columns={[
            { key: 'name', label: 'Applicant' },
            { key: 'role', label: 'Role' },
            { key: 'userId', label: 'User ID' },
            { key: 'district', label: 'District', render: (row) => row.district || '-' },
            { key: 'submittedAt', label: 'Submitted' },
            { key: 'status', label: 'Status', render: (row) => statusPill(row.status) },
            { key: 'bankVerified', label: 'Bank', render: (row) => (row.bankVerified ? 'Verified' : 'Pending') },
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
          <section className="modal" role="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>KYC details</h2>
              <button className="icon-only" type="button" onClick={() => setSelected(null)}><X size={18} /></button>
            </div>
            <div className="detail-grid">
              <div><span>Applicant</span><strong>{selected.name}</strong></div>
              <div><span>Role</span><strong>{selected.role}</strong></div>
              <div><span>District</span><strong>{selected.district || '-'}</strong></div>
              <div><span>Village</span><strong>{selected.village || '-'}</strong></div>
              <div><span>GSTIN</span><strong>{selected.gstin || '-'}</strong></div>
              <div><span>Aadhaar</span><strong>{selected.aadhaarMasked || '-'}</strong></div>
              <div><span>Bank account</span><strong>{selected.bankAccountMasked || '-'}</strong></div>
              <div><span>IFSC</span><strong>{selected.ifsc || '-'}</strong></div>
              <div><span>Status</span><strong>{statusPill(selected.status)}</strong></div>
              <div><span>Bank verified</span><strong>{selected.bankVerified ? 'Yes' : 'No'}</strong></div>
            </div>
            <div className="document-links">
              {(selected.documents || []).length ? (
                selected.documents.map((url, index) => (
                  <a key={url} className="btn btn-light" href={url} target="_blank" rel="noreferrer">View document {index + 1}</a>
                ))
              ) : (
                <p className="muted">No uploaded documents</p>
              )}
            </div>
            <div className="modal-actions">
              {selected.status === 'pending' || selected.status === 'reupload_requested' ? (
                <>
                  <button className="btn btn-primary" onClick={async () => { await handleApprove(selected); }}>Approve</button>
                  <button className="btn btn-light" onClick={async () => { await handleReject(selected); }}>Reject</button>
                </>
              ) : null}
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

  const refresh = async () => setData(unwrap(await endpoints.adminUsers()));

  const isSelf = (row) => currentUser?.id === row?.id;

  const openDetails = async (row) => {
    const details = unwrap(await endpoints.adminUser(row.id));
    setSelected(details);
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    if (!editing?.id) return;
    const { pin, ...profile } = editing;
    await endpoints.updateAdminUser(editing.id, profile);
    if (pin && String(pin).length === 4) {
      await endpoints.setPin({ userId: editing.id, pin: String(pin) });
    }
    if (isSelf(editing)) {
      setUser({ ...currentUser, ...profile });
      localStorage.setItem('aswamithra_user', JSON.stringify({ ...currentUser, ...profile }));
    }
    setEditing(null);
    await refresh();
  };

  const deleteUser = async (id) => {
    if (isSelf({ id })) return;
    await endpoints.deleteAdminUser(id, currentUser?.id);
    if (selected?.id === id) setSelected(null);
    if (editing?.id === id) setEditing(null);
    await refresh();
  };

  const rows = data || [];

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
              <button className="btn btn-light" onClick={() => setEditing({ ...row, pin: '' })}>Edit</button>
              {!isSelf(row) ? <button className="btn btn-light" onClick={() => deleteUser(row.id)}>Delete</button> : null}
            </div>
          )}
        />
      </section>
      {selected ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelected(null)}>
          <section className="modal" role="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>User details</h2>
              <button className="icon-only" type="button" onClick={() => setSelected(null)}><X size={18} /></button>
            </div>
            <div className="detail-grid">
              <div><span>Name</span><strong>{selected.name}</strong></div>
              <div><span>Mobile</span><strong>{selected.mobile}</strong></div>
              <div><span>Email</span><strong>{selected.email || '-'}</strong></div>
              <div><span>Role</span><strong>{selected.role}</strong></div>
              <div><span>Status</span><strong>{selected.status}</strong></div>
              <div><span>Language</span><strong>{selected.language || '-'}</strong></div>
              <div><span>Security PIN</span><strong>{selected.hasPin ? 'Set' : 'Not set'}</strong></div>
              <div><span>Created</span><strong>{selected.createdAt || '-'}</strong></div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-light" onClick={() => setEditing({ ...selected, pin: '' })}>Edit</button>
              {!isSelf(selected) ? <button className="btn btn-light" onClick={async () => { await deleteUser(selected.id); }}>Delete</button> : null}
            </div>
          </section>
        </div>
      ) : null}
      {editing ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setEditing(null)}>
          <section className="modal" role="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>{isSelf(editing) ? 'Edit your admin profile' : 'Edit user'}</h2>
              <button className="icon-only" type="button" onClick={() => setEditing(null)}><X size={18} /></button>
            </div>
            <form className="form-grid single" onSubmit={saveEdit}>
              <FormField label="Name" name="name" value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required />
              <FormField label="Mobile" name="mobile" value={editing.mobile || ''} onChange={(e) => setEditing({ ...editing, mobile: e.target.value })} required />
              <FormField label="Email" name="email" value={editing.email || ''} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
              {isSelf(editing) ? (
                <FormField label="Role" name="role" value={editing.role || 'admin'} disabled />
              ) : (
                <FormField label="Role" name="role" type="select" options={['customer', 'farmer', 'b2b', 'admin']} value={editing.role || ''} onChange={(e) => setEditing({ ...editing, role: e.target.value })} required />
              )}
              <FormField label="Status" name="status" type="select" options={['active', 'pending_kyc', 'suspended']} value={editing.status || ''} onChange={(e) => setEditing({ ...editing, status: e.target.value })} required />
              <FormField label="Language" name="language" value={editing.language || ''} onChange={(e) => setEditing({ ...editing, language: e.target.value })} />
              <FormField label="Security PIN" name="pin" type="password" value={editing.pin || ''} onChange={(e) => setEditing({ ...editing, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder={editing.hasPin ? 'Enter new 4-digit PIN to change' : 'Set a new 4-digit PIN'} />
              {isSelf(editing) ? <p className="muted">You can update your name, mobile, email, language, and PIN. Your admin account cannot be deleted.</p> : null}
              <div className="modal-actions">
                <button className="btn btn-primary" type="submit">Save changes</button>
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
        <Route path="/admin/commissions" render={() => <AdminTable title="Commission slabs" loader={() => endpoints.commissions()} fallback={[]} columns={[{ key: 'minAmount', label: 'Min', render: (row) => money(row.minAmount) }, { key: 'maxAmount', label: 'Max', render: (row) => money(row.maxAmount) }, { key: 'ratePercent', label: 'Rate %' }, { key: 'applicableRegion', label: 'Region' }]} />} />
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
        <Route path="/admin/finance" render={() => <ManageList title="Finance transactions" loader={() => endpoints.finance()} fallback={[]} columns={[{ key: 'id', label: 'Payment' }, { key: 'amount', label: 'Amount', render: (row) => money(row.amount) }, { key: 'platformCommission', label: 'Commission', render: (row) => money(row.platformCommission) }, { key: 'status', label: 'Status' }]} detailRenderer={(item, close) => (<><div className="modal-head"><h2>Payment details</h2><button className="icon-only" onClick={close}><X size={18} /></button></div><div className="detail-grid"><div><span>Payment</span><strong>{item.id}</strong></div><div><span>Order</span><strong>{item.orderId}</strong></div><div><span>Amount</span><strong>{money(item.amount)}</strong></div><div><span>Commission</span><strong>{money(item.platformCommission)}</strong></div><div><span>Status</span><strong>{item.status}</strong></div></div><div className="modal-actions"><button className="btn btn-primary" onClick={async () => { await endpoints.refundPayment({ orderId: item.orderId, amount: item.amount }); close(); }}>Refund</button></div></>)} extraActions={(row) => <button className="btn btn-light" onClick={async () => { await endpoints.processPayouts(); }}>Process payouts</button>} />} />
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
        <Route render={() => <StateBlock title="Admin screen not found" />} />
      </Switch>
    </AdminLayout>
  );
}
