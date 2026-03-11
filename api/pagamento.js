// API para processar pagamentos com Mercado Pago (Checkout Transparente)
export default async function handler(req, res) {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  
  if (!accessToken) {
    return res.status(500).json({ error: "Credenciais do Mercado Pago não configuradas" });
  }

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

  try {
    const { 
      token, // Token do cartão gerado pelo SDK do MP no frontend
      payment_method_id,
      installments,
      issuer_id,
      payer,
      items,
      total,
      pedido_id // ID interno para referência
    } = req.body;

    if (!token || !payment_method_id || !payer || !total) {
      return res.status(400).json({ 
        error: "Dados incompletos para processamento do pagamento" 
      });
    }

    // Monta o payload do pagamento
    const paymentData = {
      transaction_amount: Number(total),
      token: token,
      description: `Pedido Ferramentas Valfre #${pedido_id || Date.now()}`,
      installments: Number(installments) || 1,
      payment_method_id: payment_method_id,
      issuer_id: issuer_id ? String(issuer_id) : undefined,
      payer: {
        email: payer.email,
        identification: {
          type: payer.identification?.type || "CPF",
          number: payer.identification?.number?.replace(/\D/g, '') || ""
        },
        first_name: payer.first_name || payer.nome?.split(' ')[0] || "",
        last_name: payer.last_name || payer.nome?.split(' ').slice(1).join(' ') || ""
      },
      external_reference: String(pedido_id || Date.now()),
      notification_url: `${getBaseUrl(req)}/api/webhook-mp`,
      statement_descriptor: "FERRVALFRE",
      metadata: {
        pedido_id: pedido_id,
        items: items
      }
    };

    // Processa o pagamento no Mercado Pago
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Idempotency-Key': `${pedido_id}-${Date.now()}`
      },
      body: JSON.stringify(paymentData)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Erro MP:", result);
      return res.status(400).json({
        error: "Erro ao processar pagamento",
        details: result.message || result.cause?.[0]?.description || "Erro desconhecido",
        status: result.status
      });
    }

    // Retorna resultado do pagamento
    return res.status(200).json({
      success: true,
      payment: {
        id: result.id,
        status: result.status,
        status_detail: result.status_detail,
        transaction_amount: result.transaction_amount,
        installments: result.installments,
        payment_method_id: result.payment_method_id,
        date_approved: result.date_approved,
        external_reference: result.external_reference
      }
    });

  } catch (error) {
    console.error("Erro na API de pagamento:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

function getBaseUrl(req) {
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${protocol}://${host}`;
}
