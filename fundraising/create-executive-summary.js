/**
 * @fileoverview Executive Summary Generator
 *
 * Creates a concise executive summary document in .docx format for investor review.
 * Provides a high-level overview of the business, market opportunity, and financial projections.
 *
 * @module create-executive-summary
 * @requires docx
 * @requires fs
 *
 * @author Fundraising Templates
 * @version 2.0
 */

const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType,
        HeadingLevel, BorderStyle, WidthType, ShadingType, VerticalAlign, LevelFormat,
        ExternalHyperlink, PageBreak } = require('docx');

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
      document: { run: { font: "Arial", size: 22 } }
    },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal",
        run: { size: 32, bold: true, color: "000000", font: "Arial" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal",
        run: { size: 28, bold: true, color: "000000", font: "Arial" },
        paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal",
        run: { size: 24, bold: true, color: "000000", font: "Arial" },
        paragraph: { spacing: { before: 120, after: 80 }, outlineLevel: 2 } }
    ]
  },
  numbering: {
    config: [
      { reference: "bullet-list",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }
    ]
  },
  sections: [{
    properties: {
      page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
    },
    children: [
      // Title
      new Paragraph({
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Executive Summary", size: 40, bold: true })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: config.project.productName, size: 28, bold: true })]
      }),
      new Paragraph({ text: "" }),
      new Paragraph({
        children: [new TextRun({ text: "Company: ", bold: true }), new TextRun(config.project.companyName)]
      }),
      new Paragraph({
        children: [new TextRun({ text: "Project: ", bold: true }), new TextRun(config.project.name)]
      }),
      new Paragraph({
        children: [new TextRun({ text: "Date: ", bold: true }), new TextRun(config.project.date)]
      }),
      new Paragraph({
        children: [new TextRun({ text: "Confidential", bold: true, italics: true })]
      }),
      new Paragraph({ text: "" }),

      // The Opportunity
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("The Opportunity")]
      }),
      new Paragraph({
        children: [new TextRun({ text: `We're building ${config.project.productName}`, bold: true }),
                   new TextRun(` - ${config.project.tagline}`)]
      }),
      new Paragraph({ text: "" }),

      // The Problem
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("The Problem")]
      }),
      new Paragraph({
        children: [new TextRun(`${config.problem.marketSize} ${config.problem.targetMarket} struggle with:`)]
      }),
      new Paragraph({ text: "" }),
      ...config.problem.painPoints.map(painPoint =>
        new Paragraph({
          numbering: { reference: "bullet-list", level: 0 },
          children: [new TextRun({ text: `${painPoint.title}: `, bold: true }),
                     new TextRun(`${painPoint.description} - ${painPoint.impact}`)]
        })
      ),
      new Paragraph({ text: "" }),
      new Paragraph({
        children: [new TextRun({ text: "Result: ", bold: true }), new TextRun(config.problem.consequences)]
      }),
      new Paragraph({ text: "" }),

      // Our Solution
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Our Solution")]
      }),
      new Paragraph({
        children: [new TextRun({ text: `${config.solution.deliveryModel} with:`, bold: true })]
      }),
      new Paragraph({ text: "" }),
      ...config.solution.features.map((feature, index) => [
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun(`${index + 1}. ${feature.name}`)]
        }),
        new Paragraph({
          numbering: { reference: "bullet-list", level: 0 },
          children: [new TextRun(feature.description)]
        }),
        new Paragraph({
          numbering: { reference: "bullet-list", level: 0 },
          children: [new TextRun(feature.benefit)]
        }),
        new Paragraph({ text: "" })
      ]).flat(),

      // Market Opportunity - Table
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Market Opportunity")]
      }),
      new Paragraph({ text: "" }),

      new Table({
        columnWidths: [4680, 4680],
        margins: { top: 100, bottom: 100, left: 180, right: 180 },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({
                width: { size: 4680, type: WidthType.DXA },
                shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Metric", bold: true })] })]
              }),
              new TableCell({
                width: { size: 4680, type: WidthType.DXA },
                shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Value", bold: true })] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                width: { size: 4680, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "Total Addressable Market (TAM)", bold: true })] })]
              }),
              new TableCell({
                width: { size: 4680, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun(`${config.market.tam.size} ${config.market.tam.unit} × ${config.market.tam.arpu}/yr = `),
                                                       new TextRun({ text: config.market.tam.total, bold: true })] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                width: { size: 4680, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "Serviceable Available Market (SAM)", bold: true })] })]
              }),
              new TableCell({
                width: { size: 4680, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun(`${config.market.sam.size} ${config.market.sam.description} = `),
                                                       new TextRun({ text: config.market.sam.total, bold: true })] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                width: { size: 4680, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: "Serviceable Obtainable Market (SOM)", bold: true })] })]
              }),
              new TableCell({
                width: { size: 4680, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun(`${config.market.som.percentage} in 5 years = `),
                                                       new TextRun({ text: `${config.market.som.arr} ARR`, bold: true })] })]
              })
            ]
          })
        ]
      }),
      new Paragraph({ text: "" }),

      // Business Model
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Business Model")]
      }),
      new Paragraph({
        children: [new TextRun({ text: `${config.businessModel.model}:`, bold: true })]
      }),
      ...config.businessModel.pricingTiers.map(tier =>
        new Paragraph({
          numbering: { reference: "bullet-list", level: 0 },
          children: [new TextRun({ text: `${tier.name} (${tier.sizeMetric}): `, bold: true }),
                     new TextRun(`${tier.monthlyPrice}/month → ${tier.annualPrice}/year`)]
        })
      ),
      new Paragraph({ text: "" }),
      new Paragraph({
        children: [new TextRun({ text: "Customer Economics:", bold: true })]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Current cost: ", bold: true }), new TextRun(config.businessModel.customerSavings.currentCost)]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Our price: ", bold: true }), new TextRun(config.businessModel.customerSavings.yourPrice)]
      }),
      new Paragraph({
        numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun({ text: "Customer savings: ", bold: true }),
                   new TextRun(`${config.businessModel.customerSavings.savings} (${config.businessModel.customerSavings.percentage} cost reduction)`)]
      }),
      new Paragraph({ text: "" }),

      // Funding Ask
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Funding Ask")]
      }),
      new Paragraph({
        children: [new TextRun({ text: "Round: ", bold: true }), new TextRun(config.financials.fundingRounds[0].round)]
      }),
      new Paragraph({
        children: [new TextRun({ text: "Amount: ", bold: true }), new TextRun(config.financials.fundingRounds[0].amount)]
      }),
      new Paragraph({
        children: [new TextRun({ text: "Structure: ", bold: true }),
                   new TextRun(`${config.financials.fundingRounds[0].structure} with ${config.financials.fundingRounds[0].valuationCap} valuation cap, ${config.financials.fundingRounds[0].discount} discount`)]
      }),
      new Paragraph({ text: "" }),
      new Paragraph({
        children: [new TextRun({ text: "Milestones:", bold: true })]
      }),
      ...config.milestones.map(milestone => [
        new Paragraph({
          numbering: { reference: "bullet-list", level: 0 },
          children: [new TextRun({ text: `Month ${milestone.month}: ${milestone.title}`, bold: true })]
        }),
        ...milestone.outcomes.map(outcome =>
          new Paragraph({
            numbering: { reference: "bullet-list", level: 0 },
            children: [new TextRun(outcome)],
            indent: { left: 720 }
          })
        )
      ]).flat(),
      new Paragraph({ text: "" }),

      // Contact
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Contact")]
      }),
      new Paragraph({
        children: [new TextRun({ text: config.project.founderName, bold: true })]
      }),
      new Paragraph({
        children: [new TextRun(config.project.founderTitle)]
      }),
      new Paragraph({
        children: [new TextRun(`Email: ${config.project.founderEmail}`)]
      }),
      new Paragraph({
        children: [new TextRun(`Phone: ${config.project.founderPhone}`)]
      }),
      new Paragraph({ text: "" }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "This is a confidential document intended solely for potential investors.", italics: true, size: 20 })]
      }),
      new Paragraph({ text: "" }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `Last Updated: ${config.project.date}`, size: 20 })]
      })
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("01-EXECUTIVE-SUMMARY.docx", buffer);
  console.log("✅ Created: 01-EXECUTIVE-SUMMARY.docx");
  console.log("📄 Based on: fundraising-config.json");
});
