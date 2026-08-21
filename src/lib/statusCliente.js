// Fonte única dos status comerciais. Esses valores são gravados na coluna
// `status` da tabela `clientes` e comparados por igualdade em várias telas —
// renomear aqui mantém filtros, badges e gráficos em sincronia.
export const STATUS_CLIENTE = {
  COM_CONTRATO: 'Com contrato',
  SEM_CONTRATO: 'Sem contrato',
  EM_PROSPECCAO: 'Em prospecção',
};

// Ordem usada nos <select> de formulário e filtro
export const STATUS_CLIENTE_LISTA = [
  STATUS_CLIENTE.COM_CONTRATO,
  STATUS_CLIENTE.SEM_CONTRATO,
  STATUS_CLIENTE.EM_PROSPECCAO,
];

// Status assumido quando o registro está sem valor gravado
export const STATUS_CLIENTE_PADRAO = STATUS_CLIENTE.EM_PROSPECCAO;
