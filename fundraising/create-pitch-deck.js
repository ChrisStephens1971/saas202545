/**
 * @fileoverview Pitch Deck Generator
 *
 * Creates a professional investor pitch deck in .docx format for SaaS fundraising.
 * Generates a complete pitch deck with problem, solution, market, traction, team,
 * financials, and ask sections based on fundraising-config.json.
 *
 * @module create-pitch-deck
 * @requires docx
 * @requires fs
 *
 * @author Fundraising Templates
 * @version 2.0
 */

const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, PageBreak, AlignmentType, HeadingLevel, LevelFormat } = require('docx');

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
        run: { size: 36, bold: true, color: "000000" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal",
        run: { size: 28, bold: true, color: "000000" },
        paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 1 } }
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
      // Slide 1: Cover
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 2000 },
        children: [new TextRun({ text: config.project.companyName, size: 48, bold: true })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 },
        children: [new TextRun({ text: config.project.productName, size: 36, bold: true })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 800 },
        children: [new TextRun({ text: config.project.tagline, size: 28 })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 1200 },
        children: [new TextRun({ text: `${config.project.founderName}, ${config.project.founderTitle}`, size: 24 })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: config.project.founderEmail, size: 24 })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 },
        children: [new TextRun({ text: "CONFIDENTIAL", size: 24, bold: true, italics: true })]
      }),

      // Slide 2: The Problem
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        children: [new TextRun("The Problem")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.CENTER,
        children: [new TextRun(`${config.problem.targetMarket} Face Challenges`)]
      }),
      new Paragraph({ text: "", spacing: { before: 400 } }),
      new Paragraph({
        children: [new TextRun({ text: `${config.problem.marketSize} face:`, bold: true, size: 24 })]
      }),
      ...config.problem.painPoints.map(painPoint =>
        new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
          children: [new TextRun({ text: `${painPoint.title} - `, bold: true }), new TextRun(painPoint.description)] })
      ),
      new Paragraph({ text: "", spacing: { before: 400 } }),
      new Paragraph({
        children: [new TextRun({ text: "Result: ", bold: true }), new TextRun(config.problem.consequences)]
      }),

      // Slide 3: The Solution
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        children: [new TextRun("The Solution")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.CENTER,
        children: [new TextRun(config.solution.deliveryModel)]
      }),
      new Paragraph({ text: "", spacing: { before: 400 } }),
      ...config.solution.features.map((feature, index) => [
        new Paragraph({
          children: [new TextRun({ text: `${index + 1}. ${feature.name}`, bold: true, size: 26 })]
        }),
        new Paragraph({ children: [new TextRun(`• ${feature.description}`)] }),
        new Paragraph({ children: [new TextRun(`• ${feature.benefit}`)] }),
        new Paragraph({ text: "" })
      ]).flat(),

      // Slide 4: Market Opportunity
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        children: [new TextRun("Market Opportunity")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.CENTER,
        children: [new TextRun(`${config.market.tam.total} Total Addressable Market`)]
      }),
      new Paragraph({ text: "", spacing: { before: 600 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `TAM: ${config.market.tam.size} ${config.market.tam.unit} × ${config.market.tam.arpu}/yr = ${config.market.tam.total}`, size: 28, bold: true })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200 },
        children: [new TextRun({ text: `SAM: ${config.market.sam.size} (${config.market.sam.description}) = ${config.market.sam.total}`, size: 28, bold: true })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200 },
        children: [new TextRun({ text: `SOM: ${config.market.som.percentage} in 5 years = ${config.market.som.arr} ARR`, size: 28, bold: true })]
      }),

      // Slide 5: Business Model
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        children: [new TextRun("Business Model")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.CENTER,
        children: [new TextRun(config.businessModel.model)]
      }),
      new Paragraph({ text: "", spacing: { before: 400 } }),
      new Paragraph({
        children: [new TextRun({ text: "Pricing Tiers:", bold: true, size: 26 })]
      }),
      ...config.businessModel.pricingTiers.map(tier =>
        new Paragraph({ children: [new TextRun({ text: `• ${tier.name} (${tier.sizeMetric}): `, bold: true }),
                                     new TextRun(`${tier.monthlyPrice}/mo → ${tier.annualPrice}/year`)] })
      ),
      new Paragraph({ text: "", spacing: { before: 400 } }),
      new Paragraph({
        children: [new TextRun({ text: "Customer Savings:", bold: true, size: 26 })]
      }),
      new Paragraph({ children: [new TextRun(`• Current cost: ${config.businessModel.customerSavings.currentCost}`)] }),
      new Paragraph({ children: [new TextRun(`• Our price: ${config.businessModel.customerSavings.yourPrice}`)] }),
      new Paragraph({ children: [new TextRun({ text: `• Savings: ${config.businessModel.customerSavings.savings} (${config.businessModel.customerSavings.percentage})`, bold: true })] }),

      // Slide 6: Financial Projections
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        children: [new TextRun("Financial Projections (5-Year)")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.CENTER,
        children: [new TextRun(`Path to ${config.financials.projections.year5.arr} ARR by Year 5`)]
      }),
      new Paragraph({ text: "", spacing: { before: 600 } }),
      new Paragraph({
        children: [new TextRun({ text: "Year 1: ", bold: true }), new TextRun(`${config.financials.projections.year1.arr} ARR, ${config.financials.projections.year1.customers} customers`)]
      }),
      new Paragraph({
        children: [new TextRun({ text: "Year 2: ", bold: true }), new TextRun(`${config.financials.projections.year2.arr} ARR, ${config.financials.projections.year2.customers} customers (${config.financials.projections.year2.growth} growth)`)]
      }),
      new Paragraph({
        children: [new TextRun({ text: "Year 3: ", bold: true }), new TextRun(`${config.financials.projections.year3.arr} ARR, ${config.financials.projections.year3.customers} customers (${config.financials.projections.year3.growth} growth)`)]
      }),
      new Paragraph({
        children: [new TextRun({ text: "Year 4: ", bold: true }), new TextRun(`${config.financials.projections.year4.arr} ARR, ${config.financials.projections.year4.customers} customers (${config.financials.projections.year4.growth} growth)`)]
      }),
      new Paragraph({
        children: [new TextRun({ text: "Year 5: ", bold: true }), new TextRun(`${config.financials.projections.year5.arr} ARR, ${config.financials.projections.year5.customers} customers (Profitable!)`)]
      }),

      // Slide 7: Competition
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        children: [new TextRun("Competition & Differentiation")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.CENTER,
        children: [new TextRun("We Win Through Specialization")]
      }),
      new Paragraph({ text: "", spacing: { before: 400 } }),
      ...config.competition.competitors.map(competitor =>
        new Paragraph({
          children: [new TextRun({ text: `${competitor.name}: `, bold: true }),
                     new TextRun(`${competitor.weakness} → ${competitor.yourAdvantage}`)]
        })
      ),
      new Paragraph({ text: "", spacing: { before: 400 } }),
      new Paragraph({
        children: [new TextRun({ text: "Our Moat:", bold: true, size: 26 })]
      }),
      ...config.competition.moat.map(moatItem =>
        new Paragraph({ children: [new TextRun(`✓ ${moatItem}`)] })
      ),

      // Slide 8: The Ask
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        children: [new TextRun("The Ask")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.CENTER,
        children: [new TextRun(`Raising ${config.financials.fundingRounds[0].amount}`)]
      }),
      new Paragraph({ text: "", spacing: { before: 600 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `Round: ${config.financials.fundingRounds[0].round}`, size: 26, bold: true })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200 },
        children: [new TextRun({ text: `Amount: ${config.financials.fundingRounds[0].amount}`, size: 26, bold: true })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200 },
        children: [new TextRun({ text: `Structure: ${config.financials.fundingRounds[0].structure}`, size: 26, bold: true })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `${config.financials.fundingRounds[0].valuationCap} valuation cap, ${config.financials.fundingRounds[0].discount} discount`, size: 26, bold: true })]
      }),
      new Paragraph({ text: "", spacing: { before: 600 } }),
      new Paragraph({
        children: [new TextRun({ text: `Use of Funds (${config.financials.useOfFunds.runway}-Month Runway):`, bold: true, size: 24 })]
      }),
      ...config.financials.useOfFunds.breakdown.map(item =>
        new Paragraph({ children: [new TextRun(`• ${item.category}: ${item.amount} (${item.description})`)] })
      ),

      // Slide 9: Exit Strategy
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        children: [new TextRun("Exit Strategy")]
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.CENTER,
        children: [new TextRun(`Clear Path to ${config.exitStrategy.type}`)]
      }),
      new Paragraph({ text: "", spacing: { before: 600 } }),
      new Paragraph({
        children: [new TextRun({ text: "Target Acquirers:", bold: true, size: 26 })]
      }),
      ...config.exitStrategy.targetAcquirers.map((acquirer, index) =>
        new Paragraph({ children: [new TextRun(`${index + 1}. ${acquirer.name} (${acquirer.marketCap}) - ${acquirer.rationale}`)] })
      ),
      new Paragraph({ text: "", spacing: { before: 400 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `Target Exit: ${config.exitStrategy.targetValuation} in ${config.exitStrategy.timeline}`, bold: true, size: 30 })]
      }),

      // Final Slide: Closing
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 1000 },
        children: [new TextRun({ text: `Let's Build the Future Together`, size: 40, bold: true })]
      }),
      new Paragraph({ text: "", spacing: { before: 800 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `${config.project.founderName}, ${config.project.founderTitle}`, size: 26, bold: true })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: config.project.founderEmail, size: 24 })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: config.project.founderPhone, size: 24 })]
      }),
      new Paragraph({ text: "", spacing: { before: 600 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Thank you for your time and consideration.", size: 26, italics: true })]
      })
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("02-PITCH-DECK.docx", buffer);
  console.log("✅ Created: 02-PITCH-DECK.docx");
  console.log("📄 Based on: fundraising-config.json");
});
