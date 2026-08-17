import { useState, useEffect } from 'react';
import {
  Search, Download, LayoutGrid, Copy, ExternalLink, Loader2, Filter, X, Trash2
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Monitoramento() {
  const [credenciais, setCredenciais] = useState([]);
  const [plataformas, setPlataformas] = useState([]); // Base de plataformas real
  const [loading, setLoading] = useState(true);
  
  // Filtros e Modais
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  const [filtroPlataforma, setFiltroPlataforma] = useState('Todas as plataformas');
  const [isPlataformasModalOpen, setIsPlataformasModalOpen] = useState(false);

  // Estados do Form de Nova Plataforma
  const [novaPlataformaNome, setNovaPlataformaNome] = useState('');
  const [novaPlataformaLink, setNovaPlataformaLink] = useState('');
  const [loadingPlataforma, setLoadingPlataforma] = useState(false);

  const fetchDados = async () => {
    setLoading(true);
    
    // 1. Busca os clientes (Apenas Com contrato)
    const { data: clientesData, error: clientesError } = await supabase
      .from('clientes')
      .select('id, nome_razao_social, plataforma_inversor, status_monitoramento, login_app, senha_app, observacoes_internas, status')
      .order('nome_razao_social');
      
    // 2. Busca as plataformas cadastradas
    const { data: platsData, error: platsError } = await supabase
      .from('plataformas')
      .select('*')
      .order('nome');

    if (!platsError) {
      setPlataformas(platsData || []);
    }

    if (clientesError) {
      console.error('Erro ao buscar monitoramento:', clientesError);
    } else {
      const dataNormalizada = (clientesData || [])
        .filter(c => c.status === 'Com contrato')
        .map(c => ({
          ...c,
          status_monitoramento: c.status_monitoramento?.toLowerCase() || 'normal'
        }));
      setCredenciais(dataNormalizada);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDados();
  }, []);

  // Aplicação dos filtros
  const dadosFiltrados = credenciais.filter(c => {
    const termo = busca.toLowerCase();
    const matchBusca = 
      (c.nome_razao_social?.toLowerCase() || '').includes(termo) || 
      (c.plataforma_inversor?.toLowerCase() || '').includes(termo) ||
      (c.login_app?.toLowerCase() || '').includes(termo);
      
    const statusAtual = c.status_monitoramento || 'normal';
    const matchStatus = filtroStatus === 'Todos' || statusAtual === filtroStatus.toLowerCase();
    const matchPlataforma = filtroPlataforma === 'Todas as plataformas' || c.plataforma_inversor === filtroPlataforma;
    
    return matchBusca && matchStatus && matchPlataforma;
  });

  // Contadores
  const total = dadosFiltrados.length;
  const normais = dadosFiltrados.filter(c => c.status_monitoramento === 'normal').length;
  const vencidos = dadosFiltrados.filter(c => c.status_monitoramento === 'vencido').length;
  const offline = dadosFiltrados.filter(c => c.status_monitoramento === 'offline').length;
  const problemas = dadosFiltrados.filter(c => c.status_monitoramento === 'problema').length;
  const alertas = offline + problemas;

  // ==========================================
  // LÓGICA DE SALVAMENTO INLINE (TABELA)
  // ==========================================
  const handleStatusChange = async (id, novoStatus) => {
    setCredenciais(prev => prev.map(c => c.id === id ? { ...c, status_monitoramento: novoStatus } : c));
    await supabase.from('clientes').update({ status_monitoramento: novoStatus }).eq('id', id);
  };

  const handleObsChangeLocal = (id, novoTexto) => {
    setCredenciais(prev => prev.map(c => c.id === id ? { ...c, observacoes_internas: novoTexto } : c));
  };

  const handleObsBlurSave = async (id, textoFinal) => {
    await supabase.from('clientes').update({ observacoes_internas: textoFinal }).eq('id', id);
  };

  // ==========================================
  // LÓGICA DO GERENCIADOR DE PLATAFORMAS
  // ==========================================
  const handleAddPlataforma = async (e) => {
    e.preventDefault();
    if (!novaPlataformaNome.trim()) return;
    
    setLoadingPlataforma(true);
    const { error } = await supabase.from('plataformas').insert([{
      nome: novaPlataformaNome,
      link: novaPlataformaLink
    }]);
    
    if (!error) {
      setNovaPlataformaNome('');
      setNovaPlataformaLink('');
      // Recarrega as plataformas
      const { data } = await supabase.from('plataformas').select('*').order('nome');
      if (data) setPlataformas(data);
    }
    setLoadingPlataforma(false);
  };

  const handleDeletePlataforma = async (id) => {
    const { error } = await supabase.from('plataformas').delete().eq('id', id);
    if (!error) {
      setPlataformas(prev => prev.filter(p => p.id !== id));
    }
  };

  const exportarCSV = () => {
    // Login/senha ficam de fora do export por segurança (arquivo CSV costuma circular sem criptografia)
    const header = ['Cliente', 'Plataforma', 'Status', 'Observações'];
    const linhas = dadosFiltrados.map(item => [
      item.nome_razao_social,
      item.plataforma_inversor || '',
      item.status_monitoramento || 'normal',
      item.observacoes_internas || ''
    ]);

    const csv = [header, ...linhas]
      .map(linha => linha.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\n');

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Monitoramento_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLinkPlataforma = (nome) => {
    const plat = plataformas.find(p => p.nome?.toLowerCase() === nome?.toLowerCase());
    return plat?.link || null;
  };

  // ==========================================
  // ESTILOS DE LINHA
  // ==========================================
  const getRowStyle = (status) => {
    const s = status || 'normal';
    if (s === 'offline') return 'bg-[#FFFF00] text-black hover:brightness-95 border-b border-black/10';
    if (s === 'problema') return 'bg-[#FFC000] text-black hover:brightness-95 border-b border-black/10';
    if (s === 'vencido') return 'bg-[#FF0000] text-white hover:brightness-95 border-b border-white/20';
    
    return 'bg-white text-gray-800 hover:bg-gray-50/50 border-b border-gray-200';
  };

  const renderCelulaComCopia = (texto, rowStatus) => {
    const isRed = rowStatus === 'vencido';
    const btnColor = isRed ? 'text-white/60 hover:text-white' : 'text-gray-400 hover:text-green-600';
    
    return (
      <div className="flex items-center justify-between gap-2 group/cell">
        <span className="font-medium text-[12px] truncate" style={{ color: 'inherit' }}>{texto || '--'}</span>
        {texto && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(texto);
            }}
            className={`p-1 opacity-0 group-hover/cell:opacity-100 transition-all cursor-pointer rounded-none shrink-0 ${btnColor}`}
            title="Copiar"
          >
            <Copy size={13} strokeWidth={2.5} />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col relative">
      
      <div className="flex flex-col h-full bg-white border border-gray-300 animate-in fade-in duration-300 antialiased text-sm">
        
        {/* CABEÇALHO / CONTROLES */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3 p-3 md:p-4 border-b border-gray-300 shrink-0 w-full bg-white">
          
          <div className="relative flex-1 w-full lg:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar em cliente, login ou plataforma" 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-none text-[13px] focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 transition-all"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto shrink-0 justify-end">
            
            <div className="relative">
               <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                 <Filter size={14} className="text-gray-500" />
               </div>
              <select 
                value={filtroStatus} 
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="bg-white border border-gray-300 pl-8 pr-8 py-2 text-[12px] text-gray-700 outline-none focus:ring-1 focus:ring-green-500 font-medium rounded-none cursor-pointer appearance-none"
              >
                <option value="Todos">Todos os status</option>
                <option value="normal">Normal</option>
                <option value="offline">Offline</option>
                <option value="problema">Com problema</option>
                <option value="vencido">Vencido</option>
              </select>
               <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-500">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
               </div>
            </div>

            <div className="relative">
              <select 
                value={filtroPlataforma} 
                onChange={(e) => setFiltroPlataforma(e.target.value)}
                className="bg-white border border-gray-300 pl-3 pr-8 py-2 text-[12px] text-gray-700 outline-none focus:ring-1 focus:ring-green-500 font-medium rounded-none cursor-pointer appearance-none max-w-[200px]"
              >
                <option value="Todas as plataformas">Todas as plataformas</option>
                {plataformas.map((plat) => (
                  <option key={plat.id} value={plat.nome}>{plat.nome}</option>
                ))}
              </select>
               <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-500">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
               </div>
            </div>

            <button onClick={exportarCSV} className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-none text-[12px] font-medium hover:bg-gray-100 transition-all cursor-pointer">
              <Download size={14} /> Exportar
            </button>
            
            <button 
              onClick={() => setIsPlataformasModalOpen(true)}
              className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-none text-[12px] font-medium hover:bg-gray-100 transition-all cursor-pointer"
            >
              <LayoutGrid size={14} /> Plataformas
            </button>
          </div>
        </div>

        {/* BARRA DE RESUMO */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-gray-300 bg-white shrink-0">
          <div className="px-4 py-2 border-r border-gray-300 text-[12px] text-gray-800">
            <span className="font-extrabold">{total}</span> credenciais
          </div>
          <div className="px-4 py-2 border-r border-gray-300 text-[12px] text-green-700">
            <span className="font-extrabold">{normais}</span> normais
          </div>
          <div className="hidden sm:block px-4 py-2 border-r border-gray-300 text-[12px] text-yellow-600">
            <span className="font-extrabold">{alertas}</span> c/ problema ou offline
          </div>
          <div className="px-4 py-2 text-[12px] text-red-600">
            <span className="font-extrabold">{vencidos}</span> vencidos
          </div>
        </div>

        {/* TABELA DE MONITORAMENTO */}
        <div className="flex-1 overflow-y-auto bg-white flex flex-col">
          {loading ? (
            <div className="flex justify-center items-center flex-1 text-gray-400 text-[13px] min-h-[200px]">
              <Loader2 className="animate-spin mr-2" size={18} /> Carregando monitoramento...
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="bg-gray-100 sticky top-0 z-10 border-b border-gray-300">
                  <tr className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                    <th className="px-4 py-3 border-r border-gray-300">Cliente / Empresa/Residencial</th>
                    <th className="px-4 py-3 border-r border-gray-300">Plataforma</th>
                    <th className="px-4 py-3 border-r border-gray-300 w-[140px]">Status</th>
                    <th className="px-4 py-3 border-r border-gray-300 w-full min-w-[300px]">Observações</th>
                    <th className="px-4 py-3 border-r border-gray-300 w-[120px]">Login</th>
                    <th className="px-4 py-3 w-[120px]">Senha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {dadosFiltrados.map((item) => {
                    const statusVal = item.status_monitoramento;
                    const rowClass = getRowStyle(statusVal);
                    const linkPlataforma = getLinkPlataforma(item.plataforma_inversor);
                    
                    return (
                      <tr key={item.id} className={`${rowClass} transition-colors group`}>
                        
                        {/* CLIENTE */}
                        <td className="px-4 py-2.5 border-r border-current/10 min-w-[200px]">
                          <span className="font-semibold text-[12px]" style={{ color: 'inherit' }}>
                            {item.nome_razao_social}
                          </span>
                        </td>

                        {/* PLATAFORMA */}
                        <td className="px-4 py-2.5 border-r border-current/10 min-w-[150px]">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-medium" style={{ color: 'inherit' }}>
                              {item.plataforma_inversor || '--'}
                            </span>
                            {item.plataforma_inversor && (
                              linkPlataforma ? (
                                <a href={linkPlataforma} target="_blank" rel="noreferrer" className="opacity-60 hover:opacity-100 cursor-pointer text-blue-600" title="Acessar plataforma">
                                  <ExternalLink size={13} />
                                </a>
                              ) : (
                                <ExternalLink size={13} className="opacity-30 cursor-not-allowed" title="Link não cadastrado nas plataformas" />
                              )
                            )}
                          </div>
                        </td>
                        
                        {/* STATUS (Dropdown) */}
                        <td className="px-3 py-1.5 border-r border-current/10 bg-black/5 hover:bg-black/10 transition-colors w-[140px]">
                          <select 
                            value={statusVal}
                            onChange={(e) => handleStatusChange(item.id, e.target.value)}
                            className="w-full bg-transparent border-none outline-none font-medium text-[11px] uppercase tracking-wider cursor-pointer text-inherit text-center appearance-none"
                          >
                            <option value="normal" className="text-gray-800 bg-white">Normal</option>
                            <option value="offline" className="text-black bg-[#FFFF00]">Offline</option>
                            <option value="problema" className="text-black bg-[#FFC000]">Com problema</option>
                            <option value="vencido" className="text-white bg-[#FF0000]">Vencido</option>
                          </select>
                        </td>

                        {/* OBSERVAÇÕES */}
                        <td className="px-2 py-0 border-r border-current/10 hover:bg-black/5 transition-colors w-full min-w-[300px]">
                          <input 
                            type="text"
                            value={item.observacoes_internas || ''}
                            onChange={(e) => handleObsChangeLocal(item.id, e.target.value)}
                            onBlur={(e) => handleObsBlurSave(item.id, e.target.value)}
                            placeholder="Adicionar observação..."
                            className="w-full h-full min-h-[35px] bg-transparent border-none outline-none px-2 py-2 text-[12px] font-medium placeholder:text-current/50 placeholder:italic focus:ring-inset focus:ring-1 focus:ring-black/20"
                            style={{ color: 'inherit' }}
                          />
                        </td>
                        
                        {/* LOGIN */}
                        <td className="px-4 py-2.5 border-r border-current/10 min-w-[100px] w-[120px] max-w-[150px]">
                          {renderCelulaComCopia(item.login_app, statusVal)}
                        </td>
                        
                        {/* SENHA */}
                        <td className="px-4 py-2.5 min-w-[100px] w-[120px] max-w-[150px]">
                          {renderCelulaComCopia(item.senha_app, statusVal)}
                        </td>
                      </tr>
                    );
                  })}
                  
                  {dadosFiltrados.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-4 py-12 text-center text-[13px] text-gray-500 bg-white">
                        Nenhuma credencial encontrada na busca.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE GERENCIAR PLATAFORMAS */}
      {isPlataformasModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 transition-opacity" onClick={(e) => { if (e.target === e.currentTarget) setIsPlataformasModalOpen(false); }}>
          <div className="bg-white shadow-2xl border border-gray-400 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 rounded-none">
            
            <div className="flex justify-between items-center p-4 border-b border-gray-300 bg-gray-50">
              <h3 className="font-bold text-[13px] uppercase tracking-wider text-gray-800">Gerenciar Plataformas</h3>
              <button onClick={() => setIsPlataformasModalOpen(false)} className="text-gray-500 hover:text-red-600 hover:bg-red-50 p-1.5 transition-colors cursor-pointer border border-transparent hover:border-red-200 rounded-none">
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
            
            <div className="p-5 space-y-5">
              
              <form onSubmit={handleAddPlataforma} className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input type="text" placeholder="Nome da Plataforma" value={novaPlataformaNome} onChange={(e) => setNovaPlataformaNome(e.target.value)} className="flex-1 bg-white border border-gray-300 rounded-none px-3 py-2 text-[12px] focus:ring-1 focus:ring-green-500 outline-none" />
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder="Link (ex: https://...)" value={novaPlataformaLink} onChange={(e) => setNovaPlataformaLink(e.target.value)} className="flex-1 bg-white border border-gray-300 rounded-none px-3 py-2 text-[12px] focus:ring-1 focus:ring-green-500 outline-none" />
                  <button type="submit" disabled={loadingPlataforma} className="bg-gray-800 text-white px-4 py-2 rounded-none text-[12px] font-medium hover:bg-gray-900 transition-all cursor-pointer flex items-center justify-center min-w-[70px]">
                    {loadingPlataforma ? <Loader2 size={14} className="animate-spin" /> : 'Add'}
                  </button>
                </div>
              </form>

              <div className="space-y-1.5 max-h-60 overflow-y-auto border border-gray-200 p-2 bg-gray-50">
                {plataformas.map((plat) => (
                  <div key={plat.id} className="flex justify-between items-center bg-white border border-gray-300 p-2 shadow-sm rounded-none">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-medium text-gray-800">{plat.nome}</span>
                      {plat.link && (
                        <a href={plat.link} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700 transition-colors" title={plat.link}>
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                    <button onClick={() => handleDeletePlataforma(plat.id)} className="text-gray-400 hover:text-red-600 transition-colors p-1 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-none cursor-pointer">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {plataformas.length === 0 && (
                  <p className="text-center text-[12px] text-gray-500 py-4 font-medium">Nenhuma plataforma cadastrada.</p>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}