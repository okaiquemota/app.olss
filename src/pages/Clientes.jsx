import { useState, useEffect } from 'react';
import { 
  Save, Loader2, Plus, Trash2, X, 
  Search, Zap, User, Key, Calendar, 
  Phone, FileText, Activity, Mail, Copy,
  CheckCircle, XCircle, AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Clientes() {
  const [view, setView] = useState('lista'); 
  
  const [clientesLista, setClientesLista] = useState([]);
  const [loadingLista, setLoadingLista] = useState(true);
  
  // Filtros da tabela
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('Todos');

  const [loadingForm, setLoadingForm] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null);
  
  const [formData, setFormData] = useState({
    nome_razao_social: '', documento: '', contato: '', email: '', status: 'Ativo',
    endereco: '', login_cpfl: '', senha_cpfl: '', plataforma_inversor: '', 
    login_app: '', senha_app: '', dia_vencimento: '', observacoes_internas: '', 
    ultimo_relatorio: ''
  });
  
  const [ucs, setUcs] = useState([
    { id: Date.now(), tipo: 'Geradora', numero_uc: '' }
  ]);

  const fetchClientes = async () => {
    setLoadingLista(true);
    const { data, error } = await supabase.from('clientes').select('*').order('nome_razao_social');
    if (error) console.error('Erro ao buscar:', error);
    else setClientesLista(data || []);
    setLoadingLista(false);
  };

  useEffect(() => {
    fetchClientes();
  }, []); 

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleUCChange = (id, campo, valor) => setUcs(ucs.map(uc => uc.id === id ? { ...uc, [campo]: valor } : uc));
  const adicionarUC = () => setUcs([...ucs, { id: Date.now(), tipo: 'Beneficiada', numero_uc: '' }]);
  const removerUC = (id) => setUcs(ucs.filter(uc => uc.id !== id));

  const prepararNovoCliente = () => {
    setClienteEditando(null);
    setFormData({
      nome_razao_social: '', documento: '', contato: '', email: '', status: 'Ativo',
      endereco: '', login_cpfl: '', senha_cpfl: '', plataforma_inversor: '', 
      login_app: '', senha_app: '', dia_vencimento: '', observacoes_internas: '', 
      ultimo_relatorio: ''
    });
    setUcs([{ id: Date.now(), tipo: 'Geradora', numero_uc: '' }]);
    setView('form');
  };

  const abrirClienteParaEdicao = (cliente) => {
    setClienteEditando(cliente.id);
    setFormData({
      nome_razao_social: cliente.nome_razao_social || '',
      documento: cliente.documento || '',
      contato: cliente.contato || '',
      email: cliente.email || '',
      status: cliente.status || 'Ativo',
      endereco: cliente.endereco || '',
      login_cpfl: cliente.login_cpfl || '',
      senha_cpfl: cliente.senha_cpfl || '',
      plataforma_inversor: cliente.plataforma_inversor || '',
      login_app: cliente.login_app || '',
      senha_app: cliente.senha_app || '',
      dia_vencimento: cliente.dia_vencimento || '',
      observacoes_internas: cliente.observacoes_internas || '',
      ultimo_relatorio: cliente.ultimo_relatorio || ''
    });
    
    if (cliente.ucs && cliente.ucs.length > 0) {
      setUcs(cliente.ucs);
    } else {
      setUcs([{ id: Date.now(), tipo: 'Geradora', numero_uc: '' }]);
    }
    setView('form');
  };

  const handleSalvar = async () => {
    if (!formData.nome_razao_social) {
      alert('O Nome/Razão Social é obrigatório!');
      return;
    }

    setLoadingForm(true);
    try {
      const payload = {
        ...formData,
        dia_vencimento: formData.dia_vencimento ? parseInt(formData.dia_vencimento) : null,
        ucs: ucs
      };

      if (clienteEditando) {
        const { error } = await supabase.from('clientes').update(payload).eq('id', clienteEditando);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('clientes').insert([payload]);
        if (error) throw error;
      }
      setView('lista');
      fetchClientes(); 
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao salvar: ' + (error.message || error.details));
    } finally {
      setLoadingForm(false);
    }
  };

  // Lógica de Filtros e Contadores
  const clientesFiltrados = clientesLista.filter(c => {
    const matchBusca = c.nome_razao_social.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === 'Todos' || c.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  const total = clientesFiltrados.length;
  const ativos = clientesFiltrados.filter(c => c.status === 'Ativo').length;
  const inativos = clientesFiltrados.filter(c => c.status === 'Inativo').length;
  const outros = total - ativos - inativos;

  const renderStatus = (status) => {
    const stat = status || 'Ativo';
    
    if (stat === 'Ativo') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-green-400 text-green-700 bg-transparent rounded-sm text-[11px] font-bold">
          <CheckCircle size={13} /> Ativo
        </span>
      );
    }
    if (stat === 'Inativo') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-red-400 text-red-700 bg-transparent rounded-sm text-[11px] font-bold">
          <XCircle size={13} /> Inativo
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-yellow-400 text-yellow-700 bg-transparent rounded-sm text-[11px] font-bold">
        <AlertCircle size={13} /> {stat}
      </span>
    );
  };

  const renderCelulaComCopia = (texto, estiloPadrao = "text-[12px] text-gray-600 font-medium") => {
    return (
      <div className="flex items-center justify-between gap-2">
        <span className={`${estiloPadrao} truncate`}>{texto || '--'}</span>
        {texto && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(texto);
            }}
            className="p-1 text-gray-300 hover:text-green-600 opacity-0 group-hover:opacity-100 transition-all cursor-pointer rounded-none shrink-0"
            title="Copiar"
          >
            <Copy size={13} strokeWidth={2.5} />
          </button>
        )}
      </div>
    );
  };

  const inputClass = "w-full bg-white border border-gray-300 px-3 py-2 text-[12px] text-gray-800 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 transition-all rounded-none placeholder:text-gray-400";
  const labelClass = "block text-[11px] font-bold text-gray-600 mb-1.5 uppercase tracking-wider flex items-center gap-1.5";
  const cardHeaderClass = "px-3 py-2 border-b border-gray-300 bg-gray-100 flex items-center justify-between";
  const cardTitleClass = "text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center gap-2";

  return (
    <div className="w-full h-full flex flex-col relative">
      
      {/* ========================================== */}
      {/* TELA DE LISTA */}
      {/* ========================================== */}
      
      {/* Container principal com borda e sombra para fazer o estilo "card" na tela */}
      <div className="flex flex-col h-full bg-white border border-gray-300 shadow-sm animate-in fade-in duration-300 antialiased text-sm">
        
        {/* CONTROLES / BUSCA */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3 p-3 md:p-4 border-b border-gray-300 shrink-0 w-full bg-white">
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto flex-1">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Buscar cliente, documento ou email..." 
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-none text-[13px] focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 transition-all"
              />
            </div>
            
            <select 
              value={filtroStatus} 
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full sm:w-auto bg-white border border-gray-300 px-3 py-2 text-[12px] text-gray-700 outline-none focus:ring-1 focus:ring-green-500 font-medium rounded-none cursor-pointer"
            >
              <option value="Todos">Todos os status</option>
              <option value="Ativo">Ativo</option>
              <option value="Inativo">Inativo</option>
              <option value="Com contrato">Com contrato</option>
              <option value="Sem contrato">Sem contrato</option>
              <option value="Em prospecção">Em prospecção</option>
            </select>
          </div>
          
          <button 
            onClick={prepararNovoCliente}
            className="w-full lg:w-auto flex items-center justify-center gap-1.5 bg-green-700 text-white px-4 py-2 rounded-none text-[13px] font-medium hover:bg-green-800 transition-all cursor-pointer shrink-0"
          >
            <Plus size={16} strokeWidth={2} /> Adicionar
          </button>
        </div>

        {/* BARRA DE RESUMO */}
        <div className="grid grid-cols-3 sm:grid-cols-4 border-b border-gray-300 bg-white shrink-0">
          <div className="px-4 py-2.5 border-r border-gray-300 text-[12px] text-gray-800">
            <span className="font-extrabold">{total}</span> clientes
          </div>
          <div className="px-4 py-2.5 border-r border-gray-300 text-[12px] text-green-700">
            <span className="font-extrabold">{ativos}</span> ativos
          </div>
          <div className="px-4 py-2.5 border-r border-gray-300 text-[12px] text-red-600">
            <span className="font-extrabold">{inativos}</span> inativos
          </div>
          <div className="hidden sm:block px-4 py-2.5 text-[12px] text-yellow-600">
            <span className="font-extrabold">{outros}</span> outros
          </div>
        </div>

        {/* TABELA DE CLIENTES */}
        <div className="flex-1 overflow-y-auto bg-white flex flex-col">
          {loadingLista ? (
            <div className="flex justify-center items-center flex-1 text-gray-400 text-[13px] min-h-[200px]">
              <Loader2 className="animate-spin mr-2" size={18} /> Carregando clientes...
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="bg-gray-100 sticky top-0 z-10 border-b border-gray-300">
                  <tr className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                    <th className="px-4 py-3 border-r border-gray-300">Cliente / Empresa</th>
                    <th className="px-4 py-3 border-r border-gray-300 text-center">UCs</th>
                    <th className="px-4 py-3 border-r border-gray-300">Status</th>
                    <th className="px-4 py-3 border-r border-gray-300">CNPJ/CPF</th>
                    <th className="px-4 py-3 border-r border-gray-300">Contato</th>
                    <th className="px-4 py-3 border-r border-gray-300">E-mail</th>
                    <th className="px-4 py-3">Endereço</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {clientesFiltrados.map((cliente) => (
                    <tr 
                      key={cliente.id} 
                      onClick={() => abrirClienteParaEdicao(cliente)}
                      className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                    >
                      {/* Voltamos para px-4 py-2.5 pra dar o respiro certinho */}
                      <td className="px-4 py-2.5 border-r border-gray-200 min-w-[200px]">
                        {renderCelulaComCopia(cliente.nome_razao_social, "font-semibold text-[12px] text-gray-800")}
                      </td>
                      <td className="px-4 py-2.5 border-r border-gray-200 text-center">
                        <span className="inline-flex items-center justify-center px-1.5 py-0.5 bg-gray-100 text-gray-600 font-bold text-[11px] border border-gray-200">
                          {cliente.ucs ? cliente.ucs.length : 0}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 border-r border-gray-200">
                        {renderStatus(cliente.status)}
                      </td>
                      <td className="px-4 py-2.5 border-r border-gray-200 min-w-[130px]">
                        {renderCelulaComCopia(cliente.documento)}
                      </td>
                      <td className="px-4 py-2.5 border-r border-gray-200 min-w-[130px]">
                        {renderCelulaComCopia(cliente.contato)}
                      </td>
                      <td className="px-4 py-2.5 border-r border-gray-200 min-w-[160px]">
                        {renderCelulaComCopia(cliente.email)}
                      </td>
                      <td className="px-4 py-2.5 min-w-[200px] max-w-[300px]">
                        {renderCelulaComCopia(cliente.endereco)}
                      </td>
                    </tr>
                  ))}
                  {clientesFiltrados.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-[12px] text-gray-400">
                        Nenhum cliente encontrado na busca.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ========================================== */}
      {/* MODAL DO FORMULÁRIO */}
      {/* ========================================== */}
      {view === 'form' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4 md:p-6 lg:p-8">
          
          <div className="bg-[#f8f9fa] w-full max-w-[1400px] max-h-full flex flex-col shadow-2xl border border-gray-400 animate-in zoom-in-95 duration-200">
            
            <div className="flex flex-row justify-between items-center gap-3 p-3 md:p-4 border-b border-gray-300 shrink-0 w-full bg-gray-50">
              <div className="flex items-center gap-3">
                <button onClick={() => setView('lista')} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer rounded-none border border-transparent hover:border-red-200">
                  <X size={18} strokeWidth={2.5} />
                </button>
                <div className="h-5 w-px bg-gray-300" />
                <h2 className="text-[13px] font-bold text-gray-800 uppercase tracking-wider">
                  {clienteEditando ? 'Edição de Cliente' : 'Novo Cliente'}
                </h2>
              </div>
              
              <button onClick={handleSalvar} disabled={loadingForm} className="flex items-center justify-center gap-1.5 bg-green-700 text-white px-5 py-2 rounded-none text-[13px] font-medium hover:bg-green-800 transition-all cursor-pointer disabled:opacity-50 border border-green-800">
                {loadingForm ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} strokeWidth={2} />}
                <span className="hidden sm:inline">{loadingForm ? 'Salvando...' : 'Salvar Ficha'}</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-5">
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 w-full">
                
                <div className="xl:col-span-3 space-y-4">
                  
                  <div className="bg-white border border-gray-300">
                    <div className={cardHeaderClass}>
                      <h3 className={cardTitleClass}>
                        <User size={14} className="text-gray-500" /> Informações Principais
                      </h3>
                    </div>
                    
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="md:col-span-2 lg:col-span-2">
                        <label className={labelClass}>Nome / Razão Social *</label>
                        <input type="text" name="nome_razao_social" value={formData.nome_razao_social} onChange={handleChange} className={inputClass} />
                      </div>
                      
                      <div className="col-span-1 md:col-span-1 lg:col-span-1">
                        <label className={labelClass}><FileText size={13}/> CNPJ / CPF</label>
                        <input type="text" name="documento" value={formData.documento} onChange={handleChange} placeholder="000.000.000-00" className={inputClass} />
                      </div>
                      
                      <div className="col-span-1 md:col-span-1 lg:col-span-1">
                        <label className={labelClass}><Phone size={13}/> Contato</label>
                        <input type="text" name="contato" value={formData.contato} onChange={handleChange} placeholder="(00) 00000-0000" className={inputClass} />
                      </div>

                      <div className="col-span-1 md:col-span-1 lg:col-span-2">
                        <label className={labelClass}><Mail size={13}/> E-mail</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="email@exemplo.com.br" className={inputClass} />
                      </div>

                      <div className="col-span-1 md:col-span-1 lg:col-span-2">
                        <label className={labelClass}><Activity size={13}/> Status Contratual</label>
                        <select name="status" value={formData.status} onChange={handleChange} className={`${inputClass} font-medium text-gray-800 cursor-pointer`}>
                          <option value="Ativo">Ativo</option>
                          <option value="Inativo">Inativo</option>
                          <option value="Com contrato">Com contrato</option>
                          <option value="Sem contrato">Sem contrato</option>
                          <option value="Em prospecção">Em prospecção</option>
                        </select>
                      </div>

                      <div className="col-span-1 md:col-span-2 lg:col-span-4">
                        <label className={labelClass}>Endereço Completo</label>
                        <input type="text" name="endereco" value={formData.endereco} onChange={handleChange} className={inputClass} />
                      </div>

                      <div className="col-span-1 md:col-span-2 lg:col-span-4">
                        <label className={labelClass}>Observações Internas</label>
                        <textarea name="observacoes_internas" value={formData.observacoes_internas} onChange={handleChange} placeholder="Anotações gerais, acordos, pendências..." className={`${inputClass} resize-none h-20`} />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-300">
                    <div className={cardHeaderClass}>
                      <h3 className={cardTitleClass}>
                        <Zap size={14} className="text-gray-500" /> Unidades Consumidoras
                      </h3>
                      <button type="button" onClick={adicionarUC} className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 px-3 py-1.5 text-[11px] font-bold hover:bg-gray-100 transition-all cursor-pointer rounded-none">
                        <Plus size={14} strokeWidth={2} /> Adicionar UC
                      </button>
                    </div>
                    
                    <div className="p-4">
                      <div className="border border-gray-300 bg-white">
                        <div className="grid grid-cols-[120px_1fr_40px] gap-0 border-b border-gray-300 bg-gray-100">
                          <div className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase tracking-wider">Tipo</div>
                          <div className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase tracking-wider border-l border-gray-300">Número da UC</div>
                          <div className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase tracking-wider text-center border-l border-gray-300">Ação</div>
                        </div>
                        
                        <div className="divide-y divide-gray-200">
                          {ucs.map((uc, index) => (
                            <div key={uc.id} className="grid grid-cols-[120px_1fr_40px] gap-0 bg-white group hover:bg-gray-50 transition-colors">
                              <div className="p-1.5">
                                <select 
                                  value={uc.tipo} 
                                  onChange={(e) => handleUCChange(uc.id, 'tipo', e.target.value)} 
                                  className={`w-full h-full border border-gray-300 text-[11px] font-bold px-2 outline-none cursor-pointer rounded-none focus:ring-1 focus:ring-green-500 ${uc.tipo === 'Geradora' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-blue-50 text-blue-800 border-blue-200'}`}
                                >
                                  <option value="Geradora">Geradora</option>
                                  <option value="Beneficiada">Beneficiada</option>
                                </select>
                              </div>
                              
                              <div className="border-l border-gray-200 p-0">
                                <input 
                                  type="text" 
                                  value={uc.numero_uc} 
                                  onChange={(e) => handleUCChange(uc.id, 'numero_uc', e.target.value)} 
                                  placeholder="Digite o número da UC..." 
                                  className="w-full h-full bg-transparent border-none px-3 py-2 text-[12px] outline-none font-medium text-gray-800 focus:bg-white" 
                                />
                              </div>
                              
                              <div className="border-l border-gray-200 flex items-center justify-center bg-white group-hover:bg-gray-50">
                                <button 
                                  type="button" 
                                  onClick={() => index > 0 ? removerUC(uc.id) : null} 
                                  className={`p-1.5 transition-colors rounded-none ${index > 0 ? 'text-gray-400 hover:text-red-600 cursor-pointer' : 'text-gray-200 cursor-not-allowed'}`}
                                  title={index > 0 ? "Remover UC" : "UC Principal não pode ser removida"}
                                >
                                  <Trash2 size={15} strokeWidth={2} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  
                  <div className="bg-white border border-gray-300">
                    <div className={cardHeaderClass}>
                      <h3 className={cardTitleClass}>
                        <Calendar size={14} className="text-gray-500" /> Faturamento
                      </h3>
                    </div>
                    <div className="p-4 space-y-4">
                      <div>
                        <label className={labelClass}>Dia de Vencimento</label>
                        <input type="number" name="dia_vencimento" value={formData.dia_vencimento} onChange={handleChange} placeholder="Ex: 15" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Mês Últ. Relatório</label>
                        <input type="text" name="ultimo_relatorio" value={formData.ultimo_relatorio} onChange={handleChange} placeholder="Ex: Abr/26" className={inputClass} />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-300">
                    <div className={cardHeaderClass}>
                      <h3 className={cardTitleClass}>
                        <Key size={14} className="text-gray-500" /> Credenciais
                      </h3>
                    </div>
                    <div className="p-4 space-y-4">
                      
                      <div className="border border-gray-300 bg-white p-3">
                        <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-2.5 flex items-center gap-1.5"><Zap size={13}/> Portal CPFL</label>
                        <div className="space-y-2">
                          <input type="text" name="login_cpfl" value={formData.login_cpfl} onChange={handleChange} placeholder="Login ou CPF/CNPJ" className={inputClass} />
                          <input type="text" name="senha_cpfl" value={formData.senha_cpfl} onChange={handleChange} placeholder="Senha de Acesso" className={inputClass} />
                        </div>
                      </div>

                      <div className="border border-gray-300 bg-white p-3">
                        <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-2.5 flex items-center gap-1.5"><Activity size={13}/> Portal Inversor</label>
                        <div className="space-y-2">
                          <input type="text" name="plataforma_inversor" value={formData.plataforma_inversor} onChange={handleChange} placeholder="Nome da Plataforma" className={inputClass} />
                          <input type="text" name="login_app" value={formData.login_app} onChange={handleChange} placeholder="Login do Aplicativo" className={inputClass} />
                          <input type="text" name="senha_app" value={formData.senha_app} onChange={handleChange} placeholder="Senha do Aplicativo" className={inputClass} />
                        </div>
                      </div>
                      
                    </div>
                  </div>
                  
                </div>
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}