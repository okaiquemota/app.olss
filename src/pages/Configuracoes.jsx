import { useState, useEffect } from 'react';
import { Plus, Trash2, ExternalLink, Loader2, LayoutGrid, AlertCircle, X, AlertTriangle, Edit2, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { linkSeguro } from '../lib/links';

export function Configuracoes() {
  const [plataformas, setPlataformas] = useState([]);
  const [usoPorPlataforma, setUsoPorPlataforma] = useState({});
  const [loading, setLoading] = useState(true);

  const [nome, setNome] = useState('');
  const [link, setLink] = useState('');
  const [salvando, setSalvando] = useState(false);

  const [erro, setErro] = useState('');
  const [plataformaParaExcluir, setPlataformaParaExcluir] = useState(null);

  // Plataforma sendo editada (null = cadastrando uma nova)
  const [editando, setEditando] = useState(null);
  // Rename que ainda precisa de confirmação por afetar clientes vinculados
  const [renomeacaoPendente, setRenomeacaoPendente] = useState(null);

  const fetchPlataformas = async () => {
    setLoading(true);

    const [resPlataformas, resClientes] = await Promise.all([
      supabase.from('plataformas').select('*').order('nome'),
      supabase.from('clientes').select('plataforma_inversor'),
    ]);

    if (resPlataformas.error) {
      setErro('Não foi possível carregar as plataformas. Verifique a conexão e recarregue a página.');
    } else {
      setPlataformas(resPlataformas.data || []);
    }

    // Conta quantos clientes usam cada plataforma, para mostrar o impacto da exclusão
    if (resClientes.data) {
      const contagem = {};
      resClientes.data.forEach(c => {
        const chave = c.plataforma_inversor?.trim().toLowerCase();
        if (chave) contagem[chave] = (contagem[chave] || 0) + 1;
      });
      setUsoPorPlataforma(contagem);
    }

    setLoading(false);
  };

  useEffect(() => { fetchPlataformas(); }, []);

  useEffect(() => {
    if (!erro) return;
    const t = setTimeout(() => setErro(''), 6000);
    return () => clearTimeout(t);
  }, [erro]);

  // Esc fecha as confirmações abertas
  useEffect(() => {
    if (!plataformaParaExcluir && !renomeacaoPendente) return;
    const aoTeclar = (e) => {
      if (e.key !== 'Escape') return;
      setPlataformaParaExcluir(null);
      setRenomeacaoPendente(null);
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [plataformaParaExcluir, renomeacaoPendente]);

  const contarUso = (nomePlataforma) => usoPorPlataforma[nomePlataforma?.trim().toLowerCase()] || 0;

  const limparFormulario = () => {
    setEditando(null);
    setNome('');
    setLink('');
  };

  const iniciarEdicao = (plat) => {
    setEditando(plat);
    setNome(plat.nome || '');
    setLink(plat.link || '');
  };

  // Valida o formulário e devolve os valores prontos, ou null se algo estiver errado
  const validarFormulario = () => {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) return null;

    // O Monitoramento casa cliente e plataforma pelo nome, então nome repetido
    // deixaria o link ambíguo. Na edição, a própria plataforma não conta.
    const jaExiste = plataformas.some(p =>
      p.id !== editando?.id && p.nome?.trim().toLowerCase() === nomeLimpo.toLowerCase()
    );
    if (jaExiste) {
      setErro(`A plataforma "${nomeLimpo}" já está cadastrada.`);
      return null;
    }

    const linkLimpo = link.trim();
    if (linkLimpo && !linkSeguro(linkLimpo)) {
      setErro('O link informado não é válido. Use um endereço começando com http:// ou https://');
      return null;
    }

    return { nome: nomeLimpo, link: linkLimpo ? linkSeguro(linkLimpo) : '' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const valores = validarFormulario();
    if (!valores) return;

    if (!editando) {
      await gravar(valores);
      return;
    }

    // Renomear muda o vínculo: o Monitoramento acha a plataforma do cliente pelo
    // nome, então os clientes precisam ser atualizados junto. Confirma antes.
    const renomeou = valores.nome.toLowerCase() !== editando.nome?.trim().toLowerCase();
    if (renomeou && contarUso(editando.nome) > 0) {
      setRenomeacaoPendente({ antigo: editando.nome, valores });
      return;
    }

    await gravar(valores);
  };

  // Grava o cadastro; em rename com clientes vinculados, atualiza os clientes junto
  const gravar = async (valores, nomeAntigoParaMigrar = null) => {
    setSalvando(true);

    const { error } = editando
      ? await supabase.from('plataformas').update(valores).eq('id', editando.id)
      : await supabase.from('plataformas').insert([valores]);

    if (error) {
      setSalvando(false);
      setErro(editando ? 'Não foi possível salvar a plataforma. Tente novamente.' : 'Não foi possível cadastrar a plataforma. Tente novamente.');
      return;
    }

    if (nomeAntigoParaMigrar) {
      const { error: erroClientes } = await supabase
        .from('clientes')
        .update({ plataforma_inversor: valores.nome })
        .eq('plataforma_inversor', nomeAntigoParaMigrar);

      if (erroClientes) {
        setSalvando(false);
        setErro(`A plataforma foi renomeada, mas os clientes ainda apontam para "${nomeAntigoParaMigrar}". Ajuste-os no cadastro.`);
        limparFormulario();
        fetchPlataformas();
        return;
      }
    }

    setSalvando(false);
    limparFormulario();
    fetchPlataformas();
  };

  const confirmarRenomeacao = async () => {
    const pendente = renomeacaoPendente;
    setRenomeacaoPendente(null);
    if (pendente) await gravar(pendente.valores, pendente.antigo);
  };

  const confirmarExclusao = async () => {
    const alvo = plataformaParaExcluir;
    setPlataformaParaExcluir(null);
    if (!alvo) return;

    const { error } = await supabase.from('plataformas').delete().eq('id', alvo.id);
    if (error) {
      setErro('Não foi possível remover a plataforma. Tente novamente.');
      return;
    }
    // Se a plataforma excluída era a que estava aberta no formulário, sai da edição
    if (editando?.id === alvo.id) limparFormulario();
    setPlataformas(prev => prev.filter(p => p.id !== alvo.id));
  };

  const inputClass = "flex-1 bg-white border border-gray-400 rounded-none px-3 py-2 text-[12px] text-gray-800 focus:ring-1 focus:ring-green-500 focus:border-green-500 outline-none placeholder:text-gray-500";

  return (
    <div className="w-full h-full flex flex-col gap-4 animate-in fade-in duration-300 antialiased text-sm">

      {/* AVISO DE FALHA */}
      {erro && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] max-w-[90vw] bg-red-600 text-white px-4 py-2.5 rounded-none shadow-sm text-[13px] font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <AlertCircle size={16} className="shrink-0" />
          {erro}
        </div>
      )}

      <div className="bg-white border border-gray-400 shadow-sm">
        <div className="px-4 py-2.5 border-b border-gray-400 bg-gray-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <LayoutGrid size={14} className="text-gray-600" />
            <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">Plataformas de Monitoramento</h3>
          </div>
          {!loading && (
            <span className="text-[11px] font-bold text-gray-600 tabular-nums">
              {plataformas.length} {plataformas.length === 1 ? 'cadastrada' : 'cadastradas'}
            </span>
          )}
        </div>

        <div className="p-4 space-y-4">
          <div className={editando ? 'border border-green-600 bg-green-50 p-3 -m-0.5' : ''}>
            {editando && (
              <p className="text-[11px] font-bold text-green-800 uppercase tracking-wider mb-2">
                Editando: {editando.nome}
              </p>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Nome da plataforma"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className={inputClass}
              />
              <input
                type="text"
                placeholder="Link (ex: https://...)"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className={inputClass}
              />
              <div className="flex gap-2 shrink-0">
                <button
                  type="submit"
                  disabled={salvando || !nome.trim()}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-green-700 text-white px-4 py-2 rounded-none text-[12px] font-bold hover:bg-green-800 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
                >
                  {salvando
                    ? <Loader2 size={14} className="animate-spin" />
                    : editando
                      ? <><Check size={14} /> Salvar</>
                      : <><Plus size={14} /> Adicionar</>}
                </button>
                {editando && (
                  <button
                    type="button"
                    onClick={limparFormulario}
                    disabled={salvando}
                    className="bg-white border border-gray-400 text-gray-700 px-4 py-2 rounded-none text-[12px] font-bold hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>

            <p className="text-[11px] text-gray-600 mt-1.5">
              O nome precisa ser igual ao que está no cadastro do cliente — é por ele que o Monitoramento monta o link de acesso.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-600 text-[13px]">
              <Loader2 className="animate-spin mr-2" size={16} /> Carregando plataformas...
            </div>
          ) : (
            <div className="border border-gray-400 divide-y divide-gray-300">
              {plataformas.map(plat => {
                const href = linkSeguro(plat.link);
                const emUso = contarUso(plat.nome);
                return (
                  <div key={plat.id} className="flex justify-between items-center gap-3 px-3 py-2.5 hover:bg-gray-100 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-semibold text-gray-800 truncate">{plat.nome}</span>
                        {href && (
                          <a
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-700 hover:text-blue-900 shrink-0"
                            title={`Abrir ${plat.nome}`}
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-600 truncate mt-0.5">
                        {href
                          ? <>{href} · <span className={emUso > 0 ? 'text-gray-700 font-medium' : ''}>{emUso} {emUso === 1 ? 'cliente' : 'clientes'}</span></>
                          : <span className="italic">Sem link cadastrado · {emUso} {emUso === 1 ? 'cliente' : 'clientes'}</span>}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => iniciarEdicao(plat)}
                        className="text-gray-500 hover:text-gray-900 transition-colors p-1.5 hover:bg-gray-200 border border-transparent hover:border-gray-400 rounded-none cursor-pointer"
                        title="Editar"
                        aria-label={`Editar ${plat.nome}`}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlataformaParaExcluir(plat)}
                        className="text-gray-500 hover:text-red-600 transition-colors p-1.5 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-none cursor-pointer"
                        title="Remover"
                        aria-label={`Remover ${plat.nome}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
              {plataformas.length === 0 && (
                <p className="text-center text-[12px] text-gray-600 py-6 font-medium">
                  Nenhuma plataforma cadastrada. Adicione a primeira no campo acima.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CONFIRMAÇÃO DE RENOMEAÇÃO — clientes vinculados serão atualizados junto */}
      {renomeacaoPendente && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[70] flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setRenomeacaoPendente(null); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-renomear-plataforma"
            className="bg-white shadow-2xl border border-gray-400 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 rounded-none"
          >
            <div className="flex justify-between items-center p-4 border-b border-gray-400 bg-gray-100">
              <h3 id="titulo-renomear-plataforma" className="font-bold text-[13px] uppercase tracking-wider text-gray-800">Renomear Plataforma</h3>
              <button
                type="button"
                onClick={() => setRenomeacaoPendente(null)}
                className="text-gray-600 hover:text-red-600 hover:bg-red-50 p-1.5 transition-colors cursor-pointer border border-transparent hover:border-red-200 rounded-none"
                title="Fechar"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>

            <div className="p-5">
              <p className="text-[13px] text-gray-700 leading-relaxed">
                Renomear <span className="font-bold text-gray-900">{renomeacaoPendente.antigo}</span> para{' '}
                <span className="font-bold text-gray-900">{renomeacaoPendente.valores.nome}</span>?
              </p>

              <div className="flex gap-2 mt-3 p-2.5 bg-yellow-50 border border-yellow-400 text-[12px] text-yellow-900">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <span>
                  {contarUso(renomeacaoPendente.antigo)}{' '}
                  {contarUso(renomeacaoPendente.antigo) === 1 ? 'cliente será atualizado' : 'clientes serão atualizados'} para
                  o nome novo, para não perderem o link no Monitoramento.
                </span>
              </div>

              <div className="flex gap-2 mt-5">
                <button
                  type="button"
                  autoFocus
                  onClick={() => setRenomeacaoPendente(null)}
                  className="flex-1 bg-white border border-gray-400 text-gray-700 px-4 py-2.5 text-[12px] font-bold hover:bg-gray-200 transition-colors cursor-pointer rounded-none"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmarRenomeacao}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-700 text-white px-4 py-2.5 text-[12px] font-bold hover:bg-green-800 transition-colors cursor-pointer rounded-none"
                >
                  <Check size={14} strokeWidth={2.2} />
                  Renomear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO DE EXCLUSÃO */}
      {plataformaParaExcluir && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[70] flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setPlataformaParaExcluir(null); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-excluir-plataforma"
            className="bg-white shadow-2xl border border-gray-400 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 rounded-none"
          >
            <div className="flex justify-between items-center p-4 border-b border-gray-400 bg-gray-100">
              <h3 id="titulo-excluir-plataforma" className="font-bold text-[13px] uppercase tracking-wider text-gray-800">Remover Plataforma</h3>
              <button
                type="button"
                onClick={() => setPlataformaParaExcluir(null)}
                className="text-gray-600 hover:text-red-600 hover:bg-red-50 p-1.5 transition-colors cursor-pointer border border-transparent hover:border-red-200 rounded-none"
                title="Fechar"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>

            <div className="p-5">
              <p className="text-[13px] text-gray-700 leading-relaxed">
                Remover <span className="font-bold text-gray-900">{plataformaParaExcluir.nome}</span> da lista de plataformas?
              </p>

              {contarUso(plataformaParaExcluir.nome) > 0 && (
                <div className="flex gap-2 mt-3 p-2.5 bg-yellow-50 border border-yellow-400 text-[12px] text-yellow-900">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                  <span>
                    {contarUso(plataformaParaExcluir.nome)}{' '}
                    {contarUso(plataformaParaExcluir.nome) === 1 ? 'cliente usa' : 'clientes usam'} esta plataforma.
                    O cadastro deles não muda, mas o link deixa de aparecer no Monitoramento.
                  </span>
                </div>
              )}

              <div className="flex gap-2 mt-5">
                <button
                  type="button"
                  autoFocus
                  onClick={() => setPlataformaParaExcluir(null)}
                  className="flex-1 bg-white border border-gray-400 text-gray-700 px-4 py-2.5 text-[12px] font-bold hover:bg-gray-200 transition-colors cursor-pointer rounded-none"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmarExclusao}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2.5 text-[12px] font-bold hover:bg-red-700 transition-colors cursor-pointer rounded-none"
                >
                  <Trash2 size={14} strokeWidth={2.2} />
                  Remover
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
