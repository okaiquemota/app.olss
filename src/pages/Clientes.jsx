import { useState, useEffect } from 'react';
import { 
  Save, Loader2, Plus, Trash2, ArrowLeft, 
  Search, Edit2, Zap, User, Key, Calendar, 
  Phone, FileText, Activity
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Clientes() {
  const [view, setView] = useState('lista');
  
  const [clientesLista, setClientesLista] = useState([]);
  const [loadingLista, setLoadingLista] = useState(true);
  const [busca, setBusca] = useState('');

  const [loadingForm, setLoadingForm] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null);
  
  const [formData, setFormData] = useState({
    nome_razao_social: '', documento: '', contato: '', status: 'Ativo',
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
    if (view === 'lista') fetchClientes();
  }, [view]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleUCChange = (id, campo, valor) => setUcs(ucs.map(uc => uc.id === id ? { ...uc, [campo]: valor } : uc));
  const adicionarUC = () => setUcs([...ucs, { id: Date.now(), tipo: 'Beneficiada', numero_uc: '' }]);
  const removerUC = (id) => setUcs(ucs.filter(uc => uc.id !== id));

  const prepararNovoCliente = () => {
    setClienteEditando(null);
    setFormData({
      nome_razao_social: '', documento: '', contato: '', status: 'Ativo',
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
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao salvar: ' + (error.message || error.details));
    } finally {
      setLoadingForm(false);
    }
  };

  const clientesFiltrados = clientesLista.filter(c => 
    c.nome_razao_social.toLowerCase().includes(busca.toLowerCase())
  );

  const getStatusCor = (status) => {
    switch (status) {
      case 'Ativo': return 'bg-green-50 text-green-700 border-green-200/60';
      case 'Inativo': return 'bg-red-50 text-red-700 border-red-200/60';
      case 'Com contrato': return 'bg-blue-50 text-blue-700 border-blue-200/60';
      case 'Sem contrato': return 'bg-orange-50 text-orange-700 border-orange-200/60';
      case 'Em prospecção': return 'bg-purple-50 text-purple-700 border-purple-200/60';
      default: return 'bg-gray-50 text-gray-700 border-gray-200/60';
    }
  };

  // ==========================================
  // RENDERIZAÇÃO: TELA DE LISTA
  // ==========================================
  if (view === 'lista') {
    return (
      <div className="w-full px-6 md:px-8 h-[calc(100vh-80px)] flex flex-col animate-in fade-in duration-300 py-4 antialiased text-sm">
        
        {/* CABEÇALHO DA TELA (Barra de busca estendida) */}
        <div className="flex flex-col md:flex-row items-center gap-3 mb-6 shrink-0 w-full">
          
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar cliente..." 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200/60 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
            />
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <button 
              onClick={prepararNovoCliente}
              className="flex items-center justify-center gap-1.5 bg-green-700 text-white px-4 py-2.5 rounded-xl text-[13px] font-medium hover:bg-green-800 transition-all shadow-sm shrink-0 cursor-pointer flex-1 md:flex-none"
            >
              <Plus size={16} strokeWidth={2} /> Adicionar
            </button>
          </div>
        </div>

        {/* TABELA DE CLIENTES */}
        <div className="flex-1 bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-200/60 overflow-hidden flex flex-col">
          {loadingLista ? (
            <div className="flex justify-center items-center flex-1 text-gray-400 text-[13px]">
              <Loader2 className="animate-spin mr-2" size={18} /> Carregando clientes...
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="bg-gray-50/80 backdrop-blur-sm sticky top-0 z-10">
                  <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                    <th className="px-6 py-4">Cliente / Empresa</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Documento</th>
                    <th className="px-6 py-4">Contato</th>
                    <th className="px-6 py-4">Últ. Relatório</th>
                    <th className="px-6 py-4 text-center">UCs</th>
                    <th className="px-6 py-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100/60">
                  {clientesFiltrados.map((cliente) => (
                    <tr 
                      key={cliente.id} 
                      onClick={() => abrirClienteParaEdicao(cliente)}
                      className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-[13px] text-gray-800 truncate max-w-[250px]">{cliente.nome_razao_social}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${getStatusCor(cliente.status)}`}>
                          {cliente.status || 'Ativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[13px] text-gray-500 font-medium">
                        {cliente.documento || '--'}
                      </td>
                      <td className="px-6 py-4 text-[13px] text-gray-500 font-medium">
                        {cliente.contato || '--'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[13px] font-medium text-gray-600">
                          {cliente.ultimo_relatorio || '--'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-500 font-bold text-[11px]">
                          {cliente.ucs ? cliente.ucs.length : 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors cursor-pointer mx-auto opacity-0 group-hover:opacity-100">
                          <Edit2 size={16} strokeWidth={1.5} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {clientesFiltrados.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-[13px] text-gray-400">
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
    );
  }

  // ==========================================
  // RENDERIZAÇÃO: TELA DE FORMULÁRIO
  // ==========================================
  return (
    <div className="w-full px-6 md:px-8 h-[calc(100vh-80px)] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300 py-4 antialiased text-sm overflow-y-auto">
      
      <div className="max-w-5xl mx-auto w-full space-y-6 pb-10">
        
        {/* CABEÇALHO FLUTUANTE */}
        <div className="flex justify-between items-center bg-white/70 backdrop-blur-md p-3.5 px-5 rounded-2xl border border-gray-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('lista')} className="p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all cursor-pointer">
              <ArrowLeft size={18} strokeWidth={2} />
            </button>
            <div>
              <h2 className="text-base font-bold text-gray-800 leading-tight">{clienteEditando ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <p className="text-gray-500 text-[11px] mt-0.5">{clienteEditando ? 'Atualize as informações da usina' : 'Cadastre uma nova usina na base'}</p>
            </div>
          </div>
          
          <button onClick={handleSalvar} disabled={loadingForm} className="flex items-center gap-1.5 bg-green-700 text-white px-5 py-2.5 rounded-xl text-[13px] font-medium hover:bg-green-800 transition-all shadow-sm cursor-pointer disabled:opacity-50">
            {loadingForm ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} strokeWidth={2} />}
            <span className="hidden sm:inline">{loadingForm ? 'Salvando...' : 'Salvar Cliente'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Lado Esquerdo */}
          <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-200/60">
              <h3 className="text-[14px] font-bold text-gray-800 mb-5 flex items-center gap-2">
                <User size={16} className="text-gray-400" /> Informações Principais
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Nome / Razão Social *</label>
                  <input type="text" name="nome_razao_social" value={formData.nome_razao_social} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200/60 rounded-xl p-2.5 text-[13px] focus:bg-white focus:ring-1 focus:ring-green-500 outline-none transition-all" />
                </div>
                
                <div className="col-span-1">
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider flex items-center gap-1"><FileText size={12}/> CPF / CNPJ</label>
                  <input type="text" name="documento" value={formData.documento} onChange={handleChange} placeholder="000.000.000-00" className="w-full bg-gray-50 border border-gray-200/60 rounded-xl p-2.5 text-[13px] focus:bg-white focus:ring-1 focus:ring-green-500 outline-none transition-all" />
                </div>
                
                <div className="col-span-1">
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider flex items-center gap-1"><Phone size={12}/> Contato</label>
                  <input type="text" name="contato" value={formData.contato} onChange={handleChange} placeholder="(00) 00000-0000" className="w-full bg-gray-50 border border-gray-200/60 rounded-xl p-2.5 text-[13px] focus:bg-white focus:ring-1 focus:ring-green-500 outline-none transition-all" />
                </div>

                <div className="col-span-1">
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider flex items-center gap-1"><Activity size={12}/> Status Contratual</label>
                  <select name="status" value={formData.status} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200/60 rounded-xl p-2.5 text-[13px] focus:bg-white focus:ring-1 focus:ring-green-500 outline-none transition-all font-medium text-gray-700 cursor-pointer">
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                    <option value="Com contrato">Com contrato</option>
                    <option value="Sem contrato">Sem contrato</option>
                    <option value="Em prospecção">Em prospecção</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Endereço Principal</label>
                  <input type="text" name="endereco" value={formData.endereco} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200/60 rounded-xl p-2.5 text-[13px] focus:bg-white focus:ring-1 focus:ring-green-500 outline-none transition-all" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Observações Internas</label>
                  <textarea name="observacoes_internas" value={formData.observacoes_internas} onChange={handleChange} placeholder="Anotações gerais do cliente..." className="w-full bg-gray-50 border border-gray-200/60 rounded-xl p-2.5 text-[13px] focus:bg-white focus:ring-1 focus:ring-green-500 outline-none transition-all resize-none h-20" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-200/60">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-[14px] font-bold text-gray-800 flex items-center gap-2">
                  <Zap size={16} className="text-gray-400" /> Unidades Consumidoras
                </h3>
                <button type="button" onClick={adicionarUC} className="flex items-center gap-1 bg-white border border-gray-200/60 text-gray-600 px-3 py-1.5 rounded-lg text-[11px] font-semibold hover:bg-gray-50 transition-all cursor-pointer">
                  <Plus size={14} /> Adicionar UC
                </button>
              </div>
              <div className="space-y-2">
                {ucs.map((uc, index) => (
                  <div key={uc.id} className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200/60">
                    <select value={uc.tipo} onChange={(e) => handleUCChange(uc.id, 'tipo', e.target.value)} className={`border-none text-[12px] font-semibold py-1.5 px-2 rounded-lg outline-none cursor-pointer ${uc.tipo === 'Geradora' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      <option value="Geradora">Geradora</option>
                      <option value="Beneficiada">Beneficiada</option>
                    </select>
                    <input type="text" value={uc.numero_uc} onChange={(e) => handleUCChange(uc.id, 'numero_uc', e.target.value)} placeholder="Nº da Unidade Consumidora" className="flex-1 bg-transparent border-none px-2 py-1.5 text-[13px] outline-none font-medium text-gray-700" />
                    {index > 0 && (
                      <button type="button" onClick={() => removerUC(uc.id)} className="p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-lg cursor-pointer transition-colors mr-1">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Lado Direito - Controle e Acessos */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-200/60">
              <h3 className="text-[14px] font-bold text-gray-800 mb-5 flex items-center gap-2">
                <Calendar size={16} className="text-gray-400" /> Controle
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Dia de Vencimento</label>
                  <input type="number" name="dia_vencimento" value={formData.dia_vencimento} onChange={handleChange} placeholder="Ex: 15" className="w-full bg-gray-50 border border-gray-200/60 rounded-xl p-2.5 text-[13px] focus:bg-white focus:ring-1 focus:ring-green-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Mês Último Relatório</label>
                  <input type="text" name="ultimo_relatorio" value={formData.ultimo_relatorio} onChange={handleChange} placeholder="Ex: Abr/26" className="w-full bg-gray-50 border border-gray-200/60 rounded-xl p-2.5 text-[13px] focus:bg-white focus:ring-1 focus:ring-green-500 outline-none transition-all" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-200/60">
              <h3 className="text-[14px] font-bold text-gray-800 mb-2 flex items-center gap-2">
                <Key size={16} className="text-gray-400" /> Credenciais
              </h3>
              <p className="text-[11px] text-gray-400 mb-5 leading-relaxed">As credenciais do App alimentarão a tela de Monitoramento automaticamente.</p>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">Portal CPFL</label>
                  <div className="space-y-2">
                    <input type="text" name="login_cpfl" value={formData.login_cpfl} onChange={handleChange} placeholder="Login / CPF" className="w-full bg-white border border-gray-200/60 rounded-xl p-2.5 text-[13px] outline-none focus:ring-1 focus:ring-green-500 transition-all" />
                    <input type="text" name="senha_cpfl" value={formData.senha_cpfl} onChange={handleChange} placeholder="Senha" className="w-full bg-white border border-gray-200/60 rounded-xl p-2.5 text-[13px] outline-none focus:ring-1 focus:ring-green-500 transition-all" />
                  </div>
                </div>

                <div className="bg-blue-50/30 p-4 rounded-2xl border border-blue-100/50">
                  <label className="block text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-2.5">App Inversor</label>
                  <div className="space-y-2">
                    <input type="text" name="plataforma_inversor" value={formData.plataforma_inversor} onChange={handleChange} placeholder="Plataforma (Ex: Solarman)" className="w-full bg-white border border-gray-200/60 rounded-xl p-2.5 text-[13px] outline-none focus:ring-1 focus:ring-blue-500 transition-all" />
                    <input type="text" name="login_app" value={formData.login_app} onChange={handleChange} placeholder="Login App" className="w-full bg-white border border-gray-200/60 rounded-xl p-2.5 text-[13px] outline-none focus:ring-1 focus:ring-blue-500 transition-all" />
                    <input type="text" name="senha_app" value={formData.senha_app} onChange={handleChange} placeholder="Senha App" className="w-full bg-white border border-gray-200/60 rounded-xl p-2.5 text-[13px] outline-none focus:ring-1 focus:ring-blue-500 transition-all" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}