const products = data.Products.map(p => ({
  id: Number(p.Product.id),

  name: p.Product.name || "",

  price: Number(p.Product.price) || 0,

  promotional_price: Number(p.Product.promotional_price) || 0,

  brand: p.Product.brand || "",

  category_id: Number(p.Product.category_id) || 0,

  stock: Number(p.Product.stock) || 0,

  description: p.Product.description || "",

  description_small: p.Product.description_small || "",

  model: p.Product.model || "",

  weight: p.Product.weight || "",

  warranty: p.Product.warranty || "",

  ean: p.Product.ean || "",

  image:
    p.Product.ProductImage?.[0]?.https ||
    p.Product.ProductImage?.[0]?.http ||
    p.Product.image ||
    null
}));
