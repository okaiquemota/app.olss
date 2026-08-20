import { useState, useEffect } from 'react';
import {
  FileText, Zap, PenTool, Calculator,
  Search, Plus, Loader2, TrendingUp, TrendingDown,
  CheckCircle2, X, MapPin, Key, Lock, Copy
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { gerarPdfRelatorio } from '../lib/relatorioPdf';
import { montarHistoricoGrafico } from '../lib/historicoGrafico';
import { calcularEconomiaAcumuladaAno } from '../lib/economia';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function Relatorios({ clienteInicialId, onClienteInicialConsumido }) {
  const [clientes, setClientes] = useState([]);
  const [relatorios, setRelatorios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [quantidadeMeses, setQuantidadeMeses] = useState(6);

  const [mesResumo, setMesResumo] = useState('');

  const [modalAberto, setModalAberto] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [relatorioEditandoId, setRelatorioEditandoId] = useState(null);
  
  const [mesReferencia, setMesReferencia] = useState('');
  const [geracaoAtual, setGeracaoAtual] = useState('');
  const [geracaoAnterior, setGeracaoAnterior] = useState(0);

  const [unidades, setUnidades] = useState([]);
  const [parecerTecnico, setParecerTecnico] = useState('');
  const [statusRelatorio, setStatusRelatorio] = useState('Pronto para Envio');
  
  const [loadingForm, setLoadingForm] = useState(false);

  const parseNum = (val) => {
    if (!val) return 0;
    const normalized = String(val).replace(',', '.');
    return parseFloat(normalized) || 0;
  };

  const fetchData = async () => {
    setLoading(true);
    const resClientes = await supabase.from('clientes').select('*').order('nome_razao_social');
    const resRelatorios = await supabase.from('relatorios').select('*').order('created_at', { ascending: false });

    if (resClientes.data) setClientes(resClientes.data);
    if (resRelatorios.data) setRelatorios(resRelatorios.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const abrirModal = async (cliente, mesLabel, relatorioExistente = null) => {
    setClienteSelecionado(cliente);
    setMesReferencia(mesLabel);
    setModalAberto(true);

    if (relatorioExistente) {
      setRelatorioEditandoId(relatorioExistente.id);
      setGeracaoAtual(relatorioExistente.geracao_atual || '');
      setGeracaoAnterior(relatorioExistente.geracao_anterior || 0);
      setParecerTecnico(relatorioExistente.parecer_tecnico || '');
      
      const extras = relatorioExistente.faturas_cpfl || {};
      setStatusRelatorio(extras.status_relatorio || 'Pronto para Envio');
      setUnidades(extras.ucs || []);
    } else {
      setRelatorioEditandoId(null);
      setGeracaoAtual('');
      setParecerTecnico('');
      setStatusRelatorio('Rascunho'); 

      const { data: relAnteriorData } = await supabase
        .from('relatorios')
        .select('geracao_atual')
        .eq('cliente_id', cliente.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const genAnt = relAnteriorData && relAnteriorData.length > 0 ? (relAnteriorData[0].geracao_atual || 0) : 0;
      setGeracaoAnterior(genAnt);

      if (cliente.ucs && cliente.ucs.length > 0) {
        setUnidades(cliente.ucs.map(uc => ({
          ...uc, precoKwh: '', tarifaConta: '', valorConta: '', energiaInjetada: '', consumoConta: '', energiaAtiva: ''
        })));
      } else {
        setUnidades([]);
      }
    }
  };

  const copiarTexto = (texto) => {
    if (texto) navigator.clipboard.writeText(texto);
  };

  const hoje = new Date();
  const mesesColunas = Array.from({ length: quantidadeMeses })
    .map((_, i) => {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const idx = d.getMonth();
      const ano = d.getFullYear();
      const label = `${MESES[idx]}/${ano}`;
      return { idx, ano, chave: ano * 100 + idx, label, curto: `${MESES[idx]}/${String(ano).slice(-2)}`, atual: i === 0 };
    }).reverse().map(mes => ({
      ...mes, qtd: relatorios.filter(r => r.mes_referencia === mes.label).length,
    }));

  const clientesFiltrados = clientes.filter(c => c.nome_razao_social?.toLowerCase().includes(busca.toLowerCase()));
  const buscarRelatorio = (clienteId, mesLabel) => relatorios.find(r => r.cliente_id === clienteId && r.mes_referencia === mesLabel);

  // Abre o modal automaticamente quando chega um cliente vindo do Histórico ("Prosseguir")
  useEffect(() => {
    if (!clienteInicialId || clientes.length === 0) return;
    const cliente = clientes.find(c => c.id === clienteInicialId);
    if (cliente) {
      const mesLabel = mesesColunas.at(-1)?.label || '';
      abrirModal(cliente, mesLabel, buscarRelatorio(cliente.id, mesLabel));
    }
    onClienteInicialConsumido?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteInicialId, clientes]);

  const handleUnidadeChange = (id, campo, valor) => {
    setUnidades(unidades.map(u => u.id === id ? { ...u, [campo]: valor } : u));
  };

  const geracaoAtualNum = parseNum(geracaoAtual);
  const geracaoAnteriorNum = parseNum(geracaoAnterior);
  const diferencaGeracao = geracaoAtualNum - geracaoAnteriorNum;

  const qtdGeradoras = unidades.filter(u => u.tipo === 'Geradora').length || 1;
  const geracaoRateada = geracaoAnteriorNum / qtdGeradoras;

  const calcularLinhaUC = (unidade) => {
    const preco = parseNum(unidade.precoKwh);
    const tarifa = parseNum(unidade.tarifaConta);
    const valorComSistema = parseNum(unidade.valorConta);
    let consumoTotalUC; let autoconsumo = 0;

    if (unidade.tipo === 'Geradora') {
      const injetada = parseNum(unidade.energiaInjetada);
      const consumoDaConta = parseNum(unidade.consumoConta);
      autoconsumo = Math.max(0, geracaoRateada - injetada);
      consumoTotalUC = autoconsumo + consumoDaConta;
    } else {
      consumoTotalUC = parseNum(unidade.energiaAtiva);
    }
    const valorSemSistema = (consumoTotalUC * preco) + tarifa;
    const economia = valorSemSistema - valorComSistema;
    return { consumoTotalUC, autoconsumo, valorSemSistema, economia };
  };

  const economiaTotal = unidades.reduce((acc, unidade) => acc + calcularLinhaUC(unidade).economia, 0);

  const handleSalvar = async (gerarPdf = true) => {
    if (!mesReferencia) return alert('Informe o mês de referência.');

    setLoadingForm(true);
    try {
      const unidadesComResultado = unidades.map(u => ({ ...u, ...calcularLinhaUC(u) }));
      const statusFinal = gerarPdf ? statusRelatorio : 'Rascunho';

      const payload = {
        cliente_id: clienteSelecionado.id,
        mes_referencia: mesReferencia,
        geracao_atual: geracaoAtualNum,
        geracao_anterior: geracaoAnteriorNum,
        parecer_tecnico: parecerTecnico,
        faturas_cpfl: {
          status_relatorio: statusFinal,
          ucs: unidadesComResultado
        }
      };

      if (relatorioEditandoId) {
        const { error } = await supabase.from('relatorios').update(payload).eq('id', relatorioEditandoId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('relatorios').insert([payload]);
        if (error) throw error;
      }

      if (gerarPdf) {
        const relatoriosOutros = relatorios.filter(r => r.id !== relatorioEditandoId);
        const relatorioAtualParaCalculo = { mes_referencia: mesReferencia, faturas_cpfl: { ucs: unidadesComResultado } };

        const historicoGraficoLimpo = montarHistoricoGrafico(
          relatoriosOutros,
          clienteSelecionado.id,
          { mes_referencia: mesReferencia, geracao_atual: geracaoAtualNum }
        );

        const economiaAcumuladaAno = calcularEconomiaAcumuladaAno(
          relatoriosOutros,
          clienteSelecionado.id,
          mesReferencia,
          relatorioAtualParaCalculo
        );

        await gerarPdfRelatorio({
          cliente: clienteSelecionado,
          relatorio: payload,
          unidades: unidadesComResultado,
          economiaTotal,
          historicoGrafico: historicoGraficoLimpo,
          economiaAcumuladaAno
        });
      }

      fetchData();
      setModalAberto(false);

    } catch (err) {
      alert("Erro ao salvar relatório: " + err.message);
    } finally {
      setLoadingForm(false);
    }
  };

  // ==========================================
  // NOVOS ESTILOS DE DESTAQUE PARA O MODAL
  // ==========================================
  const inputClass = "w-full bg-slate-50 border border-slate-300 px-3 py-2 text-[12px] text-gray-800 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white transition-all rounded-none placeholder:text-gray-400";
  const labelClass = "block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider";
  
  // Cabeçalho dos cards agora usa o Verde Escuro da OLSS para dar muito contraste
  const cardHeaderClass = "px-4 py-2.5 border-b border-emerald-950 bg-[#064E3B] flex items-center justify-between";
  const cardTitleClass = "text-[11px] font-bold text-emerald-50 uppercase tracking-wider flex items-center gap-2";

  const mesAtualLabel = mesesColunas.at(-1)?.label || '';
  const mesSelecionadoResumo = mesResumo || mesAtualLabel;

  const relatoriosDoMesSelecionado = relatorios.filter(r => r.mes_referencia === mesSelecionadoResumo);
  const qtdProntos = relatoriosDoMesSelecionado.filter(r => r.faturas_cpfl?.status_relatorio !== 'Rascunho').length;
  const qtdRascunhos = relatoriosDoMesSelecionado.filter(r => r.faturas_cpfl?.status_relatorio === 'Rascunho').length;
  const qtdAFazer = clientes.length - (qtdProntos + qtdRascunhos);

  return (
    <div className="w-full h-full flex flex-col relative text-sm">
      <div className="flex flex-col h-full bg-white border border-gray-300 animate-in fade-in duration-300 antialiased">
        
        {/* CABEÇALHO DA TELA */}
        <div className="flex flex-col lg:flex-row items-center gap-2 p-3 md:p-4 border-b border-gray-300 shrink-0 w-full bg-white">
          <div className="relative flex-1 w-full lg:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" placeholder="Pesquisar usina/cliente na grade..." value={busca} onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-none text-[13px] font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 transition-all placeholder:text-gray-400"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto shrink-0 justify-end">
            <select value={quantidadeMeses} onChange={(e) => setQuantidadeMeses(Number(e.target.value))} className="bg-white border border-gray-300 px-3 py-2 text-[12px] text-gray-700 outline-none focus:ring-1 focus:ring-green-500 font-medium rounded-none cursor-pointer">
              <option value={3}>3 meses</option>
              <option value={6}>6 meses</option>
              <option value={12}>12 meses</option>
            </select>
          </div>
        </div>

        {/* BARRA DE RESUMO INTELIGENTE */}
        <div className="flex flex-wrap border-b border-gray-300 bg-white shrink-0 text-[12px] divide-x divide-gray-300">
          <div className="px-4 py-2 flex items-center gap-2 bg-gray-50">
            <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">Mês Ref:</span>
            <select
              value={mesSelecionadoResumo}
              onChange={(e) => setMesResumo(e.target.value)}
              className="bg-white border border-gray-300 px-3 py-1.5 text-[12px] font-bold text-gray-800 outline-none focus:ring-1 focus:ring-green-500 rounded-none cursor-pointer"
            >
              {[...mesesColunas].reverse().map(m => (
                <option key={m.chave} value={m.label}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="px-4 py-2 text-gray-800 flex items-center justify-center grow">
            <div><span className="font-extrabold text-[14px]">{clientes.length}</span> <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 ml-1">Clientes</span></div>
          </div>
          <div className="px-4 py-2 text-green-700 flex items-center justify-center grow bg-green-50/40">
            <div><span className="font-extrabold text-[14px]">{qtdProntos}</span> <span className="text-[10px] font-bold uppercase tracking-wider text-green-600 ml-1">Prontos</span></div>
          </div>
          <div className="px-4 py-2 text-amber-600 flex items-center justify-center grow bg-amber-50/40">
            <div><span className="font-extrabold text-[14px]">{qtdRascunhos}</span> <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 ml-1">Rascunhos</span></div>
          </div>
          <div className="px-4 py-2 text-gray-500 flex items-center justify-center grow bg-gray-50/60">
            <div><span className="font-extrabold text-[14px]">{qtdAFazer}</span> <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">A Fazer</span></div>
          </div>
        </div>

        {/* TABELA DE HISTÓRICO */}
        <div className="flex-1 bg-white overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex justify-center items-center flex-1 text-gray-400 text-[13px]"><Loader2 className="animate-spin mr-2" size={18} /> Carregando base...</div>
          ) : (
            <div className="flex-1 overflow-auto">
              <table className="border-collapse min-w-[900px] w-full text-left whitespace-nowrap">
                <thead className="bg-gray-100 sticky top-0 z-30 border-b border-gray-300">
                  <tr className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                    <th className="sticky left-0 z-40 bg-gray-100 border-r border-gray-300 px-4 py-3 min-w-[285px]">Cliente / Usina</th>
                    {mesesColunas.map(mes => (
                      <th key={mes.chave} className={`border-r border-gray-300 px-2 py-3 text-center min-w-[90px] ${mes.atual ? 'bg-green-50/60' : ''}`}>
                        <div className={`text-[12px] font-bold ${mes.atual ? 'text-green-800' : 'text-gray-700'}`}>{mes.curto}</div>
                        <div className="text-[10px] font-semibold text-gray-500">{mes.qtd}/{clientes.length}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {clientesFiltrados.map(cliente => (
                    <tr key={cliente.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="sticky left-0 z-20 bg-white border-r border-gray-200 px-4 py-2">
                        <div className="font-semibold text-[12px] text-gray-800 truncate max-w-[270px]">{cliente.nome_razao_social}</div>
                        <span className="text-[11px] text-gray-500">{cliente.plataforma_inversor || '--'}</span>
                      </td>
                      
                      {mesesColunas.map(mes => {
                        const rel = buscarRelatorio(cliente.id, mes.label);
                        const isRascunho = rel?.faturas_cpfl?.status_relatorio === 'Rascunho';
                        
                        return (
                          <td 
                            key={mes.chave} 
                            onClick={() => abrirModal(cliente, mes.label, rel)}
                            className={`px-2 py-1.5 text-center border-r border-gray-200 cursor-pointer transition-colors ${
                              rel ? (isRascunho ? 'bg-amber-50 hover:bg-amber-100' : 'bg-green-50/30 hover:bg-green-100/60') 
                              : (mes.atual ? 'bg-gray-50 hover:bg-gray-100' : 'hover:bg-gray-100')
                            }`}
                          >
                            {rel ? (
                              isRascunho ? (
                                <div className="flex flex-col items-center justify-center gap-0.5">
                                  <PenTool size={15} strokeWidth={2.5} className="text-amber-500" />
                                  <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">Rascunho</span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center gap-0.5">
                                  <CheckCircle2 size={15} strokeWidth={2.5} className="text-green-600" />
                                  <span className="text-[9px] font-bold text-green-700 uppercase tracking-wider">Gerado</span>
                                </div>
                              )
                            ) : (
                              <div className="flex flex-col items-center justify-center gap-0.5 opacity-40 hover:opacity-100 transition-opacity">
                                <Plus size={15} strokeWidth={2.5} className="text-gray-500" />
                                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Criar</span>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* LEGENDA */}
        <div className="flex items-center gap-6 px-4 py-2 border-t border-gray-300 bg-white shrink-0 text-[11px] text-gray-600 font-medium">
          <div className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-green-700" /> Gerado</div>
          <div className="flex items-center gap-1.5"><PenTool size={13} className="text-amber-500" /> Rascunho (Salvo)</div>
          <div className="flex items-center gap-1.5"><Plus size={14} className="text-gray-400" /> Vazio</div>
        </div>
      </div>

      {/* MODAL DE GERAÇÃO E EDIÇÃO */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 transition-opacity overflow-y-auto" onClick={(e) => { if (e.target === e.currentTarget) setModalAberto(false); }}>
          <div className="bg-white shadow-2xl border border-gray-400 w-full max-w-5xl overflow-hidden animate-in zoom-in-95 duration-200 rounded-none max-h-[90vh] flex flex-col my-auto">
            
            {/* TOPO DO MODAL (MANTÉM CLARO E LIMPO) */}
            <div className="flex justify-between items-center p-4 border-b border-gray-300 bg-white shrink-0 z-10">
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="font-bold text-[14px] text-gray-800 uppercase tracking-wider">
                    {relatorioEditandoId ? 'Editando Relatório' : 'Novo Relatório de Geração'}
                  </h3>
                  <p className="text-gray-500 text-[11px] font-bold mt-0.5">{clienteSelecionado?.nome_razao_social}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1 rounded-none flex items-center gap-2">
                  <Calculator size={14} className="text-emerald-600" />
                  <span className="text-[12px] font-extrabold">Econ: R$ {economiaTotal.toFixed(2).replace('.', ',')}</span>
                </div>
                <button onClick={() => setModalAberto(false)} className="text-gray-500 hover:text-red-600 hover:bg-red-50 p-1.5 transition-colors cursor-pointer border border-transparent hover:border-red-200 rounded-none">
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* CORPO DO FORMULÁRIO (FUNDO ESCURECIDO PRA DESTACAR OS CARDS) */}
            <div className="p-5 space-y-5 overflow-y-auto flex-1 bg-slate-100 shadow-inner">
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                
                {/* ETAPA 1 */}
                <div className="bg-white border border-slate-300 shadow-sm lg:col-span-2">
                  <div className={cardHeaderClass}>
                    <h3 className={cardTitleClass}><FileText size={14} className="text-emerald-400" /> 1. Dados de Identificação</h3>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Cliente / Usina</label>
                      <input type="text" disabled value={clienteSelecionado?.nome_razao_social || ''} className="w-full bg-slate-200 border border-slate-300 px-3 py-2 text-[12px] text-slate-700 font-bold rounded-none" />
                    </div>
                    <div>
                      <label className={labelClass}><MapPin size={11} className="inline"/> Endereço</label>
                      <input type="text" disabled value={clienteSelecionado?.endereco || 'Não cadastrado'} className="w-full bg-slate-200 border border-slate-300 px-3 py-2 text-[12px] text-slate-700 font-bold rounded-none truncate" />
                    </div>
                    <div>
                      <label className={labelClass}>Mês de Referência</label>
                      <input type="text" disabled value={mesReferencia} className="w-full bg-slate-200 border border-slate-300 px-3 py-2 text-[12px] text-slate-700 font-bold rounded-none" />
                    </div>
                  </div>
                </div>

                {/* CARD DE CREDENCIAIS (DARK MODE NATURAL) */}
                <div className="bg-[#1e293b] border border-[#0f172a] shadow-md lg:col-span-1 flex flex-col rounded-none">
                  <div className="px-3 py-2.5 border-b border-gray-700/50 bg-[#0f172a]/60 flex items-center gap-2">
                    <Key size={13} className="text-amber-400" />
                    <h3 className="text-[11px] font-bold text-amber-50 uppercase tracking-wider">Credenciais de Acesso</h3>
                  </div>
                  <div className="p-4 flex flex-col gap-4 text-[12px]">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1"><Lock size={10}/> Plataforma: {clienteSelecionado?.plataforma_inversor || 'N/A'}</span>
                      <div className="flex gap-2">
                        <button onClick={() => copiarTexto(clienteSelecionado?.login_app)} className="flex-1 bg-[#0f172a] text-slate-300 border border-slate-700 px-2 py-1.5 hover:text-white hover:border-slate-500 transition-all flex items-center justify-between group cursor-pointer" title="Copiar Login App">
                          <span className="truncate max-w-[80px] text-[11px]">{clienteSelecionado?.login_app || 'S/ Login'}</span><Copy size={11} className="opacity-40 group-hover:opacity-100"/>
                        </button>
                        <button onClick={() => copiarTexto(clienteSelecionado?.senha_app)} className="flex-1 bg-[#0f172a] text-slate-300 border border-slate-700 px-2 py-1.5 hover:text-white hover:border-slate-500 transition-all flex items-center justify-between group cursor-pointer" title="Copiar Senha App">
                          <span className="truncate max-w-[80px] text-[11px]">{clienteSelecionado?.senha_app ? '******' : 'S/ Senha'}</span><Copy size={11} className="opacity-40 group-hover:opacity-100"/>
                        </button>
                      </div>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1"><Zap size={10}/> CPFL Paulista</span>
                      <div className="flex gap-2">
                        <button onClick={() => copiarTexto(clienteSelecionado?.login_cpfl)} className="flex-1 bg-[#0f172a] text-slate-300 border border-slate-700 px-2 py-1.5 hover:text-white hover:border-slate-500 transition-all flex items-center justify-between group cursor-pointer" title="Copiar Login CPFL">
                          <span className="truncate max-w-[80px] text-[11px]">{clienteSelecionado?.login_cpfl || 'S/ Login'}</span><Copy size={11} className="opacity-40 group-hover:opacity-100"/>
                        </button>
                        <button onClick={() => copiarTexto(clienteSelecionado?.senha_cpfl)} className="flex-1 bg-[#0f172a] text-slate-300 border border-slate-700 px-2 py-1.5 hover:text-white hover:border-slate-500 transition-all flex items-center justify-between group cursor-pointer" title="Copiar Senha CPFL">
                          <span className="truncate max-w-[80px] text-[11px]">{clienteSelecionado?.senha_cpfl ? '******' : 'S/ Senha'}</span><Copy size={11} className="opacity-40 group-hover:opacity-100"/>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* ETAPA 2 */}
              <div className="bg-white border border-slate-300 shadow-sm">
                <div className={cardHeaderClass}>
                  <h3 className={cardTitleClass}><Zap size={14} className="text-emerald-400" /> 2. Leitura do Inversor</h3>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <div>
                    <label className={labelClass}>Geração Atual (kWh)</label>
                    <div className="relative">
                      <input type="text" value={geracaoAtual} onChange={(e) => setGeracaoAtual(e.target.value)} placeholder="0.00" className={inputClass} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-gray-400">kWh</span>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Geração Mês Anterior (Banco)</label>
                    <div className="relative">
                      <input type="text" value={geracaoAnterior} disabled readOnly placeholder="0.00" className={`${inputClass} !bg-slate-100 !cursor-not-allowed !text-slate-500`} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-gray-400">kWh</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3 flex flex-col justify-center rounded-none mt-5">
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Comparativo</span>
                    <span className={`text-[13px] font-extrabold flex items-center gap-1 mt-0.5 ${diferencaGeracao >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {diferencaGeracao >= 0 ? <TrendingUp size={15}/> : <TrendingDown size={15}/>} {Math.abs(diferencaGeracao).toFixed(0)} kWh ({diferencaGeracao >= 0 ? 'Ganho' : 'Perda'})
                    </span>
                  </div>
                </div>
              </div>

              {/* ETAPA 3 */}
              {unidades.length > 0 && (
                <div className="bg-white border border-slate-300 shadow-sm">
                  <div className={cardHeaderClass}>
                    <h3 className={cardTitleClass}><Calculator size={14} className="text-emerald-400" /> 3. Faturas da CPFL</h3>
                  </div>
                  <div className="p-4 space-y-4">
                    {unidades.map((unidade) => {
                      const ehGeradora = unidade.tipo === 'Geradora';
                      const res = calcularLinhaUC(unidade);
                      
                      return (
                        <div key={unidade.id} className="bg-slate-50 p-4 border border-slate-200 rounded-none relative">
                          <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-200">
                            <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border rounded-none ${ehGeradora ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-blue-100 text-blue-800 border-blue-300'}`}>
                              {unidade.tipo} - UC: {unidade.numero_uc}
                            </span>
                            <div className="flex items-center gap-3">
                              <div className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-1 shadow-sm">Consumo Total: <span className="text-slate-800">{res.consumoTotalUC.toFixed(0)} kWh</span></div>
                              {ehGeradora && <div className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-1 shadow-sm">Autoconsumo: <span className="text-slate-800">{res.autoconsumo.toFixed(0)} kWh</span></div>}
                              <div className="text-[11px] font-extrabold bg-white border border-slate-200 px-2 py-1 shadow-sm">Econ: <span className={res.economia >= 0 ? 'text-emerald-700' : 'text-red-600'}>R$ {res.economia.toFixed(2).replace('.', ',')}</span></div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                            <div><label className={labelClass}>Preço do kWh (R$)</label><input type="text" value={unidade.precoKwh} onChange={(e) => handleUnidadeChange(unidade.id, 'precoKwh', e.target.value)} placeholder="0.00" className={inputClass} /></div>
                            <div><label className={labelClass}>Tarifa Fixa / Mínima (R$)</label><input type="text" value={unidade.tarifaConta} onChange={(e) => handleUnidadeChange(unidade.id, 'tarifaConta', e.target.value)} placeholder="0.00" className={inputClass} /></div>
                            <div><label className={labelClass}>Valor Fatura c/ Sistema (R$)</label><input type="text" value={unidade.valorConta} onChange={(e) => handleUnidadeChange(unidade.id, 'valorConta', e.target.value)} placeholder="0.00" className={inputClass} /></div>
                          </div>

                          {ehGeradora ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-emerald-50/50 border border-emerald-200 shadow-inner">
                              <div><label className="block text-[10px] font-bold text-emerald-800 mb-1.5 uppercase tracking-wider">Energia Injetada (kWh)</label><input type="text" value={unidade.energiaInjetada} onChange={(e) => handleUnidadeChange(unidade.id, 'energiaInjetada', e.target.value)} placeholder="Ex: 1200" className={inputClass} /></div>
                              <div><label className="block text-[10px] font-bold text-emerald-800 mb-1.5 uppercase tracking-wider">Consumo Conta Geradora (kWh)</label><input type="text" value={unidade.consumoConta} onChange={(e) => handleUnidadeChange(unidade.id, 'consumoConta', e.target.value)} placeholder="Ex: 150" className={inputClass} /></div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 p-3 bg-blue-50/30 border border-blue-200 shadow-inner">
                              <div><label className="block text-[10px] font-bold text-blue-800 mb-1.5 uppercase tracking-wider">Energia Ativa / Consumo Total (kWh)</label><input type="text" value={unidade.energiaAtiva} onChange={(e) => handleUnidadeChange(unidade.id, 'energiaAtiva', e.target.value)} placeholder="Ex: 350" className={inputClass} /></div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ETAPA 4 */}
              <div className="bg-white border border-slate-300 shadow-sm">
                <div className={cardHeaderClass}>
                  <h3 className={cardTitleClass}><PenTool size={14} className="text-emerald-400" /> 4. Resolução Final</h3>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <label className={labelClass}>Parecer Técnico (Vai pro PDF)</label>
                    <textarea rows="3" value={parecerTecnico} onChange={(e) => setParecerTecnico(e.target.value)} placeholder="Ex: Faltou x kWh para pagar taxa mínima..." className="w-full bg-slate-50 border border-slate-300 p-3 text-[12px] focus:ring-1 focus:ring-emerald-600 focus:bg-white outline-none resize-none rounded-none font-medium text-gray-800"></textarea>
                  </div>
                  <div className="w-full md:w-1/3">
                    <label className={labelClass}>Status do Relatório</label>
                    <select value={statusRelatorio} onChange={(e) => setStatusRelatorio(e.target.value)} className="w-full bg-slate-50 border border-slate-300 px-3 py-2 text-[12px] text-gray-800 outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white font-bold rounded-none cursor-pointer">
                      <option value="Rascunho">Rascunho</option>
                      <option value="Pronto para Envio">Pronto para Envio</option>
                      <option value="Enviado">Enviado</option>
                    </select>
                  </div>
                </div>
              </div>

            </div>

            {/* RODAPÉ: CANCELAR | SALVAR RASCUNHO | GERAR PDF */}
            <div className="p-4 border-t border-gray-300 bg-white flex justify-end gap-3 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
              <button onClick={() => setModalAberto(false)} className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 text-[12px] font-bold hover:bg-gray-100 rounded-none cursor-pointer transition-colors">
                Cancelar
              </button>
              
              <button 
                onClick={() => handleSalvar(false)} 
                disabled={loadingForm} 
                className="flex items-center gap-1.5 px-5 py-2.5 bg-amber-50 text-amber-700 border border-amber-300 text-[12px] font-bold hover:bg-amber-100 rounded-none cursor-pointer transition-colors disabled:opacity-50"
              >
                {loadingForm ? <Loader2 size={14} className="animate-spin" /> : <PenTool size={14} />} 
                Salvar Rascunho
              </button>

              <button 
                onClick={() => handleSalvar(true)} 
                disabled={loadingForm} 
                className="flex items-center gap-2 bg-[#064E3B] text-white px-6 py-2.5 rounded-none text-[12px] font-bold hover:bg-emerald-900 transition-all cursor-pointer border border-[#064E3B] disabled:opacity-50 shadow-sm"
              >
                {loadingForm ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} strokeWidth={2} />} 
                {loadingForm ? 'Processando...' : (relatorioEditandoId ? 'Atualizar e Gerar PDF' : 'Salvar e Gerar PDF')}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}