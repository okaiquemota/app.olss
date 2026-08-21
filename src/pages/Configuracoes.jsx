import { useState, useEffect } from 'react';
import { Plus, Trash2, ExternalLink, Loader2, LayoutGrid } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Configuracoes() {
  const [plataformas, setPlataformas] = useState([]);
  const [loading, setLoading] = useState(true);

  const [nome, setNome] = useState('');
  const [link, setLink] = useState('');
  const [salvando, setSalvando] = useState(false);

  const fetchPlataformas = async () => {
    setLoading(true);
    const { data } = await supabase.from('plataformas').select('*').order('nome');
    setPlataformas(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPlataformas();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!nome.trim()) return;

    setSalvando(true);
    const { error } = await supabase.from('plataformas').insert([{ nome, link }]);
    if (!error) {
      setNome('');
      setLink('');
      fetchPlataformas();
    }
    setSalvando(false);
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from('plataformas').delete().eq('id', id);
    if (!error) setPlataformas(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="w-full h-full flex flex-col gap-4 animate-in fade-in duration-300 antialiased text-sm">

      <div className="bg-white border border-gray-400 shadow-sm">
        <div className="px-4 py-2.5 border-b border-gray-400 bg-gray-200 flex items-center gap-2">
          <LayoutGrid size={14} className="text-gray-600" />
          <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">Plataformas de Monitoramento</h3>
        </div>

        <div className="p-4 space-y-4">
          <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Nome da plataforma"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="flex-1 bg-white border border-gray-400 rounded-none px-3 py-2 text-[12px] focus:ring-1 focus:ring-green-500 outline-none"
            />
            <input
              type="text"
              placeholder="Link (ex: https://...)"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="flex-1 bg-white border border-gray-400 rounded-none px-3 py-2 text-[12px] focus:ring-1 focus:ring-green-500 outline-none"
            />
            <button
              type="submit"
              disabled={salvando}
              className="flex items-center justify-center gap-1.5 bg-green-700 text-white px-4 py-2 rounded-none text-[12px] font-bold hover:bg-green-800 transition-all cursor-pointer disabled:opacity-50 min-w-[100px]"
            >
              {salvando ? <Loader2 size={14} className="animate-spin" /> : <><Plus size={14} /> Adicionar</>}
            </button>
          </form>

          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-500 text-[13px]">
              <Loader2 className="animate-spin mr-2" size={16} /> Carregando plataformas...
            </div>
          ) : (
            <div className="border border-gray-300 divide-y divide-gray-200">
              {plataformas.map(plat => (
                <div key={plat.id} className="flex justify-between items-center px-3 py-2.5 hover:bg-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium text-gray-800">{plat.nome}</span>
                    {plat.link && (
                      <a href={plat.link} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700 transition-colors" title={plat.link}>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(plat.id)}
                    className="text-gray-500 hover:text-red-600 transition-colors p-1.5 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-none cursor-pointer"
                    title="Remover"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {plataformas.length === 0 && (
                <p className="text-center text-[12px] text-gray-600 py-6 font-medium">Nenhuma plataforma cadastrada.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
