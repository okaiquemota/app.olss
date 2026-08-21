import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { paraNumero, formatarReal } from './numero';
import { gerarGraficoGeracaoBase64 } from './graficoGeracao';

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

// =========================================================
// PALETA
// =========================================================
const corOlss = '#064E3B';      // verde escuro institucional
const corAccent = '#059669';    // verde médio (destaques secundários)
const corMuted = '#94A3B8';     // cinza label
const corText = '#334155';      // cinza texto
const corBorder = '#E2E8F0';    // cinza borda
const corBg = '#F8FAFC';        // cinza fundo claro
const corPositivo = '#166534';
const corNegativo = '#991B1B';

// =========================================================
// HELPERS DE LAYOUT
// =========================================================

// Título de seção com marcador colorido lateral, no lugar do underline antigo
const sectionTitle = (texto) => ({
  columns: [
    { width: 4, canvas: [{ type: 'rect', x: 0, y: 2, w: 4, h: 11, color: corOlss }] },
    { width: '*', text: texto.toUpperCase(), style: 'sectionTitle', margin: [8, 0, 0, 0] }
  ],
  margin: [0, 16, 0, 6]
});

// Card de indicador (usado na régua de KPIs do topo)
const kpiCard = (label, valor, cor = corText, corDestaque = corOlss) => ({
  table: {
    widths: ['*'],
    body: [[{
      stack: [
        { text: label.toUpperCase(), fontSize: 7, bold: true, color: corMuted, margin: [0, 0, 0, 4] },
        { text: valor, fontSize: 15, bold: true, color: cor }
      ],
      fillColor: corBg,
      margin: [12, 10, 12, 10]
    }]]
  },
  layout: {
    hLineWidth: (i) => (i === 0 ? 3 : 1),
    vLineWidth: () => 1,
    hLineColor: (i) => (i === 0 ? corDestaque : corBorder),
    vLineColor: () => corBorder
  }
});

// Caixa com barra de destaque à esquerda (usada nos dados do cliente e no parecer técnico)
const boxDestaque = (conteudoStack, corBarra = corOlss) => ({
  table: {
    widths: ['*'],
    body: [[{ stack: conteudoStack, fillColor: '#FAFAFA', margin: [16, 12, 16, 12] }]]
  },
  layout: {
    hLineWidth: () => 1,
    vLineWidth: (i) => (i === 0 ? 3 : 1),
    hLineColor: () => corBorder,
    vLineColor: (i) => (i === 0 ? corBarra : corBorder)
  }
});

const infoRow = (label, valor) => ({
  columns: [
    { width: 130, text: label.toUpperCase(), style: 'infoLabel' },
    { width: '*', text: valor, style: 'infoValue' }
  ],
  margin: [0, 0, 0, 5]
});

