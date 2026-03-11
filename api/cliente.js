// API para cadastrar/buscar clientes no Tiny ERP
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
    if (req.method === 'POST') {
      // Cadastrar novo cliente
      return await cadastrarCliente(req, res, token);
    } else if (req.method === 'GET') {
      // Buscar cliente por CPF/CNPJ ou email
      return await buscarCliente(req, res, token);
    }
    
    return res.status(405).json({ error: "Método não permitido" });
  } catch (error) {
    console.error("Erro na API de cliente:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

async function cadastrarCliente(req, res, token) {
  const { nome, cpf_cnpj, email, telefone, endereco } = req.body;
  
  if (!nome || !cpf_cnpj || !email) {
    return res.status(400).json({ error: "Nome, CPF/CNPJ e email são obrigatórios" });
  }

  // Verifica se cliente já existe
  const clienteExistente = await buscarClientePorDocumento(cpf_cnpj, token);
  if (clienteExistente) {
    return res.status(200).json({ 
      success: true, 
      cliente: clienteExistente,
      message: "Cliente já cadastrado"
    });
  }

  // Monta o objeto do contato para o Tiny
  const contato = {
    contato: {
      sequencia: 1,
      codigo: cpf_cnpj.replace(/\D/g, ''),
      nome: nome,
      tipo_pessoa: cpf_cnpj.replace(/\D/g, '').length > 11 ? "J" : "F",
      cpf_cnpj: cpf_cnpj.replace(/\D/g, ''),
      email: email,
      fone: telefone ? telefone.replace(/\D/g, '') : "",
      situacao: "A"
    }
  };

  // Adiciona endereço se fornecido
  if (endereco) {
    contato.contato.endereco = endereco.logradouro || "";
    contato.contato.numero = endereco.numero || "";
    contato.contato.complemento = endereco.complemento || "";
    contato.contato.bairro = endereco.bairro || "";
    contato.contato.cep = endereco.cep ? endereco.cep.replace(/\D/g, '') : "";
    contato.contato.cidade = endereco.cidade || "";
    contato.contato.uf = endereco.uf || "";
  }

  const params = new URLSearchParams({
    token: token,
    formato: "json",
    contato: JSON.stringify(contato)
  });

  const response = await fetch(
    `https://api.tiny.com.br/api2/contato.incluir.php`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    }
  );

  const data = await response.json();

  if (data.retorno?.status === "Erro") {
    console.error("Erro Tiny ao cadastrar cliente:", data.retorno.erros);
    return res.status(400).json({ 
      error: "Erro ao cadastrar cliente",
      details: data.retorno.erros
    });
  }

  const idTiny = data.retorno?.registros?.registro?.id || null;

  return res.status(201).json({
    success: true,
    cliente: {
      id: idTiny,
      nome,
      cpf_cnpj,
      email,
      telefone
    },
    message: "Cliente cadastrado com sucesso"
  });
}

async function buscarCliente(req, res, token) {
  const { cpf_cnpj, email } = req.query;
  
  if (!cpf_cnpj && !email) {
    return res.status(400).json({ error: "CPF/CNPJ ou email é obrigatório" });
  }

  const cliente = cpf_cnpj 
    ? await buscarClientePorDocumento(cpf_cnpj, token)
    : await buscarClientePorEmail(email, token);

  if (!cliente) {
    return res.status(404).json({ error: "Cliente não encontrado" });
  }

  return res.status(200).json({ success: true, cliente });
}

async function buscarClientePorDocumento(cpf_cnpj, token) {
  const doc = cpf_cnpj.replace(/\D/g, '');
  
  const params = new URLSearchParams({
    token: token,
    formato: "json",
    cpf_cnpj: doc
  });

  const response = await fetch(
    `https://api.tiny.com.br/api2/contatos.pesquisa.php?${params.toString()}`
  );

  const data = await response.json();

  if (data.retorno?.status === "OK" && data.retorno?.contatos?.length > 0) {
    const c = data.retorno.contatos[0].contato;
    return {
      id: c.id,
      nome: c.nome,
      cpf_cnpj: c.cpf_cnpj,
      email: c.email,
      telefone: c.fone
    };
  }

  return null;
}

async function buscarClientePorEmail(email, token) {
  const params = new URLSearchParams({
    token: token,
    formato: "json",
    pesquisa: email
  });

  const response = await fetch(
    `https://api.tiny.com.br/api2/contatos.pesquisa.php?${params.toString()}`
  );

  const data = await response.json();

  if (data.retorno?.status === "OK" && data.retorno?.contatos?.length > 0) {
    const c = data.retorno.contatos[0].contato;
    return {
      id: c.id,
      nome: c.nome,
      cpf_cnpj: c.cpf_cnpj,
      email: c.email,
      telefone: c.fone
    };
  }

  return null;
}
