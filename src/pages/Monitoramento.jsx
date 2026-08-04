import { useState, useEffect } from 'react';
import {
  Trash2, Edit2, Search, Copy, Check, ExternalLink, ShieldAlert, AlertCircle,
  CheckCircle2, X, Eye, Settings, Filter, Table2, KeyRound, Users, FileCheck,
  CalendarCheck, DollarSign, Download, FileText, Loader2, Minus
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ==========================================
// HELPERS
// ==========================================
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const parseMes = (mesReferencia) => {
  if (!mesReferencia) return null;
  const partes = String(mesReferencia).split('/');
  if (partes.length !== 2) return null;
  const idx = MESES.indexOf(partes[0].trim());
  const ano = parseInt(partes[1].trim());
  if (idx === -1 || isNaN(ano)) return null;
  return { idx, ano, chave: ano * 100 + idx, label: `${MESES[idx]}/${ano}` };
};

const economiaDoRelatorio = (rel) => {
  if (!rel || !Array.isArray(rel.faturas_cpfl)) return 0;
  return rel.faturas_cpfl.reduce((acc, u) => acc + (parseFloat(u.economia) || 0), 0);
};

const brl = (v) => `R$ ${(v || 0).toFixed(2).replace('.', ',')}`;

// Componente simples para o botão de Copiar com feedback visual
const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!text) return <span className="text-gray-300">-</span>;

  return (
    <div className="flex items-center gap-2 group">
      <span className="text-[13px] font-mono text-gray-600 truncate">{text}</span>
      <button
        type="button"
        onClick={handleCopy}
        className="text-gray-400 hover:text-green-600 transition-colors opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-green-50 cursor-pointer shrink-0"
        title="Copiar"
      >
        {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
      </button>
    </div>
  );
};

