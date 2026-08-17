import { useEffect, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BadgeCheck,
  Building2,
  Carrot,
  Leaf,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  ShieldCheck,
  ShoppingBasket,
  Sprout,
  Star,
  Tractor,
  User,
  Users,
  Wheat,
} from 'lucide-react';
import PublicLayout from '../layouts/PublicLayout.jsx';
import ProductCard from '../components/ProductCard.jsx';
import StatCard from '../components/StatCard.jsx';
import StateBlock from '../components/StateBlock.jsx';
import { useApi } from '../hooks/useApi.js';
import { endpoints } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { buildCartPayload } from '../utils/cart.js';
import '../styles/landing-template.css';

const fallbackConfig = {
  landing: {
    title: 'Fresh farm products, directly from nearby farmers.',
    description: 'Aswamithra connects customers, farmers, B2B buyers, and admin teams through one transparent marketplace.',
    stats: [
      { label: 'Verified farmers', value: '3+' },
      { label: 'Live products', value: '5+' },
      { label: 'Customer savings', value: 'Rs. 80+' },
      { label: 'District hubs', value: '4+' },
    ],
  },
  map: {
    mapLat: 16.5062,
    mapLng: 80.6480,
    mapAddress: 'Vijayawada, Andhra Pradesh',
  },
};

const services = [
  {
    title: 'Customer Shopping',
    text: 'Set your location, choose a radius, compare farmer prices, and order fresh produce online.',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000&auto=format&fit=crop',
    icon: ShoppingBasket,
  },
  {
    title: 'Farmer Selling',
    text: 'Create your shop, upload products, manage stock, accept orders, and track earnings.',
    image: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=1000&auto=format&fit=crop',
    icon: Tractor,
  },
  {
    title: 'B2B Bulk Buying',
    text: 'Hotels and retailers can raise RFQs, compare quotes, and manage invoices with credit terms.',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1470&auto=format&fit=crop',
    icon: Building2,
  },
  {
    title: 'Admin Operations',
    text: 'Approve KYC, manage commission, shops, CMS banners, disputes, and finance from one console.',
    image: 'https://images.unsplash.com/photo-1518843875459-f738682238a6?q=80&w=1442&auto=format&fit=crop',
    icon: ShieldCheck,
  },
];

const blogPosts = [
  {
    date: 'AUG. 6, 2026',
    title: 'How radius search helps you find the freshest farmers nearby',
    image: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?q=80&w=800&auto=format&fit=crop',
  },
  {
    date: 'AUG. 6, 2026',
    title: 'Farmer KYC and shop setup guide on Aswamithra',
    image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?q=80&w=800&auto=format&fit=crop',
  },
];

const testimonials = [
  {
    quote: 'I found fresh cow milk from a farmer just 2 km away and saved Rs. 24 per kg compared to retail shops. The radius search makes it easy to buy local.',
    name: 'Lakshmi Devi',
    role: 'Customer, Vijayawada',
  },
  {
    quote: 'Aswamithra helped me list my harvest directly without middlemen. I manage my shop, stock, and orders from one farmer dashboard.',
    name: 'Ramesh Kumar',
    role: 'Farmer, Kankipadu',
  },
  {
    quote: 'Our hotel buys vegetables in bulk through RFQs. Quotes are transparent and invoices are tracked in the B2B portal.',
    name: 'Suresh Reddy',
    role: 'B2B Buyer, Guntur',
  },
];

