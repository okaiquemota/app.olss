import { useState, useEffect } from 'react';
import { 
  FileText, Zap, PenTool, Calculator, ArrowRight, 
  ArrowLeft, Search, Plus, Loader2, Calendar 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { gerarPdfRelatorio } from '../lib/relatorioPdf';

export function Relatorios({ clienteInicialId, onClienteInicialConsumido }) {
  const [view, setView] = useState('lista'); 
  
  // Estados da Lista
  const [clientes, setClientes] = useState([]);
  const [relatorios, setRelatorios] = useState([]);
  const [loadingLista, setLoadingLista] = useState(true);
  const [busca, setBusca] = useState('');

  // Estados do Formulário
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [mesReferencia, setMesReferencia] = useState('');
  const [geracaoAtual, setGeracaoAtual] = useState('');
  const [geracaoAnterior, setGeracaoAnterior] = useState('');
  const [parecerTecnico, setParecerTecnico] = useState('');
  const [unidades, setUnidades] = useState([]);
  const [loadingForm, setLoadingForm] = useState(false);

  // Helper para aceitar vírgula e ponto nos números
  const parseNum = (val) => {
    if (!val) return 0;
    const normalized = String(val).replace(',', '.');
    return parseFloat(normalized) || 0;
  };

  // ==========================================
  // BUSCA INICIAL DE DADOS
  // ==========================================
  const fetchData = async () => {
    setLoadingLista(true);
    
    const resClientes = await supabase
      .from('clientes')
      .select('id, nome_razao_social, endereco, ucs, status')
      .order('nome_razao_social');
      
    const resRelatorios = await supabase
      .from('relatorios')
      .select('id, cliente_id, mes_referencia, created_at')
      .order('created_at', { ascending: false });
    
    if (resClientes.data) setClientes(resClientes.data);
    if (resRelatorios.data) setRelatorios(resRelatorios.data);
    
    setLoadingLista(false);
  };

  // ==========================================
  // NAVEGAÇÃO E PREPARAÇÃO
  // ==========================================
  const abrirNovoRelatorio = (cliente) => {
    setClienteSelecionado(cliente);
    
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const dataAtual = new Date();
    setMesReferencia(`${meses[dataAtual.getMonth()]}/${dataAtual.getFullYear()}`);
    
    setGeracaoAtual('');
    setGeracaoAnterior('');
    setParecerTecnico('');

    if (cliente.ucs) {
      const ucsPreparadas = cliente.ucs.map(uc => ({
        ...uc,
        precoKwh: '', tarifaConta: '', valorConta: '', injetado: '', consumoConta: '', energiaAtiva: ''
      }));
      setUnidades(ucsPreparadas);
    } else {
      setUnidades([]);
    }
    
    setView('form');
  };

  const voltarParaLista = () => {
    setView('lista');
    setClienteSelecionado(null);
  };

  useEffect(() => {
    if (view === 'lista') fetchData();
  }, [view]);

  useEffect(() => {
    if (!clienteInicialId) return;

    const carregarClienteInicial = async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome_razao_social, endereco, ucs, status')
        .eq('id', clienteInicialId)
        .single();

      if (!error && data) abrirNovoRelatorio(data);
      onClienteInicialConsumido?.();
    };

    carregarClienteInicial();
  }, [clienteInicialId, onClienteInicialConsumido]);

  // ==========================================
  // LÓGICA DO FORMULÁRIO E MATEMÁTICA
  // ==========================================
  const handleUnidadeChange = (id, campo, valor) => {
    setUnidades(unidades.map(u => u.id === id ? { ...u, [campo]: valor } : u));
  };

  const qtdGeradoras = unidades.filter(u => u.tipo === 'Geradora').length || 1;

  const calcularLinha = (unidade) => {
    const preco = parseNum(unidade.precoKwh);
    const tarifa = parseNum(unidade.tarifaConta);
    const valorComSistema = parseNum(unidade.valorConta);
    let consumoTotal;
    let autoConsumo = 0;

    if (unidade.tipo === 'Geradora') {
      const injetado = parseNum(unidade.injetado);
      const consumoDaConta = parseNum(unidade.consumoConta);
      const genAnterior = parseNum(geracaoAnterior);
      const geracaoRateada = genAnterior / qtdGeradoras;

      autoConsumo = Math.max(0, geracaoRateada - injetado);
      consumoTotal = autoConsumo + consumoDaConta;
    } else {
      consumoTotal = parseNum(unidade.energiaAtiva); 
    }

    const valorSemSistema = (consumoTotal * preco) + tarifa;
    const economia = valorSemSistema - valorComSistema;

    return { autoConsumo, consumoTotal, valorSemSistema, economia };
  };

  const economiaTotal = unidades.reduce((acc, unidade) => acc + calcularLinha(unidade).economia, 0);

  // ==========================================
  // GERAÇÃO DO PDF NO PADRÃO PROFISSIONAL
  // ==========================================
  const handleGerarRelatorio = async () => {
    setLoadingForm(true);
    try {
      const unidadesComResultado = unidades.map(u => ({
        ...u,
        ...calcularLinha(u)
      }));

      const payload = {
        cliente_id: clienteSelecionado.id,
        mes_referencia: mesReferencia,
        geracao_atual: parseNum(geracaoAtual),
        geracao_anterior: parseNum(geracaoAnterior),
        parecer_tecnico: parecerTecnico,
        faturas_cpfl: unidadesComResultado 
      };

      const { error } = await supabase.from('relatorios').insert([payload]);
      if (error) throw error;

      gerarPdfRelatorio({
        cliente: clienteSelecionado,
        relatorio: payload,
        unidades: unidadesComResultado,
        economiaTotal,
      });

      fetchData();
      voltarParaLista();

    } catch (err) {
      alert("Erro ao gerar relatório: " + err.message);
    } finally {
      setLoadingForm(false);
    }
  };

  // ==========================================
  // RENDERIZAÇÃO: TELA DE HISTÓRICO (LISTA)
  // ==========================================
  if (view === 'lista') {
    const clientesFiltrados = clientes.filter(c => 
      c.nome_razao_social.toLowerCase().includes(busca.toLowerCase())
    );

    return (
      <div className="w-full px-6 md:px-8 h-[calc(100vh-80px)] flex flex-col animate-in fade-in duration-300 py-4 antialiased text-sm">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar cliente para gerar relatório..." 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200/60 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
            />
          </div>
        </div>

        <div className="flex-1 bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-200/60 overflow-hidden flex flex-col">
          {loadingLista ? (
            <div className="flex justify-center items-center flex-1 text-gray-400 text-[13px]">
              <Loader2 className="animate-spin mr-2" size={18} /> Carregando base...
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="bg-gray-50/80 backdrop-blur-sm sticky top-0 z-10">
                  <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                    <th className="px-6 py-4">Cliente / Usina</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Últimos Relatórios</th>
                    <th className="px-6 py-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100/60">
                  {clientesFiltrados.map((cliente) => {
                    const historico = relatorios.filter(r => r.cliente_id === cliente.id).slice(0, 2);

                    return (
                      <tr key={cliente.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-[13px] text-gray-800 truncate max-w-[280px]">
                            {cliente.nome_razao_social}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${cliente.status === 'Ativo' ? 'bg-green-50 text-green-700 border-green-200/60' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                            {cliente.status || 'Ativo'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {historico.length > 0 ? (
                            <div className="flex items-center gap-3">
                              {historico.map(rel => (
                                <span key={rel.id} className="flex items-center gap-1 text-[11px] font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-md border border-gray-200/60">
                                  <FileText size={12} className="text-gray-400" />
                                  {rel.mes_referencia}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[12px] text-gray-400 italic">Nenhum gerado</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => abrirNovoRelatorio(cliente)}
                            className="inline-flex items-center justify-center gap-1.5 bg-white border border-gray-200 text-green-700 px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-green-50 hover:border-green-200 transition-all cursor-pointer shadow-sm"
                          >
                            <Plus size={14} strokeWidth={2.5} /> Novo
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {clientesFiltrados.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center text-[13px] text-gray-400">
                        Nenhum cliente encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDERIZAÇÃO: TELA DE FORMULÁRIO
  // ==========================================
  return (
    <div className="w-full px-6 md:px-8 h-[calc(100vh-80px)] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300 py-4 antialiased text-sm overflow-y-auto">
      
      <div className="max-w-5xl mx-auto w-full space-y-6 pb-10">
        
        <div className="flex justify-between items-center bg-white/70 backdrop-blur-md p-3.5 px-5 rounded-2xl border border-gray-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={voltarParaLista} className="p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all cursor-pointer">
              <ArrowLeft size={18} strokeWidth={2} />
            </button>
            <div>
              <h2 className="text-base font-bold text-gray-800 leading-tight">Gerar Relatório</h2>
              <p className="text-gray-500 text-[11px] mt-0.5 truncate max-w-[200px] sm:max-w-md">{clienteSelecionado?.nome_razao_social}</p>
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200/60 text-green-700 px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm shrink-0">
            <Calculator size={16} strokeWidth={2.5} className="hidden sm:block" />
            <div className="flex flex-col">
              <span className="text-[9px] font-bold uppercase tracking-wider leading-none text-green-600/70">Econ. Total</span>
              <span className="text-[14px] font-extrabold leading-tight">
                R$ {economiaTotal.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-200/60 lg:col-span-1">
            <h3 className="text-[14px] font-bold text-gray-800 mb-5 flex items-center gap-2">
              <Calendar size={16} className="text-gray-400" /> Referência
            </h3>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Mês de Geração</label>
              <input type="text" value={mesReferencia} onChange={(e) => setMesReferencia(e.target.value)} placeholder="Ex: Maio/2026" className="w-full bg-gray-50 border border-gray-200/60 rounded-xl p-2.5 text-[13px] focus:bg-white focus:ring-1 focus:ring-green-500 outline-none transition-all font-medium" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-200/60 lg:col-span-2">
            <h3 className="text-[14px] font-bold text-gray-800 mb-5 flex items-center gap-2">
              <Zap size={16} className="text-gray-400" /> Leitura do Inversor
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Geração Atual</label>
                <div className="relative">
                  <input type="text" value={geracaoAtual} onChange={(e) => setGeracaoAtual(e.target.value)} placeholder="0.00" className="w-full bg-gray-50 border border-gray-200/60 rounded-xl p-2.5 pr-10 text-[13px] focus:bg-white focus:ring-1 focus:ring-green-500 outline-none transition-all font-medium" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-gray-400">kWh</span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider" title="Usado para cálculo do auto consumo">Geração Anterior</label>
                <div className="relative">
                  <input type="text" value={geracaoAnterior} onChange={(e) => setGeracaoAnterior(e.target.value)} placeholder="0.00" className="w-full bg-gray-50 border border-gray-200/60 rounded-xl p-2.5 pr-10 text-[13px] focus:bg-white focus:ring-1 focus:ring-green-500 outline-none transition-all font-medium" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-gray-400">kWh</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {unidades.length > 0 && (
          <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-200/60">
            <h3 className="text-[14px] font-bold text-gray-800 mb-5 flex items-center gap-2">
              <FileText size={16} className="text-gray-400" /> Faturas e Rateio CPFL
            </h3>

            <div className="space-y-4">
              {unidades.map((unidade) => {
                const calculo = calcularLinha(unidade);
                const ehGeradora = unidade.tipo === 'Geradora';
                
                return (
                  <div key={unidade.id} className="bg-gray-50/70 p-4 rounded-2xl border border-gray-100 transition-all hover:bg-white hover:border-gray-200/60 hover:shadow-sm">
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-100">
                      
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider border ${ehGeradora ? 'bg-green-50 text-green-700 border-green-200/60' : 'bg-blue-50 text-blue-700 border-blue-200/60'}`}>
                          {unidade.tipo}
                        </span>
                        <span className="text-[13px] font-bold text-gray-700">
                          UC: {unidade.numero_uc}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Consumo Calc</span>
                          <span className="text-[12px] font-bold text-gray-700">{calculo.consumoTotal.toFixed(0)} kWh</span>
                        </div>
                        <div className="w-px h-6 bg-gray-100 mx-1"></div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Economia</span>
                          <span className={`text-[12px] font-bold ${calculo.economia >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            R$ {calculo.economia.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                      <div className="col-span-1 lg:col-span-2">
                        <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Preço kWh</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-gray-400">R$</span>
                          <input type="text" value={unidade.precoKwh} onChange={(e) => handleUnidadeChange(unidade.id, 'precoKwh', e.target.value)} placeholder="0.00" className="w-full bg-white border border-gray-200/60 rounded-xl p-2.5 pl-8 text-[13px] focus:ring-1 focus:ring-green-500 outline-none transition-all font-medium" />
                        </div>
                      </div>
                      <div className="col-span-1 lg:col-span-2">
                        <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Tarifa Fixa</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-gray-400">R$</span>
                          <input type="text" value={unidade.tarifaConta} onChange={(e) => handleUnidadeChange(unidade.id, 'tarifaConta', e.target.value)} placeholder="0.00" className="w-full bg-white border border-gray-200/60 rounded-xl p-2.5 pl-8 text-[13px] focus:ring-1 focus:ring-green-500 outline-none transition-all font-medium" />
                        </div>
                      </div>
                      <div className="col-span-2 md:col-span-1 lg:col-span-2">
                        <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Valor Fatura</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-gray-400">R$</span>
                          <input type="text" value={unidade.valorConta} onChange={(e) => handleUnidadeChange(unidade.id, 'valorConta', e.target.value)} placeholder="C/ Sistema" className="w-full bg-white border border-gray-200/60 rounded-xl p-2.5 pl-8 text-[13px] focus:ring-1 focus:ring-green-500 outline-none transition-all font-medium" />
                        </div>
                      </div>

                      {ehGeradora ? (
                        <>
                          <div className="col-span-1 lg:col-span-3">
                            <label className="block text-[10px] font-bold text-green-600 mb-1.5 uppercase tracking-wider">Energia Injetada</label>
                            <div className="relative">
                              <input type="text" value={unidade.injetado} onChange={(e) => handleUnidadeChange(unidade.id, 'injetado', e.target.value)} placeholder="0.00" className="w-full bg-green-50/30 border border-green-200/60 rounded-xl p-2.5 pr-10 text-[13px] focus:bg-white focus:ring-1 focus:ring-green-500 outline-none transition-all font-medium" />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-green-500">kWh</span>
                            </div>
                          </div>
                          <div className="col-span-1 lg:col-span-3">
                            <label className="block text-[10px] font-bold text-green-600 mb-1.5 uppercase tracking-wider">Consumo Conta</label>
                            <div className="relative">
                              <input type="text" value={unidade.consumoConta} onChange={(e) => handleUnidadeChange(unidade.id, 'consumoConta', e.target.value)} placeholder="0.00" className="w-full bg-green-50/30 border border-green-200/60 rounded-xl p-2.5 pr-10 text-[13px] focus:bg-white focus:ring-1 focus:ring-green-500 outline-none transition-all font-medium" />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-green-500">kWh</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="col-span-2 lg:col-span-6">
                          <label className="block text-[10px] font-bold text-blue-600 mb-1.5 uppercase tracking-wider">Energia Ativa (Consumo Total)</label>
                          <div className="relative">
                            <input type="text" value={unidade.energiaAtiva} onChange={(e) => handleUnidadeChange(unidade.id, 'energiaAtiva', e.target.value)} placeholder="0.00" className="w-full bg-blue-50/30 border border-blue-200/60 rounded-xl p-2.5 pr-10 text-[13px] focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all font-medium" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-blue-400">kWh</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-200/60">
          <h3 className="text-[14px] font-bold text-gray-800 mb-5 flex items-center gap-2">
            <PenTool size={16} className="text-gray-400" /> Parecer Técnico
          </h3>
          <textarea 
            rows="4" 
            value={parecerTecnico} 
            onChange={(e) => setParecerTecnico(e.target.value)} 
            placeholder="Ex: Tivemos uma geração excelente neste mês..." 
            className="w-full bg-gray-50 border border-gray-200/60 rounded-xl p-3.5 text-[13px] focus:bg-white focus:ring-1 focus:ring-green-500 outline-none transition-all resize-none text-gray-700 leading-relaxed"
          ></textarea>
        </div>

        <div className="flex justify-end pt-2 pb-6">
          <button 
            onClick={handleGerarRelatorio}
            disabled={loadingForm}
            className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-6 py-3.5 rounded-2xl text-[14px] font-bold transition-all shadow-sm cursor-pointer hover:-translate-y-0.5 shadow-green-900/20 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loadingForm ? <Loader2 size={20} className="animate-spin" /> : <FileText size={20} strokeWidth={2.5} />} 
            {loadingForm ? 'Processando...' : 'Gerar PDF e Salvar'}
            {!loadingForm && <ArrowRight size={18} className="ml-1 opacity-60" />}
          </button>
        </div>

      </div>
    </div>
  );
}
