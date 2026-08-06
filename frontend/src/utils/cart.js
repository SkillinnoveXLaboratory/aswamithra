export function buildCartPayload(product, qty = 1) {
  const farmer = product.farmer || {};
  return {
    productId: product.id,
    qty,
    name: product.name,
    price: product.price,
    unit: product.unit,
    image: product.images?.[0] || '',
    category: product.category || '',
    marketReferencePrice: product.marketReferencePrice ?? product.price,
    sellerId: product.sellerId || farmer.id || '',
    sellerName: product.sellerName || farmer.name || '',
  };
}
