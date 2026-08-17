import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Minus,
  Search,
  X,
} from 'lucide-react';
import { CopyButton } from '../components/CopyButton';
import { supabase } from '../lib/supabase';
import { gerarPdfRelatorio } from '../lib/relatorioPdf';
import { montarHistoricoGrafico } from '../lib/historicoGrafico';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function HistoricoRelatorios({ onCriarRelatorio }) {
  const [clientes, setClientes] = useState([]);
  const [plataformas, setPlataformas] = useState([]);
  const [relatorios, setRelatorios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [quantidadeMeses, setQuantidadeMeses] = useState(6);
  const [relatorioDetalhe, setRelatorioDetalhe] = useState(null);
  const [iniciarRelatorioModal, setIniciarRelatorioModal] = useState(null);
  const [gerandoPDF, setGerandoPDF] = useState(false);

  const fetchData = async () => {
    setLoading(true);

    const resClientes = await supabase
      .from('clientes')
      .select('*')
      .order('nome_razao_social', { ascending: true });
    const resPlataformas = await supabase
      .from('plataformas')
      .select('*')
      .order('nome', { ascending: true });
    const resRelatorios = await supabase
      .from('relatorios')
      .select('id, cliente_id, mes_referencia, created_at, geracao_atual, geracao_anterior, parecer_tecnico, faturas_cpfl')
      .order('created_at', { ascending: false });

    if (!resClientes.error) setClientes(resClientes.data || []);
    if (!resPlataformas.error) setPlataformas(resPlataformas.data || []);
    if (!resRelatorios.error) setRelatorios(resRelatorios.data || []);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const hoje = new Date();
  const mesesColunas = Array.from({ length: quantidadeMeses })
    .map((_, i) => {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const idx = d.getMonth();
      const ano = d.getFullYear();
      const label = `${MESES[idx]}/${ano}`;
      return {
        idx,
        ano,
        chave: ano * 100 + idx,
        label,
        curto: `${MESES[idx]}/${String(ano).slice(-2)}`,
        atual: i === 0,
      };
    })
    .reverse()
    .map(mes => ({
      ...mes,
      qtd: relatorios.filter(r => r.mes_referencia === mes.label).length,
    }));

  const clientesFiltrados = clientes
    .filter(c => c.nome_razao_social?.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => (a.nome_razao_social || '').localeCompare(b.nome_razao_social || ''));

  const buscarRelatorio = (clienteId, mesLabel) =>
    relatorios.find(r => r.cliente_id === clienteId && r.mes_referencia === mesLabel);

  const exportarCSV = () => {
    const header = ['Cliente', ...mesesColunas.map(m => m.label), 'Total Relatórios na Grade'];
    const linhas = clientesFiltrados.map(cliente => {
      const colunas = mesesColunas.map(m => buscarRelatorio(cliente.id, m.label) ? 'Gerado' : 'Pendente');
      return [cliente.nome_razao_social, ...colunas, colunas.filter(c => c === 'Gerado').length];
    });

    const csv = [header, ...linhas]
      .map(linha => linha.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Relatorios_Status_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const baixarPDFRelatorio = async (cliente, relatorio) => {
    setGerandoPDF(true);
    try {
      const ucs = relatorio.faturas_cpfl?.ucs || [];
      const economiaTotal = ucs.reduce((acc, u) => acc + (u.economia || 0), 0);
      const historicoGrafico = montarHistoricoGrafico(relatorios, cliente.id);

      await gerarPdfRelatorio({
        cliente,
        relatorio,
        unidades: ucs,
        economiaTotal,
        historicoGrafico,
      });
    } catch (err) {
      alert('Erro ao gerar PDF: ' + err.message);
    } finally {
      setGerandoPDF(false);
    }
  };

  const handleAvancarParaCriacao = (clienteId) => {
    setIniciarRelatorioModal(null);
    onCriarRelatorio?.(clienteId);
  };

  const coberturaAtual = clientes.length > 0 ? Math.round(((mesesColunas.at(-1)?.qtd || 0) / clientes.length) * 100) : 0;

  return (
    <div className="w-full h-full flex flex-col relative text-sm">
      <div className="flex flex-col h-full bg-white border border-gray-300 animate-in fade-in duration-300 antialiased">
        
        {/* CABEÇALHO / CONTROLES */}
        <div className="flex flex-col lg:flex-row items-center gap-2 p-3 md:p-4 border-b border-gray-300 shrink-0 w-full bg-white">
          <div className="relative flex-1 w-full lg:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Pesquisar usina/cliente para iniciar o relatório..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-none text-[13px] font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 transition-all placeholder:text-gray-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto shrink-0 justify-end">
            <select
              value={quantidadeMeses}
              onChange={(e) => setQuantidadeMeses(Number(e.target.value))}
              className="bg-white border border-gray-300 px-3 py-2 text-[12px] text-gray-700 outline-none focus:ring-1 focus:ring-green-500 font-medium rounded-none cursor-pointer"
            >
              <option value={3}>3 meses</option>
              <option value={6}>6 meses</option>
              <option value={12}>12 meses</option>
            </select>
            <button
              onClick={exportarCSV}
              className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-none text-[12px] font-medium hover:bg-gray-100 transition-all cursor-pointer"
            >
              <Download size={14} /> Exportar Grade
            </button>
          </div>
        </div>

        {/* BARRA DE RESUMO */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-gray-300 bg-white shrink-0 text-[12px]">
          <div className="px-4 py-2 border-r border-gray-300 text-gray-800">
            <span className="font-extrabold">{clientes.length}</span> clientes
          </div>
          <div className="px-4 py-2 border-r border-gray-300 text-gray-800">
            <span className="font-extrabold">{relatorios.length}</span> relatórios salvos
          </div>
          <div className="px-4 py-2 border-r border-gray-300 text-green-700">
            <span className="font-extrabold">{mesesColunas.at(-1)?.qtd || 0}</span> no mês atual
          </div>
          <div className="px-4 py-2 text-gray-700">
            <span className="font-extrabold">{coberturaAtual}%</span> cobertura atual
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center flex-1 text-gray-400 text-[13px]">
            <Loader2 className="animate-spin mr-2" size={18} /> Carregando histórico...
          </div>
        ) : (
          <div className="flex-1 bg-white overflow-hidden flex flex-col">
            {clientesFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 text-gray-400 py-16">
                <Search size={32} strokeWidth={1} className="mb-2 text-gray-300" />
                <p className="text-[13px]">Nenhum cliente encontrado.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-auto">
                <table className="border-collapse min-w-[900px] w-full text-left whitespace-nowrap">
                  <thead className="bg-gray-100 sticky top-0 z-30 border-b border-gray-300">
                    <tr className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                      <th className="sticky left-0 z-40 bg-gray-100 border-r border-gray-300 px-4 py-3 min-w-[285px]">
                        Selecionar Cliente
                      </th>
                      {mesesColunas.map(mes => (
                        <th
                          key={mes.chave}
                          className={`border-r border-gray-300 px-2 py-3 text-center min-w-[90px] ${mes.atual ? 'bg-green-50/60' : ''}`}
                        >
                          <div className={`text-[12px] font-bold ${mes.atual ? 'text-green-800' : 'text-gray-700'}`}>{mes.curto}</div>
                          <div className="text-[10px] font-semibold text-gray-500">{mes.qtd}/{clientes.length}</div>
                        </th>
                      ))}
                      <th className="sticky right-0 z-40 bg-gray-100 border-l border-gray-300 px-4 py-3 text-center min-w-[110px]">
                        Progresso
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {clientesFiltrados.map(cliente => {
                      const relCliente = mesesColunas.filter(m => buscarRelatorio(cliente.id, m.label)).length;

                      return (
                        <tr key={cliente.id} className="hover:bg-gray-50 transition-colors group">
                          <td
                            onClick={() => setIniciarRelatorioModal(cliente)}
                            className="sticky left-0 z-20 bg-white border-r border-gray-200 px-4 py-2 cursor-pointer"
                            title="Clique para iniciar o relatório deste cliente"
                          >
                            <div className="font-semibold text-[12px] text-gray-800 truncate max-w-[270px]">
                              {cliente.nome_razao_social}
                            </div>
                            <div className="mt-0.5">
                              <span className={`inline-flex items-center px-1.5 py-0.2 text-[10px] font-bold uppercase border rounded-none ${cliente.status === 'Inativo' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                                {cliente.status || 'Ativo'}
                              </span>
                            </div>
                          </td>

                          {mesesColunas.map(mes => {
                            const rel = buscarRelatorio(cliente.id, mes.label);
                            return (
                              <td key={mes.chave} className={`px-2 py-1.5 text-center border-r border-gray-200 ${mes.atual ? 'bg-green-50/20' : ''}`}>
                                {rel ? (
                                  <button
                                    onClick={() => setRelatorioDetalhe({ cliente, relatorio: rel })}
                                    className="w-full h-7 inline-flex items-center justify-center gap-1 bg-green-50 hover:bg-green-100 border border-green-300 text-green-700 px-1 cursor-pointer rounded-none"
                                    title="Visualizar relatório gerado"
                                  >
                                    <CheckCircle2 size={13} strokeWidth={2.5} />
                                    <span className="text-[11px] font-bold">Ver</span>
                                  </button>
                                ) : (
                                  <div className="w-full h-7 flex items-center justify-center text-gray-300" title="Pendente">
                                    <Minus size={14} strokeWidth={2} />
                                  </div>
                                )}
                              </td>
                            );
                          })}

                          <td className="sticky right-0 z-20 bg-white border-l border-gray-200 px-4 py-2 text-center">
                            <span className="text-[12px] font-bold text-gray-700">{relCliente}/{mesesColunas.length}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* LEGENDA INFERIOR */}
        <div className="flex items-center gap-6 px-4 py-2 border-t border-gray-300 bg-white shrink-0 text-[11px] text-gray-600 font-medium">
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-green-50 border border-green-300 inline-flex items-center justify-center"><CheckCircle2 size={9} className="text-green-700" /></span> Relatório pronto</div>
          <div className="flex items-center gap-1.5"><Minus size={14} className="text-gray-400" /> Pendente</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-green-50 border border-green-300 inline-block" /> Mês atual</div>
        </div>

      </div>

      {/* MODAL: INICIAR RELATÓRIO */}
      {iniciarRelatorioModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 transition-opacity" onClick={(e) => { if (e.target === e.currentTarget) setIniciarRelatorioModal(null); }}>
          <div className="bg-white shadow-2xl border border-gray-400 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 rounded-none">
            <div className="flex justify-between items-center p-4 border-b border-gray-300 bg-gray-50">
              <div>
                <h3 className="font-bold text-[13px] text-gray-800 uppercase tracking-wider">Iniciar Relatório</h3>
                <p className="text-[12px] font-medium text-gray-500 mt-0.5">{iniciarRelatorioModal.nome_razao_social}</p>
              </div>
              <button onClick={() => setIniciarRelatorioModal(null)} className="text-gray-500 hover:text-red-600 hover:bg-red-50 p-1.5 transition-colors cursor-pointer border border-transparent hover:border-red-200 rounded-none">
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-white border border-gray-300 p-3 flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Plataforma</span>
                  <p className="text-[12px] font-bold text-gray-800">{iniciarRelatorioModal.plataforma_inversor || 'Não informada'}</p>
                </div>
                {iniciarRelatorioModal.plataforma_inversor && plataformas.find(p => p.nome === iniciarRelatorioModal.plataforma_inversor)?.link && (
                  <a
                    href={plataformas.find(p => p.nome === iniciarRelatorioModal.plataforma_inversor).link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 bg-white border border-gray-300 text-blue-600 px-3 py-1.5 text-[11px] font-bold hover:bg-gray-50 transition-colors cursor-pointer rounded-none"
                  >
                    <ExternalLink size={13} /> Abrir
                  </a>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white border border-gray-300 p-3">
                  <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Login App</span>
                  <CopyButton text={iniciarRelatorioModal.login_app} />
                </div>
                <div className="bg-white border border-gray-300 p-3">
                  <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Senha App</span>
                  <CopyButton text={iniciarRelatorioModal.senha_app} />
                </div>
              </div>

              {iniciarRelatorioModal.observacoes_internas && (
                <div className="text-[12px] text-yellow-900 bg-yellow-50 p-3 border border-yellow-300 whitespace-pre-wrap">
                  <div className="flex items-center gap-1 mb-1 font-bold text-yellow-800 text-[11px] uppercase tracking-wider">
                    <AlertCircle size={13} /> Avisos / Observações
                  </div>
                  {iniciarRelatorioModal.observacoes_internas}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-300 bg-gray-50 flex justify-end gap-2">
              <button
                onClick={() => setIniciarRelatorioModal(null)}
                className="px-4 py-2 text-[12px] font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded-none transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleAvancarParaCriacao(iniciarRelatorioModal.id)}
                className="flex items-center gap-1.5 bg-green-700 text-white px-4 py-2 rounded-none text-[12px] font-bold hover:bg-green-800 transition-all cursor-pointer border border-green-800"
              >
                Prosseguir <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DETALHE DO RELATÓRIO SALVO */}
      {relatorioDetalhe && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 transition-opacity" onClick={(e) => { if (e.target === e.currentTarget) setRelatorioDetalhe(null); }}>
          <div className="bg-white shadow-2xl border border-gray-400 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 rounded-none max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-300 bg-gray-50">
              <div>
                <h3 className="font-bold text-[13px] text-gray-800 uppercase tracking-wider">{relatorioDetalhe.cliente.nome_razao_social}</h3>
                <p className="text-[12px] text-gray-500 mt-0.5">Relatório de {relatorioDetalhe.relatorio.mes_referencia}</p>
              </div>
              <button onClick={() => setRelatorioDetalhe(null)} className="text-gray-500 hover:text-red-600 hover:bg-red-50 p-1.5 transition-colors cursor-pointer border border-transparent hover:border-red-200 rounded-none">
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white border border-gray-300 p-3">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Geração Atual</span>
                  <p className="text-[13px] font-bold text-gray-800">{relatorioDetalhe.relatorio.geracao_atual || 0} kWh</p>
                </div>
                <div className="bg-white border border-gray-300 p-3">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Geração Anterior</span>
                  <p className="text-[13px] font-bold text-gray-800">{relatorioDetalhe.relatorio.geracao_anterior || 0} kWh</p>
                </div>
              </div>

              {relatorioDetalhe.relatorio.parecer_tecnico && (
                <div>
                  <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Parecer Técnico</span>
                  <div className="text-[12px] text-gray-700 bg-gray-50 p-3 border border-gray-300 whitespace-pre-wrap font-medium">
                    {relatorioDetalhe.relatorio.parecer_tecnico}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-300 bg-gray-50 flex justify-end">
              <button
                onClick={() => baixarPDFRelatorio(relatorioDetalhe.cliente, relatorioDetalhe.relatorio)}
                disabled={gerandoPDF}
                className="flex items-center gap-1.5 bg-green-700 text-white px-4 py-2 rounded-none text-[12px] font-bold hover:bg-green-800 transition-all cursor-pointer disabled:opacity-50 border border-green-800"
              >
                {gerandoPDF ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
                {gerandoPDF ? 'Gerando...' : 'Baixar PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}