export default function LandingPage() {
  const history = useHistory();
  const { token, user } = useAuth();
  const { data: config } = useApi(() => endpoints.siteConfig(), fallbackConfig, []);
  const [location, setLocation] = useState({ lat: fallbackConfig.map.mapLat, lng: fallbackConfig.map.mapLng, label: fallbackConfig.map.mapAddress });
  const [locationError, setLocationError] = useState('');
  const [radiusKm, setRadiusKm] = useState(50);
  const { data: productData, loading } = useApi(
    () => endpoints.productsRadius({ lat: location.lat, lng: location.lng, radiusKm }),
    { products: [] },
    [location.lat, location.lng, radiusKm],
  );
  const products = productData.products || [];
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const currentTestimonial = testimonials[activeTestimonial];

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Location access is not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
          label: 'Using your live location',
        });
        setLocationError('');
      },
      () => {
        setLocationError('Location permission was denied. Showing nearby products from Vijayawada.');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 600000 },
    );
  }, []);

  const addToCart = async (product) => {
    if (!token || user?.role !== 'customer') {
      history.push('/login');
      return;
    }
    await endpoints.addCartItem(buildCartPayload(product));
    history.push('/customer/cart');
  };

  return (
    <PublicLayout>
      <header className="landing-hero">
        <div className="landing-container landing-hero-content">
          <div className="landing-hero-text">
            <h1>
              <Leaf size={40} />
              Aswamithra
              <span>Fresh Farm Marketplace</span>
            </h1>
            <p>{config.landing?.description || fallbackConfig.landing.description}</p>
            <div className="hero-actions">
              <Link className="btn btn-primary big" to="/login"><ShoppingBasket size={20} /> Get Started</Link>
              <a className="btn btn-ghost big" href="#products">See products <ArrowRight size={20} /></a>
            </div>
            <div className="trust-strip" id="trust">
              <span><ShieldCheck size={18} /> OTP login</span>
              <span><BadgeCheck size={18} /> KYC farmers</span>
              <span><MapPin size={18} /> {location.label}</span>
            </div>
            <div className="landing-location-card">
              <div className="landing-location-top">
                <div className="landing-location-badge">
                  <MapPin size={18} />
                  <div>
                    <p>Location source</p>
                    <strong>{location.label}</strong>
                  </div>
                </div>
                <label className="landing-radius-field">
                  <span>Nearby radius</span>
                  <select value={radiusKm} onChange={(e) => setRadiusKm(Number(e.target.value))}>
                    <option value={10}>10 km</option>
                    <option value={25}>25 km</option>
                    <option value={50}>50 km</option>
                    <option value={100}>100 km</option>
                  </select>
                </label>
              </div>
              <div className={`landing-location-note${locationError ? ' error' : ''}`}>
                <span className="landing-location-pulse" aria-hidden="true" />
                <div>
                  <p>{locationError ? 'Location update needed' : 'Auto refresh active'}</p>
                  {locationError || 'Products refresh automatically using your browser location.'}
                </div>
              </div>
            </div>
          </div>
          <div className="landing-hero-image">
            <img
              src="https://images.pexels.com/photos/34518427/pexels-photo-34518427.jpeg?auto=compress&cs=tinysrgb&w=1000"
              alt="Farm landscape with barn and fields"
            />
          </div>
        </div>
        <div className="landing-wave-bottom" aria-hidden="true">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25" className="shape-fill" />
            <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" opacity=".5" className="shape-fill" />
            <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" className="shape-fill" />
          </svg>
        </div>
      </header>

      <section className="stats-band">
        {(config.landing?.stats || fallbackConfig.landing.stats).map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} icon={Star} />
        ))}
      </section>

      <section className="landing-about" id="about">
        <div className="landing-container landing-about-grid">
          <div className="landing-about-images">
            <img src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?q=80&w=1470&auto=format&fit=crop" className="landing-leaf-img-1" alt="Farm field" />
            <img src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=2070&auto=format&fit=crop" className="landing-leaf-img-2" alt="Tractor in field" />
            <Leaf className="landing-floating-leaf" size={42} />
          </div>
          <div className="landing-about-text">
            <span className="landing-section-subtitle"><Leaf size={16} /> About Aswamithra</span>
            <h2>Fresh produce,<br />fair farmer earnings</h2>
            <p>
              Aswamithra is a farmer-to-consumer and B2B marketplace built for transparent trade.
              Customers discover verified farmers by radius, farmers sell directly from their shops,
              and admin teams keep operations compliant and trustworthy.
            </p>
            <div className="landing-features">
              <div className="landing-feature-item">
                <div className="landing-feature-icon"><Sprout size={24} /></div>
                <div className="landing-feature-text">
                  <h4>Verified farmers</h4>
                  <p>KYC-approved sellers and shop profiles you can trust.</p>
                </div>
              </div>
              <div className="landing-feature-item">
                <div className="landing-feature-icon"><Carrot size={24} /></div>
                <div className="landing-feature-text">
                  <h4>Fresh categories</h4>
                  <p>Milk, vegetables, fruits, grains, and more from nearby farms.</p>
                </div>
              </div>
            </div>
            <p>
              We focus on reducing middlemen, improving farmer income, and helping families access
              fresher food at better prices across Krishna district and beyond.
            </p>
            <div className="landing-about-footer">
              <div>
                <div className="landing-signature-font">Aswamithra Team</div>
                <div className="landing-signature-text">Farm-to-table platform</div>
              </div>
              <Link className="btn btn-primary" to="/login">Explore more <ArrowRight size={18} /></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-services" id="services">
        <div className="landing-container landing-services-wrap">
          <div className="landing-services-header">
            <span className="landing-section-subtitle"><Leaf size={16} /> Our services</span>
            <h2>What we provide</h2>
            <div className="landing-best-badge">
              <div className="landing-badge-icon"><Award size={26} /></div>
              <div className="landing-badge-text">
                <h4>Trusted platform</h4>
                <p>Built for farmers, customers, and B2B buyers</p>
                <div className="landing-stars">5/5 for transparent farm trade</div>
              </div>
            </div>
          </div>
          <div className="landing-services-grid">
            {services.map((service) => (
              <article className="landing-service-card" key={service.title}>
                <img src={service.image} alt={service.title} />
                <div className="landing-service-content">
                  <span className="landing-arrow-btn"><ArrowRight size={14} /></span>
                  <service.icon size={24} />
                  <h4>{service.title}</h4>
                  <p>{service.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="product-highlight" id="products">
        <div className="section-heading">
          <span className="eyebrow"><Sprout size={17} /> Live marketplace preview</span>
          <h2>Fresh products from farmers near you.</h2>
          <p>Live listings loaded from the backend radius API using your browser location.</p>
        </div>
        {loading ? <StateBlock type="loading" title="Loading fresh products" /> : null}
        <div className="products-grid landing-products">
          {products.slice(0, 3).map((product) => <ProductCard key={product.id} product={product} onAdd={addToCart} />)}
        </div>
      </section>

      <section className="section-grid" id="roles">
        <div className="section-heading">
          <span className="eyebrow"><Users size={17} /> One platform, four portals</span>
          <h2>Simple enough for first-time users, strong enough for operations.</h2>
        </div>
        <div className="role-grid">
          {[
            { icon: ShoppingBasket, title: 'Customer', text: 'Set location, choose radius, compare farmer prices, order, and track.' },
            { icon: Tractor, title: 'Farmer', text: 'List crops, manage stock, accept orders, and view payouts.' },
            { icon: Building2, title: 'B2B Buyer', text: 'Create bulk RFQs, compare quotes, manage invoices and credit.' },
            { icon: ShieldCheck, title: 'Admin', text: 'Approve KYC, manage commission, shops, CMS, disputes, and finance.' },
          ].map((role) => (
            <article className="role-card" key={role.title}>
              <role.icon size={30} />
              <h3>{role.title}</h3>
              <p>{role.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="how-band" id="how">
        {['Choose role', 'Verify mobile OTP', 'Complete profile', 'Start buying or selling'].map((step, index) => (
          <article key={step}>
            <span>{index + 1}</span>
            <h3>{step}</h3>
            <p>Clear screens, large controls, and backend-driven data keep each step easy.</p>
          </article>
        ))}
      </section>

      <section className="landing-testimonials" id="testimonials">
        <img src="https://upload.wikimedia.org/wikipedia/commons/8/80/World_map_-_low_resolution.svg" className="landing-map-bg" alt="" />
        <div className="landing-floating-imgs" aria-hidden="true">
          <img src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?q=80&w=400&auto=format&fit=crop" className="landing-float-item landing-float-1" alt="" />
          <img src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?q=80&w=400&auto=format&fit=crop" className="landing-float-item landing-float-2" alt="" />
          <img src="https://images.unsplash.com/photo-1589923188900-85dae523342b?q=80&w=400&auto=format&fit=crop" className="landing-float-item landing-float-3" alt="" />
          <img src="https://images.unsplash.com/photo-1605000797499-95a51c5269ae?q=80&w=400&auto=format&fit=crop" className="landing-float-item landing-float-4" alt="" />
        </div>
        <div className="landing-container landing-testi-content">
          <span className="landing-section-subtitle" style={{ justifyContent: 'center', width: '100%' }}><Leaf size={16} /> Our testimonials</span>
          <h2>Hear what our<br />community says</h2>
          <p className="landing-quote">&ldquo;{currentTestimonial.quote}&rdquo;</p>
          <h4 className="landing-client-name">{currentTestimonial.name}</h4>
          <span className="landing-client-role">{currentTestimonial.role}</span>
          <div className="landing-dots">
            {testimonials.map((item, index) => (
              <button
                key={item.name}
                type="button"
                className={`landing-dot${index === activeTestimonial ? ' active' : ''}`}
                aria-label={`Show testimonial ${index + 1}`}
                onClick={() => setActiveTestimonial(index)}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="landing-blog" id="blog">
        <div className="landing-container landing-blog-wrap">
          <div className="landing-blog-header">
            <span className="landing-section-subtitle"><Leaf size={16} /> Our blogs</span>
            <h2>Latest news from the marketplace</h2>
            <a className="btn btn-primary" href="#blog">View all news <ArrowRight size={18} /></a>
          </div>
          <div className="landing-blog-grid">
            {blogPosts.map((post) => (
              <article className="landing-blog-card" key={post.title}>
                <div className="landing-blog-img">
                  <span className="landing-date-badge">{post.date}</span>
                  <img src={post.image} alt={post.title} />
                </div>
                <div className="landing-blog-meta">
                  <span><User size={14} /> Admin</span>
                  <span><MessageCircle size={14} /> 0 Comments</span>
                </div>
                <h4>{post.title}</h4>
                <span className="landing-read-more">Read more <ArrowRight size={14} /></span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="landing-site-footer" id="contact">
        <div className="landing-container">
          <div className="landing-newsletter-box">
            <Mail className="landing-news-icon" size={40} />
            <h3>Sign up to our newsletter</h3>
            <p>Get updates on new farmers, seasonal produce, and platform features.</p>
            <div style={{ margin: '14px 0 10px', display: 'grid', gap: '10px' }}>
              <div className="landing-f-contact" style={{ margin: 0 }}>
                <Mail size={20} />
                <div>
                  <p>General enquiries</p>
                  <h4>support@aswamithra.in</h4>
                </div>
              </div>
              <div className="landing-f-contact" style={{ margin: 0 }}>
                <Phone size={20} />
                <div>
                  <p>Give us a call</p>
                  <h4>+91 98765 43210</h4>
                </div>
              </div>
            </div>
            <form onSubmit={(event) => event.preventDefault()}>
              <input type="email" placeholder="Email address*" required />
              <button type="submit" className="btn btn-primary full">Subscribe <ArrowRight size={16} /></button>
                      </form>
            </div>

          <div className="landing-footer-top">
            <div className="landing-footer-contacts" />
            {config?.map?.mapLat && config?.map?.mapLng ? (
              <div className="landing-footer-map">
                <iframe
                  title="Footer Location Map"
                  width="100%"
                  height="240"
                  frameBorder="0"
                  scrolling="no"
                  marginHeight={0}
                  marginWidth={0}
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${config.map.mapLng - 0.005},${config.map.mapLat - 0.005},${config.map.mapLng + 0.005},${config.map.mapLat + 0.005}&layer=mapnik&marker=${config.map.mapLat},${config.map.mapLng}`}
                  style={{ border: 0, borderRadius: '8px' }}
                />
                {config.map.mapAddress ? <p className="landing-map-address">{config.map.mapAddress}</p> : null}
              </div>
            ) : (
              <div className="landing-footer-map">
                <div className="landing-map-placeholder">Map location not configured</div>
              </div>
            )}
            <img
              src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?q=80&w=400&auto=format&fit=crop"
              className="landing-farmer-img"
              alt="Farmer"
            />
          </div>

          <div className="landing-footer-main">
            <div className="landing-footer-col">
              <h4>Useful links</h4>
              <ul>
                <li><a href="#about">About us</a></li>
                <li><a href="#services">Why choose us</a></li>
                <li><a href="#roles">Our portals</a></li>
                <li><a href="#contact">Contact us</a></li>
                <li><a href="#how">How it works</a></li>
              </ul>
            </div>
            <div className="landing-footer-col">
              <h4>Explore</h4>
              <ul>
                <li><a href="#services">What we offer</a></li>
                <li><a href="#blog">Latest news</a></li>
                <li><a href="#products">Live products</a></li>
                <li><a href="#testimonials">Testimonials</a></li>
                <li><Link to="/login">Login / Register</Link></li>
              </ul>
            </div>
            <div className="landing-footer-col landing-footer-about">
              <Link to="/" className="brand">
                <Leaf size={28} />
                <span>Aswamithra</span>
              </Link>
              <p>
                Fresh farm products, fair farmer earnings, and transparent admin operations —
                one platform connecting rural producers with customers and B2B buyers.
              </p>
              <div className="landing-social-icons">
                <a href="#" aria-label="Facebook"><Package size={18} /></a>
                <a href="#" aria-label="Twitter"><Wheat size={18} /></a>
                <a href="#" aria-label="LinkedIn"><Users size={18} /></a>
                <a href="#" aria-label="Instagram"><Sprout size={18} /></a>
              </div>
            </div>
          </div>

          <div className="landing-footer-bottom">
            <p>&copy; 2026 <span>Aswamithra</span>. Fresh farm marketplace for India.</p>
          </div>
        </div>
      </footer>
    </PublicLayout>
  );
}
