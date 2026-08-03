import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { Search, MapPin, Navigation, CheckCircle2, AlertCircle, ShieldAlert, X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

// ==========================================
// ÍCONES CUSTOMIZADOS DO MAPA 
// ==========================================
const createIcon = (status) => {
  let corClass = 'bg-green-500';
  if (status === 'alerta') corClass = 'bg-yellow-500 animate-pulse';
  if (status === 'vencido') corClass = 'bg-red-500';

  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `<div class="w-5 h-5 rounded-full border-[3px] border-white shadow-md ${corClass}"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

export function MapaUsinas() {
  const [busca, setBusca] = useState('');
  const [usinaSelecionada, setUsinaSelecionada] = useState(null);
  
  const [usinas, setUsinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progresso, setProgresso] = useState(0); // Para o feedback do Geocodificador

  useEffect(() => {
    const carregarUsinas = async () => {
      // 1. Busca os clientes da base real
      const { data, error } = await supabase.from('clientes').select('*');
      
      if (error || !data) {
        setLoading(false);
        return;
      }

      // 2. Transforma os endereços em coordenadas
      const usinasMapeadas = [];
      
      for (let i = 0; i < data.length; i++) {
        const cliente = data[i];
        
        // Se o cliente já tiver lat/lng salvos no banco, usa eles direto
        if (cliente.lat && cliente.lng) {
          usinasMapeadas.push({
            id: cliente.id,
            nome: cliente.nome_razao_social,
            lat: parseFloat(cliente.lat),
            lng: parseFloat(cliente.lng),
            status: cliente.status_monitoramento || 'normal',
            endereco: cliente.endereco,
            obs: cliente.observacoes_internas
          });
        } 
        // Se não tiver, tenta buscar a coordenada na API do OpenStreetMap
        else if (cliente.endereco && cliente.endereco.trim() !== '') {
          try {
            // Melhora a precisão da busca garantindo que procure no Brasil
            let query = cliente.endereco;
            if (!query.toLowerCase().includes('brasil')) query += ', Brasil';

            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
            const geoData = await res.json();
            
            if (geoData && geoData.length > 0) {
              usinasMapeadas.push({
                id: cliente.id,
                nome: cliente.nome_razao_social,
                lat: parseFloat(geoData[0].lat),
                lng: parseFloat(geoData[0].lon),
                status: cliente.status_monitoramento || 'normal',
                endereco: cliente.endereco,
                obs: cliente.observacoes_internas
              });
            }
          } catch (e) {
            console.error("Falha ao localizar endereço: ", cliente.endereco);
          }
          
          // Delay obrigatório de 1s para respeitar as regras da API gratuita e não ser bloqueado
          await new Promise(r => setTimeout(r, 1000));
        }
        
        // Atualiza a barrinha de carregamento
        setProgresso(Math.round(((i + 1) / data.length) * 100));
      }

      setUsinas(usinasMapeadas);
      setLoading(false);
    };

    carregarUsinas();
  }, []);

  const usinasFiltradas = usinas.filter(u => 
    u.nome.toLowerCase().includes(busca.toLowerCase()) || 
    (u.endereco && u.endereco.toLowerCase().includes(busca.toLowerCase()))
  );

  const getStatusVisual = (status) => {
    if (status === 'alerta') return { cor: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200', icone: <AlertCircle size={14}/>, label: 'Offline / Problema' };
    if (status === 'vencido') return { cor: 'text-red-600', bg: 'bg-red-50 border-red-200', icone: <ShieldAlert size={14}/>, label: 'Vencido' };
    return { cor: 'text-green-600', bg: 'bg-green-50 border-green-200', icone: <CheckCircle2 size={14}/>, label: 'Operante' };
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-green-700 bg-white/50 rounded-3xl">
        <Loader2 className="animate-spin mb-4" size={40} />
        <h3 className="font-bold text-lg text-gray-800">Mapeando Usinas...</h3>
        <p className="text-sm text-gray-500 mb-4">Localizando os endereços no globo terrestre.</p>
        <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${progresso}%` }}></div>
        </div>
        <p className="text-xs text-gray-400 mt-2">{progresso}% concluído</p>
      </div>
    );
  }

  return (
    /* Truque: -m-6 e md:-m-8 cancelam o padding do App.jsx, fazendo o mapa vazar até as bordas */
    <div className="-m-6 md:-m-8 h-screen relative z-0 overflow-hidden animate-in fade-in duration-300 bg-gray-100">
      
      {/* ========================================== */}
      {/* UI FLUTUANTE SOBRE O MAPA                  */}
      {/* ========================================== */}
      
      {/* Barra de Busca - Margens padronizadas com o App (left-6/8 top-6/8) */}
      <div className="absolute top-6 left-6 md:top-8 md:left-8 z-[1000] w-[calc(100vw-3rem)] sm:w-80 md:w-96 pr-6 sm:pr-0">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar usina ou endereço..." 
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl text-[14px] font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/50 shadow-lg placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Legenda (Margem top-6/8 right-6/8) */}
      <div className="hidden sm:flex absolute top-6 right-6 md:top-8 md:right-8 z-[1000] bg-white/90 backdrop-blur-xl border border-white/20 p-2.5 rounded-2xl shadow-lg gap-3">
        <div className="flex items-center gap-1.5 px-2"><div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm"></div><span className="text-[11px] font-bold text-gray-600">Operante</span></div>
        <div className="flex items-center gap-1.5 px-2"><div className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-sm"></div><span className="text-[11px] font-bold text-gray-600">Problema</span></div>
        <div className="flex items-center gap-1.5 px-2"><div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm"></div><span className="text-[11px] font-bold text-gray-600">Vencido</span></div>
      </div>

      {/* Card de Detalhes da Usina (Margem bottom-6/8 left-6/8) */}
      {usinaSelecionada && (
        <div className="absolute bottom-6 left-6 md:bottom-8 md:left-8 z-[1000] w-[calc(100vw-3rem)] sm:w-80 md:w-96 bg-white/95 backdrop-blur-2xl border border-white/40 p-5 rounded-3xl shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
          <button 
            onClick={() => setUsinaSelecionada(null)} 
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 p-1.5 rounded-full transition-colors cursor-pointer"
          >
            <X size={14} strokeWidth={2.5}/>
          </button>
          
          <div className="flex items-center gap-2 mb-3 pr-6">
            <div className="p-2 bg-green-50 text-green-600 rounded-xl shrink-0"><MapPin size={18} /></div>
            <h3 className="font-bold text-gray-800 text-[14px] leading-tight line-clamp-2">{usinaSelecionada.nome}</h3>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-4 mb-4">
             <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border uppercase tracking-wider ${getStatusVisual(usinaSelecionada.status).bg} ${getStatusVisual(usinaSelecionada.status).cor}`}>
                {getStatusVisual(usinaSelecionada.status).icone} {getStatusVisual(usinaSelecionada.status).label}
             </span>
             {usinaSelecionada.endereco && (
               <span className="flex items-center gap-1 text-[11px] font-medium text-gray-500 px-1 py-1 line-clamp-1 w-full mt-1">
                 {usinaSelecionada.endereco}
               </span>
             )}
          </div>

          {usinaSelecionada.obs && (
            <p className="text-[12px] text-gray-500 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100 leading-snug">
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Anotações</span>
              {usinaSelecionada.obs}
            </p>
          )}

          <div className="pt-2 border-t border-gray-100">
            {/* BOTÃO DE ROTAS FUNCIONAL -> Redireciona para o Google Maps */}
            <a 
              href={`https://www.google.com/maps/dir/?api=1&destination=${usinaSelecionada.lat},${usinaSelecionada.lng}`}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-600 py-3 rounded-xl text-[13px] font-bold hover:bg-blue-100 hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <Navigation size={16} strokeWidth={2.5} /> Iniciar Rota no Google Maps
            </a>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* COMPONENTE DO MAPA LEAFLET                 */}
      {/* ========================================== */}
      <MapContainer 
        center={[-21.1704, -47.8103]} // Coordenadas de Ribeirão Preto como Fallback
        zoom={13} 
        zoomControl={false} 
        className="w-full h-full z-0"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        
        {/* Controle de Zoom (Margem bottom-6/8 right-6/8) */}
        <div className="absolute bottom-6 right-6 md:bottom-8 md:right-8 z-[1000] hidden sm:block">
          <ZoomControl position="bottomright" />
        </div>

        {/* Renderiza os Pinos Dinâmicos */}
        {usinasFiltradas.map(usina => (
          <Marker 
            key={usina.id} 
            position={[usina.lat, usina.lng]}
            icon={createIcon(usina.status)}
            eventHandlers={{
              click: () => setUsinaSelecionada(usina),
            }}
          />
        ))}
      </MapContainer>

    </div>
  );
}