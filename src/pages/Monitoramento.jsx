import { useState, useEffect } from 'react';
import { 
  Search, Download, LayoutGrid, CheckCircle, 
  AlertTriangle, AlertCircle, Copy, ExternalLink, Loader2, Filter
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Monitoramento() {
  const [credenciais, setCredenciais] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  const [filtroPlataforma, setFiltroPlataforma] = useState('Todas as plataformas');

  const fetchDados = async () => {
    setLoading(true);
    // Busca os clientes para pegar os acessos às plataformas
    const { data, error } = await supabase
      .from('clientes')
      .select('id, nome_razao_social, plataforma_inversor, status_monitoramento, login_app, senha_app, observacoes_internas')
      .order('nome_razao_social');
      
    if (error) {
      console.error('Erro ao buscar monitoramento:', error);
    } else {
      setCredenciais(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDados();
  }, []);

  // Pegar lista única de plataformas para o select (removendo vazios e duplicados)
  const listaPlataformas = [...new Set(credenciais.map(c => c.plataforma_inversor).filter(Boolean))];

  // Aplicação dos filtros
  const dadosFiltrados = credenciais.filter(c => {
    const termo = busca.toLowerCase();
    const matchBusca = 
      (c.nome_razao_social?.toLowerCase() || '').includes(termo) || 
      (c.plataforma_inversor?.toLowerCase() || '').includes(termo) ||
      (c.login_app?.toLowerCase() || '').includes(termo);
      
    const matchStatus = filtroStatus === 'Todos' || c.status_monitoramento === filtroStatus;
    const matchPlataforma = filtroPlataforma === 'Todas as plataformas' || c.plataforma_inversor === filtroPlataforma;
    
    return matchBusca && matchStatus && matchPlataforma;
  });

  // Contadores para a barra de resumo
  const total = dadosFiltrados.length;
  const normais = dadosFiltrados.filter(c => !c.status_monitoramento || c.status_monitoramento.toLowerCase() === 'normal').length;
  const vencidos = dadosFiltrados.filter(c => c.status_monitoramento?.toLowerCase() === 'vencido' || c.status_monitoramento?.toLowerCase() === 'serviço vencido').length;
  const alertas = total - normais - vencidos; // O que sobrar é alerta/outros

  // Componente visual do Status
  const renderStatus = (status) => {
    const stat = (status || 'normal').toLowerCase();
    
    if (stat === 'normal') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-green-400 text-green-700 bg-transparent rounded-sm text-[11px] font-bold">
          <CheckCircle size={13} /> Normal
        </span>
      );
    }
    if (stat === 'vencido' || stat === 'serviço vencido') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-red-400 text-red-700 bg-transparent rounded-sm text-[11px] font-bold">
          <AlertCircle size={13} /> Serviço Vencido
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-yellow-400 text-yellow-700 bg-transparent rounded-sm text-[11px] font-bold">
        <AlertTriangle size={13} /> {status}
      </span>
    );
  };

  // Função auxiliar para renderizar célula copiável
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

  return (
    <div className="w-full h-full flex flex-col relative">
      
      {/* Container principal com borda para fazer o estilo "card" na tela */}
      <div className="flex flex-col h-full bg-white border border-gray-300 animate-in fade-in duration-300 antialiased text-sm">
        
        {/* CABEÇALHO / CONTROLES */}
        <div className="flex flex-col lg:flex-row items-center gap-2 p-3 md:p-4 border-b border-gray-300 shrink-0 w-full bg-white">
          
          {/* Busca - Ocupando o máximo de espaço possível na esquerda */}
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
          
          {/* Filtros e Botões alinhados na direita */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto shrink-0 justify-end">
            
            {/* Adicionando ícone ao select de Status para replicar o design visual */}
            <div className="relative">
               <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                 <Filter size={14} className="text-gray-500" />
               </div>
              <select 
                value={filtroStatus} 
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="bg-white border border-gray-300 pl-8 pr-8 py-2 text-[12px] text-gray-700 outline-none focus:ring-1 focus:ring-green-500 font-medium rounded-none cursor-pointer appearance-none"
              >
                <option value="Todos">Todos</option>
                <option value="normal">Normal</option>
                <option value="vencido">Vencido</option>
                <option value="alerta">Alerta</option>
              </select>
               {/* Seta customizada do select para não usar aparência padrão feia do navegador */}
               <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-500">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
               </div>
            </div>

            <div className="relative">
              <select 
                value={filtroPlataforma} 
                onChange={(e) => setFiltroPlataforma(e.target.value)}
                className="bg-white border border-gray-300 pl-3 pr-8 py-2 text-[12px] text-gray-700 outline-none focus:ring-1 focus:ring-green-500 font-medium rounded-none cursor-pointer appearance-none"
              >
                <option value="Todas as plataformas">Todas as plataformas</option>
                {listaPlataformas.map((plat, idx) => (
                  <option key={idx} value={plat}>{plat}</option>
                ))}
              </select>
               <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-500">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
               </div>
            </div>

            <button className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-none text-[12px] font-medium hover:bg-gray-100 transition-all cursor-pointer">
              <Download size={14} /> Exportar
            </button>
            
            <button className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-none text-[12px] font-medium hover:bg-gray-100 transition-all cursor-pointer">
              <LayoutGrid size={14} /> Plataformas
            </button>
          </div>
        </div>

        {/* BARRA DE RESUMO */}
        <div className="grid grid-cols-4 border-b border-gray-300 bg-white shrink-0">
          <div className="px-4 py-2 border-r border-gray-300 text-[12px] text-gray-800">
            <span className="font-extrabold">{total}</span> credenciais
          </div>
          <div className="px-4 py-2 border-r border-gray-300 text-[12px] text-green-700">
            <span className="font-extrabold">{normais}</span> normais
          </div>
          <div className="px-4 py-2 border-r border-gray-300 text-[12px] text-yellow-600">
            <span className="font-extrabold">{alertas}</span> alertas
          </div>
          <div className="px-4 py-2 text-[12px] text-red-600">
            <span className="font-extrabold">{vencidos}</span> vencidos
          </div>
        </div>

        {/* TABELA */}
        <div className="flex-1 overflow-y-auto bg-white flex flex-col">
          {loading ? (
            <div className="flex justify-center items-center flex-1 text-gray-400 text-[13px] min-h-[200px]">
              <Loader2 className="animate-spin mr-2" size={18} /> Carregando monitoramento...
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-300">
                  <tr className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                    <th className="px-4 py-3 border-r border-gray-300">Cliente / Usina</th>
                    <th className="px-4 py-3 border-r border-gray-300">Plataforma</th>
                    <th className="px-4 py-3 border-r border-gray-300">Status</th>
                    <th className="px-4 py-3 border-r border-gray-300">Login</th>
                    <th className="px-4 py-3 border-r border-gray-300">Senha</th>
                    <th className="px-4 py-3">Observações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {dadosFiltrados.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-4 py-3 border-r border-gray-200 min-w-[200px]">
                        {renderCelulaComCopia(item.nome_razao_social, "font-medium text-[12px] text-gray-700")}
                      </td>
                      
                      <td className="px-4 py-3 border-r border-gray-200 min-w-[150px]">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] text-gray-700 font-medium">{item.plataforma_inversor || '--'}</span>
                          {item.plataforma_inversor && (
                            <ExternalLink size={13} className="text-blue-500 cursor-pointer hover:text-blue-700" />
                          )}
                        </div>
                      </td>
                      
                      <td className="px-4 py-3 border-r border-gray-200 min-w-[120px]">
                        {renderStatus(item.status_monitoramento)}
                      </td>
                      
                      <td className="px-4 py-3 border-r border-gray-200 min-w-[150px]">
                        {renderCelulaComCopia(item.login_app, "text-[12px] text-gray-700 font-medium")}
                      </td>
                      
                      <td className="px-4 py-3 border-r border-gray-200 min-w-[150px]">
                        {renderCelulaComCopia(item.senha_app, "text-[12px] text-gray-700 font-medium")}
                      </td>
                      
                      <td className="px-4 py-3 min-w-[250px] max-w-[400px]">
                        <span className="text-[12px] text-gray-500 font-medium truncate block">
                          {item.observacoes_internas || '--'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  
                  {dadosFiltrados.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-[12px] text-gray-400">
                        Nenhum registro encontrado na busca.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}