export const gerarPdfRelatorio = async ({ cliente, relatorio, unidades, economiaTotal, historicoGrafico, economiaAcumuladaAno }) => {

  const diferenca = relatorio.geracao_atual - relatorio.geracao_anterior;
  const statusDiferenca = diferenca >= 0 ? 'aumento' : 'perda';
  const textoDiferenca = diferenca !== 0
    ? `, resultando em uma ${statusDiferenca} de ${Math.abs(diferenca).toFixed(0)} kWh em relação ao mês anterior`
    : ' mantendo a mesma média do mês anterior';

  const geradora = unidades.find(u => u.tipo === 'Geradora');
  const anoReferencia = (relatorio.mes_referencia || '').split('/')[1] || '';
  const formatarMoeda = (valor) => paraNumero(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // =========================================================
  // GRÁFICO DE GERAÇÃO (desenhado localmente, sem serviço externo)
  // =========================================================
  const chartBase64 = gerarGraficoGeracaoBase64(historicoGrafico);

  // =========================================================
  // MONTAGEM DO DOCUMENTO PDF
  // =========================================================
  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [40, 100, 40, 55],

    header: function () {
      return {
        table: {
          widths: ['*'],
          body: [[
            {
              fillColor: corOlss,
              margin: [40, 22, 40, 22],
              columns: [
                {
                  width: '*',
                  stack: [
                    { text: 'RELATÓRIO MENSAL', style: 'bannerTitle' },
                    { text: (relatorio.mes_referencia || '').toUpperCase(), style: 'bannerSub' }
                  ]
                },
                {
                  width: 'auto',
                  stack: [
                    { text: 'OLSS', style: 'bannerBrand' },
                    { text: 'LIMPEZA E MONITORAMENTO FOTOVOLTAICO', style: 'bannerBrandSub' }
                  ]
                }
              ]
            }
          ]]
        },
        layout: 'noBorders'
      };
    },

    content: [
      // DADOS DO CLIENTE (grade em vez de bloco único)
      boxDestaque([
        infoRow('Cliente', (cliente.nome_razao_social || '').toUpperCase()),
        infoRow('Endereço gerador', (cliente.endereco || 'Não informado').toUpperCase()),
        infoRow('Mês referência', (relatorio.mes_referencia || '').toUpperCase())
      ]),

      // RÉGUA DE INDICADORES (KPIs)
      {
        columnGap: 10,
        margin: [0, 14, 0, 0],
        columns: [
          kpiCard('Geração Atual', `${relatorio.geracao_atual} kWh`, corText),
          kpiCard('Geração Anterior', `${relatorio.geracao_anterior} kWh`, corText),
          kpiCard(
            diferenca >= 0 ? 'Ganho no Mês' : 'Perda no Mês',
            `${diferenca >= 0 ? '+' : '-'}${Math.abs(diferenca).toFixed(0)} kWh`,
            diferenca >= 0 ? corPositivo : corNegativo,
            diferenca >= 0 ? corPositivo : corNegativo
          ),
          kpiCard('Economia Total', formatarMoeda(economiaTotal), corPositivo, corAccent)
        ]
      },

      // DESCRIÇÃO DE RESULTADO
      sectionTitle('Descrição de Resultado'),
      {
        text: `O valor gerado pelo sistema no mês ${relatorio.mes_referencia} foi de ${relatorio.geracao_atual} kWh, enquanto no mês anterior tivemos uma geração de ${relatorio.geracao_anterior} kWh${textoDiferenca}.`,
        style: 'paragraph',
        margin: [0, 0, 0, 4]
      }
    ],

    footer: function (currentPage, pageCount, pageSize) {
      return {
        stack: [
          { canvas: [{ type: 'rect', x: 0, y: 0, w: pageSize.width, h: 2, color: corAccent }] },
          {
            table: {
              widths: ['*'],
              body: [[
                {
                  fillColor: corOlss,
                  margin: [40, 14, 40, 14],
                  columns: [
                    {
                      width: '*',
                      stack: [
                        { text: 'OTÁVIO LAVEZZO', style: 'footerName' },
                        { text: 'Diretor Proprietário  ·  (16) 98849-4891  ·  otavio.olss1@gmail.com', style: 'footerContact' }
                      ]
                    },
                    {
                      width: 'auto',
                      stack: [
                        { text: `PÁGINA ${currentPage}/${pageCount}`, style: 'footerPageBadge' },
                        { text: 'DESENVOLVIDO POR MOVCODE', style: 'footerDevCredit' }
                      ]
                    }
                  ]
                }
              ]]
            },
            layout: 'noBorders'
          }
        ]
      };
    },

    styles: {
      bannerTitle: { fontSize: 18, bold: true, color: '#FFFFFF' },
      bannerSub: { fontSize: 9, bold: true, color: '#A7F3D0', margin: [0, 3, 0, 0] },
      bannerBrand: { fontSize: 15, bold: true, color: '#FFFFFF', alignment: 'right' },
      bannerBrandSub: { fontSize: 6, bold: true, color: '#A7F3D0', alignment: 'right', margin: [0, 2, 0, 0], lineHeight: 1.3 },
      footerName: { fontSize: 9, bold: true, color: '#FFFFFF' },
      footerContact: { fontSize: 7.5, color: '#A7F3D0', margin: [0, 2, 0, 0] },
      footerPageBadge: { fontSize: 7.5, bold: true, color: '#FFFFFF', alignment: 'right' },
      footerDevCredit: { fontSize: 5.5, bold: true, color: '#5FA98A', alignment: 'right', margin: [0, 3, 0, 0] },
      sectionTitle: { fontSize: 11, bold: true, color: '#1E293B' },
      paragraph: { fontSize: 10, color: corText, lineHeight: 1.4, alignment: 'justify' },
      list: { fontSize: 10, color: corText, lineHeight: 1.6, margin: [10, 0, 0, 0] },
      infoLabel: { fontSize: 8, bold: true, color: corMuted },
      infoValue: { fontSize: 10, bold: true, color: '#1E293B' },
      tableHeader: { bold: true, fontSize: 8, color: '#FFFFFF', alignment: 'center', margin: [0, 6, 0, 6] },
      tableCell: { fontSize: 8, color: corText, alignment: 'center', margin: [0, 6, 0, 6] },
      economiaLabel: { fontSize: 9, bold: true, color: '#D1FAE5' },
      economiaValue: { fontSize: 16, bold: true, color: '#FFFFFF' }
    }
  };

  // ADICIONA O GRÁFICO (Se a imagem foi gerada com sucesso)
  if (chartBase64) {
    docDefinition.content.push(
      sectionTitle('Histórico de Geração (kWh)'),
      {
        table: { widths: ['*'], body: [[{ image: chartBase64, width: 470, alignment: 'center', margin: [8, 10, 8, 10] }]] },
        layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => corBorder, vLineColor: () => corBorder },
        margin: [0, 0, 0, 4]
      }
    );
  }

  // ADICIONA RELAÇÃO DA GERADORA (cards em vez de bullets) — inicia a página 2
  if (geradora) {
    docDefinition.content.push(
      { ...sectionTitle('Relação da Conta Geradora'), pageBreak: 'before' },
      {
        columnGap: 10,
        margin: [0, 0, 0, 4],
        columns: [
          kpiCard('Geração mês anterior', `${relatorio.geracao_anterior} kWh`, corText, corAccent),
          kpiCard('Injetado na rede', `${geradora.energiaInjetada || 0} kWh`, corText, corAccent),
          kpiCard('Autoconsumo', `${geradora.autoconsumo || 0} kWh`, corText, corAccent),
          kpiCard('Consumo da conta', `${geradora.consumoConta || 0} kWh`, corText, corAccent)
        ]
      }
    );
  }

  // ADICIONA A TABELA E ECONOMIA
  // Se não houver UC geradora (caso raro), a quebra de página cai aqui em vez de na seção acima
  docDefinition.content.push(
    geradora ? sectionTitle('Valores das Contas') : { ...sectionTitle('Valores das Contas'), pageBreak: 'before' },
    {
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
        body: [
          [
            { text: 'UC', style: 'tableHeader' }, { text: 'CONSUMO\nTOTAL KWH', style: 'tableHeader' },
            { text: 'PREÇO', style: 'tableHeader' }, { text: 'TARIFA DA\nCONTA', style: 'tableHeader' },
            { text: 'VALOR\nS/SISTEMA', style: 'tableHeader' }, { text: 'VALOR COM\nSISTEMA', style: 'tableHeader' },
            { text: 'ECONOMIA', style: 'tableHeader' }
          ],
          ...unidades.map(u => [
            { text: `${u.tipo}\n${u.numero_uc}`, style: 'tableCell', bold: true },
            { text: `${Math.round(u.consumoTotalUC)} kWh`, style: 'tableCell' },
            { text: `R$ ${formatarReal(u.precoKwh)}`, style: 'tableCell' },
            { text: `R$ ${formatarReal(u.tarifaConta)}`, style: 'tableCell' },
            { text: `R$ ${formatarReal(u.valorSemSistema)}`, style: 'tableCell' },
            { text: `R$ ${formatarReal(u.valorConta)}`, style: 'tableCell' },
            { text: `R$ ${formatarReal(u.economia)}`, style: 'tableCell', color: paraNumero(u.economia) >= 0 ? corPositivo : corNegativo, bold: true }
          ])
        ]
      },
      layout: {
        hLineWidth: (i, node) => (i === 0 || i === node.table.body.length) ? 0 : 1,
        vLineWidth: () => 0,
        hLineColor: () => corBorder,
        fillColor: (rowIndex) => {
          if (rowIndex === 0) return corOlss;
          return rowIndex % 2 === 0 ? corBg : null;
        },
        paddingLeft: () => 6, paddingRight: () => 6, paddingTop: () => 4, paddingBottom: () => 4
      },
      margin: [0, 0, 0, 12]
    },

    // BANNER DE ECONOMIA (MÊS + ACUMULADO NO ANO)
    {
      columns: [
        {
          width: '*',
          table: {
            widths: ['*', 'auto'],
            body: [[
              { text: 'ECONOMIA DO MÊS', style: 'economiaLabel', fillColor: corOlss, margin: [16, 12, 0, 12] },
              { text: formatarMoeda(economiaTotal), style: 'economiaValue', fillColor: corOlss, alignment: 'right', margin: [0, 12, 16, 12] }
            ]]
          },
          layout: 'noBorders'
        },
        { width: 6, text: '' },
        {
          width: '*',
          table: {
            widths: ['*', 'auto'],
            body: [[
              { text: `ACUMULADO EM ${anoReferencia}`, style: 'economiaLabel', fillColor: corAccent, margin: [16, 12, 0, 12] },
              { text: formatarMoeda(economiaAcumuladaAno), style: 'economiaValue', fillColor: corAccent, alignment: 'right', margin: [0, 12, 16, 12] }
            ]]
          },
          layout: 'noBorders'
        }
      ],
      margin: [0, 0, 0, 20]
    },

    sectionTitle('Resolução Final'),
    boxDestaque([
      { text: relatorio.parecer_tecnico || 'Nenhum parecer técnico cadastrado.', style: 'paragraph' }
    ], corAccent)
  );

  const nomeArquivo = `Relatorio_${cliente.nome_razao_social.replace(/[^a-z0-9]/gi, '_')}_${relatorio.mes_referencia.replace('/', '-')}.pdf`;
  pdfMake.createPdf(docDefinition).download(nomeArquivo);
};