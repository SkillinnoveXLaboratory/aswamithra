import { Link } from 'react-router-dom';
import { Leaf, Menu, Phone, ShoppingBasket, X } from 'lucide-react';
import { useState } from 'react';

export default function PublicLayout({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="public-page">
      <header className="public-nav">
        <Link to="/" className="brand">
          <Leaf size={30} />
          <span>Aswamithra</span>
        </Link>
        <nav className={open ? 'open' : ''}>
          <a href="/#about">About</a>
          <a href="/#services">Services</a>
          <a href="/#products">Products</a>
          <a href="/#blog">Blog</a>
          <a href="/#contact">Contact</a>
        </nav>
        <div className="nav-actions">
          <span className="help-phone"><Phone size={17} /> Help</span>
          <Link className="btn btn-primary" to="/login">
            <ShoppingBasket size={18} /> Get Started
          </Link>
          <button className="icon-only mobile-only" type="button" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      {children}
    </div>
  );
}
