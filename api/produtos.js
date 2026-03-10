export default async function handler(req, res) {

  try {

    const page = req.query.page || 1;

    const response = await fetch(
      "https://1225878.commercesuite.com.br/web_api/products?limit=50&page=" + page + "&include=ProductStock"
    );

    const data = await response.json();

    if (!data || !data.Products) {
      return res.status(200).json([]);
    }

    const products = data.Products.map((item) => {

      const p = item.Product || {};

      // pega estoque correto
      const stock =
        p.ProductStock?.[0]?.quantity ??
        Number(p.stock) ??
        0;

      return {

        id: Number(p.id) || 0,

        name: p.name || "",

        price: Number(p.price) || 0,

        promotional_price: Number(p.promotional_price) || 0,

        brand: p.brand || "",

        category_id: Number(p.category_id) || null,

        stock: Number(stock),

        description: p.description || "",

        description_small: p.description_small || "",

        model: p.model || "",

        weight: p.weight || "",

        warranty: p.warranty || "",

        ean: p.ean || "",

        slug: p.slug || "",

        image:
          p.ProductImage?.[0]?.https ||
          p.ProductImage?.[0]?.http ||
          null

      };

    });

    res.status(200).json(products);

  } catch (error) {

    console.error("Tray API ERROR:", error);

    res.status(500).json([]);

  }

}
