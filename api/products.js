export default async function handler(req, res) {

  const page = req.query.page || 1;

  const response = await fetch(
    `https://1225878.commercesuite.com.br/web_api/products?limit=50&page=${page}`
  );

  const data = await response.json();

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
      image: p.Product.ProductImage?.[0]?.https || null
  }));

  res.status(200).json(products);
}
