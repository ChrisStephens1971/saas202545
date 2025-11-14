/**
 * @fileoverview Investor FAQ Generator
 *
 * Creates a comprehensive investor FAQ document in .docx format.
 * Based on fundraising-config.json data.
 *
 * @module create-investor-faq
 * @requires docx
 * @requires fs
 *
 * @author Fundraising Templates
 * @version 2.0
 */

const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } = require('docx');

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
        paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 1 } }
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
        children: [new TextRun({ text: "Investor FAQ", size: 40, bold: true })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Frequently Asked Questions from Investors", size: 24 })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `${config.project.productName} (${config.project.name})`, size: 20 })]
      }),
      new Paragraph({ text: "" }),

      // About the Opportunity
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("About the Opportunity")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Q: What problem are you solving?")]
      }),
      new Paragraph({
        children: [new TextRun({ text: "A: ", bold: true }),
                   new TextRun(`${config.problem.marketSize} ${config.problem.targetMarket} struggle with ${config.problem.painPoints.map(p => p.title.toLowerCase()).join(', ')}. `),
                   new TextRun(`${config.project.tagline}`)]
      }),
      new Paragraph({ text: "" }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Q: How big is the market?")]
      }),
      new Paragraph({
        children: [new TextRun({ text: "A:", bold: true })]
      }),
      new Paragraph({
        children: [new TextRun({ text: "• TAM: ", bold: true }), new TextRun(`${config.market.tam.total}`)]
      }),
      new Paragraph({
        children: [new TextRun({ text: "• SAM: ", bold: true }), new TextRun(`${config.market.sam.total}`)]
      }),
      new Paragraph({
        children: [new TextRun({ text: "• SOM: ", bold: true }), new TextRun(`${config.market.som.arr} ARR in 5 years (${config.market.som.percentage})`)]
      }),
      new Paragraph({ text: "" }),

      // Competition
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Competition")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Q: Who are your competitors?")]
      }),
      new Paragraph({
        children: [new TextRun({ text: "A: ", bold: true })]
      }),
      ...config.competition.competitors.map((competitor, index) =>
        new Paragraph({
          children: [new TextRun({ text: `${index + 1}. ${competitor.name}: `, bold: true }),
                     new TextRun(`${competitor.weakness} → We have ${competitor.yourAdvantage}`)]
        })
      ),
      new Paragraph({ text: "" }),
      new Paragraph({
        children: [new TextRun({ text: "Our Moat:", bold: true })]
      }),
      ...config.competition.moat.map(moatItem =>
        new Paragraph({ children: [new TextRun(`• ${moatItem}`)] })
      ),
      new Paragraph({ text: "" }),

      // Traction & Validation
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Traction & Validation")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Q: What is your current status?")]
      }),
      new Paragraph({
        children: [new TextRun({ text: "A: ", bold: true }), new TextRun(config.traction.stage)]
      }),
      new Paragraph({
        children: [new TextRun({ text: "Completed:", bold: true })]
      }),
      ...config.traction.completed.map(item =>
        new Paragraph({ children: [new TextRun(`• ${item}`)] })
      ),
      new Paragraph({
        children: [new TextRun({ text: "In Progress:", bold: true })]
      }),
      ...config.traction.inProgress.map(item =>
        new Paragraph({ children: [new TextRun(`• ${item}`)] })
      ),
      new Paragraph({
        children: [new TextRun({ text: "Next 6 Months:", bold: true })]
      }),
      ...config.traction.next6Months.map(item =>
        new Paragraph({ children: [new TextRun(`• ${item}`)] })
      ),
      new Paragraph({ text: "" }),

      // Fundraising
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Fundraising")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Q: How much are you raising?")]
      }),
      new Paragraph({
        children: [new TextRun({ text: "A: ", bold: true }), new TextRun({ text: config.financials.fundingRounds[0].amount, bold: true }),
                   new TextRun(" on a "), new TextRun({ text: config.financials.fundingRounds[0].structure, bold: true }),
                   new TextRun(" with "), new TextRun({ text: config.financials.fundingRounds[0].valuationCap, bold: true }),
                   new TextRun(" valuation cap and "), new TextRun({ text: config.financials.fundingRounds[0].discount, bold: true }), new TextRun(" discount.")]
      }),
      new Paragraph({
        children: [new TextRun({ text: `Use of funds (${config.financials.useOfFunds.runway}-month runway):`, bold: true })]
      }),
      ...config.financials.useOfFunds.breakdown.map(item =>
        new Paragraph({ children: [new TextRun(`• ${item.category}: ${item.amount}`)] })
      ),
      new Paragraph({ text: "" }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Q: What will you achieve with this capital?")]
      }),
      new Paragraph({
        children: [new TextRun({ text: "A: ", bold: true }), new TextRun({ text: "Milestones:", bold: true })]
      }),
      ...config.milestones.map(milestone =>
        new Paragraph({ children: [new TextRun(`✓ Month ${milestone.month}: ${milestone.title} - ${milestone.outcomes.join(', ')}`)] })
      ),
      new Paragraph({ text: "" }),

      // Team
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Team")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Q: Why are you the right person to build this?")]
      }),
      new Paragraph({
        children: [new TextRun({ text: "A: ", bold: true }), new TextRun(`${config.team.founder.background}. ${config.team.founder.whyQualified}`)]
      }),
      new Paragraph({
        children: [new TextRun({ text: "Key accomplishments:", bold: true })]
      }),
      ...config.team.founder.keyAccomplishments.map(item =>
        new Paragraph({ children: [new TextRun(`• ${item}`)] })
      ),
      new Paragraph({ text: "" }),

      // Exit Strategy
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Exit Strategy")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Q: What's your exit plan?")]
      }),
      new Paragraph({
        children: [new TextRun({ text: "A: ", bold: true }), new TextRun({ text: `${config.exitStrategy.type} in ${config.exitStrategy.timeline}`, bold: true }),
                   new TextRun(` at ${config.exitStrategy.targetValuation} valuation.`)]
      }),
      new Paragraph({
        children: [new TextRun({ text: "Target acquirers:", bold: true })]
      }),
      ...config.exitStrategy.targetAcquirers.map((acquirer, index) =>
        new Paragraph({ children: [new TextRun(`${index + 1}. ${acquirer.name} (${acquirer.marketCap}) - ${acquirer.rationale}`)] })
      ),
      new Paragraph({
        children: [new TextRun({ text: "Comparable exits:", bold: true })]
      }),
      ...config.exitStrategy.comparableExits.map(exit =>
        new Paragraph({ children: [new TextRun(`• ${exit.company} - ${exit.amount} (${exit.year})`)] })
      ),
      new Paragraph({ text: "" }),

      // Closing
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Why Invest?")]
      }),

      new Paragraph({
        children: [new TextRun({ text: "Five key reasons:", bold: true })]
      }),
      new Paragraph({ children: [new TextRun(`1. Large market: ${config.market.sam.total} addressable`)] }),
      new Paragraph({ children: [new TextRun(`2. Customer savings: ${config.businessModel.customerSavings.percentage} cost reduction`)] }),
      new Paragraph({ children: [new TextRun(`3. Strong unit economics: ${config.businessModel.unitEconomics.ltvCacRatio} LTV/CAC ratio`)] }),
      new Paragraph({ children: [new TextRun(`4. Defensible moat: ${config.competition.moat[0]}`)] }),
      new Paragraph({ children: [new TextRun(`5. Clear exit path: ${config.exitStrategy.targetValuation} in ${config.exitStrategy.timeline}`)] }),
      new Paragraph({ text: "" }),

      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Ready to invest? Let's schedule a follow-up call.", size: 24, bold: true })]
      }),
      new Paragraph({ text: "" }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `${config.project.founderName} | ${config.project.founderEmail}`, size: 22 })]
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
  fs.writeFileSync("07-INVESTOR-FAQ.docx", buffer);
  console.log("✅ Created: 07-INVESTOR-FAQ.docx");
  console.log("📄 Based on: fundraising-config.json");
});
