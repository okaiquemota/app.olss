import { useState, useEffect, Fragment } from 'react';
import { Plus, Trash2, CheckCircle2, Circle, X, Edit2, Settings, Filter, LayoutGrid, List, AlertCircle, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Pendencias() {
  const [lembretes, setLembretes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);

  // Controles de Exibição e Filtros
  const [filtroTipo, setFiltroTipo] = useState('Todos'); 
  const [filtroCategoria, setFiltroCategoria] = useState('Todas');
  const [viewMode, setViewMode] = useState('grid');
  const [busca, setBusca] = useState('');

  // Estados de Drag and Drop
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  // Mensagem de falha exibida no rodapé (some sozinha depois de alguns segundos)
  const [erro, setErro] = useState('');

  // Estados dos Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoriaModalOpen, setIsCategoriaModalOpen] = useState(false);
  const [editandoId, setEditandoId] = useState(null);

  // Estados do Formulário de Tarefa
  const [tarefa, setTarefa] = useState('');
  const [tipoAtivo, setTipoAtivo] = useState('Pendência');
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('');
  const [prioridade, setPrioridade] = useState(false);
  const [corSelecionada, setCorSelecionada] = useState('bg-yellow-50');

  // Estado do Formulário de Categoria
  const [novaCategoria, setNovaCategoria] = useState('');
  const [tipoCategoriaModal, setTipoCategoriaModal] = useState('Pendência');

  const cores = [
    { id: 'bg-yellow-50', btnClass: 'bg-yellow-100 border-yellow-300', class: 'bg-yellow-50 text-yellow-900' },
    { id: 'bg-blue-50', btnClass: 'bg-blue-100 border-blue-300', class: 'bg-blue-50 text-blue-900' },
    { id: 'bg-green-50', btnClass: 'bg-green-100 border-green-300', class: 'bg-green-50 text-green-900' },
    { id: 'bg-pink-50', btnClass: 'bg-pink-100 border-pink-300', class: 'bg-pink-50 text-pink-900' },
    { id: 'bg-purple-50', btnClass: 'bg-purple-100 border-purple-300', class: 'bg-purple-50 text-purple-900' },
    { id: 'bg-white', btnClass: 'bg-gray-200 border-gray-400', class: 'bg-white text-gray-800' },
  ];

  const fetchData = async () => {
    const resLembretes = await supabase.from('lembretes').select('*').order('concluido', { ascending: true }).order('prioridade', { ascending: false }).order('ordem', { ascending: true }).order('created_at', { ascending: false });
    const resCategorias = await supabase.from('categorias').select('*').order('nome');

    if (resLembretes.error || resCategorias.error) {
      setErro('Não foi possível carregar as anotações. Verifique a conexão e recarregue a página.');
    }
    if (!resLembretes.error) setLembretes(resLembretes.data || []);
    if (!resCategorias.error) setCategorias(resCategorias.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!erro) return;
    const t = setTimeout(() => setErro(''), 5000);
    return () => clearTimeout(t);
  }, [erro]);

  const mudarFiltroTipo = (tipo) => {
    setFiltroTipo(tipo);
    setFiltroCategoria('Todas');
  };

  const lembretesFiltrados = lembretes.filter(l => {
    const matchBusca = l.tarefa.toLowerCase().includes(busca.toLowerCase());
    const matchTipo = filtroTipo === 'Todos' || l.tipo === filtroTipo;
    const matchCat = filtroCategoria === 'Todas' || l.categoria === filtroCategoria;
    return matchBusca && matchTipo && matchCat;
  });

  // ==========================================
  // MOTOR DE ARRASTAR E SOLTAR
  // ==========================================
  const handleDragStart = (e, id) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    setTimeout(() => setDraggedId(id), 0);
  };

  const handleDragOver = (e, targetId) => {
    e.preventDefault(); 
    if (draggedId && draggedId !== targetId) setDragOverId(targetId); 
  };

  const handleDragLeave = (e, targetId) => {
    if (dragOverId === targetId) setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDrop = async (e, targetId) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null); setDragOverId(null); return;
    }

    const novaLista = [...lembretes];
    const draggedIndex = novaLista.findIndex(i => i.id === draggedId);
    const targetIndex = novaLista.findIndex(i => i.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const [removido] = novaLista.splice(draggedIndex, 1);
    const newTargetIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
    novaLista.splice(newTargetIndex, 0, removido);

    const atualizados = novaLista.map((item, index) => ({ ...item, ordem: index }));
    setLembretes(atualizados);
    
    setDraggedId(null); setDragOverId(null);

    try {
      const resultados = await Promise.all(
        atualizados.map(item => supabase.from('lembretes').update({ ordem: item.ordem }).eq('id', item.id))
      );
      if (resultados.some(r => r.error)) throw new Error('Falha');
    } catch {
      setErro('A nova ordem pode não ter sido salva. Recarregue a página.');
    }
  };

  // ==========================================
  // FUNÇÕES DE CATEGORIA E TAREFA
  // ==========================================
  const abrirModalCategorias = () => {
    setNovaCategoria('');
    setIsCategoriaModalOpen(true);
  };

  const handleSalvarCategoria = async (e) => {
    e.preventDefault();
    if (!novaCategoria.trim()) return;
    const { error } = await supabase.from('categorias').insert([{ nome: novaCategoria, tipo: tipoCategoriaModal }]);
    if (error) {
      setErro('Não foi possível criar a categoria. Tente novamente.');
      return;
    }
    setNovaCategoria('');
    fetchData();
  };

  const deletarCategoria = async (id) => {
    const { error } = await supabase.from('categorias').delete().eq('id', id);
    if (error) {
      setErro('Não foi possível excluir a categoria. Tente novamente.');
      return;
    }
    fetchData();
  };

  const changeTipoTarefa = (novoTipo) => {
    setTipoAtivo(novoTipo);
    const cats = categorias.filter(c => c.tipo === novoTipo);
    setCategoriaSelecionada(cats.length > 0 ? cats[0].nome : '');
    setCorSelecionada(novoTipo === 'Pendência' ? 'bg-yellow-50' : 'bg-blue-50');
  };

  const abrirModalNovo = () => {
    setEditandoId(null);
    const tipoInicial = filtroTipo === 'Todos' ? 'Pendência' : filtroTipo;
    changeTipoTarefa(tipoInicial);
    setTarefa('');
    setPrioridade(false);
    setIsModalOpen(true);
  };

  const abrirModalEdicao = (item) => {
    setEditandoId(item.id);
    setTipoAtivo(item.tipo);
    setCategoriaSelecionada(item.categoria);
    setTarefa(item.tarefa);
    setPrioridade(item.prioridade);
    setCorSelecionada(item.cor || 'bg-white');
    setIsModalOpen(true);
  };

  const handleSalvarTarefa = async (e) => {
    e.preventDefault();
    if (!tarefa.trim()) return;

    const payload = { tarefa, tipo: tipoAtivo, categoria: categoriaSelecionada, prioridade, cor: corSelecionada };

    const { error } = editandoId
      ? await supabase.from('lembretes').update(payload).eq('id', editandoId)
      : await supabase.from('lembretes').insert([{ ...payload, concluido: false, ordem: lembretes.filter(l => l.tipo === tipoAtivo).length }]);

    if (error) {
      setErro('Não foi possível salvar a anotação. Tente novamente.');
      return;
    }
    setIsModalOpen(false);
    fetchData();
  };

  const toggleConcluido = async (id, statusAtual) => {
    const { error } = await supabase.from('lembretes').update({ concluido: !statusAtual }).eq('id', id);
    if (error) {
      setErro('Não foi possível atualizar a anotação. Tente novamente.');
      return;
    }
    fetchData();
  };

  const deletarLembrete = async (id) => {
    const { error } = await supabase.from('lembretes').delete().eq('id', id);
    if (error) {
      setErro('Não foi possível excluir a anotação. Tente novamente.');
      return;
    }
    fetchData();
  };

  const categoriasDoModal = categorias.filter(c => c.tipo === tipoCategoriaModal);
  const categoriasDoFiltro = categorias.filter(c => c.tipo === (filtroTipo === 'Todos' ? 'Pendência' : filtroTipo));

  // ==========================================
  // COMPONENTE DO CARD FLAT
  // ==========================================
  const TaskCard = ({ item }) => {
    const corCard = item.cor || 'bg-white';
    const isDragged = item.id === draggedId;
    const isDragOver = item.id === dragOverId;

    const borderStyle = item.prioridade && !item.concluido
      ? 'border border-red-500'
      : 'border border-gray-400'; 

    return (
      <div className="relative h-full">
        {isDragOver && (
          <div 
            className={`absolute z-10 bg-green-500 transition-all duration-200 
              ${viewMode === 'grid' 
                ? 'w-[3px] top-0 bottom-0 -left-[8px]' 
                : 'h-[3px] left-0 right-0 -top-[4px]'
              }`
            } 
          />
        )}

        <div
          draggable={!item.concluido}
          onDragStart={(e) => handleDragStart(e, item.id)}
          onDragOver={(e) => handleDragOver(e, item.id)}
          onDragLeave={(e) => handleDragLeave(e, item.id)}
          onDrop={(e) => handleDrop(e, item.id)}
          onDragEnd={handleDragEnd}
          className={`p-3.5 flex ${viewMode === 'grid' ? 'flex-col min-h-[120px] h-full justify-between' : 'flex-row items-center gap-4'} transition-all duration-200 group cursor-grab active:cursor-grabbing rounded-none
            ${item.concluido ? 'bg-gray-100 border border-gray-300 opacity-60 cursor-default' : `${corCard} ${borderStyle} hover:brightness-[0.98]`}
            ${isDragged ? 'opacity-40 scale-[0.99]' : 'opacity-100 scale-100'}
          `}
        >
          <div className={`flex ${viewMode === 'grid' ? 'items-start' : 'items-center flex-1'} gap-3 w-full relative overflow-hidden`}>
            
            <button
              onClick={() => toggleConcluido(item.id, item.concluido)}
              className={`shrink-0 transition-transform hover:scale-105 cursor-pointer ${item.prioridade && !item.concluido ? 'text-red-500' : 'text-gray-500 hover:text-green-600'} ${viewMode === 'grid' ? 'mt-0.5' : ''}`}
            >
              {item.concluido ? <CheckCircle2 size={18} strokeWidth={2} className="text-green-600" /> : <Circle size={18} strokeWidth={1.5} />}
            </button>

            <div className="flex-1 min-w-0 pointer-events-none">
              {viewMode === 'grid' && (
                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 bg-white/50 border border-gray-300 px-1.5 py-0.5 rounded-none">
                    {item.categoria}
                  </span>
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                    {item.tipo}
                  </span>
                </div>
              )}
              <p 
                title={item.tarefa} 
                className={`text-[13px] font-medium leading-snug transition-all break-words whitespace-pre-wrap ${viewMode === 'grid' ? 'line-clamp-4' : ''} ${item.concluido ? 'line-through text-gray-500' : 'text-gray-800'}`}
              >
                {item.tarefa}
              </p>
            </div>

            {viewMode === 'list' && (
              <div className="flex items-center gap-2 pointer-events-none shrink-0 opacity-80">
                <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                  {item.categoria} • {item.tipo}
                </span>
              </div>
            )}
          </div>

          <div className={`flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity ${viewMode === 'grid' ? 'justify-end mt-3' : 'shrink-0 ml-2'}`}>
            <button onClick={() => abrirModalEdicao(item)} className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-white/50 border border-transparent hover:border-gray-400 rounded-none transition-all cursor-pointer">
              <Edit2 size={14} strokeWidth={2} />
            </button>
            <button onClick={() => deletarLembrete(item.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-white/50 border border-transparent hover:border-red-200 rounded-none transition-all cursor-pointer">
              <Trash2 size={14} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col relative">
      
      {/* Container principal replicando o estilo "card flat" */}
      <div className="flex flex-col h-full bg-white border border-gray-400 shadow-sm animate-in fade-in duration-300 antialiased text-sm">

        {/* CABEÇALHO / CONTROLES IDÊNTICOS AO MONITORAMENTO */}
        <div className="flex flex-col lg:flex-row items-center gap-2 p-3 md:p-4 border-b border-gray-400 shrink-0 w-full bg-white">
          
          {/* Busca (Esquerda) */}
          <div className="relative flex-1 w-full lg:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input 
              type="text" 
              placeholder="Buscar em anotações..." 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-400 rounded-none text-[13px] focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 transition-all"
            />
          </div>

          {/* Filtros e Botões (Direita) */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto shrink-0 justify-end">
            
            {/* View Mode */}
            <div className="flex border border-gray-400 bg-white">
               <button onClick={() => setViewMode('grid')} className={`px-2.5 py-1.5 border-r border-gray-400 hover:bg-gray-100 transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-gray-200 text-gray-900' : 'text-gray-600'}`}><LayoutGrid size={15}/></button>
               <button onClick={() => setViewMode('list')} className={`px-2.5 py-1.5 hover:bg-gray-100 transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-gray-200 text-gray-900' : 'text-gray-600'}`}><List size={15}/></button>
            </div>
            
            {/* Filtro Tipo */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Filter size={14} className="text-gray-600" />
              </div>
              <select 
                value={filtroTipo} 
                onChange={(e) => mudarFiltroTipo(e.target.value)}
                className="bg-white border border-gray-400 pl-8 pr-8 py-2 text-[12px] text-gray-700 outline-none focus:ring-1 focus:ring-green-500 font-medium rounded-none cursor-pointer appearance-none"
              >
                <option value="Todos">Todos os tipos</option>
                <option value="Pendência">Pendências</option>
                <option value="Lembrete">Lembretes</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-600">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
              </div>
            </div>

            {/* Filtro Categoria */}
            <div className="relative">
              <select 
                value={filtroCategoria} 
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className="bg-white border border-gray-400 pl-3 pr-8 py-2 text-[12px] text-gray-700 outline-none focus:ring-1 focus:ring-green-500 font-medium rounded-none cursor-pointer appearance-none min-w-[140px]"
              >
                <option value="Todas">Todas as categorias</option>
                {categoriasDoFiltro.map(c => (
                  <option key={c.id} value={c.nome}>{c.nome}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-600">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
              </div>
            </div>

            <button onClick={abrirModalCategorias} className="flex items-center gap-1.5 bg-white border border-gray-400 text-gray-700 px-3 py-2 rounded-none text-[12px] font-medium hover:bg-gray-200 transition-all cursor-pointer">
              <Settings size={14} /> Categorias
            </button>
            
            <button onClick={abrirModalNovo} className="flex items-center gap-1.5 bg-green-700 text-white px-4 py-2 rounded-none text-[13px] font-medium hover:bg-green-800 transition-all cursor-pointer">
              <Plus size={16} strokeWidth={2} /> Adicionar
            </button>
          </div>
        </div>

        {/* ÁREA DE RENDERIZAÇÃO DOS CARDS */}
        {loading ? (
          <div className="flex justify-center items-center flex-1 text-gray-500 text-[13px]">Carregando anotações...</div>
        ) : (
          <div className="flex-1 overflow-y-auto bg-gray-100 p-4">
            {lembretesFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 border border-dashed border-gray-400 bg-white rounded-none">
                <Filter size={32} strokeWidth={1} className="mb-2 text-gray-400" />
                <p className="text-[13px]">Nenhuma anotação encontrada.</p>
              </div>
            ) : (
              <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" : "flex flex-col gap-2"}>
                {lembretesFiltrados.map((item) => (
                  <Fragment key={item.id}>
                    <TaskCard item={item} />
                  </Fragment>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* AVISO DE FALHA (salvar, excluir, carregar ou reordenar) */}
      {erro && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-red-600 text-white px-4 py-2.5 rounded-none shadow-sm text-[13px] font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <AlertCircle size={16} />
          {erro}
        </div>
      )}

      {/* MODAL PADRONIZADO: NOVA/EDITAR TAREFA */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 transition-opacity" onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
          <div className="bg-white shadow-2xl border border-gray-400 w-full max-w-md overflow-hidden transform transition-all animate-in zoom-in-95 duration-200 rounded-none">
            
            <div className="flex justify-between items-center p-4 border-b border-gray-400 bg-gray-100">
              <h3 className="font-bold text-[13px] uppercase tracking-wider text-gray-800">{editandoId ? 'Editar Anotação' : 'Nova Anotação'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-600 hover:text-red-600 hover:bg-red-50 p-1.5 transition-colors cursor-pointer border border-transparent hover:border-red-200 rounded-none">
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
            
            <form onSubmit={handleSalvarTarefa} className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Tipo</label>
                  <select value={tipoAtivo} onChange={(e) => changeTipoTarefa(e.target.value)} className="w-full bg-white border border-gray-400 px-3 py-2 text-[12px] focus:ring-1 focus:ring-green-500 outline-none cursor-pointer font-medium text-gray-800 rounded-none">
                    <option value="Pendência">Pendência</option>
                    <option value="Lembrete">Lembrete</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Categoria</label>
                  <select value={categoriaSelecionada} onChange={(e) => setCategoriaSelecionada(e.target.value)} className="w-full bg-white border border-gray-400 px-3 py-2 text-[12px] focus:ring-1 focus:ring-green-500 outline-none cursor-pointer font-medium text-gray-800 rounded-none">
                    {categorias.filter(c => c.tipo === tipoAtivo).map(cat => (<option key={cat.id} value={cat.nome}>{cat.nome}</option>))}
                    {categorias.filter(c => c.tipo === tipoAtivo).length === 0 && <option value="">Sem categoria</option>}
                  </select>
                </div>
              </div>

              <div>
                <textarea autoFocus placeholder="O que precisa ser feito?" value={tarefa} onChange={(e) => setTarefa(e.target.value)} className="w-full bg-white border border-gray-400 p-3 text-[13px] focus:ring-1 focus:ring-green-500 outline-none resize-none h-24 transition-all rounded-none placeholder:text-gray-500" />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-2 uppercase tracking-wider">Cor de fundo</label>
                <div className="flex gap-2">
                  {cores.map(cor => (
                    <button key={cor.id} type="button" onClick={() => setCorSelecionada(cor.id)} className={`w-8 h-8 rounded-none border transition-all ${cor.btnClass} ${corSelecionada === cor.id ? 'ring-2 ring-offset-2 ring-gray-400 scale-105' : 'opacity-60 hover:opacity-100'}`} />
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-300 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1.5 transition-colors -ml-1.5 border border-transparent hover:border-gray-300 rounded-none">
                  <input type="checkbox" checked={prioridade} onChange={(e) => setPrioridade(e.target.checked)} className="w-4 h-4 text-red-600 rounded-none border-gray-400 focus:ring-red-500 cursor-pointer" />
                  <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider">Urgente</span>
                </label>
                <button type="submit" className="flex items-center gap-1.5 bg-green-700 text-white px-5 py-2 rounded-none text-[13px] font-medium hover:bg-green-800 transition-all cursor-pointer border border-green-800">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PADRONIZADO: GERENCIAR CATEGORIAS */}
      {isCategoriaModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setIsCategoriaModalOpen(false); }}>
          <div className="bg-white shadow-2xl border border-gray-400 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 rounded-none">
            
            <div className="flex justify-between items-center p-4 border-b border-gray-400 bg-gray-100">
              <h3 className="font-bold text-[13px] uppercase tracking-wider text-gray-800">Gerenciar Categorias</h3>
              <button onClick={() => setIsCategoriaModalOpen(false)} className="text-gray-600 hover:text-red-600 hover:bg-red-50 p-1.5 transition-colors cursor-pointer border border-transparent hover:border-red-200 rounded-none">
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
            
            <div className="p-5 space-y-5">
              <div className="flex border border-gray-400 bg-white">
                <button onClick={() => setTipoCategoriaModal('Pendência')} className={`flex-1 py-2 text-[12px] font-bold border-r border-gray-400 ${tipoCategoriaModal === 'Pendência' ? 'bg-gray-200 text-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}>Pendências</button>
                <button onClick={() => setTipoCategoriaModal('Lembrete')} className={`flex-1 py-2 text-[12px] font-bold ${tipoCategoriaModal === 'Lembrete' ? 'bg-gray-200 text-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}>Lembretes</button>
              </div>

              <form onSubmit={handleSalvarCategoria} className="flex gap-2">
                <input type="text" placeholder="Nome da categoria..." value={novaCategoria} onChange={(e) => setNovaCategoria(e.target.value)} className="flex-1 bg-white border border-gray-400 rounded-none px-3 py-2 text-[12px] focus:ring-1 focus:ring-green-500 outline-none" />
                <button type="submit" className="bg-gray-800 text-white px-4 py-2 rounded-none text-[12px] font-medium hover:bg-gray-900 transition-all cursor-pointer">Add</button>
              </form>

              <div className="space-y-1.5 max-h-48 overflow-y-auto border border-gray-300 p-2 bg-gray-100">
                {categoriasDoModal.map(cat => (
                  <div key={cat.id} className="flex justify-between items-center bg-white border border-gray-400 p-2 shadow-sm rounded-none">
                    <span className="text-[12px] font-medium text-gray-800">{cat.nome}</span>
                    <button onClick={() => deletarCategoria(cat.id)} className="text-gray-500 hover:text-red-600 transition-colors p-1 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-none cursor-pointer"><Trash2 size={14} /></button>
                  </div>
                ))}
                {categoriasDoModal.length === 0 && <p className="text-center text-[12px] text-gray-600 py-4 font-medium">Nenhuma categoria registrada.</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}