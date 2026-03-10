export default async function handler(req, res) {
  try {
    const page = Number(req.query.page || 1);

    const response = await fetch(
      "https://1225878.commercesuite.com.br/web_api/products?limit=50&page=" +
        page +
        "&include=ProductStock,ProductImage,ProductVariant"
    );

    const data = await response.json();

    if (!data || !Array.isArray(data.Products)) {
      return res.status(200).json([]);
    }

    const products = data.Products.map((item) => {
      const p = item.Product || {};

      const hasVariations =
        p.has_variations === "1" ||
        p.has_variations === true ||
        (Array.isArray(p.ProductVariant) && p.ProductVariant.length > 0);

      let stock = 0;

      if (Array.isArray(p.ProductStock) && p.ProductStock.length > 0) {
        stock = p.ProductStock.reduce(
          (total, s) => total + Number(s.quantity || s.stock || 0),
          0
        );
      }

      if (stock === 0 && p.stock !== undefined && p.stock !== null) {
        stock = Number(p.stock) || 0;
      }

      if (stock === 0 && Array.isArray(p.ProductVariant) && p.ProductVariant.length > 0) {
        stock = p.ProductVariant.reduce(
          (total, v) => total + Number(v.stock || v.quantity || 0),
          0
        );
      }

      let image = null;
      if (Array.isArray(p.ProductImage) && p.ProductImage.length > 0) {
        image = p.ProductImage[0].https || p.ProductImage[0].http || null;
      }
      if (!image && p.main_image) {
        image = p.main_image;
      }

      const description = p.description || p.description_small || "";

      return {
        id: Number(p.id) || 0,
        name: p.name || "",
        price: Number(p.price) || 0,
        promotional_price: Number(p.promotional_price) || 0,
        brand: p.brand || "",
        category_id: Number(p.category_id) || 0,
        stock,
        available: p.available === "1" || p.available === 1 || p.available === true,
        has_variations: hasVariations,
        description,
        description_small: p.description_small || "",
        model: p.model || "",
        weight: p.weight || "",
        warranty: p.warranty || "",
        reference: p.reference || "",
        ean: p.ean || "",
        slug: p.slug || "",
        image
      };
    });

    return res.status(200).json(products);
  } catch (error) {
    console.error("Tray API ERROR:", error);
    return res.status(500).json([]);
  }
}
