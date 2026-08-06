import { IndianRupee, MapPin, Plus, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { money } from '../utils/format.js';
import { resolveMediaUrl } from '../utils/media.js';

export default function ProductCard({ product, onAdd }) {
  const image = resolveMediaUrl(product.images?.[0]) || 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=900';
  const farmer = product.farmer || {};
  return (
    <article className="product-card">
      <Link to={`/customer/product/${product.id}`} className="product-image">
        <img src={image} alt={product.name} />
        <span>{product.category || 'Fresh produce'}</span>
      </Link>
      <div className="product-body">
        <div>
          <h3>{product.name}</h3>
          <p className="muted">{farmer.name || product.sellerName || 'Verified farmer'}</p>
        </div>
        <div className="price-row">
          <strong>{money(product.price)} / {product.unit}</strong>
          <small>{money(product.marketReferencePrice)}</small>
        </div>
        <div className="mini-row">
          <span><MapPin size={15} /> {farmer.distanceKm ?? 'Near'} km</span>
          <span><Star size={15} /> {farmer.rating || '4.8'}</span>
          <span><IndianRupee size={15} /> Save {money(product.estimatedSavingsPerUnit || product.marketReferencePrice - product.price)}</span>
        </div>
        <button className="btn btn-primary full" type="button" onClick={() => onAdd?.(product)}>
          <Plus size={18} /> Add to cart
        </button>
      </div>
    </article>
  );
}
