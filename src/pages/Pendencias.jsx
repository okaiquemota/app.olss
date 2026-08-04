import { useState, useEffect, Fragment } from 'react';
import { Plus, Trash2, CheckCircle2, Circle, X, Edit2, Settings, Filter, LayoutGrid, List, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Pendencias() {
  const [lembretes, setLembretes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);

  // Controles de Exibição e Filtros
  const [filtroTipo, setFiltroTipo] = useState('Todos'); 
  const [filtroCategoria, setFiltroCategoria] = useState('Todas');
  const [viewMode, setViewMode] = useState('grid');

  // Estados de Drag and Drop
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [ordemFalhou, setOrdemFalhou] = useState(false);

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
    { id: 'bg-yellow-50', btnClass: 'bg-yellow-100 border-yellow-200', class: 'bg-yellow-50 text-yellow-900' },
    { id: 'bg-blue-50', btnClass: 'bg-blue-100 border-blue-200', class: 'bg-blue-50 text-blue-900' },
    { id: 'bg-green-50', btnClass: 'bg-green-100 border-green-200', class: 'bg-green-50 text-green-900' },
    { id: 'bg-pink-50', btnClass: 'bg-pink-100 border-pink-200', class: 'bg-pink-50 text-pink-900' },
    { id: 'bg-purple-50', btnClass: 'bg-purple-100 border-purple-200', class: 'bg-purple-50 text-purple-900' },
    { id: 'bg-white', btnClass: 'bg-gray-100 border-gray-300', class: 'bg-white text-gray-800' },
  ];

  const fetchData = async () => {
    const resLembretes = await supabase.from('lembretes').select('*').order('concluido', { ascending: true }).order('prioridade', { ascending: false }).order('ordem', { ascending: true }).order('created_at', { ascending: false });
    const resCategorias = await supabase.from('categorias').select('*').order('nome');

    if (!resLembretes.error) setLembretes(resLembretes.data || []);
    if (!resCategorias.error) setCategorias(resCategorias.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!ordemFalhou) return;
    const t = setTimeout(() => setOrdemFalhou(false), 4000);
    return () => clearTimeout(t);
  }, [ordemFalhou]);

  const mudarFiltroTipo = (tipo) => {
    setFiltroTipo(tipo);
    setFiltroCategoria('Todas');
  };

  const lembretesFiltrados = lembretes.filter(l => {
    const matchTipo = filtroTipo === 'Todos' || l.tipo === filtroTipo;
    const matchCat = filtroCategoria === 'Todas' || l.categoria === filtroCategoria;
    return matchTipo && matchCat;
  });

  // ==========================================
  // MOTOR DE ARRASTAR E SOLTAR
  // ==========================================
  const handleDragStart = (e, id) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    
    setTimeout(() => {
      setDraggedId(id);
    }, 0);
  };

  const handleDragOver = (e, targetId) => {
    e.preventDefault(); 
    if (draggedId && draggedId !== targetId) {
      setDragOverId(targetId); 
    }
  };

  const handleDragLeave = (e, targetId) => {
    if (dragOverId === targetId) {
      setDragOverId(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDrop = async (e, targetId) => {
    e.preventDefault();
    
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
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
    
    setDraggedId(null);
    setDragOverId(null);

    try {
      const resultados = await Promise.all(
        atualizados.map(item => supabase.from('lembretes').update({ ordem: item.ordem }).eq('id', item.id))
      );
      if (resultados.some(r => r.error)) throw new Error('Falha');
    } catch {
      setOrdemFalhou(true);
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
    await supabase.from('categorias').insert([{ nome: novaCategoria, tipo: tipoCategoriaModal }]);
    setNovaCategoria('');
    fetchData();
  };

  const deletarCategoria = async (id) => {
    await supabase.from('categorias').delete().eq('id', id);
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

    if (editandoId) {
      await supabase.from('lembretes').update(payload).eq('id', editandoId);
    } else {
      const maxOrdem = lembretes.filter(l => l.tipo === tipoAtivo).length;
      await supabase.from('lembretes').insert([{ ...payload, concluido: false, ordem: maxOrdem }]);
    }
    setIsModalOpen(false);
    fetchData();
  };

  const toggleConcluido = async (id, statusAtual) => {
    await supabase.from('lembretes').update({ concluido: !statusAtual }).eq('id', id);
    fetchData();
  };

  const deletarLembrete = async (id) => {
    await supabase.from('lembretes').delete().eq('id', id);
    fetchData();
  };

  const categoriasDoModal = categorias.filter(c => c.tipo === tipoCategoriaModal);
  const categoriasDoFiltro = categorias.filter(c => c.tipo === filtroTipo);

  // ==========================================
  // COMPONENTE DO CARD 
  // ==========================================
  const TaskCard = ({ item }) => {
    const corCard = item.cor || 'bg-white';
    
    const isDragged = item.id === draggedId;
    const isDragOver = item.id === dragOverId;

    const borderStyle = item.prioridade && !item.concluido
      ? 'border border-red-500'
      : 'border border-gray-200/60';

    return (
      <div className="relative h-full">
        {isDragOver && (
          <div 
            className={`absolute z-10 bg-gray-800 rounded-full transition-all duration-200 
              ${viewMode === 'grid' 
                ? 'w-[2px] top-0 bottom-0 -left-[9px]' 
                : 'h-[2px] left-0 right-0 -top-[5px]'
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
          className={`p-3.5 rounded-2xl flex ${viewMode === 'grid' ? 'flex-col min-h-[120px] h-full justify-between' : 'flex-row items-center gap-4'} transition-all duration-200 group cursor-grab active:cursor-grabbing shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]
            ${item.concluido ? 'bg-gray-50 border-gray-200 opacity-60 cursor-default shadow-none' : `${corCard} ${borderStyle}`}
            ${isDragged ? 'opacity-40 scale-[0.98]' : 'opacity-100 scale-100'}
          `}
        >
          <div className={`flex ${viewMode === 'grid' ? 'items-start' : 'items-center flex-1'} gap-3 w-full relative overflow-hidden`}>
            
            <button
              onClick={() => toggleConcluido(item.id, item.concluido)}
              className={`shrink-0 transition-transform hover:scale-105 ${item.prioridade && !item.concluido ? 'text-red-500' : 'text-gray-400 hover:text-gray-600'} ${viewMode === 'grid' ? 'mt-0.5' : ''}`}
            >
              {item.concluido ? <CheckCircle2 size={18} strokeWidth={2} /> : <Circle size={18} strokeWidth={1.5} />}
            </button>

            <div className="flex-1 min-w-0 pointer-events-none">
              {viewMode === 'grid' && (
                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500/80 bg-black/5 px-1.5 py-0.5 rounded-md">
                    {item.categoria}
                  </span>
                  <span className="text-[10px] font-medium text-gray-400">
                    {item.tipo}
                  </span>
                </div>
              )}
              {/* O SEGREDO ESTÁ AQUI: line-clamp-4 corta o texto em 4 linhas apenas no modo grid, e o title="" mostra ele completo no mouse */}
              <p 
                title={item.tarefa} 
                className={`text-[13px] font-medium leading-snug transition-all break-words whitespace-pre-wrap ${viewMode === 'grid' ? 'line-clamp-4' : ''} ${item.concluido ? 'line-through text-gray-400' : 'text-gray-700'}`}
              >
                {item.tarefa}
              </p>
            </div>

            {viewMode === 'list' && (
              <div className="flex items-center gap-2 pointer-events-none shrink-0 opacity-60">
                <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                  {item.categoria} • {item.tipo}
                </span>
              </div>
            )}
          </div>

          <div className={`flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity ${viewMode === 'grid' ? 'justify-end mt-3' : 'shrink-0 ml-2'}`}>
            <button onClick={() => abrirModalEdicao(item)} className="p-1.5 text-gray-400 hover:text-gray-800 hover:bg-gray-200/50 rounded-lg transition-colors cursor-pointer">
              <Edit2 size={14} strokeWidth={1.5} />
            </button>
            <button onClick={() => deletarLembrete(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
              <Trash2 size={14} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full px-6 md:px-8 h-[calc(100vh-80px)] flex flex-col relative animate-in fade-in duration-300 py-4 text-sm antialiased">

      {/* CABEÇALHO E FILTROS */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-5 shrink-0 bg-white/70 backdrop-blur-md p-3 rounded-2xl border border-gray-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl">
            <button onClick={() => mudarFiltroTipo('Todos')} className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${filtroTipo === 'Todos' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>Todos</button>
            <button onClick={() => mudarFiltroTipo('Pendência')} className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${filtroTipo === 'Pendência' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>Pendências</button>
            <button onClick={() => mudarFiltroTipo('Lembrete')} className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${filtroTipo === 'Lembrete' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>Lembretes</button>
          </div>

          {filtroTipo !== 'Todos' && (
            <div className="flex items-center gap-2 animate-in slide-in-from-left-2 fade-in duration-300 bg-gray-50 border border-gray-200/60 px-3 py-1.5 rounded-xl">
              <Filter size={14} className="text-gray-400" />
              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className="bg-transparent text-[13px] font-semibold text-gray-600 outline-none cursor-pointer hover:text-gray-900 transition-colors"
              >
                <option value="Todas">Todas as Categorias</option>
                {categoriasDoFiltro.map(c => (
                  <option key={c.id} value={c.nome}>{c.nome}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <div className="flex items-center bg-gray-100/80 p-1 rounded-xl mr-2">
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}>
              <LayoutGrid size={16} strokeWidth={1.5} />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}>
              <List size={16} strokeWidth={1.5} />
            </button>
          </div>

          <button onClick={abrirModalCategorias} className="flex items-center justify-center bg-gray-100 text-gray-600 p-2 rounded-xl hover:bg-gray-200 transition-all cursor-pointer" title="Gerenciar Categorias">
            <Settings size={16} strokeWidth={1.5} />
          </button>
          <button onClick={abrirModalNovo} className="flex items-center justify-center gap-1.5 bg-gray-900 text-white px-4 py-2 rounded-xl text-[13px] font-medium hover:bg-black transition-all cursor-pointer shadow-sm">
            <Plus size={16} strokeWidth={2} /> Nova
          </button>
        </div>
      </div>

      {/* ÁREA DE RENDERIZAÇÃO DOS CARDS */}
      {loading ? (
        <div className="flex justify-center items-center flex-1 text-gray-400 text-[13px]">Carregando anotações...</div>
      ) : (
        <div className="flex-1 overflow-y-auto pb-10 px-1 pt-1">
          {lembretesFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 border border-dashed border-gray-200 rounded-3xl bg-gray-50/50">
              <Filter size={32} strokeWidth={1} className="mb-2 text-gray-300" />
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

      {/* AVISO DE FALHA AO SALVAR A ORDEM */}
      {ordemFalhou && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-red-600 text-white px-4 py-2.5 rounded-xl shadow-lg text-[13px] font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <AlertCircle size={16} />
          A nova ordem pode não ter sido salva. Recarregue a página.
        </div>
      )}

      {/* MODAL DE NOVA/EDITAR TAREFA */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity" onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
          <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-full max-w-sm overflow-hidden transform transition-all animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-semibold text-base text-gray-800">{editandoId ? 'Editar Anotação' : 'Nova Anotação'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 p-1.5 rounded-full transition-colors cursor-pointer">
                <X size={16} strokeWidth={2} />
              </button>
            </div>
            
            <form onSubmit={handleSalvarTarefa} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Tipo</label>
                  <select value={tipoAtivo} onChange={(e) => changeTipoTarefa(e.target.value)} className="w-full bg-gray-50 border border-gray-200/60 rounded-xl p-2.5 text-[13px] focus:ring-1 focus:ring-gray-300 outline-none cursor-pointer font-medium text-gray-700">
                    <option value="Pendência">Pendência</option>
                    <option value="Lembrete">Lembrete</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Categoria</label>
                  <select value={categoriaSelecionada} onChange={(e) => setCategoriaSelecionada(e.target.value)} className="w-full bg-gray-50 border border-gray-200/60 rounded-xl p-2.5 text-[13px] focus:ring-1 focus:ring-gray-300 outline-none cursor-pointer text-gray-700">
                    {categorias.filter(c => c.tipo === tipoAtivo).map(cat => (<option key={cat.id} value={cat.nome}>{cat.nome}</option>))}
                    {categorias.filter(c => c.tipo === tipoAtivo).length === 0 && <option value="">Sem categoria</option>}
                  </select>
                </div>
              </div>

              <div>
                <textarea autoFocus placeholder="O que precisa ser feito?" value={tarefa} onChange={(e) => setTarefa(e.target.value)} className="w-full bg-gray-50 border border-gray-200/60 rounded-xl p-3 text-[13px] focus:bg-white focus:ring-1 focus:ring-gray-300 outline-none resize-none h-20 transition-all" />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-2 uppercase tracking-wider">Cor de fundo</label>
                <div className="flex gap-2">
                  {cores.map(cor => (
                    <button key={cor.id} type="button" onClick={() => setCorSelecionada(cor.id)} className={`w-7 h-7 rounded-full border transition-all ${cor.btnClass} ${corSelecionada === cor.id ? 'ring-2 ring-offset-2 ring-gray-400 scale-105' : 'opacity-60 hover:opacity-100'}`} />
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between mt-2">
                <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-red-50/50 transition-colors -ml-1.5">
                  <input type="checkbox" checked={prioridade} onChange={(e) => setPrioridade(e.target.checked)} className="w-3.5 h-3.5 text-red-500 rounded border-gray-300 focus:ring-red-500 cursor-pointer" />
                  <span className="text-[11px] font-semibold text-red-500 uppercase tracking-wider mt-0.5">Urgente</span>
                </label>
                <button type="submit" className="flex items-center bg-gray-900 text-white px-4 py-2 rounded-xl text-[13px] font-medium hover:bg-black transition-all cursor-pointer">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE GERENCIAR CATEGORIAS */}
      {isCategoriaModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setIsCategoriaModalOpen(false); }}>
          <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-semibold text-base text-gray-800">Categorias</h3>
              <button onClick={() => setIsCategoriaModalOpen(false)} className="text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 p-1.5 rounded-full transition-colors cursor-pointer">
                <X size={16} strokeWidth={2} />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button onClick={() => setTipoCategoriaModal('Pendência')} className={`flex-1 py-1.5 text-[12px] font-semibold rounded-lg ${tipoCategoriaModal === 'Pendência' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}>Pendências</button>
                <button onClick={() => setTipoCategoriaModal('Lembrete')} className={`flex-1 py-1.5 text-[12px] font-semibold rounded-lg ${tipoCategoriaModal === 'Lembrete' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}>Lembretes</button>
              </div>

              <form onSubmit={handleSalvarCategoria} className="flex gap-2">
                <input type="text" placeholder="Nome da categoria..." value={novaCategoria} onChange={(e) => setNovaCategoria(e.target.value)} className="flex-1 bg-gray-50 border border-gray-200/60 rounded-xl p-2.5 text-[13px] focus:ring-1 focus:ring-gray-300 outline-none" />
                <button type="submit" className="bg-gray-900 text-white px-3.5 py-2 rounded-xl text-[13px] font-medium hover:bg-black transition-all cursor-pointer">Add</button>
              </form>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {categoriasDoModal.map(cat => (
                  <div key={cat.id} className="flex justify-between items-center bg-white border border-gray-100 p-2.5 rounded-xl shadow-sm">
                    <span className="text-[13px] font-medium text-gray-700">{cat.nome}</span>
                    <button onClick={() => deletarCategoria(cat.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50/50"><Trash2 size={14} /></button>
                  </div>
                ))}
                {categoriasDoModal.length === 0 && <p className="text-center text-[12px] text-gray-400 py-4">Nenhuma categoria registrada.</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
