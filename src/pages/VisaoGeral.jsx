import { useState, useEffect } from 'react';
import { Users, CheckCircle2, FileX, AlertCircle, Loader2 } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { supabase } from '../lib/supabase';
import { STATUS_CLIENTE } from '../lib/statusCliente';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const TooltipCustomizado = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white border border-gray-400 px-3 py-2 shadow-sm text-[12px]">
      <p className="font-bold text-gray-700 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} className="font-semibold" style={{ color: p.color }}>
          {p.name}: {p.value}%
        </p>
      ))}
    </div>
  );
};

export function VisaoGeral() {
  const [clientes, setClientes] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const resClientes = await supabase.from('clientes').select('id, status');
      const listaClientes = resClientes.data || [];
      setClientes(listaClientes);

      const totalClientes = listaClientes.length;
      const comContrato = listaClientes.filter(c => c.status === STATUS_CLIENTE.COM_CONTRATO).length;
      const semContrato = listaClientes.filter(c => c.status === STATUS_CLIENTE.SEM_CONTRATO).length;
      const emProspeccao = listaClientes.filter(c => c.status === STATUS_CLIENTE.EM_PROSPECCAO).length;

      const hoje = new Date();
      const mesAtualLabel = `${MESES[hoje.getMonth()]}/${hoje.getFullYear()}`;

      // Grava/atualiza o snapshot do mês atual — quando o mês virar, essa linha
      // para de ser tocada e vira histórico congelado.
      if (totalClientes > 0) {
        await supabase.from('clientes_status_historico').upsert({
          mes_referencia: mesAtualLabel,
          total_clientes: totalClientes,
          com_contrato: comContrato,
          sem_contrato: semContrato,
          em_prospeccao: emProspeccao,
          atualizado_em: new Date().toISOString(),
        }, { onConflict: 'mes_referencia' });
      }

      const resHistorico = await supabase
        .from('clientes_status_historico')
        .select('*')
        .order('mes_referencia', { ascending: false })
        .limit(6);

      setHistorico((resHistorico.data || []).reverse());
      setLoading(false);
    };
    fetchData();
  }, []);

  const totalClientes = clientes.length;
  const comContrato = clientes.filter(c => c.status === STATUS_CLIENTE.COM_CONTRATO).length;
  const semContrato = clientes.filter(c => c.status === STATUS_CLIENTE.SEM_CONTRATO).length;
  const prospeccao = clientes.filter(c => c.status === STATUS_CLIENTE.EM_PROSPECCAO).length;

  const cards = [
    { label: 'Total de Clientes', valor: totalClientes, icone: Users, cor: 'text-gray-800' },
    { label: 'Com Contrato', valor: comContrato, icone: CheckCircle2, cor: 'text-green-700' },
    { label: 'Sem Contrato', valor: semContrato, icone: FileX, cor: 'text-red-600' },
    { label: 'Em Prospecção', valor: prospeccao, icone: AlertCircle, cor: 'text-yellow-600' },
  ];

  const dadosGrafico = historico.map(h => {
    const [mes, ano] = h.mes_referencia.split('/');
    const total = h.total_clientes || 1;
    return {
      curto: `${mes}/${String(ano).slice(-2)}`,
      'Com Contrato': Math.round((h.com_contrato / total) * 100),
      'Sem Contrato': Math.round((h.sem_contrato / total) * 100),
      'Em Prospecção': Math.round((h.em_prospeccao / total) * 100),
    };
  });

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-white border border-gray-400 text-gray-600">
        <Loader2 className="animate-spin mb-3 text-green-700" size={28} />
        <span className="text-[13px] font-bold uppercase tracking-wider">Carregando visão geral...</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col gap-4 animate-in fade-in duration-300 antialiased text-sm">

      {/* CARDS DE INDICADORES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(card => (
          <div key={card.label} className="bg-white border border-gray-400 shadow-sm p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{card.label}</span>
              <card.icone size={16} className={card.cor} />
            </div>
            <span className={`text-2xl font-extrabold ${card.cor}`}>{card.valor}</span>
          </div>
        ))}
      </div>

      {/* GRÁFICO DE EVOLUÇÃO MENSAL */}
      <div className="bg-white border border-gray-400 shadow-sm flex-1 flex flex-col min-h-[320px]">
        <div className="px-4 py-2.5 border-b border-gray-400 bg-gray-200">
          <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">Evolução Mensal de Clientes por Status (%)</h3>
        </div>
        <div className="flex-1 p-4 min-h-[260px]">
          {dadosGrafico.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-gray-500 text-[13px]">
              Ainda não há histórico mensal salvo.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosGrafico} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="curto" tick={{ fontSize: 11, fontWeight: 700, fill: '#64748B' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} width={36} unit="%" />
                <Tooltip content={<TooltipCustomizado />} cursor={{ fill: '#F1F5F9' }} />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
                <Bar dataKey="Com Contrato" stackId="status" fill="#15803d" maxBarSize={40} />
                <Bar dataKey="Sem Contrato" stackId="status" fill="#dc2626" maxBarSize={40} />
                <Bar dataKey="Em Prospecção" stackId="status" fill="#ca8a04" radius={[3, 3, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
