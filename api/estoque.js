// API para consultar estoque em tempo real no Tiny ERP
export default async function handler(req, res) {
  const token = process.env.TINY_API_TOKEN;
  
  if (!token) {
    return res.status(500).json({ error: "Token do Tiny ERP não configurado" });
  }

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // Consultar estoque de um produto
      return await consultarEstoque(req, res, token);
    } else if (req.method === 'POST') {
      // Verificar estoque de múltiplos produtos (para carrinho)
      return await verificarEstoqueCarrinho(req, res, token);
    }
    
    return res.status(405).json({ error: "Método não permitido" });
  } catch (error) {
    console.error("Erro na API de estoque:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

async function consultarEstoque(req, res, token) {
  const { id, codigo } = req.query;
  
  if (!id && !codigo) {
    return res.status(400).json({ error: "ID ou código do produto é obrigatório" });
  }

  const params = new URLSearchParams({
    token: token,
    formato: "json"
  });

  if (id) {
    params.append("id", id);
  } else {
    params.append("codigo", codigo);
  }

  const response = await fetch(
    `https://api.tiny.com.br/api2/produto.obter.estoque.php?${params.toString()}`
  );

  const data = await response.json();

  if (data.retorno?.status === "Erro") {
    console.error("Erro Tiny ao consultar estoque:", data.retorno.erros);
    return res.status(400).json({ 
      error: "Erro ao consultar estoque",
      details: data.retorno.erros
    });
  }

  const produto = data.retorno?.produto || {};
  
  // Calcula estoque total considerando depósitos
  let estoqueTotal = 0;
  if (produto.depositos && produto.depositos.length > 0) {
    estoqueTotal = produto.depositos.reduce((acc, dep) => {
      return acc + (Number(dep.deposito?.saldo) || 0);
    }, 0);
  } else {
    estoqueTotal = Number(produto.saldo) || 0;
  }

  return res.status(200).json({
    success: true,
    produto: {
      id: produto.id,
      codigo: produto.codigo,
      nome: produto.nome,
      estoque: estoqueTotal,
      depositos: produto.depositos || []
    }
  });
}

async function verificarEstoqueCarrinho(req, res, token) {
  const { itens } = req.body;
  
  if (!itens || !Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ error: "Lista de itens é obrigatória" });
  }

  const resultados = [];
  let todosDisponiveis = true;

  for (const item of itens) {
    const params = new URLSearchParams({
      token: token,
      formato: "json",
      id: item.id
    });

    try {
      const response = await fetch(
        `https://api.tiny.com.br/api2/produto.obter.estoque.php?${params.toString()}`
      );

      const data = await response.json();
      
      let estoqueAtual = 0;
      if (data.retorno?.status === "OK" && data.retorno?.produto) {
        const produto = data.retorno.produto;
        if (produto.depositos && produto.depositos.length > 0) {
          estoqueAtual = produto.depositos.reduce((acc, dep) => {
            return acc + (Number(dep.deposito?.saldo) || 0);
          }, 0);
        } else {
          estoqueAtual = Number(produto.saldo) || 0;
        }
      }

      const disponivel = estoqueAtual >= item.quantidade;
      if (!disponivel) todosDisponiveis = false;

      resultados.push({
        id: item.id,
        nome: item.nome,
        quantidade_solicitada: item.quantidade,
        estoque_atual: estoqueAtual,
        disponivel
      });
    } catch (e) {
      console.error("Erro ao verificar estoque do item:", item.id, e);
      resultados.push({
        id: item.id,
        nome: item.nome,
        quantidade_solicitada: item.quantidade,
        estoque_atual: 0,
        disponivel: false,
        erro: "Falha ao consultar"
      });
      todosDisponiveis = false;
    }
  }

  return res.status(200).json({
    success: true,
    todos_disponiveis: todosDisponiveis,
    itens: resultados
  });
}
