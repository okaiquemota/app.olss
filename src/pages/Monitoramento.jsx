import { useState, useEffect } from 'react';
import { Search, ExternalLink, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { linkSeguro } from '../lib/links';
import { STATUS_CLIENTE } from '../lib/statusCliente';
import { CopyButton } from '../components/CopyButton';

export function Monitoramento() {
  const [clientes, setClientes] = useState([]);
  const [plataformas, setPlataformas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState('');

  const fetchDados = async () => {
    setLoading(true);

    const [resClientes, resPlataformas] = await Promise.all([
      supabase
        .from('clientes')
        .select('id, nome_razao_social, plataforma_inversor, login_app, senha_app, status')
        .order('nome_razao_social'),
      supabase.from('plataformas').select('*').order('nome'),
    ]);

    if (resClientes.error || resPlataformas.error) {
      setErro('Não foi possível carregar os acessos. Verifique a conexão e tente novamente.');
    }
    if (resPlataformas.data) setPlataformas(resPlataformas.data);
    if (resClientes.data) {
      setClientes(resClientes.data.filter(c => c.status === STATUS_CLIENTE.COM_CONTRATO));
    }
    setLoading(false);
  };

  useEffect(() => { fetchDados(); }, []);

  useEffect(() => {
    if (!erro) return;
    const t = setTimeout(() => setErro(''), 6000);
    return () => clearTimeout(t);
  }, [erro]);

  const clientesFiltrados = clientes.filter(c => {
    const termo = busca.toLowerCase();
    return (
      (c.nome_razao_social?.toLowerCase() || '').includes(termo) ||
      (c.plataforma_inversor?.toLowerCase() || '').includes(termo) ||
      (c.login_app?.toLowerCase() || '').includes(termo)
    );
  });

  const getLinkPlataforma = (nome) => linkSeguro(plataformas.find(p => p.nome?.toLowerCase() === nome?.toLowerCase())?.link);

  // Quantos clientes estão sem login ou sem senha preenchidos
  const semAcesso = clientes.filter(c => !c.login_app || !c.senha_app).length;

  return (
    <div className="w-full h-full flex flex-col relative">

      {/* AVISO DE FALHA */}
      {erro && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] max-w-[90vw] bg-red-600 text-white px-4 py-2.5 rounded-none shadow-sm text-[13px] font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <AlertCircle size={16} className="shrink-0" />
          {erro}
        </div>
      )}

      <div className="flex flex-col h-full bg-white border border-gray-400 shadow-sm animate-in fade-in duration-300 antialiased text-sm">

        {/* BUSCA + AÇÕES */}
        <div className="flex flex-col lg:flex-row items-center gap-2 p-3 md:p-4 border-b border-gray-400 shrink-0 w-full bg-white">
          <div className="relative flex-1 w-full lg:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Buscar cliente, login ou plataforma..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-400 rounded-none text-[13px] focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 transition-all"
            />
          </div>

          <button
            type="button"
            onClick={fetchDados}
            disabled={loading}
            className="w-full lg:w-auto shrink-0 flex items-center justify-center gap-1.5 bg-white border border-gray-400 text-gray-700 px-3 py-2 rounded-none text-[12px] font-bold hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50"
            title="Recarregar os dados"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>

        {/* CONTADORES */}
        <div className="grid grid-cols-2 border-b border-gray-400 shrink-0 divide-x divide-gray-400">
          <div className="px-4 py-2">
            <span className="text-[13px] font-bold text-gray-800">{clientesFiltrados.length}</span>
            <span className="text-[12px] text-gray-600 ml-1.5">
              {clientesFiltrados.length === 1 ? 'cliente com contrato' : 'clientes com contrato'}
            </span>
          </div>
          <div className="px-4 py-2">
            <span className={`text-[13px] font-bold ${semAcesso > 0 ? 'text-yellow-700' : 'text-gray-800'}`}>{semAcesso}</span>
            <span className="text-[12px] text-gray-600 ml-1.5">sem acesso cadastrado</span>
          </div>
        </div>

        {/* LISTA */}
        <div className="flex-1 overflow-y-auto bg-white">
          {loading ? (
            <div className="flex justify-center items-center h-full text-gray-600 text-[13px] min-h-[200px]">
              <Loader2 className="animate-spin mr-2" size={18} /> Carregando...
            </div>
          ) : clientesFiltrados.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-full text-gray-600 text-[13px] min-h-[200px] gap-1">
              {busca
                ? <>Nenhum cliente encontrado para <span className="font-semibold text-gray-800">“{busca}”</span>.</>
                : 'Nenhum cliente com contrato ativo.'}
            </div>
          ) : (
            <div className="divide-y divide-gray-300">
              {clientesFiltrados.map(item => {
                const link = getLinkPlataforma(item.plataforma_inversor);
                const temPlataforma = Boolean(item.plataforma_inversor);
                return (
                  <div key={item.id} className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6 px-4 py-3 hover:bg-gray-100 transition-colors">

                    <div className="min-w-[220px] md:w-[280px] shrink-0">
                      <p className="font-semibold text-[13px] text-gray-800 truncate" title={item.nome_razao_social}>
                        {item.nome_razao_social}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {temPlataforma ? (
                          link ? (
                            <a
                              href={link}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 hover:text-blue-900 hover:underline"
                              title={`Abrir ${item.plataforma_inversor}`}
                            >
                              {item.plataforma_inversor}
                              <ExternalLink size={11} />
                            </a>
                          ) : (
                            <span
                              className="text-[11px] text-gray-600 border-b border-dotted border-gray-500 cursor-help"
                              title="Sem link cadastrado. Cadastre em Configurações para abrir a plataforma direto daqui."
                            >
                              {item.plataforma_inversor}
                            </span>
                          )
                        ) : (
                          <span className="text-[11px] text-gray-500 italic">Plataforma não informada</span>
                        )}
                      </div>
                    </div>

                    {/* grid de largura fixa mantém Login e Senha alinhados entre as linhas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 flex-1 min-w-0 sm:max-w-[620px]">
                      <div className="min-w-0">
                        <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Login</span>
                        <CopyButton text={item.login_app} />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Senha</span>
                        <CopyButton text={item.senha_app} mascarar />
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
