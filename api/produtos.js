export default async function handler(req, res) {

  try {

    const page = req.query.page || 1;

    const response = await fetch(
      "https://1225878.commercesuite.com.br/web_api/products?limit=50&page=" +
      page +
      "&include=ProductStock,ProductImage,ProductVariant"
    );

    const data = await response.json();

    if (!data || !data.Products) {
      return res.status(200).json([]);
    }

    const products = data.Products.map((item) => {

      const p = item.Product || {};

      // detectar variações
      const hasVariations =
        p.has_variations === "1" ||
        p.has_variations === true ||
        (p.ProductVariant && Array.isArray(p.ProductVariant) && p.ProductVariant.length > 0);

      // =====================
      // CALCULO DE ESTOQUE
      // =====================

      let stock = 0;

      // 1 deposito
      if (p.ProductStock && Array.isArray(p.ProductStock)) {

        stock = p.ProductStock.reduce((total, s) => {

          const q = Number(s.quantity || s.stock || 0);

          return total + q;

        }, 0);

      }

      // 2 fallback stock direto
      if (stock === 0 && p.stock !== undefined && p.stock !== null) {

        const s = Number(p.stock);

        if (!isNaN(s)) stock = s;

      }

      // 3 estoque de variacoes
      if (stock === 0 && p.ProductVariant && Array.isArray(p.ProductVariant)) {

        stock = p.ProductVariant.reduce((total, v) => {

          const q = Number(v.stock || v.quantity || 0);

          return total + q;

        }, 0);

      }

      // 4 produto com variação mas sem estoque retornado
      if (stock === 0 && hasVariations) {

        stock = -1;

      }

      // =====================
      // IMAGEM
      // =====================

      let image = null;

      if (p.ProductImage && Array.isArray(p.ProductImage) && p.ProductImage.length > 0) {

        image = p.ProductImage[0].https || p.ProductImage[0].http || null;

      }

      if (!image && p.main_image) {

        image = p.main_image;

      }

      // =====================
      // DESCRIÇÃO
      // =====================

      let description = "";

      if (p.description && p.description !== "") {

        description = p.description;

      } else if (p.description_small) {

        description = p.description_small;

      }

      // =====================
      // RETURN
      // =====================

      return {

        id: Number(p.id) || 0,

        name: p.name || "",

        price: Number(p.price) || 0,

        promotional_price: Number(p.promotional_price) || 0,

        brand: p.brand || "",

        category_id: Number(p.category_id) || 0,

        stock: stock,

        has_variations: hasVariations,

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

    res.status(200).json(products);

  } catch (error) {

    console.error("Tray API ERROR:", error);

    res.status(500).json([]);

  }

}
