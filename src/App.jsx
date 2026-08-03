import { useState } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Settings, 
  LogOut, 
  Zap,
  Activity,
  History,
  StickyNote
} from 'lucide-react';

import { Relatorios } from './pages/Relatorios';
import { Clientes } from './pages/Clientes';
import { Pendencias } from './pages/Pendencias';
import { Monitoramento } from './pages/Monitoramento';
import { MapaUsinas } from './pages/MapaUsinas';
import { Map } from 'lucide-react'; // Traz o ícone de mapa também
// Futuras telas que vamos criar:
// import { Monitoramento } from './pages/Monitoramento';
// import { HistoricoRelatorios } from './pages/HistoricoRelatorios';

function App() {
  const [telaAtiva, setTelaAtiva] = useState('clientes');

  const MenuItem = ({ id, icone: Icone, texto }) => (
    <button
      onClick={() => setTelaAtiva(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer font-medium text-[13px] ${
        telaAtiva === id 
          ? 'bg-white text-green-700 font-bold shadow-sm' 
          : 'text-green-50 hover:bg-green-600 hover:text-white'
      }`}
    >
      <Icone size={18} strokeWidth={telaAtiva === id ? 2.5 : 1.8} />
      {texto}
    </button>
  );

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden antialiased text-sm">
      
      {/* MENU LATERAL */}
      <aside className="w-64 bg-green-700 text-white flex flex-col justify-between shadow-lg z-10 shrink-0">
        <div>
          <div className="p-6 flex items-center gap-3 mb-2">
            <div className="bg-white p-2 rounded-xl text-green-700 shadow-sm">
              <Zap size={20} fill="currentColor" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight leading-none">OLSS</h1>
              <p className="text-[10px] text-green-200 font-semibold tracking-wider mt-1">MONITORAMENTO</p>
            </div>
          </div>

          <nav className="px-3 space-y-1">
            <MenuItem id="dashboard" icone={LayoutDashboard} texto="Visão Geral" />
            <MenuItem id="pendencias" icone={StickyNote} texto="Lembretes" />
            
            <div className="pt-5 pb-1">
              <p className="px-4 text-[10px] font-bold text-green-300 uppercase tracking-wider">Operação</p>
            </div>
            <MenuItem id="clientes" icone={Users} texto="Base de Clientes" />
            <MenuItem id="mapa" icone={Map} texto="Mapa de Usinas" />
            <MenuItem id="monitoramento" icone={Activity} texto="Monitoramento" />
            
            <div className="pt-5 pb-1">
              <p className="px-4 text-[10px] font-bold text-green-300 uppercase tracking-wider">Faturamento</p>
            </div>
            <MenuItem id="relatorios" icone={FileText} texto="Relatórios" />
            <MenuItem id="historico" icone={History} texto="Histórico Mensal" />
          </nav>
        </div>

        <div className="p-3 border-t border-green-600/60">
          <nav className="space-y-1">
            <MenuItem id="configuracoes" icone={Settings} texto="Configurações" />
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-green-100 hover:bg-red-500 hover:text-white transition-all font-medium text-[13px] mt-1 cursor-pointer">
              <LogOut size={18} strokeWidth={1.8} />
              Sair do Sistema
            </button>
          </nav>
        </div>
      </aside>

      {/* ÁREA DE CONTEÚDO PRINCIPAL */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F8FAFC]">
        
        {/* Roteamento das Telas */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          
          {telaAtiva === 'relatorios' && <Relatorios />}
          {telaAtiva === 'clientes' && <Clientes />}
          {telaAtiva === 'pendencias' && <Pendencias />}
          {telaAtiva === 'monitoramento' && <Monitoramento />}
          {telaAtiva === 'mapa' && <MapaUsinas/>}
          
          {/* Tela elegante para módulos em construção */}
          {telaAtiva !== 'relatorios' && telaAtiva !== 'clientes' && telaAtiva !== 'pendencias' && telaAtiva !== 'monitoramento' && telaAtiva !== 'mapa' &&  (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="bg-white p-8 rounded-3xl border border-gray-200/60 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col items-center max-w-sm text-center">
                <div className="p-4 bg-gray-50 rounded-2xl text-gray-400 mb-4 border border-gray-100">
                  <Activity size={32} strokeWidth={1.5} />
                </div>
                <h2 className="text-base font-semibold text-gray-800 capitalize mb-1">
                  {telaAtiva.replace('_', ' ')}
                </h2>
                <p className="text-xs text-gray-400">
                  Este módulo está sendo estruturado para entrar em produção em breve.
                </p>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default App;