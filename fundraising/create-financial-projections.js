/**
 * @fileoverview Financial Projections Generator
 *
 * Creates detailed 5-year financial projections document in .docx format.
 * Based on fundraising-config.json data.
 *
 * @module create-financial-projections
 * @requires docx
 * @requires fs
 *
 * @author Fundraising Templates
 * @version 2.0
 */

const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType,
        HeadingLevel, WidthType, ShadingType } = require('docx');

// Load configuration
const configPath = path.join(__dirname, 'fundraising-config.json');
let config;

try {
  const configData = fs.readFileSync(configPath, 'utf8');
  config = JSON.parse(configData);
} catch (error) {
  console.error('ERROR: Could not read fundraising-config.json');
  console.error('Make sure fundraising-config.json exists and is valid JSON');
  process.exit(1);
}

const doc = new Document({
  styles: {
    default: {
      document: { run: { font: "Arial", size: 20 } }
    },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal",
        run: { size: 32, bold: true, color: "000000" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal",
        run: { size: 26, bold: true, color: "000000" },
        paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 1 } }
    ]
  },
  sections: [{
    properties: {
      page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
    },
    children: [
      new Paragraph({
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Financial Projections", size: 40, bold: true })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "5-Year Model", size: 28, bold: true })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: config.project.productName, size: 24 })]
      }),
      new Paragraph({ text: "" }),

      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Summary Table (5-Year Overview)")]
      }),
      new Paragraph({ text: "" }),

      new Table({
        columnWidths: [2400, 1200, 1200, 1200, 1200, 1200, 1200],
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({
                shading: { fill: "D5E8F0" },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Metric", bold: true })] })]
              }),
              new TableCell({ shading: { fill: "D5E8F0" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Y0", bold: true })] })] }),
              new TableCell({ shading: { fill: "D5E8F0" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Y1", bold: true })] })] }),
              new TableCell({ shading: { fill: "D5E8F0" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Y2", bold: true })] })] }),
              new TableCell({ shading: { fill: "D5E8F0" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Y3", bold: true })] })] }),
              new TableCell({ shading: { fill: "D5E8F0" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Y4", bold: true })] })] }),
              new TableCell({ shading: { fill: "D5E8F0" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Y5", bold: true })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "ARR", bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun(config.financials.projections.year0.arr)] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun(config.financials.projections.year1.arr)] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun(config.financials.projections.year2.arr)] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun(config.financials.projections.year3.arr)] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun(config.financials.projections.year4.arr)] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun(config.financials.projections.year5.arr)] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Customers", bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun(config.financials.projections.year0.customers)] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun(config.financials.projections.year1.customers)] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun(config.financials.projections.year2.customers)] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun(config.financials.projections.year3.customers)] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun(config.financials.projections.year4.customers)] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun(config.financials.projections.year5.customers)] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Headcount", bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun(config.financials.projections.year0.headcount)] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun(config.financials.projections.year1.headcount)] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun(config.financials.projections.year2.headcount)] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun(config.financials.projections.year3.headcount)] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun(config.financials.projections.year4.headcount)] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun(config.financials.projections.year5.headcount)] })] })
            ]
          })
        ]
      }),
      new Paragraph({ text: "" }),

      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Unit Economics")]
      }),
      new Paragraph({ text: "" }),

      new Table({
        columnWidths: [4000, 3000, 2360],
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({ shading: { fill: "D5E8F0" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Metric", bold: true })] })] }),
              new TableCell({ shading: { fill: "D5E8F0" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Value", bold: true })] })] }),
              new TableCell({ shading: { fill: "D5E8F0" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Notes", bold: true })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Average MRR per Customer", bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun(config.businessModel.unitEconomics.averageMRR)] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun("Blended across all tiers")] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "LTV (Lifetime Value)", bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: config.businessModel.unitEconomics.ltv, bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun(config.businessModel.unitEconomics.ltvCalculation)] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "CAC (Customer Acquisition Cost)", bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: config.businessModel.unitEconomics.cac, bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun(`Payback: ${config.businessModel.unitEconomics.cacPaybackMonths} months`)] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "LTV/CAC Ratio", bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: config.businessModel.unitEconomics.ltvCacRatio, bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun("Excellent (target > 3x)")] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Gross Margin", bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun(config.businessModel.unitEconomics.grossMargin)] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun("Standard SaaS")] })] })
            ]
          })
        ]
      }),
      new Paragraph({ text: "" }),

      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Funding Requirements")]
      }),
      new Paragraph({ text: "" }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun(`${config.financials.fundingRounds[0].round} Round (Current Ask)`)]
      }),
      new Paragraph({
        children: [new TextRun({ text: `Amount: ${config.financials.fundingRounds[0].amount}`, bold: true })]
      }),
      new Paragraph({
        children: [new TextRun({ text: `Runway: ${config.financials.useOfFunds.runway} months`, bold: true })]
      }),
      new Paragraph({ text: "" }),

      new Table({
        columnWidths: [5000, 2180, 2180],
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({ shading: { fill: "D5E8F0" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Category", bold: true })] })] }),
              new TableCell({ shading: { fill: "D5E8F0" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Amount", bold: true })] })] }),
              new TableCell({ shading: { fill: "D5E8F0" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "% of Total", bold: true })] })] })
            ]
          }),
          ...config.financials.useOfFunds.breakdown.map(item =>
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun(`${item.category} (${item.description})`)] })] }),
                new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun(item.amount)] })] }),
                new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun(item.percentage)] })] })
              ]
            })
          ),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Total", bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: config.financials.useOfFunds.total, bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "100%", bold: true })] })] })
            ]
          })
        ]
      }),
      new Paragraph({ text: "" }),

      new Paragraph({ text: "" }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `Last Updated: ${config.project.date}`, size: 20 })]
      })
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("03-FINANCIAL-PROJECTIONS.docx", buffer);
  console.log("✅ Created: 03-FINANCIAL-PROJECTIONS.docx");
  console.log("📄 Based on: fundraising-config.json");
});
