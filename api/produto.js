export default async function handler(req, res) {
  try {
    const token = process.env.TINY_API_TOKEN;
    
    if (!token) {
      console.error("TINY_API_TOKEN não configurado");
      return res.status(500).json({ error: "Token do Tiny ERP não configurado" });
    }

    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: "ID do produto é obrigatório" });
    }

    // Monta a URL da API do Tiny ERP - Obter Produto
    const params = new URLSearchParams({
      token: token,
      formato: "json",
      id: id
    });

    const response = await fetch(
      `https://api.tiny.com.br/api2/produto.obter.php?${params.toString()}`
    );

    const data = await response.json();

    if (!data || !data.retorno) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    if (data.retorno.status === "Erro") {
      console.error("Tiny API Error:", data.retorno.erros);
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    const detail = data.retorno.produto || {};

    // Busca a imagem do produto
    let image = "";
    if (detail.anexos && detail.anexos.length > 0) {
      image = detail.anexos[0].anexo || "";
    } else if (detail.imagem_url) {
      image = detail.imagem_url;
    }

    // Mapeia variações se existirem
    const variations = [];
    if (detail.variacoes && detail.variacoes.length > 0) {
      detail.variacoes.forEach(v => {
        const varData = v.variacao || v;
        variations.push({
          id: varData.id || varData.codigo,
          stock: Number(varData.estoque) || 0,
          price: Number(varData.preco) || Number(detail.preco) || 0,
          promotional_price: Number(varData.preco_promocional) || 0,
          Sku: [{ value: varData.grade?.descricao || varData.nome || `Variação ${varData.id}` }]
        });
      });
    }

    const product = {
      id: Number(detail.id) || 0,
      name: detail.nome || "",
      price: Number(detail.preco) || 0,
      promotional_price: Number(detail.preco_promocional) || 0,
      brand: detail.marca || "",
      category_id: Number(detail.idCategoria) || 0,
      stock: Number(detail.estoqueAtual) || 0,
      description: detail.descricao_complementar || detail.observacoes || "",
      description_small: detail.nome || "",
      model: detail.codigo || "",
      weight: detail.peso_bruto ? `${detail.peso_bruto}kg` : "",
      warranty: detail.garantia || "",
      ean: detail.gtin || detail.codigo || "",
      slug: slugify(detail.nome || ""),
      image: image,
      variations: variations,
      all_categories: detail.categoria ? [detail.categoria] : [],
      fullLoaded: true
    };

    res.status(200).json(product);

  } catch (error) {
    console.error("Tiny API ERROR:", error);
    res.status(500).json({ error: "Erro ao buscar produto do Tiny ERP" });
  }
}

function slugify(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
