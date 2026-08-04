import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const parseNum = (val) => {
  if (!val) return 0;
  const normalized = String(val).replace(',', '.');
  return parseFloat(normalized) || 0;
};

export function gerarPdfRelatorio({ cliente, relatorio, unidades, economiaTotal }) {
  const unidadesRelatorio = Array.isArray(unidades) ? unidades : [];
  const gAtual = parseNum(relatorio.geracao_atual);
  const gAnt = parseNum(relatorio.geracao_anterior);
  const totalEconomia = economiaTotal ?? unidadesRelatorio.reduce((acc, u) => acc + parseNum(u.economia), 0);

  const doc = new jsPDF();
  let currentY = 15;

  doc.setFontSize(14);
  doc.setTextColor(21, 128, 61);
  doc.setFont('helvetica', 'bold');
  doc.text('OLSS', 14, currentY);

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('LIMPEZA E MONITORAMENTO FOTOVOLTAICO', 14, currentY + 5);

  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text('Relatório Mensal', 150, currentY + 3);

  currentY += 14;
  doc.setLineWidth(0.5);
  doc.setDrawColor(200, 200, 200);
  doc.line(14, currentY, 196, currentY);

  currentY += 8;
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENTE:', 14, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(`${(cliente.nome_razao_social || '').toUpperCase()}`, 38, currentY);

  currentY += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('ENDEREÇO:', 14, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(`${(cliente.endereco || 'Endereço não informado').toUpperCase()}`, 38, currentY);

  currentY += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('REFERÊNCIA:', 14, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(`${relatorio.mes_referencia.toUpperCase()}`, 38, currentY);

  currentY += 10;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(21, 128, 61);
  doc.text('DESCRIÇÃO DE RESULTADO', 14, currentY);

  currentY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  const diffGeracao = gAtual - gAnt;
  const textoResumo = `O valor gerado pelo sistema no período foi de ${gAtual} kWh/mês. Houve uma variação de ${diffGeracao} kWh em relação ao mês anterior (${gAnt} kWh/mês), mantendo-se dentro do esperado para a estação do ano.`;
  const splitResumo = doc.splitTextToSize(textoResumo, 182);
  doc.text(splitResumo, 14, currentY);
  currentY += (splitResumo.length * 5) + 6;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(21, 128, 61);
  doc.text(`1. GERAÇÃO - ${relatorio.mes_referencia.toUpperCase()} - ${gAtual} KWH/MÊS`, 14, currentY);

  currentY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(21, 128, 61);
  doc.text(`2. GERAÇÃO - MÊS ANTERIOR - ${gAnt} KWH/MÊS`, 14, currentY);

  const geradoraObj = unidadesRelatorio.find(u => u.tipo === 'Geradora');
  if (geradoraObj) {
    currentY += 10;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(21, 128, 61);
    doc.text('3. RELAÇÃO DA CONTA GERADORA', 14, currentY);

    currentY += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(`• Geração mês anterior: ${gAnt} kWh/mês`, 18, currentY);
    currentY += 5;
    doc.text(`• Valor Injetado: ${parseNum(geradoraObj.injetado)} kWh/mês`, 18, currentY);
    currentY += 5;
    doc.text(`• Valor auto consumo: ${parseNum(geradoraObj.autoConsumo).toFixed(0)} kWh/mês`, 18, currentY);
    currentY += 5;
    doc.text(`• Consumo da conta: ${parseNum(geradoraObj.consumoConta)} kWh/mês`, 18, currentY);
  }

  currentY += 10;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(21, 128, 61);
  doc.text('4. VALORES DAS CONTAS', 14, currentY);
  currentY += 4;

  const tableData = unidadesRelatorio.map(u => [
    `${u.tipo}\nUC: ${u.numero_uc}`,
    `${parseNum(u.consumoTotal).toFixed(0)} kWh`,
    `R$ ${parseNum(u.precoKwh).toFixed(2).replace('.', ',')}`,
    `R$ ${parseNum(u.tarifaConta).toFixed(2).replace('.', ',')}`,
    `R$ ${parseNum(u.valorSemSistema).toFixed(2).replace('.', ',')}`,
    `R$ ${parseNum(u.valorConta).toFixed(2).replace('.', ',')}`,
    `R$ ${parseNum(u.economia).toFixed(2).replace('.', ',')}`,
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
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(`ECONOMIA TOTAL: R$ ${totalEconomia.toFixed(2).replace('.', ',')}`, 14, currentY);

  currentY += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(21, 128, 61);
  doc.text('5. RESOLUÇÃO FINAL', 14, currentY);

  currentY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  const textoParecer = relatorio.parecer_tecnico || 'Resultado dentro do esperado para o período, com contas de energia atenuadas ao limite tarifário mínimo.';
  const splitParecer = doc.splitTextToSize(textoParecer, 182);
  doc.text(splitParecer, 14, currentY);
  currentY += (splitParecer.length * 5) + 15;

  if (currentY > 260) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('OTÁVIO LAVEZZO', 14, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text('Diretor Proprietário', 14, currentY + 5);
  doc.text('(16) 98849-4891  |  otavio.olss1@gmail.com', 14, currentY + 10);

  doc.save(`Relatorio_${(cliente.nome_razao_social || 'cliente').substring(0, 15)}_${relatorio.mes_referencia.replace('/', '-')}.pdf`);
}