export function Monitoramento() {
  // ==========================================
  // ESTADOS GERAIS / COMPARTILHADOS
  // ==========================================
  const [aba, setAba] = useState('grade'); // 'grade' | 'acessos'
  const [clientes, setClientes] = useState([]);
  const [plataformas, setPlataformas] = useState([]);
  const [relatorios, setRelatorios] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros / busca - Aba Grade
  const [buscaGrade, setBuscaGrade] = useState('');
  const [relatorioDetalhe, setRelatorioDetalhe] = useState(null); // { cliente, relatorio }
  const [gerandoPDF, setGerandoPDF] = useState(false);

  // Filtros - Aba Acessos
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('Todos');

  // Modais - Aba Acessos
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPlataformaModalOpen, setIsPlataformaModalOpen] = useState(false);
  const [clienteDetalhe, setClienteDetalhe] = useState(null);
  const [editandoId, setEditandoId] = useState(null);

  // Form states - Clientes (Acessos)
  const [nomeCliente, setNomeCliente] = useState('');
  const [loginApp, setLoginApp] = useState('');
  const [senhaApp, setSenhaApp] = useState('');
  const [plataformaInversor, setPlataformaInversor] = useState('Solarman Smart');
  const [observacoesInternas, setObservacoesInternas] = useState('');
  const [statusMonitoramento, setStatusMonitoramento] = useState('normal');

  // Form states - Plataformas
  const [novaPlataformaNome, setNovaPlataformaNome] = useState('');
  const [novaPlataformaLink, setNovaPlataformaLink] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const resClientes = await supabase.from('clientes').select('*').order('nome_razao_social', { ascending: true });
    const resPlataformas = await supabase.from('plataformas').select('*').order('nome', { ascending: true });
    const resRelatorios = await supabase
      .from('relatorios')
      .select('id, cliente_id, mes_referencia, created_at, geracao_atual, geracao_anterior, parecer_tecnico, faturas_cpfl')
      .order('created_at', { ascending: false });

    if (!resClientes.error) setClientes(resClientes.data || []);
    if (!resPlataformas.error) setPlataformas(resPlataformas.data || []);
    if (!resRelatorios.error) setRelatorios(resRelatorios.data || []);

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // ==========================================
  // GRADE: MESES / MATRIZ / ESTATÍSTICAS
  // ==========================================
  const mapaMeses = new Map();
  relatorios.forEach(r => {
    const p = parseMes(r.mes_referencia);
    if (p && !mapaMeses.has(p.chave)) mapaMeses.set(p.chave, p);
  });
  // Garante que o mês atual sempre apareça, mesmo sem relatórios ainda
  const agora = new Date();
  const mesAtual = { idx: agora.getMonth(), ano: agora.getFullYear(), chave: agora.getFullYear() * 100 + agora.getMonth(), label: `${MESES[agora.getMonth()]}/${agora.getFullYear()}` };
  if (!mapaMeses.has(mesAtual.chave)) mapaMeses.set(mesAtual.chave, mesAtual);

  const mesesColunas = Array.from(mapaMeses.values())
    .sort((a, b) => a.chave - b.chave)
    .map(m => {
      const relDoMes = relatorios.filter(r => r.mes_referencia === m.label);
      return {
        ...m,
        curto: `${MESES[m.idx]}/${String(m.ano).slice(-2)}`,
        qtd: relDoMes.length,
        economia: relDoMes.reduce((acc, r) => acc + economiaDoRelatorio(r), 0),
        atual: m.chave === mesAtual.chave,
      };
    });

  const clientesFiltradosGrade = clientes
    .filter(c => c.nome_razao_social?.toLowerCase().includes(buscaGrade.toLowerCase()))
    .sort((a, b) => (a.nome_razao_social || '').localeCompare(b.nome_razao_social || ''));

  // Estatísticas do topo
  const totalClientes = clientes.length;
  const totalRelatorios = relatorios.length;
  const economiaTotalGeral = relatorios.reduce((acc, r) => acc + economiaDoRelatorio(r), 0);
  const relatoriosMesAtual = relatorios.filter(r => r.mes_referencia === mesAtual.label).length;
  const coberturaMesAtual = totalClientes > 0 ? Math.round((relatoriosMesAtual / totalClientes) * 100) : 0;

  const buscarRelatorio = (clienteId, mesLabel) =>
    relatorios.find(r => r.cliente_id === clienteId && r.mes_referencia === mesLabel);

  // ==========================================
  // EXPORTAR CSV (ESTILO PLANILHA)
  // ==========================================
  const exportarCSV = () => {
    const header = ['Cliente', ...mesesColunas.map(m => m.label), 'Total Relatórios', 'Economia Total'];
    const linhas = clientesFiltradosGrade.map(cliente => {
      const relCliente = relatorios.filter(r => r.cliente_id === cliente.id);
      const economiaTotalCliente = relCliente.reduce((acc, r) => acc + economiaDoRelatorio(r), 0);
      const colunas = mesesColunas.map(m => {
        const rel = buscarRelatorio(cliente.id, m.label);
        return rel ? brl(economiaDoRelatorio(rel)) : '';
      });
      return [cliente.nome_razao_social, ...colunas, relCliente.length, brl(economiaTotalCliente)];
    });

    const csv = [header, ...linhas]
      .map(linha => linha.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Monitoramento_Relatorios_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ==========================================
  // REIMPRESSÃO DE PDF A PARTIR DE UM RELATÓRIO JÁ SALVO
  // ==========================================
  const baixarPDFRelatorio = (cliente, relatorio) => {
    setGerandoPDF(true);
    try {
      const unidades = Array.isArray(relatorio.faturas_cpfl) ? relatorio.faturas_cpfl : [];
      const gAtual = parseFloat(relatorio.geracao_atual) || 0;
      const gAnt = parseFloat(relatorio.geracao_anterior) || 0;
      const economiaTotal = unidades.reduce((acc, u) => acc + (parseFloat(u.economia) || 0), 0);

      const doc = new jsPDF();
      let currentY = 15;

      doc.setFontSize(14);
      doc.setTextColor(21, 128, 61);
      doc.setFont("helvetica", "bold");
      doc.text("OLSS", 14, currentY);

      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text("LIMPEZA E MONITORAMENTO FOTOVOLTAICO", 14, currentY + 5);

      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text("Relatório Mensal", 150, currentY + 3);

      currentY += 14;
      doc.setLineWidth(0.5);
      doc.setDrawColor(200, 200, 200);
      doc.line(14, currentY, 196, currentY);

      currentY += 8;
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      doc.setFont("helvetica", "bold");
      doc.text(`CLIENTE:`, 14, currentY);
      doc.setFont("helvetica", "normal");
      doc.text(`${(cliente.nome_razao_social || '').toUpperCase()}`, 38, currentY);

      currentY += 6;
      doc.setFont("helvetica", "bold");
      doc.text(`ENDEREÇO:`, 14, currentY);
      doc.setFont("helvetica", "normal");
      doc.text(`${(cliente.endereco || 'Endereço não informado').toUpperCase()}`, 38, currentY);

      currentY += 6;
      doc.setFont("helvetica", "bold");
      doc.text(`REFERÊNCIA:`, 14, currentY);
      doc.setFont("helvetica", "normal");
      doc.text(`${relatorio.mes_referencia.toUpperCase()}`, 38, currentY);

      currentY += 10;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(21, 128, 61);
      doc.text("DESCRIÇÃO DE RESULTADO", 14, currentY);

      currentY += 6;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      const diffGeracao = gAtual - gAnt;
      const textoResumo = `O valor gerado pelo sistema no período foi de ${gAtual} kWh/mês. Houve uma variação de ${diffGeracao} kWh em relação ao mês anterior (${gAnt} kWh/mês), mantendo-se dentro do esperado para a estação do ano.`;
      const splitResumo = doc.splitTextToSize(textoResumo, 182);
      doc.text(splitResumo, 14, currentY);
      currentY += (splitResumo.length * 5) + 6;

      doc.setFont("helvetica", "bold");
      doc.setTextColor(21, 128, 61);
      doc.text(`1. GERAÇÃO - ${relatorio.mes_referencia.toUpperCase()} - ${gAtual} KWH/MÊS`, 14, currentY);

      currentY += 6;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(21, 128, 61);
      doc.text(`2. GERAÇÃO - MÊS ANTERIOR - ${gAnt} KWH/MÊS`, 14, currentY);

      const geradoraObj = unidades.find(u => u.tipo === 'Geradora');
      if (geradoraObj) {
        currentY += 10;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(21, 128, 61);
        doc.text("3. RELAÇÃO DA CONTA GERADORA", 14, currentY);

        currentY += 6;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);
        doc.text(`• Geração mês anterior: ${gAnt} kWh/mês`, 18, currentY);
        currentY += 5;
        doc.text(`• Valor Injetado: ${parseFloat(geradoraObj.injetado) || 0} kWh/mês`, 18, currentY);
        currentY += 5;
        doc.text(`• Valor auto consumo: ${(parseFloat(geradoraObj.autoConsumo) || 0).toFixed(0)} kWh/mês`, 18, currentY);
        currentY += 5;
        doc.text(`• Consumo da conta: ${parseFloat(geradoraObj.consumoConta) || 0} kWh/mês`, 18, currentY);
      }

      currentY += 10;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(21, 128, 61);
      doc.text("4. VALORES DAS CONTAS", 14, currentY);
      currentY += 4;

      const tableData = unidades.map(u => [
        `${u.tipo}\nUC: ${u.numero_uc}`,
        `${(parseFloat(u.consumoTotal) || 0).toFixed(0)} kWh`,
        `R$ ${(parseFloat(u.precoKwh) || 0).toFixed(2).replace('.', ',')}`,
        `R$ ${(parseFloat(u.tarifaConta) || 0).toFixed(2).replace('.', ',')}`,
        `R$ ${(parseFloat(u.valorSemSistema) || 0).toFixed(2).replace('.', ',')}`,
        `R$ ${(parseFloat(u.valorConta) || 0).toFixed(2).replace('.', ',')}`,
        `R$ ${(parseFloat(u.economia) || 0).toFixed(2).replace('.', ',')}`
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Tipo / UC', 'Consumo Total', 'Preço kWh', 'Tarifa Conta', 'Valor S/ Sistema', 'Valor C/ Sistema', 'Economia']],
        body: tableData,
        headStyles: { fillColor: [21, 128, 61], fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        theme: 'grid',
      });

      currentY = doc.lastAutoTable.finalY + 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`ECONOMIA TOTAL: R$ ${economiaTotal.toFixed(2).replace('.', ',')}`, 14, currentY);

      currentY += 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(21, 128, 61);
      doc.text("5. RESOLUÇÃO FINAL", 14, currentY);

      currentY += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      const textoParecer = relatorio.parecer_tecnico || "Resultado dentro do esperado para o período, com contas de energia atenuadas ao limite tarifário mínimo.";
      const splitParecer = doc.splitTextToSize(textoParecer, 182);
      doc.text(splitParecer, 14, currentY);
      currentY += (splitParecer.length * 5) + 15;

      if (currentY > 260) {
        doc.addPage();
        currentY = 20;
      }
      doc.setFont("helvetica", "bold");
      doc.setTextColor(40, 40, 40);
      doc.text("OTÁVIO LAVEZZO", 14, currentY);
      doc.setFont("helvetica", "normal");
      doc.text("Diretor Proprietário", 14, currentY + 5);
      doc.text("(16) 98849-4891  |  otavio.olss1@gmail.com", 14, currentY + 10);

      doc.save(`Relatorio_${(cliente.nome_razao_social || 'cliente').substring(0, 15)}_${relatorio.mes_referencia.replace('/', '-')}.pdf`);
    } catch (err) {
      alert("Erro ao gerar PDF: " + err.message);
    } finally {
      setGerandoPDF(false);
    }
  };

  // ==========================================
  // FUNÇÕES DE PLATAFORMAS (ABA ACESSOS)
  // ==========================================
  const handleSalvarPlataforma = async (e) => {
    e.preventDefault();
    if (!novaPlataformaNome.trim()) return;

    await supabase.from('plataformas').insert([{
      nome: novaPlataformaNome,
      link: novaPlataformaLink
    }]);

    setNovaPlataformaNome('');
    setNovaPlataformaLink('');
    fetchData();
  };

  const deletarPlataforma = async (id) => {
    if (!window.confirm('Excluir esta plataforma da lista?')) return;
    await supabase.from('plataformas').delete().eq('id', id);
    fetchData();
  };

  // ==========================================
  // FUNÇÕES DE CREDENCIAIS (ABA ACESSOS)
  // ==========================================
  const abrirModalEdicao = (item) => {
    setEditandoId(item.id);
    setNomeCliente(item.nome_razao_social || '');
    setLoginApp(item.login_app || '');
    setSenhaApp(item.senha_app || '');
    setPlataformaInversor(item.plataforma_inversor || 'Solarman Smart');
    setObservacoesInternas(item.observacoes_internas || '');
    setStatusMonitoramento(item.status_monitoramento || 'normal');
    setIsModalOpen(true);
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    if (!nomeCliente.trim() || !editandoId) return;

    const payload = {
      nome_razao_social: nomeCliente,
      login_app: loginApp,
      senha_app: senhaApp,
      plataforma_inversor: plataformaInversor,
      observacoes_internas: observacoesInternas,
      status_monitoramento: statusMonitoramento
    };

    await supabase.from('clientes').update(payload).eq('id', editandoId);

    setIsModalOpen(false);
    fetchData();
  };

  const limparCredenciais = async (id) => {
    if (!window.confirm('Remover as credenciais de monitoramento? (O cliente continua salvo na base).')) return;

    await supabase.from('clientes').update({
      login_app: null,
      senha_app: null,
      plataforma_inversor: null,
      status_monitoramento: 'normal'
    }).eq('id', id);

    fetchData();
  };

  // Lógica de filtro e agrupamento (Acessos)
  const clientesMonitoramento = clientes.filter(c => c.plataforma_inversor && c.plataforma_inversor.trim() !== '');

  const sistemasFiltrados = clientesMonitoramento.filter(s => {
    const matchBusca = (s.nome_razao_social && s.nome_razao_social.toLowerCase().includes(busca.toLowerCase())) ||
      (s.login_app && s.login_app.toLowerCase().includes(busca.toLowerCase())) ||
      (s.plataforma_inversor && s.plataforma_inversor.toLowerCase().includes(busca.toLowerCase()));

    const matchStatus = filtroStatus === 'Todos' || s.status_monitoramento === filtroStatus;

    return matchBusca && matchStatus;
  });

  const sistemasAgrupados = sistemasFiltrados.reduce((acc, curr) => {
    const plat = curr.plataforma_inversor || 'Sem Plataforma Definida';
    if (!acc[plat]) acc[plat] = [];
    acc[plat].push(curr);
    return acc;
  }, {});

  const renderStatusInfo = (statusItem) => {
    switch (statusItem) {
      case 'alerta':
        return {
          bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700',
          icon: <AlertCircle size={14} className="text-yellow-600" />, label: 'Offline / Revisar'
        };
      case 'vencido':
        return {
          bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700',
          icon: <ShieldAlert size={14} className="text-red-600" />, label: 'Serviço Vencido'
        };
      default:
        return {
          bg: 'bg-white', border: 'border-transparent hover:border-gray-200', text: 'text-gray-800',
          icon: <CheckCircle2 size={14} className="text-gray-300" />, label: 'Normal'
        };
    }
  };

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className="w-full px-6 md:px-8 h-[calc(100vh-80px)] flex flex-col animate-in fade-in duration-300 py-4 antialiased text-sm">

      {/* TABS */}
      <div className="flex items-center gap-2 mb-5 shrink-0">
        <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl">
          <button
            onClick={() => setAba('grade')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${aba === 'grade' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Table2 size={15} strokeWidth={2} /> Grade de Relatórios
          </button>
          <button
            onClick={() => setAba('acessos')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${aba === 'acessos' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <KeyRound size={15} strokeWidth={2} /> Acessos / Credenciais
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center flex-1 text-gray-400 text-[13px]">
          <Loader2 className="animate-spin mr-2" size={18} /> Carregando dados...
        </div>
      ) : aba === 'grade' ? (
        <>
          {/* CARDS DE RESUMO */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5 shrink-0">
            <div className="bg-white p-4 rounded-2xl border border-gray-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center gap-3">
              <div className="p-2.5 bg-gray-100 text-gray-500 rounded-xl shrink-0"><Users size={18} /></div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none">Clientes</p>
                <p className="text-[18px] font-extrabold text-gray-800 leading-tight mt-1">{totalClientes}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center gap-3">
              <div className="p-2.5 bg-green-50 text-green-600 rounded-xl shrink-0"><FileCheck size={18} /></div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none">Relatórios Gerados</p>
                <p className="text-[18px] font-extrabold text-gray-800 leading-tight mt-1">{totalRelatorios}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center gap-3">
              <div className={`p-2.5 rounded-xl shrink-0 ${coberturaMesAtual >= 80 ? 'bg-green-50 text-green-600' : coberturaMesAtual >= 40 ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-500'}`}><CalendarCheck size={18} /></div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none">Cobertura {mesAtual.label}</p>
                <p className="text-[18px] font-extrabold text-gray-800 leading-tight mt-1">{coberturaMesAtual}% <span className="text-[11px] font-semibold text-gray-400">({relatoriosMesAtual}/{totalClientes})</span></p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0"><DollarSign size={18} /></div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none">Economia Total</p>
                <p className="text-[18px] font-extrabold text-gray-800 leading-tight mt-1 truncate">{brl(economiaTotalGeral)}</p>
              </div>
            </div>
          </div>

          {/* BUSCA + EXPORTAR */}
          <div className="flex flex-col md:flex-row items-center gap-3 mb-4 shrink-0 w-full">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Buscar cliente na grade..."
                value={buscaGrade}
                onChange={(e) => setBuscaGrade(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200/60 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
              />
            </div>
            <button
              onClick={exportarCSV}
              className="flex items-center justify-center gap-1.5 bg-white border border-gray-200/60 text-gray-600 px-4 py-2.5 rounded-xl text-[13px] font-medium hover:bg-gray-50 transition-all shadow-sm shrink-0 cursor-pointer w-full md:w-auto"
            >
              <Download size={16} strokeWidth={1.8} /> Exportar CSV
            </button>
          </div>

          {/* GRADE ESTILO EXCEL */}
          <div className="flex-1 bg-white rounded-3xl border border-gray-200/60 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">
            {clientesFiltradosGrade.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 text-gray-400 py-16">
                <Search size={32} strokeWidth={1} className="mb-2 text-gray-300" />
                <p className="text-[13px]">Nenhum cliente encontrado.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-auto">
                <table className="border-collapse w-full text-left">
                  <thead>
                    <tr>
                      <th className="sticky top-0 left-0 z-30 bg-gray-50 border-b border-r border-gray-100 px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider min-w-[220px]">
                        Cliente
                      </th>
                      {mesesColunas.map(mes => (
                        <th
                          key={mes.chave}
                          className={`sticky top-0 z-20 border-b border-gray-100 px-2 py-3 text-center min-w-[92px] ${mes.atual ? 'bg-green-50' : 'bg-gray-50'}`}
                        >
                          <div className={`text-[11px] font-extrabold ${mes.atual ? 'text-green-700' : 'text-gray-600'}`}>{mes.curto}</div>
                          <div className="text-[9px] font-semibold text-gray-400 mt-0.5">{mes.qtd}/{totalClientes}</div>
                        </th>
                      ))}
                      <th className="sticky top-0 right-0 z-30 bg-gray-50 border-b border-l border-gray-100 px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider min-w-[130px]">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100/60">
                    {clientesFiltradosGrade.map(cliente => {
                      const relCliente = relatorios.filter(r => r.cliente_id === cliente.id);
                      const economiaTotalCliente = relCliente.reduce((acc, r) => acc + economiaDoRelatorio(r), 0);
                      const cobertura = mesesColunas.length > 0 ? relCliente.length : 0;

                      return (
                        <tr key={cliente.id} className="hover:bg-gray-50/40 transition-colors group">
                          <td className="sticky left-0 z-10 bg-white group-hover:bg-gray-50/40 border-r border-gray-100 px-4 py-2.5">
                            <div className="font-semibold text-[13px] text-gray-800 truncate max-w-[220px]" title={cliente.nome_razao_social}>
                              {cliente.nome_razao_social}
                            </div>
                            <div className={`inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${cliente.status === 'Inativo' ? 'bg-red-50 text-red-600 border-red-200/60' : 'bg-green-50 text-green-700 border-green-200/60'}`}>
                              {cliente.status || 'Ativo'}
                            </div>
                          </td>

                          {mesesColunas.map(mes => {
                            const rel = buscarRelatorio(cliente.id, mes.label);
                            return (
                              <td key={mes.chave} className={`px-2 py-2.5 text-center ${mes.atual ? 'bg-green-50/30' : ''}`}>
                                {rel ? (
                                  <button
                                    onClick={() => setRelatorioDetalhe({ cliente, relatorio: rel })}
                                    className="w-full flex flex-col items-center gap-0.5 bg-green-50 hover:bg-green-100 border border-green-200/60 text-green-700 rounded-xl px-1.5 py-1.5 transition-all cursor-pointer"
                                    title={`Relatório de ${mes.label} — ${brl(economiaDoRelatorio(rel))}`}
                                  >
                                    <CheckCircle2 size={14} strokeWidth={2.5} />
                                    <span className="text-[10px] font-bold leading-none">{brl(economiaDoRelatorio(rel))}</span>
                                  </button>
                                ) : (
                                  <div className="w-full flex items-center justify-center py-1.5 text-gray-300" title="Sem relatório gerado">
                                    <Minus size={14} strokeWidth={2} />
                                  </div>
                                )}
                              </td>
                            );
                          })}

                          <td className="sticky right-0 z-10 bg-white group-hover:bg-gray-50/40 border-l border-gray-100 px-4 py-2.5 text-center">
                            <div className="text-[12px] font-bold text-gray-700">{cobertura} / {mesesColunas.length}</div>
                            <div className="text-[11px] font-semibold text-green-600">{brl(economiaTotalCliente)}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className="sticky left-0 bottom-0 z-20 bg-gray-50 border-t border-r border-gray-100 px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Economia / mês
                      </td>
                      {mesesColunas.map(mes => (
                        <td key={mes.chave} className={`border-t border-gray-100 px-2 py-2.5 text-center text-[10px] font-bold text-gray-500 ${mes.atual ? 'bg-green-50/30' : 'bg-gray-50/60'}`}>
                          {mes.economia > 0 ? brl(mes.economia) : '—'}
                        </td>
                      ))}
                      <td className="sticky right-0 bottom-0 z-20 bg-gray-50 border-t border-l border-gray-100 px-4 py-2.5 text-center text-[11px] font-extrabold text-green-700">
                        {brl(economiaTotalGeral)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* LEGENDA */}
          <div className="flex items-center gap-5 mt-3 shrink-0 text-[11px] text-gray-400">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-green-50 border border-green-200/60 inline-flex items-center justify-center"><CheckCircle2 size={9} className="text-green-600" /></span> Relatório gerado (clique para ver / baixar)</div>
            <div className="flex items-center gap-1.5"><Minus size={12} className="text-gray-300" /> Sem relatório no mês</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-green-50 border border-green-200/60 inline-block" /> Mês atual</div>
          </div>
        </>
      ) : (
        <>
          {/* ============================================================ */}
          {/* ABA ACESSOS / CREDENCIAIS (comportamento original preservado) */}
          {/* ============================================================ */}
          <div className="flex flex-col md:flex-row items-center gap-3 mb-6 shrink-0 w-full">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Buscar cliente, login ou app..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200/60 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
              <div className="flex items-center bg-white border border-gray-200/60 rounded-xl px-3 py-2.5 shadow-sm transition-all hover:bg-gray-50 flex-1 md:flex-none">
                <Filter size={14} className="text-gray-400 mr-2 shrink-0" />
                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  className="bg-transparent text-[13px] font-semibold text-gray-600 outline-none cursor-pointer w-full"
                >
                  <option value="Todos">Todos os Status</option>
                  <option value="normal">Normal</option>
                  <option value="alerta">Offline / Problema</option>
                  <option value="vencido">Serviço Vencido</option>
                </select>
              </div>

              <button onClick={() => setIsPlataformaModalOpen(true)} className="flex items-center justify-center gap-1.5 bg-white border border-gray-200/60 text-gray-600 px-4 py-2.5 rounded-xl text-[13px] font-medium hover:bg-gray-50 transition-all shadow-sm shrink-0 cursor-pointer flex-1 md:flex-none">
                <Settings size={16} strokeWidth={1.5} /> <span className="hidden sm:inline">Plataformas</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pb-10 pr-2 space-y-5">
            {Object.keys(sistemasAgrupados).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400 border border-dashed border-gray-200 rounded-3xl bg-gray-50/50">
                <Search size={32} strokeWidth={1} className="mb-2 text-gray-300" />
                <p className="text-[13px]">Nenhuma credencial encontrada para este filtro.</p>
              </div>
            ) : (
              Object.keys(sistemasAgrupados).map(platNome => {
                const infoPlataforma = plataformas.find(p => p.nome === platNome);

                return (
                  <div key={platNome} className="bg-white rounded-2xl border border-gray-200/60 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
                    <div className="bg-gray-50/80 border-b border-gray-100 px-4 py-3 flex items-center justify-between">
                      <h4 className="font-bold text-gray-700 text-[13px] flex items-center gap-2">
                        {platNome}
                        <span className="bg-white border border-gray-200 text-gray-500 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                          {sistemasAgrupados[platNome].length}
                        </span>
                        {infoPlataforma?.link && (
                          <a
                            href={infoPlataforma.link}
                            target="_blank"
                            rel="noreferrer"
                            className="ml-1 flex items-center gap-1 bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                            title="Abrir plataforma"
                          >
                            <ExternalLink size={14} strokeWidth={2} />
                            <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Acessar</span>
                          </a>
                        )}
                      </h4>
                    </div>

                    <div className="divide-y divide-gray-100/60">
                      {sistemasAgrupados[platNome].map(item => {
                        const statusUI = renderStatusInfo(item.status_monitoramento);

                        return (
                          <div key={item.id} className={`p-3 px-4 flex flex-col md:flex-row md:items-center gap-3 transition-colors hover:bg-gray-50/50 ${statusUI.bg} ${statusUI.border} border-l-4 first:border-t-0`}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <h5 className={`font-semibold text-[13px] truncate ${statusUI.text}`}>
                                  {item.nome_razao_social}
                                </h5>
                                {item.status_monitoramento !== 'normal' && (
                                  <span className={`flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border bg-white ${statusUI.text} ${statusUI.border} uppercase tracking-wider shrink-0`}>
                                    {statusUI.icon} {statusUI.label}
                                  </span>
                                )}
                              </div>
                              {item.observacoes_internas && (
                                <p title={item.observacoes_internas} className="text-[11px] text-gray-400 line-clamp-1">
                                  {item.observacoes_internas}
                                </p>
                              )}
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 shrink-0 bg-white/60 p-1.5 px-3 rounded-xl border border-black/5">
                              <div className="flex flex-col w-[130px]">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Login</span>
                                <CopyButton text={item.login_app} />
                              </div>
                              <div className="hidden sm:block w-px h-6 bg-gray-200/60"></div>
                              <div className="flex flex-col w-[100px]">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Senha</span>
                                <CopyButton text={item.senha_app} />
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-1 shrink-0 text-gray-300 hover:text-gray-400 transition-colors">
                              <button onClick={() => setClienteDetalhe(item)} className="p-1.5 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all cursor-pointer" title="Ver Detalhes">
                                <Eye size={16} strokeWidth={1.5} />
                              </button>
                              <button onClick={() => abrirModalEdicao(item)} className="p-1.5 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer" title="Editar">
                                <Edit2 size={16} strokeWidth={1.5} />
                              </button>
                              <button onClick={() => limparCredenciais(item.id)} className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer" title="Remover credenciais">
                                <Trash2 size={16} strokeWidth={1.5} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* ============================================================ */}
      {/* MODAL: DETALHE DE RELATÓRIO (ABA GRADE)                       */}
      {/* ============================================================ */}
      {relatorioDetalhe && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity" onClick={(e) => { if (e.target === e.currentTarget) setRelatorioDetalhe(null); }}>
          <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50 shrink-0">
              <div>
                <h3 className="font-semibold text-base text-gray-800 leading-tight">{relatorioDetalhe.cliente.nome_razao_social}</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Relatório de {relatorioDetalhe.relatorio.mes_referencia}</p>
              </div>
              <button onClick={() => setRelatorioDetalhe(null)} className="text-gray-400 hover:text-gray-700 bg-white hover:bg-gray-100 p-1.5 rounded-full transition-colors cursor-pointer shadow-sm border border-gray-200/60">
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Geração Atual</span>
                  <p className="text-[13px] font-bold text-gray-800">{relatorioDetalhe.relatorio.geracao_atual || 0} kWh</p>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Geração Anterior</span>
                  <p className="text-[13px] font-bold text-gray-800">{relatorioDetalhe.relatorio.geracao_anterior || 0} kWh</p>
                </div>
              </div>

              <div className="bg-green-50/60 p-3 rounded-xl border border-green-100">
                <span className="block text-[10px] font-bold text-green-600 uppercase tracking-wider mb-1">Economia Total</span>
                <p className="text-[16px] font-extrabold text-green-700">{brl(economiaDoRelatorio(relatorioDetalhe.relatorio))}</p>
              </div>

              {Array.isArray(relatorioDetalhe.relatorio.faturas_cpfl) && relatorioDetalhe.relatorio.faturas_cpfl.length > 0 && (
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Faturas / Unidades</span>
                  <div className="space-y-1.5">
                    {relatorioDetalhe.relatorio.faturas_cpfl.map((u, i) => (
                      <div key={i} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-gray-700 truncate">{u.tipo} — UC: {u.numero_uc}</p>
                          <p className="text-[10px] text-gray-400">{(parseFloat(u.consumoTotal) || 0).toFixed(0)} kWh consumidos</p>
                        </div>
                        <span className="text-[12px] font-bold text-green-600 shrink-0 ml-2">{brl(parseFloat(u.economia) || 0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {relatorioDetalhe.relatorio.parecer_tecnico && (
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Parecer Técnico</span>
                  <div className="text-[13px] text-gray-600 bg-yellow-50/50 p-3 rounded-xl border border-yellow-100/50 whitespace-pre-wrap">
                    {relatorioDetalhe.relatorio.parecer_tecnico}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end shrink-0">
              <button
                onClick={() => baixarPDFRelatorio(relatorioDetalhe.cliente, relatorioDetalhe.relatorio)}
                disabled={gerandoPDF}
                className="flex items-center gap-1.5 bg-green-700 text-white px-4 py-2 rounded-xl text-[12px] font-semibold hover:bg-green-800 transition-all shadow-sm cursor-pointer disabled:opacity-60"
              >
                {gerandoPDF ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                {gerandoPDF ? 'Gerando...' : 'Baixar PDF novamente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE GERENCIAR PLATAFORMAS */}
      {isPlataformaModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity" onClick={(e) => { if (e.target === e.currentTarget) setIsPlataformaModalOpen(false); }}>
          <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
              <div>
                <h3 className="font-semibold text-base text-gray-800 leading-tight">Gerenciar Plataformas</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Cadastre os links para acesso rápido</p>
              </div>
              <button onClick={() => setIsPlataformaModalOpen(false)} className="text-gray-400 hover:text-gray-700 bg-white hover:bg-gray-100 p-1.5 rounded-full transition-colors cursor-pointer shadow-sm border border-gray-200/60">
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <form onSubmit={handleSalvarPlataforma} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="Nome (Ex: Solar Web)" value={novaPlataformaNome} onChange={(e) => setNovaPlataformaNome(e.target.value)} className="bg-white border border-gray-200/60 rounded-xl p-2.5 text-[13px] focus:ring-1 focus:ring-gray-300 outline-none" required />
                  <input type="url" placeholder="Link (https://...)" value={novaPlataformaLink} onChange={(e) => setNovaPlataformaLink(e.target.value)} className="bg-white border border-gray-200/60 rounded-xl p-2.5 text-[13px] focus:ring-1 focus:ring-gray-300 outline-none" />
                </div>
                <button type="submit" className="w-full bg-gray-800 text-white px-4 py-2.5 rounded-xl text-[13px] font-medium hover:bg-gray-900 transition-all cursor-pointer">
                  Adicionar Plataforma
                </button>
              </form>

              <div className="space-y-2 max-h-60 overflow-y-auto mt-4 pr-1">
                {plataformas.map(plat => (
                  <div key={plat.id} className="flex justify-between items-center bg-gray-50 border border-gray-100 p-3 rounded-xl">
                    <div className="min-w-0 flex-1">
                      <span className="text-[13px] font-medium text-gray-700 block truncate">{plat.nome}</span>
                      {plat.link && <span className="text-[10px] text-gray-400 block truncate">{plat.link}</span>}
                    </div>
                    <button onClick={() => deletarPlataforma(plat.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1.5 rounded-md hover:bg-red-50/50 shrink-0 ml-2" title="Excluir">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {plataformas.length === 0 && <p className="text-center text-[12px] text-gray-400 py-4">Nenhuma plataforma cadastrada.</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE VISUALIZAÇÃO (Detalhes Read-Only) */}
      {clienteDetalhe && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity" onClick={(e) => { if (e.target === e.currentTarget) setClienteDetalhe(null); }}>
          <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
              <div>
                <h3 className="font-semibold text-base text-gray-800 leading-tight">Detalhes da Usina</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Modo somente leitura</p>
              </div>
              <button onClick={() => setClienteDetalhe(null)} className="text-gray-400 hover:text-gray-700 bg-white hover:bg-gray-100 p-1.5 rounded-full transition-colors cursor-pointer shadow-sm border border-gray-200/60">
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Cliente / Razão Social</span>
                <p className="text-[14px] font-medium text-gray-800 bg-gray-50 p-2.5 rounded-xl border border-gray-100">{clienteDetalhe.nome_razao_social}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    {renderStatusInfo(clienteDetalhe.status_monitoramento).icon}
                    <span className={`text-[12px] font-semibold ${renderStatusInfo(clienteDetalhe.status_monitoramento).text}`}>
                      {renderStatusInfo(clienteDetalhe.status_monitoramento).label}
                    </span>
                  </div>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Plataforma</span>
                  <p className="text-[13px] font-medium text-gray-800 mt-1 truncate" title={clienteDetalhe.plataforma_inversor}>{clienteDetalhe.plataforma_inversor}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50/50 p-2.5 rounded-xl border border-blue-100/50">
                  <span className="block text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">Login App</span>
                  <CopyButton text={clienteDetalhe.login_app} />
                </div>
                <div className="bg-blue-50/50 p-2.5 rounded-xl border border-blue-100/50">
                  <span className="block text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">Senha App</span>
                  <CopyButton text={clienteDetalhe.senha_app} />
                </div>
              </div>

              {clienteDetalhe.observacoes_internas && (
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Observações</span>
                  <div className="text-[13px] text-gray-600 bg-yellow-50/50 p-3 rounded-xl border border-yellow-100/50 whitespace-pre-wrap">
                    {clienteDetalhe.observacoes_internas}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button onClick={() => {
                setClienteDetalhe(null);
                abrirModalEdicao(clienteDetalhe);
              }} className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-[12px] font-semibold hover:bg-gray-50 transition-all shadow-sm cursor-pointer">
                <Edit2 size={14} /> Editar Usina
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR CREDENCIAIS */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity" onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
          <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h3 className="font-semibold text-base text-gray-800">Editar Credenciais</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 p-1.5 rounded-full transition-colors cursor-pointer">
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            <form onSubmit={handleSalvar} className="p-5 space-y-4">

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Cliente / Usina *</label>
                <input required autoFocus type="text" placeholder="Ex: Márcio - Onze Onze Adesivos" value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} className="w-full bg-gray-50 border border-gray-200/60 rounded-xl p-2.5 text-[13px] focus:bg-white focus:ring-1 focus:ring-green-500 outline-none transition-all" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Login App</label>
                  <input type="text" placeholder="E-mail ou Usuário" value={loginApp} onChange={(e) => setLoginApp(e.target.value)} className="w-full bg-gray-50 border border-gray-200/60 rounded-xl p-2.5 text-[13px] focus:bg-white focus:ring-1 focus:ring-green-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Senha App</label>
                  <input type="text" placeholder="Senha do App" value={senhaApp} onChange={(e) => setSenhaApp(e.target.value)} className="w-full bg-gray-50 border border-gray-200/60 rounded-xl p-2.5 text-[13px] focus:bg-white focus:ring-1 focus:ring-green-500 outline-none transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Plataforma / App</label>
                <input list="plataformas-db" type="text" placeholder="Ex: Solarman Smart" value={plataformaInversor} onChange={(e) => setPlataformaInversor(e.target.value)} className="w-full bg-gray-50 border border-gray-200/60 rounded-xl p-2.5 text-[13px] focus:bg-white focus:ring-1 focus:ring-green-500 outline-none transition-all" />
                <datalist id="plataformas-db">
                  {plataformas.map(p => <option key={p.id} value={p.nome} />)}
                </datalist>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Observações de Monitoramento</label>
                <textarea placeholder="Algum detalhe importante? (Opcional)" value={observacoesInternas} onChange={(e) => setObservacoesInternas(e.target.value)} className="w-full bg-gray-50 border border-gray-200/60 rounded-xl p-2.5 text-[13px] focus:bg-white focus:ring-1 focus:ring-green-500 outline-none resize-none h-16 transition-all" />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-2 uppercase tracking-wider">Status do Monitoramento</label>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => setStatusMonitoramento('normal')} className={`py-2 px-1 cursor-pointer rounded-xl text-[12px] font-semibold border flex flex-col items-center gap-1 transition-all ${statusMonitoramento === 'normal' ? 'bg-white border-green-500 text-green-700 shadow-sm ring-1 ring-green-500' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-white'}`}>
                    <CheckCircle2 size={16} /> Normal
                  </button>
                  <button type="button" onClick={() => setStatusMonitoramento('alerta')} className={`py-2 px-1 cursor-pointer rounded-xl text-[12px] font-semibold border flex flex-col items-center gap-1 transition-all ${statusMonitoramento === 'alerta' ? 'bg-yellow-50 border-yellow-500 text-yellow-700 shadow-sm ring-1 ring-yellow-500' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-white'}`}>
                    <AlertCircle size={16} /> Offline/Problema
                  </button>
                  <button type="button" onClick={() => setStatusMonitoramento('vencido')} className={`py-2 px-1 cursor-pointer rounded-xl text-[12px] font-semibold border flex flex-col items-center gap-1 transition-all ${statusMonitoramento === 'vencido' ? 'bg-red-50 border-red-500 text-red-700 shadow-sm ring-1 ring-red-500' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-white'}`}>
                    <ShieldAlert size={16} /> Vencido
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end">
                <button type="submit" className="bg-green-700 cursor-pointer text-white px-5 py-2.5 rounded-xl text-[13px] font-semibold hover:bg-green-800 transition-all shadow-sm">
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}