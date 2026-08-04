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

  const baixarPDFRelatorio = (cliente, relatorio) => {
    setGerandoPDF(true);
    try {
      gerarPdfRelatorio({
        cliente,
        relatorio,
        unidades: relatorio.faturas_cpfl,
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

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col bg-white border border-gray-300 text-sm">
      <div className="border-b border-gray-300 bg-gray-50 px-3 py-2 flex flex-col gap-2 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center gap-2">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            type="text"
            placeholder="Pesquisar usina/cliente para iniciar o relatório..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full h-8 pl-8 pr-3 bg-white border border-gray-300 text-[13px] focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>
          <div className="flex items-center gap-2">
            <select
              value={quantidadeMeses}
              onChange={(e) => setQuantidadeMeses(Number(e.target.value))}
              className="h-8 bg-white border border-gray-300 px-2 text-[12px] outline-none cursor-pointer"
            >
              <option value={3}>3 meses</option>
              <option value={6}>6 meses</option>
              <option value={12}>12 meses</option>
            </select>
            <button
              onClick={exportarCSV}
              className="h-8 inline-flex items-center justify-center gap-1.5 bg-white border border-gray-300 text-gray-700 px-3 text-[12px] font-medium hover:bg-gray-100 cursor-pointer"
            >
              <Download size={14} /> Exportar Grade
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 border border-gray-300 bg-white text-[12px]">
          <div className="px-3 py-1.5 border-r border-gray-300"><b>{clientes.length}</b> clientes</div>
          <div className="px-3 py-1.5 border-r border-gray-300"><b>{relatorios.length}</b> relatórios salvos</div>
          <div className="px-3 py-1.5 border-r border-gray-300"><b>{mesesColunas.at(-1)?.qtd || 0}</b> no mês atual</div>
          <div className="px-3 py-1.5"><b>{sistemasPercentual(clientes.length, mesesColunas.at(-1)?.qtd || 0)}%</b> cobertura atual</div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center flex-1 text-gray-400 text-sm">
          <Loader2 className="animate-spin mr-2" size={24} /> Carregando histórico...
        </div>
      ) : (
        <div className="flex-1 bg-white overflow-hidden flex flex-col">
          {clientesFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-gray-400 py-16">
              <Search size={40} strokeWidth={1} className="mb-4 text-gray-300" />
              <p className="text-sm">Nenhum cliente encontrado.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <table className="border-collapse min-w-[900px] w-full text-left">
                <thead>
                  <tr>
                    <th className="sticky top-0 left-0 z-30 bg-gray-100 border-b border-r border-gray-300 px-3 py-2 text-[11px] font-bold text-gray-600 uppercase min-w-[280px]">
                      Selecionar Cliente
                    </th>
                    {mesesColunas.map(mes => (
                      <th
                        key={mes.chave}
                        className={`sticky top-0 z-20 border-b border-r border-gray-300 px-2 py-2 text-center min-w-[86px] ${mes.atual ? 'bg-green-50' : 'bg-gray-100'}`}
                      >
                        <div className={`text-[12px] font-bold ${mes.atual ? 'text-green-700' : 'text-gray-700'}`}>{mes.curto}</div>
                        <div className="text-[11px] font-semibold text-gray-500">{mes.qtd}/{clientes.length}</div>
                      </th>
                    ))}
                    <th className="sticky top-0 right-0 z-30 bg-gray-100 border-b border-l border-gray-300 px-3 py-2 text-center text-[11px] font-bold text-gray-600 uppercase min-w-[110px]">
                      Progresso
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {clientesFiltrados.map(cliente => {
                    const relCliente = mesesColunas.filter(m => buscarRelatorio(cliente.id, m.label)).length;

                    return (
                      <tr key={cliente.id} className="odd:bg-white even:bg-gray-50 hover:bg-green-50/40 group">
                        <td
                          onClick={() => setIniciarRelatorioModal(cliente)}
                          className="sticky left-0 z-10 bg-inherit border-b border-r border-gray-200 px-3 py-2 cursor-pointer"
                          title="Clique para iniciar o relatório deste cliente"
                        >
                          <div className="font-semibold text-[13px] text-gray-800 truncate max-w-[280px]">
                            {cliente.nome_razao_social}
                          </div>
                          <div className={`inline-flex items-center mt-1 px-1.5 py-0.5 text-[10px] font-bold uppercase border ${cliente.status === 'Inativo' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                            {cliente.status || 'Ativo'}
                          </div>
                        </td>

                        {mesesColunas.map(mes => {
                          const rel = buscarRelatorio(cliente.id, mes.label);
                          return (
                            <td key={mes.chave} className={`px-2 py-1.5 text-center border-b border-r border-gray-200 ${mes.atual ? 'bg-green-50/30' : ''}`}>
                              {rel ? (
                                <button
                                  onClick={() => setRelatorioDetalhe({ cliente, relatorio: rel })}
                                  className="w-full h-7 flex items-center justify-center gap-1 bg-green-50 hover:bg-green-100 border border-green-300 text-green-700 px-2 cursor-pointer"
                                  title="Visualizar relatório gerado"
                                >
                                  <CheckCircle2 size={14} strokeWidth={2.4} />
                                  <span className="text-[11px] font-bold">Ver</span>
                                </button>
                              ) : (
                                <div className="w-full h-7 flex items-center justify-center text-gray-300" title="Pendente">
                                  <Minus size={16} strokeWidth={2} />
                                </div>
                              )}
                            </td>
                          );
                        })}

                        <td className="sticky right-0 z-10 bg-inherit border-b border-l border-gray-200 px-3 py-2 text-center">
                          <div className="text-[12px] font-bold text-gray-700">{relCliente}/{mesesColunas.length}</div>
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

      <div className="flex items-center gap-6 px-3 py-2 border-t border-gray-300 bg-gray-50 shrink-0 text-xs text-gray-500 font-medium">
        <div className="flex items-center gap-2"><span className="w-4 h-4 bg-green-50 border border-green-300 inline-flex items-center justify-center"><CheckCircle2 size={10} className="text-green-600" /></span> Relatório pronto</div>
        <div className="flex items-center gap-2"><Minus size={14} className="text-gray-300" /> Pendente</div>
        <div className="flex items-center gap-2"><span className="w-4 h-4 bg-green-50 border border-green-300 inline-block" /> Mês atual</div>
      </div>

      {iniciarRelatorioModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity" onClick={(e) => { if (e.target === e.currentTarget) setIniciarRelatorioModal(null); }}>
          <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50 shrink-0">
              <div>
                <h3 className="font-semibold text-lg text-gray-800 leading-tight">Iniciar Relatório</h3>
                <p className="text-sm font-medium text-gray-500 mt-1">{iniciarRelatorioModal.nome_razao_social}</p>
              </div>
              <button onClick={() => setIniciarRelatorioModal(null)} className="text-gray-400 hover:text-gray-700 bg-white hover:bg-gray-100 p-2 rounded-full transition-colors cursor-pointer shadow-sm border border-gray-200/60">
                <X size={20} strokeWidth={2} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
                <div>
                  <span className="block text-xs font-bold text-blue-500 uppercase tracking-wider mb-1.5">Plataforma</span>
                  <p className="text-sm font-bold text-gray-800">{iniciarRelatorioModal.plataforma_inversor || 'Não informada'}</p>
                </div>
                {iniciarRelatorioModal.plataforma_inversor && plataformas.find(p => p.nome === iniciarRelatorioModal.plataforma_inversor)?.link && (
                  <a
                    href={plataformas.find(p => p.nome === iniciarRelatorioModal.plataforma_inversor).link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
                  >
                    <ExternalLink size={14} /> Abrir
                  </a>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)]">
                  <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Login App</span>
                  <CopyButton text={iniciarRelatorioModal.login_app} />
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)]">
                  <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Senha App</span>
                  <CopyButton text={iniciarRelatorioModal.senha_app} />
                </div>
              </div>

              {iniciarRelatorioModal.observacoes_internas && (
                <div className="mt-2 text-sm text-yellow-800 bg-yellow-50/80 p-4 rounded-xl border border-yellow-200/60 whitespace-pre-wrap">
                  <div className="flex items-center gap-1.5 mb-1.5 font-bold text-yellow-700 text-xs uppercase">
                    <AlertCircle size={14} /> Avisos / Observações
                  </div>
                  {iniciarRelatorioModal.observacoes_internas}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setIniciarRelatorioModal(null)}
                className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleAvancarParaCriacao(iniciarRelatorioModal.id)}
                className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 transition-all shadow-sm cursor-pointer"
              >
                Prosseguir <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {relatorioDetalhe && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity" onClick={(e) => { if (e.target === e.currentTarget) setRelatorioDetalhe(null); }}>
          <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50 shrink-0">
              <div>
                <h3 className="font-semibold text-lg text-gray-800 leading-tight">{relatorioDetalhe.cliente.nome_razao_social}</h3>
                <p className="text-sm text-gray-500 mt-1">Relatório de {relatorioDetalhe.relatorio.mes_referencia}</p>
              </div>
              <button onClick={() => setRelatorioDetalhe(null)} className="text-gray-400 hover:text-gray-700 bg-white hover:bg-gray-100 p-2 rounded-full transition-colors cursor-pointer shadow-sm border border-gray-200/60">
                <X size={20} strokeWidth={2} />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Geração Atual</span>
                  <p className="text-base font-bold text-gray-800">{relatorioDetalhe.relatorio.geracao_atual || 0} kWh</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Geração Anterior</span>
                  <p className="text-base font-bold text-gray-800">{relatorioDetalhe.relatorio.geracao_anterior || 0} kWh</p>
                </div>
              </div>

              {relatorioDetalhe.relatorio.parecer_tecnico && (
                <div>
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Parecer Técnico</span>
                  <div className="text-sm text-gray-600 bg-gray-50/50 p-4 rounded-xl border border-gray-100 whitespace-pre-wrap">
                    {relatorioDetalhe.relatorio.parecer_tecnico}
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end shrink-0">
              <button
                onClick={() => baixarPDFRelatorio(relatorioDetalhe.cliente, relatorioDetalhe.relatorio)}
                disabled={gerandoPDF}
                className="flex items-center gap-2 bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-800 transition-all shadow-sm cursor-pointer disabled:opacity-60"
              >
                {gerandoPDF ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                {gerandoPDF ? 'Gerando...' : 'Baixar PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
