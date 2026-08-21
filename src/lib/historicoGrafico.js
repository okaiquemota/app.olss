import { paraNumero } from './numero';

const MESES_MAP = { Jan: 1, Fev: 2, Mar: 3, Abr: 4, Mai: 5, Jun: 6, Jul: 7, Ago: 8, Set: 9, Out: 10, Nov: 11, Dez: 12 };

const ordemDoMes = (mesReferencia) => {
  const [mes, ano] = (mesReferencia || '').split('/');
  const numeroMes = MESES_MAP[mes];
  if (!numeroMes || !ano) return null;
  return parseInt(ano, 10) * 100 + numeroMes;
};

const QUANTIDADE_MESES = 6;

// Monta os últimos meses de geração de um cliente para o gráfico do PDF.
// `relatorios` já deve vir filtrado pelo chamador (ex: excluindo o em edição);
// `extra` é o relatório que está sendo salvo agora e sempre vale para o mês dele.
//
// Um mês pode ter mais de um relatório gravado (nada impede isso no banco). Nesse
// caso vale o mais recente: antes o resultado dependia da ordem do array e acabava
// escolhendo o mais antigo, então o PDF mostrava um valor já corrigido na tela.
export function montarHistoricoGrafico(relatorios, clienteId, extra = null) {
  const porMes = new Map();

  const considerar = (mesReferencia, geracao, gravadoEm, ehAtual) => {
    const ordem = ordemDoMes(mesReferencia);
    if (ordem === null) return;

    const existente = porMes.get(mesReferencia);
    if (existente) {
      // O relatório sendo salvo agora ganha de qualquer versão já gravada
      if (existente.ehAtual) return;
      if (!ehAtual && gravadoEm <= existente.gravadoEm) return;
    }

    porMes.set(mesReferencia, { ordem, geracao: paraNumero(geracao), gravadoEm, ehAtual });
  };

  relatorios
    .filter(r => r.cliente_id === clienteId)
    .forEach(r => considerar(r.mes_referencia, r.geracao_atual, r.created_at || '', false));

  if (extra) considerar(extra.mes_referencia, extra.geracao_atual, '', true);

  return [...porMes.entries()]
    .sort((a, b) => a[1].ordem - b[1].ordem)
    .slice(-QUANTIDADE_MESES)
    .map(([mesReferencia, dados]) => ({
      mes: mesReferencia.substring(0, 3),
      geracao: dados.geracao,
    }));
}
