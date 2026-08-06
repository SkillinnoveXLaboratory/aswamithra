import { NavLink, useHistory } from 'react-router-dom';
import { Bell, Leaf, LogOut, Menu, Search, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function PortalLayout({ role, title, subtitle, nav, children, accent = 'green' }) {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const history = useHistory();

  const handleLogout = async () => {
    await logout();
    history.push('/login');
  };

  return (
    <div className={`portal-layout accent-${accent}`}>
      <aside className={open ? 'portal-sidebar open' : 'portal-sidebar'}>
        <div className="portal-brand">
          <Leaf size={30} />
          <div>
            <strong>Aswamithra</strong>
            <span>{role} portal</span>
          </div>
          <button className="icon-only mobile-only" type="button" onClick={() => setOpen(false)} aria-label="Close menu">
            <X />
          </button>
        </div>
        <div className="quick-action">New farm-direct task</div>
        <nav className="portal-nav">
          {nav.map((item) => (
            <NavLink key={item.href} to={item.href} onClick={() => setOpen(false)}>
              <item.icon size={19} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <button className="logout-btn" type="button" onClick={handleLogout}>
          <LogOut size={18} /> Logout
        </button>
      </aside>
      {open ? <button className="sidebar-scrim" type="button" aria-label="Close menu" onClick={() => setOpen(false)} /> : null}
      <main className="portal-main">
        <header className="portal-header">
          <button className="icon-only mobile-only" type="button" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu />
          </button>
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="header-tools">
            <label className="header-search">
              <Search size={18} />
              <input placeholder="Search orders, crops, customers" />
            </label>
            <button className="icon-only" type="button" aria-label="Notifications"><Bell /></button>
            <div className="avatar">{(user?.name || role).slice(0, 1).toUpperCase()}</div>
          </div>
        </header>
        <section className="portal-content">{children}</section>
      </main>
    </div>
  );
}
