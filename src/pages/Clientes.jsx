import { useState, useEffect } from 'react';
import { 
  Save, Loader2, Plus, Trash2, X, 
  Search, Zap, User, Key, Calendar, 
  Phone, FileText, Activity, Mail, Copy,
  CheckCircle2, AlertCircle, FileX, Filter
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { STATUS_CLIENTE, STATUS_CLIENTE_LISTA, STATUS_CLIENTE_PADRAO } from '../lib/statusCliente';

// Id local só para identificar a linha de UC na tela (chave do React e alvo de
// edição/remoção). Date.now() gerava chave duplicada em dois cliques no mesmo
// milissegundo, o que fazia o React remover/editar a linha errada.
let proximoIdUC = 0;
const novaUC = (tipo) => ({ id: `uc-${++proximoIdUC}`, tipo, numero_uc: '' });

export function Clientes() {
  const [view, setView] = useState('lista'); 
  
  const [clientesLista, setClientesLista] = useState([]);
  const [loadingLista, setLoadingLista] = useState(true);
  
  // Filtros da tabela
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('Todos');

  const [loadingForm, setLoadingForm] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null);

  // Mensagem de falha exibida no rodapé (some sozinha depois de alguns segundos)
  const [erro, setErro] = useState('');

  // Endereço como estava ao abrir o formulário — evita repetir a geocodificação
  // (API pública, limitada a 1 req/s) quando o endereço não foi alterado.
  const [enderecoOriginal, setEnderecoOriginal] = useState('');
  
  const [formData, setFormData] = useState({
    nome_razao_social: '', documento: '', contato: '', email: '', status: STATUS_CLIENTE_PADRAO,
    endereco: '', login_cpfl: '', senha_cpfl: '', plataforma_inversor: '', 
    login_app: '', senha_app: '', observacoes_internas: ''
  });
  
  const [ucs, setUcs] = useState(() => [novaUC('Geradora')]);

  // ==========================================
  // NOVOS ESTADOS: GESTÃO DE CONTRATO
  // ==========================================
  const [dataInicioContrato, setDataInicioContrato] = useState('');
  const [duracaoMeses, setDuracaoMeses] = useState('12'); // Padrão 1 ano
  const [dataTerminoCalculada, setDataTerminoCalculada] = useState('');
  const [ultimoRelatorioAuto, setUltimoRelatorioAuto] = useState('Nunca feito');

  // Calcula a data de término automaticamente
  useEffect(() => {
    if (!dataInicioContrato) return;
    
    const [ano, mes, dia] = dataInicioContrato.split('-');
    const dataIni = new Date(ano, mes - 1, dia);
    
    // Soma os meses da duração
    dataIni.setMonth(dataIni.getMonth() + parseInt(duracaoMeses));
    
    const diaF = String(dataIni.getDate()).padStart(2, '0');
    const mesF = String(dataIni.getMonth() + 1).padStart(2, '0');
    const anoF = dataIni.getFullYear();
    
    setDataTerminoCalculada(`${diaF}/${mesF}/${anoF}`);
  }, [dataInicioContrato, duracaoMeses]);

  // Lê o último relatório gerado pelo cliente no banco
  const carregarUltimoRelatorio = async (clienteId) => {
    if (!clienteId) {
      setUltimoRelatorioAuto('Nunca feito');
      return;
    }
    const { data, error } = await supabase
      .from('relatorios')
      .select('mes_referencia')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!error && data && data.length > 0) {
      setUltimoRelatorioAuto(data[0].mes_referencia);
    } else {
      setUltimoRelatorioAuto('Nunca feito');
    }
  };
  // ==========================================

  const fetchClientes = async () => {
    setLoadingLista(true);
    const { data, error } = await supabase.from('clientes').select('*').order('nome_razao_social');
    if (error) {
      console.error('Erro ao buscar:', error);
      setErro('Não foi possível carregar os clientes. Verifique a conexão e recarregue a página.');
    } else {
      setClientesLista(data || []);
    }
    setLoadingLista(false);
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  useEffect(() => {
    if (!erro) return;
    const t = setTimeout(() => setErro(''), 6000);
    return () => clearTimeout(t);
  }, [erro]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleUCChange = (id, campo, valor) => setUcs(ucs.map(uc => uc.id === id ? { ...uc, [campo]: valor } : uc));
  const adicionarUC = () => setUcs([...ucs, novaUC('Beneficiada')]);
  const removerUC = (id) => setUcs(ucs.filter(uc => uc.id !== id));

  const prepararNovoCliente = () => {
    setClienteEditando(null);
    setFormData({
      nome_razao_social: '', documento: '', contato: '', email: '', status: STATUS_CLIENTE_PADRAO,
      endereco: '', login_cpfl: '', senha_cpfl: '', plataforma_inversor: '', 
      login_app: '', senha_app: '', observacoes_internas: ''
    });
    setUcs([novaUC('Geradora')]);
    setEnderecoOriginal('');

    // Reseta Contrato
    setDataInicioContrato('');
    setDuracaoMeses('12');
    setDataTerminoCalculada('');
    setUltimoRelatorioAuto('Nunca feito');
    
    setView('form');
  };

  const abrirClienteParaEdicao = (cliente) => {
    setClienteEditando(cliente.id);
    setFormData({
      nome_razao_social: cliente.nome_razao_social || '',
      documento: cliente.documento || '',
      contato: cliente.contato || '',
      email: cliente.email || '',
      status: cliente.status || STATUS_CLIENTE_PADRAO,
      endereco: cliente.endereco || '',
      login_cpfl: cliente.login_cpfl || '',
      senha_cpfl: cliente.senha_cpfl || '',
      plataforma_inversor: cliente.plataforma_inversor || '',
      login_app: cliente.login_app || '',
      senha_app: cliente.senha_app || '',
      observacoes_internas: cliente.observacoes_internas || ''
    });
    setEnderecoOriginal(cliente.endereco || '');

    if (cliente.ucs && cliente.ucs.length > 0) {
      setUcs(cliente.ucs);
    } else {
      setUcs([novaUC('Geradora')]);
    }

    // Carrega dados de contrato
    setDataTerminoCalculada(cliente.dia_vencimento || ''); // Puxa o término salvo no banco
    setDataInicioContrato(''); // Fica limpo para caso ele queira calcular um novo
    setDuracaoMeses('12');
    carregarUltimoRelatorio(cliente.id); // Puxa o último relatório dinâmico
    
    setView('form');
  };

  const handleSalvar = async () => {
    if (!formData.nome_razao_social) {
      setErro('O Nome/Razão Social é obrigatório.');
      return;
    }

    setLoadingForm(true);
    try {
      // Salva a data calculada direto na coluna 'dia_vencimento'
      const payload = {
        ...formData,
        dia_vencimento: dataTerminoCalculada || null,
        ultimo_relatorio: ultimoRelatorioAuto !== 'Nunca feito' ? ultimoRelatorioAuto : null,
        ucs: ucs
      };

      const endereco = formData.endereco?.trim() || '';
      const enderecoMudou = endereco !== (enderecoOriginal?.trim() || '');

      if (!endereco) {
        payload.lat = null;
        payload.lng = null;
      } else if (enderecoMudou) {
        // Só consulta o Nominatim quando o endereço é novo ou foi alterado.
        // Sem mudança, lat/lng ficam fora do payload e o banco mantém o valor atual.
        try {
          let query = endereco;
          if (!query.toLowerCase().includes('brasil')) query += ', Brasil';

          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
            headers: { 'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7' }
          });
          const geoData = await res.json();

          if (geoData && geoData.length > 0) {
            payload.lat = parseFloat(geoData[0].lat);
            payload.lng = parseFloat(geoData[0].lon);
          } else {
            payload.lat = null;
            payload.lng = null;
          }
        } catch (e) {
          console.error("Erro ao buscar coordenadas na hora de salvar:", e);
        }
      }

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
      setErro(`Não foi possível salvar o cliente: ${error.message || error.details || 'erro desconhecido'}`);
    } finally {
      setLoadingForm(false);
    }
  };

  // Lógica Comercial de Filtros e Contadores
  const clientesFiltrados = clientesLista.filter(c => {
    const matchBusca = c.nome_razao_social.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === 'Todos' || c.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  const total = clientesFiltrados.length;
  const comContrato = clientesFiltrados.filter(c => c.status === STATUS_CLIENTE.COM_CONTRATO).length;
  const semContrato = clientesFiltrados.filter(c => c.status === STATUS_CLIENTE.SEM_CONTRATO).length;
  const prospeccao = clientesFiltrados.filter(c => c.status === STATUS_CLIENTE.EM_PROSPECCAO).length;

  const renderStatus = (status) => {
    const stat = status || STATUS_CLIENTE_PADRAO;

    if (stat === STATUS_CLIENTE.COM_CONTRATO) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-green-400 text-green-700 bg-transparent rounded-sm text-[11px] font-bold">
          <CheckCircle2 size={13} /> {STATUS_CLIENTE.COM_CONTRATO}
        </span>
      );
    }
    if (stat === STATUS_CLIENTE.SEM_CONTRATO) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-red-400 text-red-700 bg-transparent rounded-sm text-[11px] font-bold">
          <FileX size={13} /> {STATUS_CLIENTE.SEM_CONTRATO}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-yellow-400 text-yellow-700 bg-transparent rounded-sm text-[11px] font-bold">
        <AlertCircle size={13} /> {STATUS_CLIENTE.EM_PROSPECCAO}
      </span>
    );
  };

  const renderCelulaComCopia = (texto, estiloPadrao = "text-[12px] text-gray-700 font-medium") => {
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
            className="p-1 text-gray-400 hover:text-green-600 opacity-0 group-hover:opacity-100 transition-all cursor-pointer rounded-none shrink-0"
            title="Copiar"
          >
            <Copy size={13} strokeWidth={2.5} />
          </button>
        )}
      </div>
    );
  };

  const inputClass = "w-full bg-white border border-gray-400 px-3 py-2 text-[12px] text-gray-800 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 transition-all rounded-none placeholder:text-gray-500";
  const labelClass = "block text-[11px] font-bold text-gray-700 mb-1.5 uppercase tracking-wider flex items-center gap-1.5";
  const cardHeaderClass = "px-3 py-2 border-b border-gray-400 bg-gray-200 flex items-center justify-between";
  const cardTitleClass = "text-[11px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2";

  return (
    <div className="w-full h-full flex flex-col relative">

      {/* AVISO DE FALHA (carregar ou salvar) */}
      {erro && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] max-w-[90vw] bg-red-600 text-white px-4 py-2.5 rounded-none shadow-sm text-[13px] font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <AlertCircle size={16} className="shrink-0" />
          {erro}
        </div>
      )}

      <div className="flex flex-col h-full bg-white border border-gray-400 shadow-sm animate-in fade-in duration-300 antialiased text-sm">

        {/* CABEÇALHO / CONTROLES IDÊNTICO AO MONITORAMENTO */}
        <div className="flex flex-col lg:flex-row items-center gap-2 p-3 md:p-4 border-b border-gray-400 shrink-0 w-full bg-white">
          
          <div className="relative flex-1 w-full lg:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input 
              type="text" 
              placeholder="Buscar em cliente, documento ou email..." 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-400 rounded-none text-[13px] font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 placeholder:text-gray-500 transition-all"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto shrink-0 justify-end">
            
            <div className="relative">
               <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                 <Filter size={14} className="text-gray-600" />
               </div>
              <select 
                value={filtroStatus} 
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="bg-white border border-gray-400 pl-8 pr-8 py-2 text-[12px] text-gray-700 outline-none focus:ring-1 focus:ring-green-500 font-medium rounded-none cursor-pointer appearance-none"
              >
                <option value="Todos">Todos os status</option>
                {STATUS_CLIENTE_LISTA.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
               <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-600">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
               </div>
            </div>

            <button 
              onClick={prepararNovoCliente}
              className="flex items-center justify-center gap-1.5 bg-green-700 text-white px-3 py-2 rounded-none text-[12px] font-medium hover:bg-green-800 transition-all cursor-pointer"
            >
              <Plus size={14} strokeWidth={2} /> Adicionar
            </button>
          </div>
        </div>

        {/* BARRA DE RESUMO COMERCIAL */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-gray-400 bg-white shrink-0">
          <div className="px-4 py-2 border-r border-gray-400 text-[12px] text-gray-800">
            <span className="font-extrabold">{total}</span> cadastros
          </div>
          <div className="px-4 py-2 border-r border-gray-400 text-[12px] text-green-700">
            <span className="font-extrabold">{comContrato}</span> com contrato
          </div>
          <div className="px-4 py-2 border-r border-gray-400 text-[12px] text-red-600">
            <span className="font-extrabold">{semContrato}</span> sem contrato
          </div>
          <div className="hidden sm:block px-4 py-2 text-[12px] text-yellow-600">
            <span className="font-extrabold">{prospeccao}</span> em prospecção
          </div>
        </div>

        {/* TABELA DE CLIENTES */}
        <div className="flex-1 overflow-y-auto bg-white flex flex-col">
          {loadingLista ? (
            <div className="flex justify-center items-center flex-1 text-gray-500 text-[13px] min-h-[200px]">
              <Loader2 className="animate-spin mr-2" size={18} /> Carregando cadastros...
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="bg-gray-100 sticky top-0 z-10 border-b border-gray-400">
                  <tr className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                    <th className="px-4 py-3 border-r border-gray-400">Cliente / Empresa</th>
                    <th className="px-4 py-3 border-r border-gray-400 text-center">UCs</th>
                    <th className="px-4 py-3 border-r border-gray-400">Status Comercial</th>
                    <th className="px-4 py-3 border-r border-gray-400">CNPJ/CPF</th>
                    <th className="px-4 py-3 border-r border-gray-400">Contato</th>
                    <th className="px-4 py-3 border-r border-gray-400">E-mail</th>
                    <th className="px-4 py-3">Endereço</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {clientesFiltrados.map((cliente) => (
                    <tr 
                      key={cliente.id} 
                      onClick={() => abrirClienteParaEdicao(cliente)}
                      className="hover:bg-gray-100/50 transition-colors group cursor-pointer"
                    >
                      <td className="px-4 py-2.5 border-r border-gray-300 min-w-[200px]">
                        {renderCelulaComCopia(cliente.nome_razao_social, "font-medium text-[12px] text-gray-700")}
                      </td>
                      <td className="px-4 py-2.5 border-r border-gray-300 text-center">
                        <span className="inline-flex items-center justify-center px-1.5 py-0.5 bg-gray-200 text-gray-700 font-bold text-[11px] border border-gray-300">
                          {cliente.ucs ? cliente.ucs.length : 0}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 border-r border-gray-300">
                        {renderStatus(cliente.status)}
                      </td>
                      <td className="px-4 py-2.5 border-r border-gray-300 min-w-[130px]">
                        {renderCelulaComCopia(cliente.documento, "text-[12px] text-gray-700 font-medium")}
                      </td>
                      <td className="px-4 py-2.5 border-r border-gray-300 min-w-[130px]">
                        {renderCelulaComCopia(cliente.contato, "text-[12px] text-gray-700 font-medium")}
                      </td>
                      <td className="px-4 py-2.5 border-r border-gray-300 min-w-[160px]">
                        {renderCelulaComCopia(cliente.email, "text-[12px] text-gray-700 font-medium")}
                      </td>
                      <td className="px-4 py-2.5 min-w-[200px] max-w-[300px]">
                        {renderCelulaComCopia(cliente.endereco, "text-[12px] text-gray-700 font-medium")}
                      </td>
                    </tr>
                  ))}
                  {clientesFiltrados.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-[12px] text-gray-500">
                        Nenhum cadastro encontrado na busca.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DO FORMULÁRIO */}
      {view === 'form' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4 md:p-6 lg:p-8">
          
          <div className="bg-[#f8f9fa] w-full max-w-[1400px] max-h-full flex flex-col shadow-2xl border border-gray-400 animate-in zoom-in-95 duration-200">
            
            <div className="flex flex-row justify-between items-center gap-3 p-3 md:p-4 border-b border-gray-400 shrink-0 w-full bg-gray-100">
              <div className="flex items-center gap-3">
                <button onClick={() => setView('lista')} className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer rounded-none border border-transparent hover:border-red-200">
                  <X size={18} strokeWidth={2.5} />
                </button>
                <div className="h-5 w-px bg-gray-300" />
                <h2 className="text-[13px] font-bold text-gray-800 uppercase tracking-wider">
                  {clienteEditando ? 'Edição de Cadastro' : 'Novo Cadastro'}
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
                  
                  <div className="bg-white border border-gray-400">
                    <div className={cardHeaderClass}>
                      <h3 className={cardTitleClass}>
                        <User size={14} className="text-gray-600" /> Informações Principais
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
                        <label className={labelClass}><Activity size={13}/> Status Comercial</label>
                        <select name="status" value={formData.status} onChange={handleChange} className={`${inputClass} font-medium text-gray-800 cursor-pointer`}>
                          {STATUS_CLIENTE_LISTA.map(s => <option key={s} value={s}>{s}</option>)}
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

                  <div className="bg-white border border-gray-400">
                    <div className={cardHeaderClass}>
                      <h3 className={cardTitleClass}>
                        <Zap size={14} className="text-gray-600" /> Unidades Consumidoras
                      </h3>
                      <button type="button" onClick={adicionarUC} className="flex items-center gap-1.5 bg-white border border-gray-400 text-gray-700 px-3 py-1.5 text-[11px] font-bold hover:bg-gray-200 transition-all cursor-pointer rounded-none">
                        <Plus size={14} strokeWidth={2} /> Adicionar UC
                      </button>
                    </div>
                    
                    <div className="p-4">
                      <div className="border border-gray-400 bg-white">
                        <div className="grid grid-cols-[120px_1fr_40px] gap-0 border-b border-gray-400 bg-gray-200">
                          <div className="px-3 py-2 text-[11px] font-bold text-gray-700 uppercase tracking-wider">Tipo</div>
                          <div className="px-3 py-2 text-[11px] font-bold text-gray-700 uppercase tracking-wider border-l border-gray-400">Número da UC</div>
                          <div className="px-3 py-2 text-[11px] font-bold text-gray-700 uppercase tracking-wider text-center border-l border-gray-400">Ação</div>
                        </div>
                        
                        <div className="divide-y divide-gray-200">
                          {ucs.map((uc, index) => (
                            <div key={uc.id} className="grid grid-cols-[120px_1fr_40px] gap-0 bg-white group hover:bg-gray-100 transition-colors">
                              <div className="p-1.5">
                                <select 
                                  value={uc.tipo} 
                                  onChange={(e) => handleUCChange(uc.id, 'tipo', e.target.value)} 
                                  className={`w-full h-full border border-gray-400 text-[11px] font-bold px-2 outline-none cursor-pointer rounded-none focus:ring-1 focus:ring-green-500 ${uc.tipo === 'Geradora' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-blue-50 text-blue-800 border-blue-200'}`}
                                >
                                  <option value="Geradora">Geradora</option>
                                  <option value="Beneficiada">Beneficiada</option>
                                </select>
                              </div>
                              
                              <div className="border-l border-gray-300 p-0">
                                <input 
                                  type="text" 
                                  value={uc.numero_uc} 
                                  onChange={(e) => handleUCChange(uc.id, 'numero_uc', e.target.value)} 
                                  placeholder="Digite o número da UC..." 
                                  className="w-full h-full bg-transparent border-none px-3 py-2 text-[12px] outline-none font-medium text-gray-800 focus:bg-white" 
                                />
                              </div>
                              
                              <div className="border-l border-gray-300 flex items-center justify-center bg-white group-hover:bg-gray-100">
                                <button 
                                  type="button" 
                                  onClick={() => index > 0 ? removerUC(uc.id) : null} 
                                  className={`p-1.5 transition-colors rounded-none ${index > 0 ? 'text-gray-500 hover:text-red-600 cursor-pointer' : 'text-gray-200 cursor-not-allowed'}`}
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
                  
                  {/* NOVO BLOCO: GESTÃO DE CONTRATO E HISTÓRICO */}
                  <div className="bg-white border border-gray-400">
                    <div className={cardHeaderClass}>
                      <h3 className={cardTitleClass}>
                        <Calendar size={14} className="text-gray-600" /> Gestão de Contrato
                      </h3>
                    </div>
                    <div className="p-4 space-y-4">
                      <div>
                        <label className={labelClass}>Data de Início do Contrato</label>
                        <input 
                          type="date" 
                          value={dataInicioContrato} 
                          onChange={(e) => setDataInicioContrato(e.target.value)} 
                          className={inputClass} 
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Duração do Contrato</label>
                        <select 
                          value={duracaoMeses} 
                          onChange={(e) => setDuracaoMeses(e.target.value)}
                          className={`${inputClass} cursor-pointer font-medium`}
                        >
                          <option value="6">6 Meses</option>
                          <option value="12">1 Ano (12 Meses)</option>
                          <option value="18">18 Meses</option>
                          <option value="24">2 Anos (24 Meses)</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Término (Calculado)</label>
                        <input 
                          type="text" 
                          disabled 
                          value={dataTerminoCalculada || 'Defina a data de início'} 
                          className="w-full bg-gray-200 border border-gray-400 px-3 py-2 text-[12px] text-gray-700 font-bold rounded-none" 
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Mês Últ. Relatório</label>
                        <input 
                          type="text" 
                          disabled 
                          value={ultimoRelatorioAuto} 
                          className={`w-full bg-gray-200 border border-gray-400 px-3 py-2 text-[12px] font-extrabold rounded-none ${ultimoRelatorioAuto === 'Nunca feito' ? 'text-gray-500' : 'text-green-700'}`} 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-400">
                    <div className={cardHeaderClass}>
                      <h3 className={cardTitleClass}>
                        <Key size={14} className="text-gray-600" /> Credenciais Operacionais
                      </h3>
                    </div>
                    <div className="p-4 space-y-4">
                      
                      <div className="border border-gray-400 bg-white p-3">
                        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5"><Zap size={13}/> Portal CPFL</label>
                        <div className="space-y-2">
                          <input type="text" name="login_cpfl" value={formData.login_cpfl} onChange={handleChange} placeholder="Login ou CPF/CNPJ" className={inputClass} />
                          <input type="text" name="senha_cpfl" value={formData.senha_cpfl} onChange={handleChange} placeholder="Senha de Acesso" className={inputClass} />
                        </div>
                      </div>

                      <div className="border border-gray-400 bg-white p-3">
                        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5"><Activity size={13}/> Portal Inversor</label>
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