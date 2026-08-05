import { useState, useEffect } from 'react';
import { 
  FileText, Zap, PenTool, Calculator, ArrowRight, 
  ArrowLeft, Search, Plus, Loader2, Calendar, TrendingUp, TrendingDown,
  CheckCircle2, Minus, X, MapPin
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { gerarPdfRelatorio } from '../lib/relatorioPdf';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function Relatorios({ clienteInicialId, onClienteInicialConsumido }) {
  const [clientes, setClientes] = useState([]);
  const [relatorios, setRelatorios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [quantidadeMeses, setQuantidadeMeses] = useState(6);

  const [modalAberto, setModalAberto] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  
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

  const abrirModalCriacao = async (cliente) => {
    setClienteSelecionado(cliente);
    
    const dataAtual = new Date();
    const mesAtualLabel = `${MESES[dataAtual.getMonth()]}/${dataAtual.getFullYear()}`;
    setMesReferencia(mesAtualLabel);
    
    setGeracaoAtual('');
    setParecerTecnico('');
    setStatusRelatorio('Pronto para Envio');

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
        ...uc,
        precoKwh: '',
        tarifaConta: '',
        valorConta: '',
        energiaInjetada: '', 
        consumoConta: '',    
        energiaAtiva: ''     
      })));
    } else {
      setUnidades([]);
    }
    
    setModalAberto(true);
  };

  useEffect(() => {
    if (!clienteInicialId) return;
    const carregarClienteInicial = async () => {
      const { data, error } = await supabase.from('clientes').select('*').eq('id', clienteInicialId).single();
      if (!error && data) abrirModalCriacao(data);
      onClienteInicialConsumido?.();
    };
    carregarClienteInicial();
  }, [clienteInicialId, onClienteInicialConsumido]);

  const hoje = new Date();
  const mesesColunas = Array.from({ length: quantidadeMeses })
    .map((_, i) => {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const idx = d.getMonth();
      const ano = d.getFullYear();
      const label = `${MESES[idx]}/${ano}`;
      return {
        idx, ano, chave: ano * 100 + idx, label, curto: `${MESES[idx]}/${String(ano).slice(-2)}`, atual: i === 0,
      };
    }).reverse().map(mes => ({
      ...mes, qtd: relatorios.filter(r => r.mes_referencia === mes.label).length,
    }));

  const clientesFiltrados = clientes.filter(c => c.nome_razao_social?.toLowerCase().includes(busca.toLowerCase()));
  const buscarRelatorio = (clienteId, mesLabel) => relatorios.find(r => r.cliente_id === clienteId && r.mes_referencia === mesLabel);

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
    let consumoTotalUC = 0; let autoconsumo = 0;

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

  const handleGerarRelatorio = async () => {
    if (!mesReferencia) return alert('Informe o mês de referência.');

    setLoadingForm(true);
    try {
      const unidadesComResultado = unidades.map(u => ({ ...u, ...calcularLinhaUC(u) }));

      const payload = {
        cliente_id: clienteSelecionado.id,
        mes_referencia: mesReferencia,
        geracao_atual: geracaoAtualNum,
        geracao_anterior: geracaoAnteriorNum,
        parecer_tecnico: parecerTecnico,
        faturas_cpfl: {
          status_relatorio: statusRelatorio,
          ucs: unidadesComResultado
        }
      };

      const { error } = await supabase.from('relatorios').insert([payload]);
      if (error) throw error;

      // ==========================================
      // LÓGICA DE HISTÓRICO PARA O GRÁFICO DO PDF
      // ==========================================
      const historicoCliente = relatorios.filter(r => r.cliente_id === clienteSelecionado.id);
      historicoCliente.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      
      // Pega os últimos 5 meses que já estavam no banco
      const ultimosRelatorios = historicoCliente.slice(-5); 
      const historicoGrafico = ultimosRelatorios.map(r => ({
        mes: r.mes_referencia.substring(0, 3), // Pega só "Jan", "Fev" etc
        geracao: r.geracao_atual
      }));
      // Adiciona o mês de agora
      historicoGrafico.push({
        mes: mesReferencia.substring(0, 3),
        geracao: geracaoAtualNum
      });

      // Passa pro criador de PDF
      await gerarPdfRelatorio({
        cliente: clienteSelecionado,
        relatorio: payload,
        unidades: unidadesComResultado,
        economiaTotal,
        historicoGrafico
      });

      fetchData();
      setModalAberto(false);

    } catch (err) {
      alert("Erro ao gerar relatório: " + err.message);
    } finally {
      setLoadingForm(false);
    }
  };

  const inputClass = "w-full bg-white border border-gray-300 px-3 py-2 text-[12px] text-gray-800 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 transition-all rounded-none placeholder:text-gray-400";
  const labelClass = "block text-[11px] font-bold text-gray-600 mb-1.5 uppercase tracking-wider";
  const cardHeaderClass = "px-3 py-2 border-b border-gray-300 bg-gray-100 flex items-center justify-between";
  const cardTitleClass = "text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center gap-2";

  const coberturaAtual = clientes.length > 0 ? Math.round(((mesesColunas.at(-1)?.qtd || 0) / clientes.length) * 100) : 0;

  return (
    <div className="w-full h-full flex flex-col relative text-sm">
      <div className="flex flex-col h-full bg-white border border-gray-300 animate-in fade-in duration-300 antialiased">
        
        {/* CABEÇALHO */}
        <div className="flex flex-col lg:flex-row items-center gap-2 p-3 md:p-4 border-b border-gray-300 shrink-0 w-full bg-white">
          <div className="relative flex-1 w-full lg:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Pesquisar usina/cliente na grade..." 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
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

        {/* RESUMO */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-gray-300 bg-white shrink-0 text-[12px]">
          <div className="px-4 py-2 border-r border-gray-300 text-gray-800"><span className="font-extrabold">{clientes.length}</span> clientes</div>
          <div className="px-4 py-2 border-r border-gray-300 text-gray-800"><span className="font-extrabold">{relatorios.length}</span> relatórios salvos</div>
          <div className="px-4 py-2 border-r border-gray-300 text-green-700"><span className="font-extrabold">{mesesColunas.at(-1)?.qtd || 0}</span> no mês atual</div>
          <div className="px-4 py-2 text-gray-700"><span className="font-extrabold">{coberturaAtual}%</span> cobertura atual</div>
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
                    <th className="sticky right-0 z-40 bg-gray-100 border-l border-gray-300 px-4 py-3 text-center min-w-[100px]">Ação</th>
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
                        return (
                          <td key={mes.chave} className={`px-2 py-1.5 text-center border-r border-gray-200 ${mes.atual ? 'bg-green-50/20' : ''}`}>
                            {rel ? <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 px-2 py-0.5 border border-green-300 rounded-none"><CheckCircle2 size={12} strokeWidth={2.5} /> Gerado</span> : <span className="text-gray-300"><Minus size={14} className="mx-auto" /></span>}
                          </td>
                        );
                      })}
                      <td className="sticky right-0 z-20 bg-white border-l border-gray-200 px-4 py-2 text-center">
                        <button onClick={() => abrirModalCriacao(cliente)} className="inline-flex items-center justify-center gap-1 bg-white border border-gray-300 text-green-700 px-3 py-1 rounded-none text-[11px] font-bold hover:bg-gray-50 transition-all cursor-pointer"><Plus size={13} strokeWidth={2.5} /> Novo</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* LEGENDA */}
        <div className="flex items-center gap-6 px-4 py-2 border-t border-gray-300 bg-white shrink-0 text-[11px] text-gray-600 font-medium">
          <div className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-green-700" /> Relatório gerado</div>
          <div className="flex items-center gap-1.5"><Minus size={14} className="text-gray-400" /> Pendente</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-green-50 border border-green-300 inline-block" /> Mês atual</div>
        </div>
      </div>

      {/* MODAL DE GERAÇÃO */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 transition-opacity overflow-y-auto" onClick={(e) => { if (e.target === e.currentTarget) setModalAberto(false); }}>
          <div className="bg-white shadow-2xl border border-gray-400 w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 rounded-none max-h-[90vh] flex flex-col my-auto">
            
            <div className="flex justify-between items-center p-4 border-b border-gray-300 bg-gray-50 shrink-0">
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="font-bold text-[13px] text-gray-800 uppercase tracking-wider">Gerar Relatório de Geração</h3>
                  <p className="text-gray-500 text-[11px] font-medium mt-0.5">{clienteSelecionado?.nome_razao_social}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-white border border-gray-300 text-green-700 px-3 py-1 rounded-none flex items-center gap-2">
                  <Calculator size={14} className="text-green-600" />
                  <span className="text-[12px] font-extrabold">R$ {economiaTotal.toFixed(2).replace('.', ',')}</span>
                </div>
                <button onClick={() => setModalAberto(false)} className="text-gray-500 hover:text-red-600 hover:bg-red-50 p-1.5 transition-colors cursor-pointer border border-transparent hover:border-red-200 rounded-none">
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1 bg-gray-50/50">
              
              {/* ETAPA 1 */}
              <div className="bg-white border border-gray-300">
                <div className={cardHeaderClass}><h3 className={cardTitleClass}><FileText size={14} className="text-gray-500" /> 1. Dados de Identificação</h3></div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><label className={labelClass}>Cliente / Usina</label><input type="text" disabled value={clienteSelecionado?.nome_razao_social || ''} className="w-full bg-gray-100 border border-gray-300 px-3 py-2 text-[12px] text-gray-600 font-bold rounded-none" /></div>
                  <div><label className={labelClass}><MapPin size={11} className="inline"/> Endereço</label><input type="text" disabled value={clienteSelecionado?.endereco || 'Não cadastrado'} className="w-full bg-gray-100 border border-gray-300 px-3 py-2 text-[12px] text-gray-600 font-bold rounded-none truncate" /></div>
                  <div><label className={labelClass}>Mês de Referência</label><input type="text" value={mesReferencia} onChange={(e) => setMesReferencia(e.target.value)} placeholder="Ex: Maio/2026" className={inputClass} /></div>
                </div>
              </div>

              {/* ETAPA 2 */}
              <div className="bg-white border border-gray-300">
                <div className={cardHeaderClass}><h3 className={cardTitleClass}><Zap size={14} className="text-gray-500" /> 2. Leitura do Inversor</h3></div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <div>
                    <label className={labelClass}>Geração Atual (kWh)</label>
                    <div className="relative"><input type="text" value={geracaoAtual} onChange={(e) => setGeracaoAtual(e.target.value)} placeholder="0.00" className={inputClass} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-gray-400">kWh</span></div>
                  </div>
                  <div>
                    <label className={labelClass}>Geração Mês Anterior (kWh)</label>
                    <div className="relative"><input type="text" value={geracaoAnterior} onChange={(e) => setGeracaoAnterior(e.target.value)} placeholder="0.00" className={inputClass} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-gray-400">kWh</span></div>
                  </div>
                  <div className="bg-gray-50 border border-gray-300 p-3 flex flex-col justify-center rounded-none mt-5">
                    <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Comparativo</span>
                    <span className={`text-[13px] font-extrabold flex items-center gap-1 mt-0.5 ${diferencaGeracao >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {diferencaGeracao >= 0 ? <TrendingUp size={15}/> : <TrendingDown size={15}/>} {Math.abs(diferencaGeracao).toFixed(0)} kWh ({diferencaGeracao >= 0 ? 'Ganho' : 'Perda'})
                    </span>
                  </div>
                </div>
              </div>

              {/* ETAPA 3 */}
              {unidades.length > 0 && (
                <div className="bg-white border border-gray-300">
                  <div className={cardHeaderClass}><h3 className={cardTitleClass}><Calculator size={14} className="text-gray-500" /> 3. Faturas da CPFL</h3></div>
                  <div className="p-4 space-y-3">
                    {unidades.map((unidade) => {
                      const ehGeradora = unidade.tipo === 'Geradora';
                      const res = calcularLinhaUC(unidade);
                      
                      return (
                        <div key={unidade.id} className="bg-gray-50 p-4 border border-gray-300 rounded-none relative">
                          <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200">
                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border rounded-none ${ehGeradora ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                              {unidade.tipo} - UC: {unidade.numero_uc}
                            </span>
                            <div className="flex items-center gap-3">
                              <div className="text-[10px] font-bold text-gray-500 bg-white border border-gray-200 px-2 py-1">Consumo Total: <span className="text-gray-800">{res.consumoTotalUC.toFixed(0)} kWh</span></div>
                              {ehGeradora && <div className="text-[10px] font-bold text-gray-500 bg-white border border-gray-200 px-2 py-1">Autoconsumo: <span className="text-gray-800">{res.autoconsumo.toFixed(0)} kWh</span></div>}
                              <div className="text-[11px] font-extrabold bg-white border border-gray-200 px-2 py-1">Econ: <span className={res.economia >= 0 ? 'text-green-700' : 'text-red-600'}>R$ {res.economia.toFixed(2).replace('.', ',')}</span></div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                            <div><label className={labelClass}>Preço do kWh (R$)</label><input type="text" value={unidade.precoKwh} onChange={(e) => handleUnidadeChange(unidade.id, 'precoKwh', e.target.value)} placeholder="0.00" className={inputClass} /></div>
                            <div><label className={labelClass}>Tarifa Fixa / Mínima (R$)</label><input type="text" value={unidade.tarifaConta} onChange={(e) => handleUnidadeChange(unidade.id, 'tarifaConta', e.target.value)} placeholder="0.00" className={inputClass} /></div>
                            <div><label className={labelClass}>Valor Fatura c/ Sistema</label><input type="text" value={unidade.valorConta} onChange={(e) => handleUnidadeChange(unidade.id, 'valorConta', e.target.value)} placeholder="0.00" className={inputClass} /></div>
                          </div>

                          {ehGeradora ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-green-50/50 border border-green-200">
                              <div><label className="block text-[10px] font-bold text-green-700 mb-1 uppercase tracking-wider">Energia Injetada (kWh)</label><input type="text" value={unidade.energiaInjetada} onChange={(e) => handleUnidadeChange(unidade.id, 'energiaInjetada', e.target.value)} placeholder="Ex: 1200" className={inputClass} /></div>
                              <div><label className="block text-[10px] font-bold text-green-700 mb-1 uppercase tracking-wider">Consumo Conta Geradora (kWh)</label><input type="text" value={unidade.consumoConta} onChange={(e) => handleUnidadeChange(unidade.id, 'consumoConta', e.target.value)} placeholder="Ex: 150" className={inputClass} /></div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 p-3 bg-blue-50/50 border border-blue-200">
                              <div><label className="block text-[10px] font-bold text-blue-700 mb-1 uppercase tracking-wider">Energia Ativa / Consumo Total (kWh)</label><input type="text" value={unidade.energiaAtiva} onChange={(e) => handleUnidadeChange(unidade.id, 'energiaAtiva', e.target.value)} placeholder="Ex: 350" className={inputClass} /></div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ETAPA 4 */}
              <div className="bg-white border border-gray-300">
                <div className={cardHeaderClass}><h3 className={cardTitleClass}><PenTool size={14} className="text-gray-500" /> 4. Resolução Final</h3></div>
                <div className="p-4 space-y-3">
                  <textarea rows="3" value={parecerTecnico} onChange={(e) => setParecerTecnico(e.target.value)} placeholder="Parecer técnico..." className="w-full bg-white border border-gray-300 p-3 text-[12px] focus:ring-1 focus:ring-green-500 outline-none resize-none rounded-none font-medium text-gray-800"></textarea>
                  <div className="w-full md:w-1/3">
                    <label className={labelClass}>Status do Relatório</label>
                    <select value={statusRelatorio} onChange={(e) => setStatusRelatorio(e.target.value)} className="w-full bg-white border border-gray-300 px-3 py-2 text-[12px] text-gray-800 outline-none focus:ring-1 focus:ring-green-500 font-bold rounded-none cursor-pointer">
                      <option value="Rascunho">Rascunho</option>
                      <option value="Pronto para Envio">Pronto para Envio</option>
                      <option value="Enviado">Enviado</option>
                    </select>
                  </div>
                </div>
              </div>

            </div>

            <div className="p-4 border-t border-gray-300 bg-gray-50 flex justify-end gap-2 shrink-0">
              <button onClick={() => setModalAberto(false)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-[12px] font-bold hover:bg-gray-100 rounded-none cursor-pointer">Cancelar</button>
              <button onClick={handleGerarRelatorio} disabled={loadingForm} className="flex items-center gap-1.5 bg-green-700 text-white px-5 py-2 rounded-none text-[12px] font-bold hover:bg-green-800 transition-all cursor-pointer border border-green-800 disabled:opacity-50">
                {loadingForm ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} strokeWidth={2} />} {loadingForm ? 'Processando...' : 'Gerar PDF e Salvar'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}