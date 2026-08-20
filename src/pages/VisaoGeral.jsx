import { useState, useEffect } from 'react';
import { Users, CheckCircle2, FileX, AlertCircle, Wallet, Loader2 } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { supabase } from '../lib/supabase';
import { somarEconomiaRelatorio } from '../lib/economia';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const TooltipCustomizado = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white border border-gray-300 px-3 py-2 shadow-sm text-[12px]">
      <p className="font-bold text-gray-700 mb-0.5">{label}</p>
      <p className="text-green-700 font-semibold">
        Economia: R$ {payload[0].value.toFixed(2).replace('.', ',')}
      </p>
    </div>
  );
};

export function VisaoGeral() {
  const [clientes, setClientes] = useState([]);
  const [relatorios, setRelatorios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const resClientes = await supabase.from('clientes').select('id, nome_razao_social, status');
      const resRelatorios = await supabase
        .from('relatorios')
        .select('cliente_id, mes_referencia, geracao_atual, faturas_cpfl');

      if (resClientes.data) setClientes(resClientes.data);
      if (resRelatorios.data) setRelatorios(resRelatorios.data);
      setLoading(false);
    };
    fetchData();
  }, []);

  const hoje = new Date();
  const mesesColunas = Array.from({ length: 6 })
    .map((_, i) => {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const idx = d.getMonth();
      const ano = d.getFullYear();
      return { label: `${MESES[idx]}/${ano}`, curto: `${MESES[idx]}/${String(ano).slice(-2)}`, atual: i === 0 };
    })
    .reverse()
    .map(mes => {
      const relatoriosDoMes = relatorios.filter(r => r.mes_referencia === mes.label);
      return {
        ...mes,
        economia: relatoriosDoMes.reduce((acc, r) => acc + somarEconomiaRelatorio(r), 0),
      };
    });

  const mesAtualLabel = mesesColunas.at(-1)?.label || '';
  const relatoriosMesAtual = relatorios.filter(r => r.mes_referencia === mesAtualLabel);
  const economiaMesAtual = relatoriosMesAtual.reduce((acc, r) => acc + somarEconomiaRelatorio(r), 0);

  const totalClientes = clientes.length;
  const comContrato = clientes.filter(c => c.status === 'Com contrato').length;
  const semContrato = clientes.filter(c => c.status === 'Sem contrato').length;
  const prospeccao = clientes.filter(c => c.status === 'Em prospecção').length;

  const cards = [
    { label: 'Total de Clientes', valor: totalClientes, icone: Users, cor: 'text-gray-800' },
    { label: 'Com Contrato', valor: comContrato, icone: CheckCircle2, cor: 'text-green-700' },
    { label: 'Sem Contrato', valor: semContrato, icone: FileX, cor: 'text-red-600' },
    { label: 'Em Prospecção', valor: prospeccao, icone: AlertCircle, cor: 'text-yellow-600' },
  ];

  const economiaFormatada = `R$ ${economiaMesAtual.toFixed(2).replace('.', ',')}`;

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-white border border-gray-300 text-gray-500">
        <Loader2 className="animate-spin mb-3 text-green-700" size={28} />
        <span className="text-[13px] font-bold uppercase tracking-wider">Carregando visão geral...</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col gap-4 animate-in fade-in duration-300 antialiased text-sm">

      {/* CARDS DE INDICADORES */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map(card => (
          <div key={card.label} className="bg-white border border-gray-300 p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{card.label}</span>
              <card.icone size={16} className={card.cor} />
            </div>
            <span className={`text-2xl font-extrabold ${card.cor}`}>{card.valor}</span>
          </div>
        ))}

        <div className="bg-[#064E3B] border border-[#064E3B] p-4 flex flex-col gap-2 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider">Economia do Mês</span>
            <Wallet size={16} className="text-emerald-200" />
          </div>
          <span className="text-2xl font-extrabold text-white">{economiaFormatada}</span>
        </div>
      </div>

      {/* GRÁFICO DE EVOLUÇÃO */}
      <div className="bg-white border border-gray-300 flex-1 flex flex-col min-h-[320px]">
        <div className="px-4 py-2.5 border-b border-gray-300 bg-gray-100">
          <h3 className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Evolução da Economia (últimos 6 meses)</h3>
        </div>
        <div className="flex-1 p-4 min-h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mesesColunas} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="curto" tick={{ fontSize: 11, fontWeight: 700, fill: '#64748B' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<TooltipCustomizado />} cursor={{ fill: '#F1F5F9' }} />
              <Bar dataKey="economia" fill="#15803d" radius={[3, 3, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
