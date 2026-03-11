// API para criar pedidos no Tiny ERP
export default async function handler(req, res) {
  const token = process.env.TINY_API_TOKEN;
  
  if (!token) {
    return res.status(500).json({ error: "Token do Tiny ERP não configurado" });
  }

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'POST') {
      return await criarPedido(req, res, token);
    } else if (req.method === 'GET') {
      return await consultarPedido(req, res, token);
    }
    
    return res.status(405).json({ error: "Método não permitido" });
  } catch (error) {
    console.error("Erro na API de pedido:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

async function criarPedido(req, res, token) {
  const { 
    cliente,
    itens,
    pagamento,
    endereco,
    observacoes
  } = req.body;

  if (!cliente || !itens || itens.length === 0) {
    return res.status(400).json({ error: "Cliente e itens são obrigatórios" });
  }

  // Calcula totais
  const totalProdutos = itens.reduce((acc, item) => {
    const preco = item.promotional_price > 0 && item.promotional_price < item.price 
      ? item.promotional_price 
      : item.price;
    return acc + (preco * item.quantity);
  }, 0);

  // Monta o pedido para o Tiny
  const pedido = {
    pedido: {
      data_pedido: new Date().toISOString().split('T')[0],
      cliente: {
        nome: cliente.nome,
        cpf_cnpj: cliente.cpf_cnpj?.replace(/\D/g, ''),
        email: cliente.email,
        fone: cliente.telefone?.replace(/\D/g, '') || ""
      },
      itens: itens.map((item, index) => ({
        item: {
          codigo: item.model || item.ean || String(item.id),
          descricao: item.name,
          unidade: "UN",
          quantidade: item.quantity,
          valor_unitario: item.promotional_price > 0 && item.promotional_price < item.price 
            ? item.promotional_price 
            : item.price
        }
      })),
      valor_frete: 0,
      valor_desconto: 0,
      obs: observacoes || `Pedido via site - Pagamento: ${pagamento?.payment_method_id || 'N/A'}`,
      situacao: mapearSituacao(pagamento?.status),
      forma_pagamento: mapearFormaPagamento(pagamento?.payment_method_id),
      meio_pagamento: "Mercado Pago",
      numero_pedido_ecommerce: pagamento?.external_reference || String(Date.now())
    }
  };

  // Adiciona endereço de entrega se fornecido
  if (endereco) {
    pedido.pedido.endereco_entrega = {
      endereco: endereco.logradouro || "",
      numero: endereco.numero || "",
      complemento: endereco.complemento || "",
      bairro: endereco.bairro || "",
      cep: endereco.cep?.replace(/\D/g, '') || "",
      cidade: endereco.cidade || "",
      uf: endereco.uf || ""
    };
  }

  // Adiciona ID do pagamento MP nas observações
  if (pagamento?.id) {
    pedido.pedido.obs += ` | ID Pagamento MP: ${pagamento.id}`;
  }

  const params = new URLSearchParams({
    token: token,
    formato: "json",
    pedido: JSON.stringify(pedido)
  });

  const response = await fetch(
    `https://api.tiny.com.br/api2/pedido.incluir.php`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    }
  );

  const data = await response.json();

  if (data.retorno?.status === "Erro") {
    console.error("Erro Tiny ao criar pedido:", data.retorno.erros);
    return res.status(400).json({ 
      error: "Erro ao criar pedido no Tiny",
      details: data.retorno.erros
    });
  }

  const registro = data.retorno?.registros?.registro || {};

  return res.status(201).json({
    success: true,
    pedido: {
      id: registro.id,
      numero: registro.numero,
      id_nota: registro.idNotaFiscal,
      valor_total: totalProdutos
    },
    message: "Pedido criado com sucesso"
  });
}

async function consultarPedido(req, res, token) {
  const { id, numero } = req.query;
  
  if (!id && !numero) {
    return res.status(400).json({ error: "ID ou número do pedido é obrigatório" });
  }

  const params = new URLSearchParams({
    token: token,
    formato: "json"
  });

  if (id) {
    params.append("id", id);
  } else {
    params.append("numero", numero);
  }

  const response = await fetch(
    `https://api.tiny.com.br/api2/pedido.obter.php?${params.toString()}`
  );

  const data = await response.json();

  if (data.retorno?.status === "Erro") {
    return res.status(404).json({ error: "Pedido não encontrado" });
  }

  const pedido = data.retorno?.pedido || {};

  return res.status(200).json({
    success: true,
    pedido: {
      id: pedido.id,
      numero: pedido.numero,
      situacao: pedido.situacao,
      data_pedido: pedido.data_pedido,
      valor: pedido.total_pedido,
      cliente: pedido.cliente
    }
  });
}

function mapearSituacao(statusMP) {
  const mapa = {
    'approved': 'aprovado',
    'pending': 'aberto',
    'in_process': 'aberto',
    'rejected': 'cancelado',
    'cancelled': 'cancelado',
    'refunded': 'cancelado'
  };
  return mapa[statusMP] || 'aberto';
}

function mapearFormaPagamento(paymentMethodId) {
  if (!paymentMethodId) return "Outros";
  
  const metodo = paymentMethodId.toLowerCase();
  
  if (metodo.includes('credit') || metodo.includes('visa') || metodo.includes('master') || metodo.includes('amex') || metodo.includes('elo') || metodo.includes('hipercard')) {
    return "Cartão de Crédito";
  }
  if (metodo.includes('debit')) {
    return "Cartão de Débito";
  }
  if (metodo.includes('pix')) {
    return "PIX";
  }
  if (metodo.includes('boleto') || metodo.includes('ticket')) {
    return "Boleto";
  }
  
  return "Outros";
}
