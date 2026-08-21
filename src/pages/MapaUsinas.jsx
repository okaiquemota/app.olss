import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { Search, MapPin, Navigation, CheckCircle2, AlertCircle, ShieldAlert, X, Loader2, DollarSign, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { STATUS_CLIENTE, STATUS_CLIENTE_PADRAO } from '../lib/statusCliente';

// ==========================================
// ÍCONES CUSTOMIZADOS: PREENCHIMENTO (Comercial) + BORDA (Operacional)
// ==========================================
const createIcon = (statusComercial, statusOperacional) => {
  let fillClass = 'bg-gray-400';
  let borderClass = 'border-0'; // Sem contorno por padrão

  // Define a cor de fundo (Comercial) e só aplica borda se tiver contrato
  if (statusComercial === STATUS_CLIENTE.COM_CONTRATO) {
    fillClass = 'bg-green-500';
    
    // Cor da Borda (Operacional) exclusiva para contratos ativos
    if (statusOperacional === 'normal') borderClass = 'border-[3px] border-green-600';
    else if (statusOperacional === 'offline') borderClass = 'border-[3px] border-[#FFFF00]';
    else if (statusOperacional === 'problema') borderClass = 'border-[3px] border-[#FFC000]';
    else if (statusOperacional === 'vencido') borderClass = 'border-[3px] border-[#FF0000]';
    
  } else if (statusComercial === STATUS_CLIENTE.SEM_CONTRATO) {
    fillClass = 'bg-red-500';
  } else if (statusComercial === STATUS_CLIENTE.EM_PROSPECCAO) {
    fillClass = 'bg-yellow-500';
  }

  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `<div class="w-5 h-5 rounded-full shadow-md ${fillClass} ${borderClass}"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

export function MapaUsinas() {
  const [busca, setBusca] = useState('');
  const [usinaSelecionada, setUsinaSelecionada] = useState(null);
  
  const [usinas, setUsinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const carregarUsinas = async () => {
      // Só as colunas que o mapa usa: com select('*') as senhas dos portais
      // vinham para esta tela sem necessidade nenhuma.
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome_razao_social, lat, lng, status, status_monitoramento, endereco, observacoes_internas');

      if (error || !data) {
        setErro('Não foi possível carregar as usinas. Verifique a conexão e recarregue a página.');
        setLoading(false);
        return;
      }

      // Agora a tela APENAS LÊ as coordenadas que já foram salvas no Cadastro. Nada de chamar API de mapa aqui.
      const usinasMapeadas = data
        .filter(cliente => cliente.lat && cliente.lng) // Pega só quem tem coordenada salva
        .map(cliente => ({
          id: cliente.id,
          nome: cliente.nome_razao_social,
          lat: parseFloat(cliente.lat),
          lng: parseFloat(cliente.lng),
          statusComercial: cliente.status || STATUS_CLIENTE_PADRAO,
          statusOperacional: cliente.status_monitoramento?.toLowerCase() || 'normal',
          endereco: cliente.endereco,
          obs: cliente.observacoes_internas
        }));

      setUsinas(usinasMapeadas);
      setLoading(false);
    };

    carregarUsinas();
  }, []);

  const usinasFiltradas = usinas.filter(u => 
    u.nome.toLowerCase().includes(busca.toLowerCase()) || 
    (u.endereco && u.endereco.toLowerCase().includes(busca.toLowerCase()))
  );

  const getComercialVisual = (status) => {
    if (status === STATUS_CLIENTE.COM_CONTRATO) return { bg: 'bg-green-50 text-green-700 border-green-200' };
    if (status === STATUS_CLIENTE.SEM_CONTRATO) return { bg: 'bg-red-50 text-red-700 border-red-200' };
    return { bg: 'bg-yellow-50 text-yellow-700 border-yellow-200' }; // Prospecção
  };

  const getOperacionalVisual = (status) => {
    if (status === 'offline') return { cor: 'text-yellow-700', bg: 'bg-yellow-50 border-[#FFFF00]', icone: <AlertCircle size={13}/>, label: 'Offline' };
    if (status === 'problema') return { cor: 'text-orange-700', bg: 'bg-orange-50 border-[#FFC000]', icone: <AlertCircle size={13}/>, label: 'Problema' };
    if (status === 'vencido') return { cor: 'text-red-700', bg: 'bg-red-50 border-[#FF0000]', icone: <ShieldAlert size={13}/>, label: 'Vencido' };
    return { cor: 'text-green-700', bg: 'bg-green-50 border-green-600', icone: <CheckCircle2 size={13}/>, label: 'Normal' };
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 border border-gray-400 rounded-none text-gray-600">
        <Loader2 className="animate-spin mb-3 text-green-700" size={28} />
        <span className="text-[13px] font-bold uppercase tracking-wider">Carregando mapa...</span>
      </div>
    );
  }

  return (
    <div className="-m-3 md:-m-4 h-[calc(100vh-48px)] relative z-0 overflow-hidden animate-in fade-in duration-300 bg-gray-200 border border-gray-400">

      {/* AVISO DE FALHA */}
      {erro && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1100] max-w-[90vw] bg-red-600 text-white px-4 py-2.5 rounded-none shadow-sm text-[13px] font-semibold flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          {erro}
        </div>
      )}
      
      {/* BARRA DE BUSCA */}
      <div className="absolute top-3 left-3 md:top-4 md:left-4 z-[1000] w-[calc(100vw-1.5rem)] sm:w-80 md:w-96 pr-3 sm:pr-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input 
            type="text" 
            placeholder="Buscar usina ou endereço..." 
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-400 rounded-none text-[13px] font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 shadow-sm placeholder:text-gray-500 transition-all"
          />
        </div>
      </div>

      {/* LEGENDA DUPLA (Preenchimento vs Contorno) */}
      <div className="hidden sm:flex flex-col absolute top-3 right-3 md:top-4 md:right-4 z-[1000] bg-white border border-gray-400 p-3 rounded-none shadow-sm gap-2">
        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1"><DollarSign size={12}/> Preenchimento (Comercial)</div>
        <div className="grid grid-cols-2 gap-y-2 gap-x-4">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-green-500"></div><span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Contrato</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div><span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">S/ Contrato</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div><span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Prospecção</span></div>
        </div>
        
        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-1 mb-1 border-t border-gray-100 pt-2 flex items-center gap-1">
          <Activity size={12}/> Contorno (Apenas c/ contrato)
        </div>
        <div className="grid grid-cols-2 gap-y-2 gap-x-4">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full border-[2px] border-green-600 bg-transparent"></div><span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Normal</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full border-[2px] border-[#FFFF00] bg-transparent"></div><span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Offline</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full border-[2px] border-[#FFC000] bg-transparent"></div><span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Problema</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full border-[2px] border-[#FF0000] bg-transparent"></div><span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Vencido</span></div>
        </div>
      </div>

      {/* CARD DE DETALHES FLAT */}
      {usinaSelecionada && (
        <div className="absolute bottom-3 left-3 md:bottom-4 md:left-4 z-[1000] w-[calc(100vw-1.5rem)] sm:w-80 md:w-96 bg-white border border-gray-400 p-4 rounded-none shadow-sm animate-in slide-in-from-bottom-4 duration-200">
          <button 
            onClick={() => setUsinaSelecionada(null)} 
            className="absolute top-3 right-3 text-gray-500 hover:text-red-600 hover:bg-red-50 p-1.5 transition-colors cursor-pointer rounded-none border border-transparent hover:border-red-200"
          >
            <X size={14} strokeWidth={2.5}/>
          </button>
          
          <div className="flex items-start gap-3 mb-4 pr-6">
            <div className="p-1.5 bg-green-50 border border-green-200 text-green-700 rounded-none shrink-0 mt-0.5"><MapPin size={16} /></div>
            <div>
              <h3 className="font-bold text-gray-800 text-[13px] leading-tight mb-1">{usinaSelecionada.nome}</h3>
              {usinaSelecionada.endereco && (
                <span className="text-[11px] font-medium text-gray-600 line-clamp-2 leading-tight">
                  {usinaSelecionada.endereco}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
             {/* TAG COMERCIAL */}
             <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-none border uppercase tracking-wider ${getComercialVisual(usinaSelecionada.statusComercial).bg}`}>
                <DollarSign size={11} /> {usinaSelecionada.statusComercial}
             </span>
             
             {/* TAG OPERACIONAL (Só aparece se o cliente tiver contrato ativo) */}
             {usinaSelecionada.statusComercial === STATUS_CLIENTE.COM_CONTRATO && (
               <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-none border uppercase tracking-wider ${getOperacionalVisual(usinaSelecionada.statusOperacional).bg} ${getOperacionalVisual(usinaSelecionada.statusOperacional).cor}`}>
                  {getOperacionalVisual(usinaSelecionada.statusOperacional).icone} Op: {getOperacionalVisual(usinaSelecionada.statusOperacional).label}
               </span>
             )}
          </div>

          {usinaSelecionada.obs && (
            <div className="mb-4 bg-gray-100 p-3 rounded-none border border-gray-300">
              <span className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">Anotações</span>
              <p className="text-[12px] text-gray-700 leading-relaxed font-medium">
                {usinaSelecionada.obs}
              </p>
            </div>
          )}

          <div className="pt-3 border-t border-gray-300">
            <a 
              href={`https://www.google.com/maps/dir/?api=1&destination=${usinaSelecionada.lat},${usinaSelecionada.lng}`}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-white border border-gray-400 text-gray-700 py-2 rounded-none text-[12px] font-bold hover:bg-gray-100 transition-all cursor-pointer"
            >
              <Navigation size={14} strokeWidth={2.5} /> Iniciar Rota no Mapa
            </a>
          </div>
        </div>
      )}

      {/* COMPONENTE DO MAPA LEAFLET */}
      <MapContainer 
        center={[-21.1704, -47.8103]}
        zoom={13} 
        zoomControl={false} 
        className="w-full h-full z-0"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        
        <div className="absolute bottom-3 right-3 md:bottom-4 md:right-4 z-[1000] hidden sm:block">
          <ZoomControl position="bottomright" />
        </div>

        {usinasFiltradas.map(usina => (
          <Marker 
            key={usina.id} 
            position={[usina.lat, usina.lng]}
            icon={createIcon(usina.statusComercial, usina.statusOperacional)}
            eventHandlers={{
              click: () => setUsinaSelecionada(usina),
            }}
          />
        ))}
      </MapContainer>
    </div>
  );
}