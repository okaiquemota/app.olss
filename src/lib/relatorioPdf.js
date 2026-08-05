import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

// =========================================================
// SOLUÇÃO DA TELA BRANCA (Compatibilidade com Vite)
// =========================================================
if (pdfFonts && pdfFonts.pdfMake) {
  pdfMake.vfs = pdfFonts.pdfMake.vfs;
} else if (window && window.pdfMake) {
  pdfMake.vfs = window.pdfMake.vfs;
} else {
  pdfMake.vfs = pdfFonts;
}

// Função auxiliar para transformar a URL do gráfico em imagem legível pro PDF
async function fetchImageAsBase64(url) {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export const gerarPdfRelatorio = async ({ cliente, relatorio, unidades, economiaTotal, historicoGrafico }) => {
  
  const diferenca = relatorio.geracao_atual - relatorio.geracao_anterior;
  const statusDiferenca = diferenca >= 0 ? 'aumento' : 'perda';
  const textoDiferenca = diferenca !== 0 
    ? `, resultando em uma ${statusDiferenca} de ${Math.abs(diferenca).toFixed(0)} kWh em relação ao mês anterior` 
    : ' mantendo a mesma média do mês anterior';

  const geradora = unidades.find(u => u.tipo === 'Geradora');

  // =========================================================
  // GERAÇÃO DO GRÁFICO (QuickChart API)
  // =========================================================
  let chartBase64 = null;
  
  if (historicoGrafico && historicoGrafico.length > 0) {
    const labels = historicoGrafico.map(h => h.mes);
    const data = historicoGrafico.map(h => h.geracao);

    const chartConfig = {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Geração (kWh)',
          data: data,
          backgroundColor: '#1E3A8A', // Azul escuro da sua marca
          borderRadius: 4
        }]
      },
      options: {
        plugins: {
          datalabels: { display: true, anchor: 'end', align: 'top', color: '#1E3A8A', font: { weight: 'bold' } },
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: '#E2E8F0' } },
          x: { grid: { display: false } }
        },
        layout: { padding: { top: 20 } } // Espaço para os números não cortarem
      }
    };

    // Pede a imagem pro QuickChart (Alta resolução)
    const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&w=600&h=250&bkg=white&devicePixelRatio=2`;
    
    try {
      chartBase64 = await fetchImageAsBase64(chartUrl);
    } catch (error) {
      console.error("Falha ao carregar gráfico:", error);
    }
  }

  // =========================================================
  // MONTAGEM DO DOCUMENTO PDF
  // =========================================================
  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 60],
    
    content: [
      // CABEÇALHO
      { text: 'Relatório Mensal', style: 'header', alignment: 'center' },
      { text: 'MOVCODE - LIMPEZA E MONITORAMENTO FOTOVOLTAICO', style: 'subHeader', alignment: 'center', margin: [0, 0, 0, 15] },

      // DADOS DO CLIENTE
      {
        style: 'clientInfoBox',
        table: {
          widths: ['*'],
          body: [
            [
              {
                text: [
                  { text: 'CLIENTE: ', bold: true }, `${cliente.nome_razao_social.toUpperCase()}\n`,
                  { text: 'ENDEREÇO GERADOR: ', bold: true }, `${(cliente.endereco || 'Não informado').toUpperCase()}\n`,
                  { text: 'MÊS REFERÊNCIA: ', bold: true }, `${relatorio.mes_referencia.toUpperCase()}`
                ],
                fillColor: '#F3F4F6',
                margin: [10, 10, 10, 10],
                border: [false, false, false, false]
              }
            ]
          ]
        },
        margin: [0, 0, 0, 15]
      },

      // DESCRIÇÃO DE RESULTADO
      { text: 'DESCRIÇÃO DE RESULTADO', style: 'sectionTitle' },
      {
        text: `O valor gerado pelo sistema no mês ${relatorio.mes_referencia} foi de ${relatorio.geracao_atual} kWh, enquanto no mês anterior tivemos uma geração de ${relatorio.geracao_anterior} kWh${textoDiferenca}.`,
        style: 'paragraph',
        margin: [0, 0, 0, 15]
      }
    ],

    footer: function(currentPage, pageCount) {
      return {
        columns: [
          { text: 'OTÁVIO LAVEZZO\nDiretor Proprietário\n(16) 98849-4891\notavio.olss1@gmail.com', style: 'footerSignature', alignment: 'left', margin: [40, 0, 0, 0] },
          { text: `Página ${currentPage} de ${pageCount}`, style: 'footerPage', alignment: 'right', margin: [0, 20, 40, 0] }
        ]
      };
    },

    styles: {
      header: { fontSize: 22, bold: true, color: '#1E3A8A', margin: [0, 0, 0, 2] },
      subHeader: { fontSize: 10, bold: true, color: '#64748B', tracking: 1 },
      sectionTitle: { fontSize: 12, bold: true, color: '#1E3A8A', margin: [0, 10, 0, 5], decoration: 'underline' },
      paragraph: { fontSize: 10, color: '#334155', lineHeight: 1.4, alignment: 'justify' },
      list: { fontSize: 10, color: '#334155', lineHeight: 1.5, margin: [10, 0, 0, 0] },
      tableHeader: { bold: true, fontSize: 8, color: '#FFFFFF', fillColor: '#1E3A8A', alignment: 'center', margin: [0, 5, 0, 5] },
      tableCell: { fontSize: 8, color: '#334155', alignment: 'center', margin: [0, 5, 0, 5] },
      economiaTotal: { fontSize: 13, bold: true, color: '#166534' },
      footerSignature: { fontSize: 8, color: '#475569', bold: true, lineHeight: 1.3 },
      footerPage: { fontSize: 8, color: '#94A3B8' }
    }
  };

  // ADICIONA O GRÁFICO (Se a imagem foi gerada com sucesso)
  if (chartBase64) {
    docDefinition.content.push(
      { text: 'HISTÓRICO DE GERAÇÃO (kWh)', style: 'sectionTitle' },
      { image: chartBase64, width: 480, alignment: 'center', margin: [0, 5, 0, 15] }
    );
  }

  // ADICIONA RELAÇÃO DA GERADORA
  if (geradora) {
    docDefinition.content.push(
      { text: 'RELAÇÃO DA CONTA GERADORA', style: 'sectionTitle' },
      {
        ul: [
          `Geração mês anterior: ${relatorio.geracao_anterior} kWh`,
          `Valor Injetado: ${geradora.energiaInjetada || 0} kWh`,
          `Valor auto consumo: ${geradora.autoconsumo || 0} kWh`,
          `Consumo da conta: ${geradora.consumoConta || 0} kWh`
        ],
        style: 'list',
        margin: [0, 0, 0, 15]
      }
    );
  }

  // ADICIONA A TABELA E ECONOMIA
  docDefinition.content.push(
    { text: 'VALORES DAS CONTAS', style: 'sectionTitle' },
    {
      table: {
        headerRows: 1,
        widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto'],
        body: [
          [
            { text: 'UC', style: 'tableHeader' }, { text: 'CONSUMO\nTOTAL KWH', style: 'tableHeader' },
            { text: 'PREÇO', style: 'tableHeader' }, { text: 'TARIFA DA\nCONTA', style: 'tableHeader' },
            { text: 'VALOR\nS/SISTEMA', style: 'tableHeader' }, { text: 'VALOR COM\nSISTEMA', style: 'tableHeader' },
            { text: 'ECONOMIA', style: 'tableHeader' }
          ],
          ...unidades.map(u => [
            { text: `${u.tipo}\n${u.numero_uc}`, style: 'tableCell' },
            { text: `${Math.round(u.consumoTotalUC)} kWh`, style: 'tableCell' },
            { text: `R$ ${parseFloat(u.precoKwh || 0).toFixed(2).replace('.',',')}`, style: 'tableCell' },
            { text: `R$ ${parseFloat(u.tarifaConta || 0).toFixed(2).replace('.',',')}`, style: 'tableCell' },
            { text: `R$ ${u.valorSemSistema.toFixed(2).replace('.',',')}`, style: 'tableCell' },
            { text: `R$ ${parseFloat(u.valorConta || 0).toFixed(2).replace('.',',')}`, style: 'tableCell' },
            { text: `R$ ${u.economia.toFixed(2).replace('.',',')}`, style: 'tableCell', color: u.economia >= 0 ? '#166534' : '#991b1b', bold: true }
          ])
        ]
      },
      layout: {
        hLineWidth: (i, node) => (i === 0 || i === node.table.body.length) ? 0 : 1,
        vLineWidth: () => 0,
        hLineColor: () => '#E2E8F0',
        paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 4, paddingBottom: () => 4
      },
      margin: [0, 0, 0, 10]
    },
    { text: `ECONOMIA TOTAL: R$ ${economiaTotal.toFixed(2).replace('.', ',')}`, style: 'economiaTotal', alignment: 'right', margin: [0, 0, 0, 20] },
    { text: 'RESOLUÇÃO FINAL', style: 'sectionTitle' },
    { text: relatorio.parecer_tecnico || 'Nenhum parecer técnico cadastrado.', style: 'paragraph', margin: [0, 0, 0, 20] }
  );

  const nomeArquivo = `Relatorio_${cliente.nome_razao_social.replace(/[^a-z0-9]/gi, '_')}_${relatorio.mes_referencia.replace('/', '-')}.pdf`;
  pdfMake.createPdf(docDefinition).download(nomeArquivo);
};