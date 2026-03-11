// Webhook para receber notificações do Mercado Pago
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const tinyToken = process.env.TINY_API_TOKEN;

  try {
    const { type, data, action } = req.body;

    console.log("Webhook MP recebido:", { type, action, data });

    // Processa apenas notificações de pagamento
    if (type === 'payment' && data?.id) {
      // Busca detalhes do pagamento
      const paymentResponse = await fetch(
        `https://api.mercadopago.com/v1/payments/${data.id}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      const payment = await paymentResponse.json();
      console.log("Detalhes do pagamento:", payment.id, payment.status);

      // Atualiza o pedido no Tiny conforme status do pagamento
      if (tinyToken && payment.external_reference) {
        await atualizarPedidoTiny(payment, tinyToken);
      }
    }

    // Sempre retorna 200 para o MP não reenviar
    return res.status(200).json({ received: true });

  } catch (error) {
    console.error("Erro no webhook MP:", error);
    // Retorna 200 mesmo com erro para evitar reenvios
    return res.status(200).json({ received: true, error: error.message });
  }
}

async function atualizarPedidoTiny(payment, token) {
  try {
    // Busca o pedido pelo número do e-commerce
    const params = new URLSearchParams({
      token: token,
      formato: "json",
      numeroEcommerce: payment.external_reference
    });

    const searchResponse = await fetch(
      `https://api.tiny.com.br/api2/pedidos.pesquisa.php?${params.toString()}`
    );

    const searchData = await searchResponse.json();

    if (searchData.retorno?.status !== "OK" || !searchData.retorno?.pedidos?.length) {
      console.log("Pedido não encontrado no Tiny:", payment.external_reference);
      return;
    }

    const pedidoId = searchData.retorno.pedidos[0].pedido.id;
    
    // Mapeia o status do MP para situação do Tiny
    const situacao = mapearSituacaoTiny(payment.status);

    // Atualiza a situação do pedido
    const updateParams = new URLSearchParams({
      token: token,
      formato: "json",
      id: pedidoId,
      situacao: situacao
    });

    const updateResponse = await fetch(
      `https://api.tiny.com.br/api2/pedido.alterar.situacao`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: updateParams.toString()
      }
    );

    const updateData = await updateResponse.json();
    console.log("Pedido atualizado no Tiny:", pedidoId, situacao, updateData.retorno?.status);

  } catch (error) {
    console.error("Erro ao atualizar pedido no Tiny:", error);
  }
}

function mapearSituacaoTiny(statusMP) {
  const mapa = {
    'approved': 'aprovado',
    'authorized': 'aprovado',
    'pending': 'aberto',
    'in_process': 'aberto',
    'in_mediation': 'aberto',
    'rejected': 'cancelado',
    'cancelled': 'cancelado',
    'refunded': 'cancelado',
    'charged_back': 'cancelado'
  };
  return mapa[statusMP] || 'aberto';
}
