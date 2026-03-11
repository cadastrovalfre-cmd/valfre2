export default async function handler(req, res) {
  try {
    const page = req.query.page || 1;

    // Faz a requisição para a API da Tray
    const response = await fetch(
      "https://1225878.commercesuite.com.br/web_api/products?limit=50&page=" + page
    );

    const data = await response.json();

    if (!data || !data.Products) {
      return res.status(200).json([]);
    }

    // Filtra e formata os produtos que vão para o frontend
    const products = data.Products.map((item) => {
      const p = item.Product || {};

      return {
        id: Number(p.id) || 0,
        name: p.name || "",
        price: Number(p.price) || 0,
        promotional_price: Number(p.promotional_price) || 0,
        brand: p.brand || "",
        category_id: Number(p.category_id) || 0,
        stock: Number(p.stock) || 0,
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
          null,
        // ADICIONADO: Captura as variações se a Tray as enviar
        variations: p.Variant 
          ? (Array.isArray(p.Variant) 
              ? p.Variant.map(v => v.Variant || v) 
              : [p.Variant.Variant || p.Variant]) 
          : []
      };
    });

    res.status(200).json(products);

  } catch (error) {
    console.error("Tray API ERROR:", error);
    res.status(500).json({ error: "Erro ao buscar produtos da Tray" });
  }
}
