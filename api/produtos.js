export default async function handler(req, res) {

  try {

    const page = Number(req.query.page || 1);

    const url =
      "https://1225878.commercesuite.com.br/web_api/products" +
      "?limit=50&page=" + page +
      "&include=ProductStock,ProductImage,ProductVariant,ProductDescription";

    const response = await fetch(url);
    const data = await response.json();

    if (!data || !Array.isArray(data.Products)) {
      return res.status(200).json([]);
    }

    const products = data.Products.map((item) => {

      const p = item.Product || {};

      // ===============================
      // VARIAÇÕES
      // ===============================

      let variants = [];

      if (Array.isArray(p.ProductVariant) && p.ProductVariant.length > 0) {

        variants = p.ProductVariant.map((v) => ({

          id: Number(v.id) || 0,

          name:
            v.name ||
            v.value ||
            v.title ||
            v.Variant ||
            v.VariantValue ||
            "",

          stock: Number(v.stock || v.quantity || 0),

          price: Number(v.price || p.price) || 0,

          image: v.image || null

        }));

      }

      const hasVariations = variants.length > 0;

      // ===============================
      // ESTOQUE
      // ===============================

      let stock = 0;

      if (Array.isArray(p.ProductStock) && p.ProductStock.length > 0) {

        stock = p.ProductStock.reduce((total, s) => {

          return total + Number(s.quantity || s.stock || 0);

        }, 0);

      }

      if (stock === 0 && p.stock !== undefined && p.stock !== null) {

        stock = Number(p.stock) || 0;

      }

      if (stock === 0 && hasVariations) {

        stock = variants.reduce((total, v) => {

          return total + Number(v.stock || 0);

        }, 0);

      }

      // ===============================
      // IMAGEM
      // ===============================

      let image = null;

      if (Array.isArray(p.ProductImage) && p.ProductImage.length > 0) {

        image = p.ProductImage[0].https || p.ProductImage[0].http || null;

      }

      if (!image && p.main_image) {

        image = p.main_image;

      }

      // ===============================
      // DESCRIÇÃO
      // ===============================

      let description = "";

if (p.description_full && p.description_full !== "") {
  description = p.description_full;
}
else if (p.description && p.description !== "") {
  description = p.description;
}
else if (p.description_small) {
  description = p.description_small;
}

      // ===============================
      // RETORNO
      // ===============================

      return {

        id: Number(p.id) || 0,

        name: p.name || "",

        price: Number(p.price) || 0,

        promotional_price: Number(p.promotional_price) || 0,

        brand: p.brand || "",

        category_id: Number(p.category_id) || 0,

        stock: stock,

        available:
          p.available === "1" ||
          p.available === 1 ||
          p.available === true,

        has_variations: hasVariations,

        variants: variants,

        description: description,

        description_small: p.description_small || "",

        model: p.model || "",

        weight: p.weight || "",

        warranty: p.warranty || "",

        reference: p.reference || "",

        ean: p.ean || "",

        slug: p.slug || "",

        image: image

      };

    });

    return res.status(200).json(products);

  } catch (error) {

    console.error("TRAY API ERROR:", error);

    return res.status(500).json([]);

  }

}
