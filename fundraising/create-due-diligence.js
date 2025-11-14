/**
 * @fileoverview Due Diligence Checklist Generator
 *
 * Creates a comprehensive due diligence checklist document in .docx format.
 * Based on fundraising-config.json data.
 *
 * @module create-due-diligence
 * @requires docx
 * @requires fs
 *
 * @author Fundraising Templates
 * @version 2.0
 */

const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, LevelFormat } = require('docx');

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
        run: { size: 32, bold: true, color: "000000" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal",
        run: { size: 28, bold: true, color: "000000" },
        paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 1 } }
    ]
  },
  numbering: {
    config: [
      { reference: "bullet-list",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "☐", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }
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
        children: [new TextRun({ text: "Due Diligence Checklist", size: 40, bold: true })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "What Investors Will Ask For", size: 24 })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: config.project.productName, size: 20 })]
      }),
      new Paragraph({ text: "" }),

      new Paragraph({
        children: [new TextRun({ text: "Purpose: ", bold: true }), new TextRun("Be prepared for investor due diligence by having these documents ready")]
      }),
      new Paragraph({ text: "" }),

      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("What is Due Diligence?")]
      }),
      new Paragraph({
        children: [new TextRun({ text: "Due diligence", bold: true }), new TextRun(" is the process where investors verify your claims and assess risks before investing.")]
      }),
      new Paragraph({
        children: [new TextRun({ text: "Typical timeline:", bold: true })]
      }),
      new Paragraph({ children: [new TextRun("• Friends & Family: Minimal due diligence (1-2 days)")] }),
      new Paragraph({ children: [new TextRun("• Angels: Light due diligence (1-2 weeks)")] }),
      new Paragraph({ children: [new TextRun("• VCs: Thorough due diligence (2-8 weeks)")] }),
      new Paragraph({ text: "" }),

      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Due Diligence Checklist")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("1. Company Formation & Legal")]
      }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Certificate of Incorporation (Delaware C-Corp recommended)")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Bylaws (company governance rules)")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Stock Purchase Agreements (founder stock)")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Board Consents (approving key decisions)")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Cap Table (who owns what %)")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("83(b) Elections (founders filed with IRS within 30 days)")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("IP Assignment Agreements (founders assigned IP to company)")] }),
      new Paragraph({ text: "" }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("2. Intellectual Property")]
      }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Patents (if any filed or pending)")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Trademarks (company name, logo, product name)")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Domain names (list of all domains owned)")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Open source licenses (list all open source software used)")] }),
      new Paragraph({ text: "" }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("3. Financial Information")]
      }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Bank statements (last 6 months)")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Financial projections (5-year model)")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Unit economics (CAC, LTV, margins)")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Cap table (current ownership)")] }),
      new Paragraph({ text: "" }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("4. Product & Technology")]
      }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Product demo (live or video)")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Product roadmap (what you're building, when)")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Technical architecture (system diagram)")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Tech stack (languages, frameworks, infrastructure)")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Security & compliance (GDPR, SOC 2, data protection)")] }),
      new Paragraph({ text: "" }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("5. Market & Customers")]
      }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Market size (TAM, SAM, SOM calculations)")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Competitive analysis (who are competitors, how you differentiate)")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Customer discovery (# of interviews, key learnings)")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Pricing strategy (how you determined pricing)")] }),
      new Paragraph({ text: "" }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("6. Team & Advisors")]
      }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun(`Founder bio (${config.project.founderName})`)] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Team members (if any)")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Advisor agreements (if any advisors involved)")] }),
      new Paragraph({ text: "" }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("7. Fundraising History")]
      }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun(`Current ask: ${config.financials.fundingRounds[0].amount} ${config.financials.fundingRounds[0].structure}`)] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("SAFEs or convertible notes (from prior rounds)")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Use of funds (how you'll spend this raise)")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 },
        children: [new TextRun("Milestones (what you'll achieve with this capital)")] }),
      new Paragraph({ text: "" }),

      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Best Practices")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Before First Investor Meeting")]
      }),
      new Paragraph({ children: [new TextRun("1. Organize data room (even if no one's asked yet)")] }),
      new Paragraph({ children: [new TextRun("2. Update all documents (ensure dates, numbers are current)")] }),
      new Paragraph({ children: [new TextRun("3. Run self-audit (go through this checklist yourself)")] }),
      new Paragraph({ children: [new TextRun("4. Practice answers (to common diligence questions)")] }),
      new Paragraph({ text: "" }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("During Due Diligence")]
      }),
      new Paragraph({ children: [new TextRun("1. Respond quickly (within 24-48 hours)")] }),
      new Paragraph({ children: [new TextRun("2. Be transparent (disclose problems upfront, don't hide)")] }),
      new Paragraph({ children: [new TextRun("3. Stay organized (track all requests in spreadsheet)")] }),
      new Paragraph({ children: [new TextRun("4. Don't oversell (be realistic about risks and challenges)")] }),
      new Paragraph({ text: "" }),

      new Paragraph({ text: "" }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "REMEMBER: Investors expect gaps at pre-revenue stage. Be honest, organized, and responsive.", italics: true, bold: true, size: 24 })]
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
  fs.writeFileSync("06-DUE-DILIGENCE-CHECKLIST.docx", buffer);
  console.log("✅ Created: 06-DUE-DILIGENCE-CHECKLIST.docx");
  console.log("📄 Based on: fundraising-config.json");
});
