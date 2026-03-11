import { buildTinyContatoPayload, tinyRequest } from './_lib/tiny.js';

function validarCliente(cliente) {
  const obrigatorios = ['nome', 'email', 'telefone', 'cpfCnpj', 'endereco', 'cidade', 'estado', 'cep'];
  const faltantes = obrigatorios.filter((campo) => !cliente?.[campo]);
  return faltantes;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const cliente = req.body || {};
    const faltantes = validarCliente(cliente);

    if (faltantes.length) {
      return res.status(400).json({ error: `Campos obrigatórios ausentes: ${faltantes.join(', ')}` });
    }

    const retorno = await tinyRequest('contato.incluir', buildTinyContatoPayload(cliente));

    return res.status(201).json({
      mensagem: 'Cliente enviado para o Tiny com sucesso',
      retorno,
    });
  } catch (error) {
    console.error('Erro /api/clientes:', error);
    return res.status(500).json({ error: error.message || 'Erro ao criar cliente no Tiny' });
  }
}
