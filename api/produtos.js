export default async function handler(req, res) {

  try {

    const page = req.query.page || 1;

    const response = await fetch(
      "https://1225878.commercesuite.com.br/web_api/products?limit=50&page=" + page + "&include=ProductStock,ProductImage"
    );

    const data = await response.json();

    if (!data || !data.Products) {
      return res.status(200).json([]);
    }

    const products = data.Products.map((item) => {

      const p = item.Product || {};

      // Estratégia de estoque:
      // 1) Soma depósitos via ProductStock
      // 2) Fallback para p.stock direto
      // 3) Se produto tem variações (has_variations), considera disponível se stock_type != 'S' ou soma variações
      let stock = 0;

      if (p.ProductStock && p.ProductStock.length > 0) {
        stock = p.ProductStock.reduce((total, s) => {
          return total + Number(s.quantity || 0);
        }, 0);
      }

      // Fallback: usa campo stock direto se ProductStock não trouxe nada
      if (stock === 0 && p.stock !== undefined && p.stock !== null) {
        stock = Number(p.stock) || 0;
      }

      // Se tem variações, usa available_quantity ou stock do pai
      if (stock === 0 && p.available_quantity !== undefined) {
        stock = Number(p.available_quantity) || 0;
      }

      // Pega imagem principal
      let image = null;
      if (p.ProductImage && Array.isArray(p.ProductImage) && p.ProductImage.length > 0) {
        image = p.ProductImage[0].https || p.ProductImage[0].http || null;
      }
      if (!image && p.main_image) {
        image = p.main_image;
      }

      return {

        id: Number(p.id) || 0,

        name: p.name || "",

        price: Number(p.price) || 0,

        promotional_price: Number(p.promotional_price) || 0,

        brand: p.brand || "",

        category_id: Number(p.category_id) || 0,

        stock: stock,

        description: p.description || "",

        description_small: p.description_small || "",

        model: p.model || "",

        weight: p.weight || "",

        warranty: p.warranty || "",

        ean: p.ean || "",

        slug: p.slug || "",

        image: image

      };

    });

    res.status(200).json(products);

  } catch (error) {

    console.error("Tray API ERROR:", error);

    res.status(500).json([]);

  }

}
