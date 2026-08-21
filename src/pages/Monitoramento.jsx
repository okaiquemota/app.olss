import { useState, useEffect } from 'react';
import { Search, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { linkSeguro } from '../lib/links';
import { STATUS_CLIENTE } from '../lib/statusCliente';
import { CopyButton } from '../components/CopyButton';

export function Monitoramento() {
  const [clientes, setClientes] = useState([]);
  const [plataformas, setPlataformas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    const fetchDados = async () => {
      setLoading(true);

      const [resClientes, resPlataformas] = await Promise.all([
        supabase
          .from('clientes')
          .select('id, nome_razao_social, plataforma_inversor, login_app, senha_app, status')
          .order('nome_razao_social'),
        supabase.from('plataformas').select('*').order('nome'),
      ]);

      if (resPlataformas.data) setPlataformas(resPlataformas.data);
      if (resClientes.data) {
        setClientes(resClientes.data.filter(c => c.status === STATUS_CLIENTE.COM_CONTRATO));
      }
      setLoading(false);
    };
    fetchDados();
  }, []);

  const clientesFiltrados = clientes.filter(c => {
    const termo = busca.toLowerCase();
    return (
      (c.nome_razao_social?.toLowerCase() || '').includes(termo) ||
      (c.plataforma_inversor?.toLowerCase() || '').includes(termo) ||
      (c.login_app?.toLowerCase() || '').includes(termo)
    );
  });

  const getLinkPlataforma = (nome) => linkSeguro(plataformas.find(p => p.nome?.toLowerCase() === nome?.toLowerCase())?.link);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex flex-col h-full bg-white border border-gray-400 shadow-sm animate-in fade-in duration-300 antialiased text-sm">

        {/* BUSCA */}
        <div className="p-3 md:p-4 border-b border-gray-400 shrink-0 bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Buscar cliente, login ou plataforma..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-400 rounded-none text-[13px] focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 transition-all"
            />
          </div>
        </div>

        {/* LISTA */}
        <div className="flex-1 overflow-y-auto bg-white">
          {loading ? (
            <div className="flex justify-center items-center h-full text-gray-500 text-[13px] min-h-[200px]">
              <Loader2 className="animate-spin mr-2" size={18} /> Carregando...
            </div>
          ) : clientesFiltrados.length === 0 ? (
            <div className="flex justify-center items-center h-full text-gray-500 text-[13px] min-h-[200px]">
              Nenhum cliente encontrado.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {clientesFiltrados.map(item => {
                const link = getLinkPlataforma(item.plataforma_inversor);
                return (
                  <div key={item.id} className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6 px-4 py-3 hover:bg-gray-100/60 transition-colors">
                    <div className="min-w-[220px]">
                      <p className="font-semibold text-[13px] text-gray-800 truncate">{item.nome_razao_social}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] text-gray-600">{item.plataforma_inversor || 'Plataforma não informada'}</span>
                        {link && (
                          <a href={link} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800" title="Abrir plataforma">
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-8 gap-y-2 flex-1">
                      <div className="min-w-[160px]">
                        <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Login</span>
                        <CopyButton text={item.login_app} />
                      </div>
                      <div className="min-w-[160px]">
                        <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Senha</span>
                        <CopyButton text={item.senha_app} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
