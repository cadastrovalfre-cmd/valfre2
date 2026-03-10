export default async function handler(req, res) {

  try {

    const page = req.query.page || 1;

    // Inclui ProductStock, ProductImage E ProductVariant para pegar estoque das variacoes
    const response = await fetch(
      "https://1225878.commercesuite.com.br/web_api/products?limit=50&page=" + page + "&include=ProductStock,ProductImage,ProductVariant"
    );

    const data = await response.json();

    if (!data || !data.Products) {
      return res.status(200).json([]);
    }

    const products = data.Products.map((item) => {

      const p = item.Product || {};

      // Detecta se produto tem variacoes
      const hasVariations =
        p.has_variations === "1" ||
        p.has_variations === true ||
        (p.ProductVariant && Array.isArray(p.ProductVariant) && p.ProductVariant.length > 0);

      // Estrategia de estoque:
      // 1) Soma depositos via ProductStock
      let stock = 0;
      if (p.ProductStock && Array.isArray(p.ProductStock) && p.ProductStock.length > 0) {
        stock = p.ProductStock.reduce((total, s) => total + Number(s.quantity || 0), 0);
      }

      // 2) Fallback para p.stock direto
      if (stock === 0 && p.stock !== undefined && p.stock !== null) {
        stock = Number(p.stock) || 0;
      }

      // 3) Soma estoque das variacoes
      if (stock === 0 && p.ProductVariant && Array.isArray(p.ProductVariant)) {
        stock = p.ProductVariant.reduce((total, v) => total + Number(v.stock || v.quantity || 0), 0);
      }

      // 4) Se tem variacoes mas stock ainda e 0, API nao retornou detalhe
      // Usamos -1 como sinal de "produto com variacoes = disponivel"
      if (stock === 0 && hasVariations) {
        stock = -1;
      }

      // Pega imagem principal
      let image = null;
      if (p.ProductImage && Array.isArray(p.ProductImage) && p.ProductImage.length > 0) {
        image = p.ProductImage[0].https || p.ProductImage[0].http || null;
      }
      if (!image && p.main_image) {
        image = p.main_image;
      }

      // Descricao: remove tags HTML basicas para texto limpo, mas mantém quebras
      let description = p.description || p.description_small || "";

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
