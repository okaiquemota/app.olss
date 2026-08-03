import { useState, useEffect } from 'react';
import { Trash2, Edit2, Search, Copy, Check, ExternalLink, ShieldAlert, AlertCircle, CheckCircle2, X, Eye, Settings, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Componente simples para o botão de Copiar com feedback visual
const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!text) return <span className="text-gray-300">-</span>;

  return (
    <div className="flex items-center gap-2 group">
      <span className="text-[13px] font-mono text-gray-600 truncate">{text}</span>
      <button 
        type="button"
        onClick={handleCopy} 
        className="text-gray-400 hover:text-green-600 transition-colors opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-green-50 cursor-pointer shrink-0"
        title="Copiar"
      >
        {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
      </button>
    </div>
  );
};

export function Monitoramento() {
  const [clientes, setClientes] = useState([]);
  const [plataformas, setPlataformas] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('Todos'); // 'Todos', 'normal', 'alerta', 'vencido'

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPlataformaModalOpen, setIsPlataformaModalOpen] = useState(false);
  const [clienteDetalhe, setClienteDetalhe] = useState(null); 
  const [editandoId, setEditandoId] = useState(null);

  // Form states - Clientes
  const [nomeCliente, setNomeCliente] = useState('');
  const [loginApp, setLoginApp] = useState('');
  const [senhaApp, setSenhaApp] = useState('');
  const [plataformaInversor, setPlataformaInversor] = useState('Solarman Smart');
  const [observacoesInternas, setObservacoesInternas] = useState('');
  const [statusMonitoramento, setStatusMonitoramento] = useState('normal'); 

  // Form states - Plataformas
  const [novaPlataformaNome, setNovaPlataformaNome] = useState('');
  const [novaPlataformaLink, setNovaPlataformaLink] = useState('');

  const fetchData = async () => {
    const resClientes = await supabase.from('clientes').select('*').order('nome_razao_social', { ascending: true });
    const resPlataformas = await supabase.from('plataformas').select('*').order('nome', { ascending: true });
    
    if (!resClientes.error) setClientes(resClientes.data || []);
    if (!resPlataformas.error) setPlataformas(resPlataformas.data || []);
    
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // ==========================================
  // FUNÇÕES DE PLATAFORMAS
  // ==========================================
  const handleSalvarPlataforma = async (e) => {
    e.preventDefault();
    if (!novaPlataformaNome.trim()) return;
    
    await supabase.from('plataformas').insert([{ 
      nome: novaPlataformaNome, 
      link: novaPlataformaLink 
    }]);
    
    setNovaPlataformaNome('');
    setNovaPlataformaLink('');
    fetchData();
  };

  const deletarPlataforma = async (id) => {
    if(!window.confirm('Excluir esta plataforma da lista?')) return;
    await supabase.from('plataformas').delete().eq('id', id);
    fetchData();
  };

  // ==========================================
  // FUNÇÕES DE CREDENCIAIS (CLIENTES)
  // ==========================================
  const abrirModalEdicao = (item) => {
    setEditandoId(item.id);
    setNomeCliente(item.nome_razao_social || ''); 
    setLoginApp(item.login_app || ''); 
    setSenhaApp(item.senha_app || '');
    setPlataformaInversor(item.plataforma_inversor || 'Solarman Smart'); 
    setObservacoesInternas(item.observacoes_internas || '');
    setStatusMonitoramento(item.status_monitoramento || 'normal');
    setIsModalOpen(true);
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    if (!nomeCliente.trim() || !editandoId) return;

    const payload = { 
      nome_razao_social: nomeCliente, 
      login_app: loginApp, 
      senha_app: senhaApp, 
      plataforma_inversor: plataformaInversor, 
      observacoes_internas: observacoesInternas, 
      status_monitoramento: statusMonitoramento 
    };

    await supabase.from('clientes').update(payload).eq('id', editandoId);
    
    setIsModalOpen(false);
    fetchData();
  };

  const limparCredenciais = async (id) => {
    if(!window.confirm('Remover as credenciais de monitoramento? (O cliente continua salvo na base).')) return;
    
    await supabase.from('clientes').update({
      login_app: null,
      senha_app: null,
      plataforma_inversor: null,
      status_monitoramento: 'normal'
    }).eq('id', id);
    
    fetchData();
  };

  // Lógica de filtro e agrupamento
  const clientesMonitoramento = clientes.filter(c => c.plataforma_inversor && c.plataforma_inversor.trim() !== '');
  
  const sistemasFiltrados = clientesMonitoramento.filter(s => {
    const matchBusca = (s.nome_razao_social && s.nome_razao_social.toLowerCase().includes(busca.toLowerCase())) || 
                       (s.login_app && s.login_app.toLowerCase().includes(busca.toLowerCase())) ||
                       (s.plataforma_inversor && s.plataforma_inversor.toLowerCase().includes(busca.toLowerCase()));
    
    const matchStatus = filtroStatus === 'Todos' || s.status_monitoramento === filtroStatus;

    return matchBusca && matchStatus;
  });

  const sistemasAgrupados = sistemasFiltrados.reduce((acc, curr) => {
    const plat = curr.plataforma_inversor || 'Sem Plataforma Definida';
    if (!acc[plat]) acc[plat] = [];
    acc[plat].push(curr);
    return acc;
  }, {});

  const renderStatusInfo = (statusItem) => {
    switch (statusItem) {
      case 'alerta':
        return { 
          bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700', 
          icon: <AlertCircle size={14} className="text-yellow-600" />, label: 'Offline / Revisar' 
        };
      case 'vencido':
        return { 
          bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', 
          icon: <ShieldAlert size={14} className="text-red-600" />, label: 'Serviço Vencido' 
        };
      default:
        return { 
          bg: 'bg-white', border: 'border-transparent hover:border-gray-200', text: 'text-gray-800', 
          icon: <CheckCircle2 size={14} className="text-gray-300" />, label: 'Normal' 
        };
    }
  };

  return (
    <div className="w-full px-6 md:px-8 h-[calc(100vh-80px)] flex flex-col animate-in fade-in duration-300 py-4 antialiased text-sm">
      
      {/* CABEÇALHO DA TELA (Barra de busca estendida + Filtros) */}
      <div className="flex flex-col md:flex-row items-center gap-3 mb-6 shrink-0 w-full">
        
        {/* Barra de Pesquisa (flex-1 para expandir o máximo possível) */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Buscar cliente, login ou app..." 
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200/60 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
          />
        </div>
        
        {/* Controles da Direita */}
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          
          {/* Filtro de Status */}
          <div className="flex items-center bg-white border border-gray-200/60 rounded-xl px-3 py-2.5 shadow-sm transition-all hover:bg-gray-50 flex-1 md:flex-none">
            <Filter size={14} className="text-gray-400 mr-2 shrink-0" />
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="bg-transparent text-[13px] font-semibold text-gray-600 outline-none cursor-pointer w-full"
            >
              <option value="Todos">Todos os Status</option>
              <option value="normal">Normal</option>
              <option value="alerta">Offline / Problema</option>
              <option value="vencido">Serviço Vencido</option>
            </select>
          </div>

          {/* Botão de Gerenciar Plataformas */}
          <button onClick={() => setIsPlataformaModalOpen(true)} className="flex items-center justify-center gap-1.5 bg-white border border-gray-200/60 text-gray-600 px-4 py-2.5 rounded-xl text-[13px] font-medium hover:bg-gray-50 transition-all shadow-sm shrink-0 cursor-pointer flex-1 md:flex-none">
            <Settings size={16} strokeWidth={1.5} /> <span className="hidden sm:inline">Plataformas</span>
          </button>

        </div>
      </div>

      {/* LISTA AGRUPADA DE CREDENCIAIS */}
      {loading ? (
        <div className="flex justify-center items-center flex-1 text-gray-400 text-[13px]">Carregando acessos...</div>
      ) : (
        <div className="flex-1 overflow-y-auto pb-10 pr-2 space-y-5">
          
          {Object.keys(sistemasAgrupados).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 border border-dashed border-gray-200 rounded-3xl bg-gray-50/50">
              <Search size={32} strokeWidth={1} className="mb-2 text-gray-300" />
              <p className="text-[13px]">Nenhuma credencial encontrada para este filtro.</p>
            </div>
          ) : (
            Object.keys(sistemasAgrupados).map(platNome => {
              const infoPlataforma = plataformas.find(p => p.nome === platNome);

              return (
                <div key={platNome} className="bg-white rounded-2xl border border-gray-200/60 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
                  
                  {/* Header da Plataforma com o Botão de Link */}
                  <div className="bg-gray-50/80 border-b border-gray-100 px-4 py-3 flex items-center justify-between">
                    <h4 className="font-bold text-gray-700 text-[13px] flex items-center gap-2">
                      {platNome}
                      <span className="bg-white border border-gray-200 text-gray-500 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                        {sistemasAgrupados[platNome].length}
                      </span>
                      {/* BOTÃO MÁGICO DO LINK DA PLATAFORMA */}
                      {infoPlataforma?.link && (
                        <a 
                          href={infoPlataforma.link} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="ml-1 flex items-center gap-1 bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                          title="Abrir plataforma"
                        >
                          <ExternalLink size={14} strokeWidth={2} />
                          <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Acessar</span>
                        </a>
                      )}
                    </h4>
                  </div>

                  {/* Lista de Clientes dessa Plataforma */}
                  <div className="divide-y divide-gray-100/60">
                    {sistemasAgrupados[platNome].map(item => {
                      const statusUI = renderStatusInfo(item.status_monitoramento);
                      
                      return (
                        <div key={item.id} className={`p-3 px-4 flex flex-col md:flex-row md:items-center gap-3 transition-colors hover:bg-gray-50/50 ${statusUI.bg} ${statusUI.border} border-l-4 first:border-t-0`}>
                          
                          {/* Coluna 1: Cliente e Status */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h5 className={`font-semibold text-[13px] truncate ${statusUI.text}`}>
                                {item.nome_razao_social}
                              </h5>
                              {item.status_monitoramento !== 'normal' && (
                                <span className={`flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border bg-white ${statusUI.text} ${statusUI.border} uppercase tracking-wider shrink-0`}>
                                  {statusUI.icon} {statusUI.label}
                                </span>
                              )}
                            </div>
                            {item.observacoes_internas && (
                              <p title={item.observacoes_internas} className="text-[11px] text-gray-400 line-clamp-1">
                                {item.observacoes_internas}
                              </p>
                            )}
                          </div>

                          {/* Coluna 2: Credenciais */}
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 shrink-0 bg-white/60 p-1.5 px-3 rounded-xl border border-black/5">
                            <div className="flex flex-col w-[130px]">
                              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Login</span>
                              <CopyButton text={item.login_app} />
                            </div>
                            <div className="hidden sm:block w-px h-6 bg-gray-200/60"></div>
                            <div className="flex flex-col w-[100px]">
                              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Senha</span>
                              <CopyButton text={item.senha_app} />
                            </div>
                          </div>

                          {/* Coluna 3: Ações */}
                          <div className="flex items-center justify-end gap-1 shrink-0 text-gray-300 hover:text-gray-400 transition-colors">
                            <button onClick={() => setClienteDetalhe(item)} className="p-1.5 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all cursor-pointer" title="Ver Detalhes">
                              <Eye size={16} strokeWidth={1.5} />
                            </button>
                            <button onClick={() => abrirModalEdicao(item)} className="p-1.5 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer" title="Editar">
                              <Edit2 size={16} strokeWidth={1.5} />
                            </button>
                            <button onClick={() => limparCredenciais(item.id)} className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer" title="Remover credenciais">
                              <Trash2 size={16} strokeWidth={1.5} />
                            </button>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* MODAL DE GERENCIAR PLATAFORMAS */}
      {isPlataformaModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity" onClick={(e) => { if (e.target === e.currentTarget) setIsPlataformaModalOpen(false); }}>
          <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
              <div>
                <h3 className="font-semibold text-base text-gray-800 leading-tight">Gerenciar Plataformas</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Cadastre os links para acesso rápido</p>
              </div>
              <button onClick={() => setIsPlataformaModalOpen(false)} className="text-gray-400 hover:text-gray-700 bg-white hover:bg-gray-100 p-1.5 rounded-full transition-colors cursor-pointer shadow-sm border border-gray-200/60">
                <X size={16} strokeWidth={2} />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <form onSubmit={handleSalvarPlataforma} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="Nome (Ex: Solar Web)" value={novaPlataformaNome} onChange={(e) => setNovaPlataformaNome(e.target.value)} className="bg-white border border-gray-200/60 rounded-xl p-2.5 text-[13px] focus:ring-1 focus:ring-gray-300 outline-none" required />
                  <input type="url" placeholder="Link (https://...)" value={novaPlataformaLink} onChange={(e) => setNovaPlataformaLink(e.target.value)} className="bg-white border border-gray-200/60 rounded-xl p-2.5 text-[13px] focus:ring-1 focus:ring-gray-300 outline-none" />
                </div>
                <button type="submit" className="w-full bg-gray-800 text-white px-4 py-2.5 rounded-xl text-[13px] font-medium hover:bg-gray-900 transition-all cursor-pointer">
                  Adicionar Plataforma
                </button>
              </form>

              <div className="space-y-2 max-h-60 overflow-y-auto mt-4 pr-1">
                {plataformas.map(plat => (
                  <div key={plat.id} className="flex justify-between items-center bg-gray-50 border border-gray-100 p-3 rounded-xl">
                    <div className="min-w-0 flex-1">
                      <span className="text-[13px] font-medium text-gray-700 block truncate">{plat.nome}</span>
                      {plat.link && <span className="text-[10px] text-gray-400 block truncate">{plat.link}</span>}
                    </div>
                    <button onClick={() => deletarPlataforma(plat.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1.5 rounded-md hover:bg-red-50/50 shrink-0 ml-2" title="Excluir">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {plataformas.length === 0 && <p className="text-center text-[12px] text-gray-400 py-4">Nenhuma plataforma cadastrada.</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE VISUALIZAÇÃO (Detalhes Read-Only) */}
      {clienteDetalhe && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity" onClick={(e) => { if (e.target === e.currentTarget) setClienteDetalhe(null); }}>
          <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
              <div>
                <h3 className="font-semibold text-base text-gray-800 leading-tight">Detalhes da Usina</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Modo somente leitura</p>
              </div>
              <button onClick={() => setClienteDetalhe(null)} className="text-gray-400 hover:text-gray-700 bg-white hover:bg-gray-100 p-1.5 rounded-full transition-colors cursor-pointer shadow-sm border border-gray-200/60">
                <X size={16} strokeWidth={2} />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Cliente / Razão Social</span>
                <p className="text-[14px] font-medium text-gray-800 bg-gray-50 p-2.5 rounded-xl border border-gray-100">{clienteDetalhe.nome_razao_social}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    {renderStatusInfo(clienteDetalhe.status_monitoramento).icon}
                    <span className={`text-[12px] font-semibold ${renderStatusInfo(clienteDetalhe.status_monitoramento).text}`}>
                      {renderStatusInfo(clienteDetalhe.status_monitoramento).label}
                    </span>
                  </div>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Plataforma</span>
                  <p className="text-[13px] font-medium text-gray-800 mt-1 truncate" title={clienteDetalhe.plataforma_inversor}>{clienteDetalhe.plataforma_inversor}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50/50 p-2.5 rounded-xl border border-blue-100/50">
                  <span className="block text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">Login App</span>
                  <CopyButton text={clienteDetalhe.login_app} />
                </div>
                <div className="bg-blue-50/50 p-2.5 rounded-xl border border-blue-100/50">
                  <span className="block text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">Senha App</span>
                  <CopyButton text={clienteDetalhe.senha_app} />
                </div>
              </div>

              {clienteDetalhe.observacoes_internas && (
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Observações</span>
                  <div className="text-[13px] text-gray-600 bg-yellow-50/50 p-3 rounded-xl border border-yellow-100/50 whitespace-pre-wrap">
                    {clienteDetalhe.observacoes_internas}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button onClick={() => {
                setClienteDetalhe(null);
                abrirModalEdicao(clienteDetalhe);
              }} className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-[12px] font-semibold hover:bg-gray-50 transition-all shadow-sm cursor-pointer">
                <Edit2 size={14} /> Editar Usina
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR CREDENCIAIS */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity" onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
          <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h3 className="font-semibold text-base text-gray-800">Editar Credenciais</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 p-1.5 rounded-full transition-colors cursor-pointer">
                <X size={16} strokeWidth={2} />
              </button>
            </div>
            
            <form onSubmit={handleSalvar} className="p-5 space-y-4">
              
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Cliente / Usina *</label>
                <input required autoFocus type="text" placeholder="Ex: Márcio - Onze Onze Adesivos" value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} className="w-full bg-gray-50 border border-gray-200/60 rounded-xl p-2.5 text-[13px] focus:bg-white focus:ring-1 focus:ring-green-500 outline-none transition-all" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Login App</label>
                  <input type="text" placeholder="E-mail ou Usuário" value={loginApp} onChange={(e) => setLoginApp(e.target.value)} className="w-full bg-gray-50 border border-gray-200/60 rounded-xl p-2.5 text-[13px] focus:bg-white focus:ring-1 focus:ring-green-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Senha App</label>
                  <input type="text" placeholder="Senha do App" value={senhaApp} onChange={(e) => setSenhaApp(e.target.value)} className="w-full bg-gray-50 border border-gray-200/60 rounded-xl p-2.5 text-[13px] focus:bg-white focus:ring-1 focus:ring-green-500 outline-none transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Plataforma / App</label>
                <input list="plataformas-db" type="text" placeholder="Ex: Solarman Smart" value={plataformaInversor} onChange={(e) => setPlataformaInversor(e.target.value)} className="w-full bg-gray-50 border border-gray-200/60 rounded-xl p-2.5 text-[13px] focus:bg-white focus:ring-1 focus:ring-green-500 outline-none transition-all" />
                <datalist id="plataformas-db">
                  {plataformas.map(p => <option key={p.id} value={p.nome} />)}
                </datalist>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Observações de Monitoramento</label>
                <textarea placeholder="Algum detalhe importante? (Opcional)" value={observacoesInternas} onChange={(e) => setObservacoesInternas(e.target.value)} className="w-full bg-gray-50 border border-gray-200/60 rounded-xl p-2.5 text-[13px] focus:bg-white focus:ring-1 focus:ring-green-500 outline-none resize-none h-16 transition-all" />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-2 uppercase tracking-wider">Status do Monitoramento</label>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => setStatusMonitoramento('normal')} className={`py-2 px-1 cursor-pointer rounded-xl text-[12px] font-semibold border flex flex-col items-center gap-1 transition-all ${statusMonitoramento === 'normal' ? 'bg-white border-green-500 text-green-700 shadow-sm ring-1 ring-green-500' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-white'}`}>
                    <CheckCircle2 size={16} /> Normal
                  </button>
                  <button type="button" onClick={() => setStatusMonitoramento('alerta')} className={`py-2 px-1 cursor-pointer rounded-xl text-[12px] font-semibold border flex flex-col items-center gap-1 transition-all ${statusMonitoramento === 'alerta' ? 'bg-yellow-50 border-yellow-500 text-yellow-700 shadow-sm ring-1 ring-yellow-500' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-white'}`}>
                    <AlertCircle size={16} /> Offline/Problema
                  </button>
                  <button type="button" onClick={() => setStatusMonitoramento('vencido')} className={`py-2 px-1 cursor-pointer rounded-xl text-[12px] font-semibold border flex flex-col items-center gap-1 transition-all ${statusMonitoramento === 'vencido' ? 'bg-red-50 border-red-500 text-red-700 shadow-sm ring-1 ring-red-500' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-white'}`}>
                    <ShieldAlert size={16} /> Vencido
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end">
                <button type="submit" className="bg-green-700 cursor-pointer text-white px-5 py-2.5 rounded-xl text-[13px] font-semibold hover:bg-green-800 transition-all shadow-sm">
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}