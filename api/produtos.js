export default async function handler(req, res) {
  try {
    const token = process.env.TINY_API_TOKEN;
    
    if (!token) {
      console.error("TINY_API_TOKEN não configurado");
      return res.status(500).json({ error: "Token do Tiny ERP não configurado" });
    }

    const page = req.query.page || 1;
    const pesquisa = req.query.pesquisa || "";

    // Monta a URL da API do Tiny ERP
    const params = new URLSearchParams({
      token: token,
      formato: "json",
      pagina: page
    });

    if (pesquisa) {
      params.append("pesquisa", pesquisa);
    }

    // Faz a requisição para a API do Tiny ERP - Pesquisar Produtos
    const response = await fetch(
      `https://api.tiny.com.br/api2/produtos.pesquisa.php?${params.toString()}`
    );

    const data = await response.json();

    if (!data || !data.retorno) {
      return res.status(200).json([]);
    }

    if (data.retorno.status === "Erro") {
      console.error("Tiny API Error:", data.retorno.erros);
      return res.status(200).json([]);
    }

    const produtos = data.retorno.produtos || [];

    if (produtos.length === 0) {
      return res.status(200).json([]);
    }

    // Buscar detalhes completos de cada produto
    const productsWithDetails = await Promise.all(
      produtos.map(async (item) => {
        const p = item.produto || {};
        
        try {
          // Busca detalhes do produto individual
          const detailParams = new URLSearchParams({
            token: token,
            formato: "json",
            id: p.id
          });
          
          const detailResponse = await fetch(
            `https://api.tiny.com.br/api2/produto.obter.php?${detailParams.toString()}`
          );
          
          const detailData = await detailResponse.json();
          const detail = detailData?.retorno?.produto || {};
          
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

          return {
            id: Number(p.id) || 0,
            name: detail.nome || p.nome || "",
            price: Number(detail.preco) || Number(p.preco) || 0,
            promotional_price: Number(detail.preco_promocional) || 0,
            brand: detail.marca || "",
            category_id: Number(detail.idCategoria) || 0,
            stock: Number(detail.estoqueAtual) || Number(p.saldo) || 0,
            description: detail.descricao_complementar || detail.observacoes || "",
            description_small: detail.nome || p.nome || "",
            model: detail.codigo || p.codigo || "",
            weight: detail.peso_bruto ? `${detail.peso_bruto}kg` : "",
            warranty: detail.garantia || "",
            ean: detail.gtin || p.codigo || "",
            slug: slugify(detail.nome || p.nome || ""),
            image: image,
            variations: variations,
            all_categories: detail.categoria ? [detail.categoria] : []
          };
        } catch (e) {
          console.error("Erro ao buscar detalhes do produto:", p.id, e);
          // Retorna dados básicos se falhar ao buscar detalhes
          return {
            id: Number(p.id) || 0,
            name: p.nome || "",
            price: Number(p.preco) || 0,
            promotional_price: Number(p.preco_promocional) || 0,
            brand: "",
            category_id: 0,
            stock: Number(p.saldo) || 0,
            description: "",
            description_small: p.nome || "",
            model: p.codigo || "",
            weight: "",
            warranty: "",
            ean: p.codigo || "",
            slug: slugify(p.nome || ""),
            image: "",
            variations: [],
            all_categories: []
          };
        }
      })
    );

    // Inclui informações de paginação
    const resultado = {
      products: productsWithDetails,
      pagination: {
        page: Number(page),
        total_pages: data.retorno.numero_paginas || 1,
        total_products: data.retorno.numero_produtos || productsWithDetails.length
      }
    };

    res.status(200).json(resultado);

  } catch (error) {
    console.error("Tiny API ERROR:", error);
    res.status(500).json({ error: "Erro ao buscar produtos do Tiny ERP" });
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
