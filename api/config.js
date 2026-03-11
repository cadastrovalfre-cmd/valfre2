// API para fornecer configurações públicas ao frontend
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: "Método não permitido" });
  }

  // Retorna apenas configurações públicas (não sensíveis)
  return res.status(200).json({
    mp_public_key: process.env.MERCADOPAGO_PUBLIC_KEY || "",
    store_name: "Ferramentas Valfre",
    store_cnpj: "52.749.158/0001-62"
  });
}
