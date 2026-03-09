export default async function handler(req, res) {

  const page = req.query.page || 1;

  const response = await fetch(
    `https://1225878.commercesuite.com.br/web_api/products?limit=50&page=${page}`
  );

  const data = await response.json();

  const products = data.Products.map(p => ({
      id: p.Product.id,
      name: p.Product.name,
      price: p.Product.price,
      brand: p.Product.brand,
      slug: p.Product.slug
  }));

  res.status(200).json(products);

}
