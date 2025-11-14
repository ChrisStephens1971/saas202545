# Fundraising Package
## Complete Investor Document Set

**Project:** saas202545
**Date Created:** 2025-11-14
**Status:** Template - customize for your project

---

## 📦 What's Included

This folder contains everything you need to pitch investors and close your first funding round.

### Core Documents (Start Here)

| # | Document | Purpose | When to Use |
|---|----------|---------|-------------|
| **01** | **Executive Summary** | 1-page overview of opportunity | Email to investors, quick pitch |
| **02** | **Pitch Deck** | 18-slide presentation (markdown) | Investor meetings, demo day |
| **03** | **Financial Projections** | 5-year model with unit economics | Detailed investor discussions |
| **04** | **SAFE Agreement Template** | Investment instrument explanation | Closing investment, legal docs |
| **05** | **Cap Table Template** | Track equity ownership | Managing investors, dilution |
| **06** | **Due Diligence Checklist** | What investors will ask for | Preparing for investor questions |
| **07** | **Investor FAQ** | Answers to common questions | Before/during/after meetings |

---

## 🚀 Quick Start Guide

### Step 1: Fill in fundraising-config.json (30 minutes)

**NEW: All document generators now read from `fundraising-config.json`!**

**Benefits:**
- ✅ Fill in your data once, generate all documents
- ✅ No need to edit multiple files
- ✅ Easy to update when things change
- ✅ JavaScript scripts auto-generate .docx files

**How to use:**

1. **Open** `fundraising-config.json` in this folder
2. **Replace** all `[bracketed placeholders]` with your actual data
3. **Note:** `{{PLACEHOLDERS}}` are auto-filled during project creation
4. **Save** the file
5. **Run** the JavaScript scripts (see Step 2) to generate .docx files

**What to fill in:**
- Project info (name, product name, tagline, founder details)
- Problem (target market, pain points, consequences)
- Solution (features, benefits, delivery model)
- Market size (TAM, SAM, SOM)
- Business model (pricing tiers, customer savings)
- Financials (5-year projections, funding ask, use of funds)
- Competition (competitors, your moat)
- Traction (current status, milestones)
- Exit strategy (acquirers, timeline)
- Team (founder bio, advisors, hiring plan)

**Example:**
```json
"productName": "CloudAuth",
"tagline": "Passwordless authentication for healthcare providers",
"targetMarket": "Healthcare clinics with 50+ staff"
```

---

### Step 2: Customize Your Documents (1-2 hours)

**Replace remaining placeholders in markdown templates:**

**Markdown template placeholders:**
- `[Your specific content]` - Manual fill-in for unique details
- *italicized examples* - Guidance for what to write

**Customize these sections:**

1. **Executive Summary (01):**
   - [ ] Add your name and contact info
   - [ ] Update founder background section
   - [ ] Customize team section (advisors if any)
   - [ ] Add any real traction (LOIs, pilot customers)

2. **Pitch Deck (02):**
   - [ ] Replace all placeholder content
   - [ ] Add founder background (Slide 13)
   - [ ] Insert product screenshots/mockups (Slide 5)
   - [ ] Update traction section with any progress (Slide 8)
   - [ ] Convert to PowerPoint or Google Slides

3. **Financial Projections (03):**
   - [ ] Transfer to Excel/Google Sheets
   - [ ] Adjust assumptions to match your business model
   - [ ] Add formulas for automatic calculations

---

### Step 2: Prepare Supporting Materials (2-3 hours)

- [ ] **Product Demo:** Record 3-minute video or prepare live demo
- [ ] **Founder Bio:** Update LinkedIn, prepare 1-page resume
- [ ] **Cap Table:** Set up in Excel or Carta (if not already)
- [ ] **Use of Funds:** Confirm budget makes sense for your plan
- [ ] **References:** Line up 2-3 people investors can call

---

### Step 3: Organize Your Data Room (1 hour)

**Create Google Drive folder:**

```
/Fundraising - {{PRODUCT_NAME}}
  /Core Documents
    - 01-Executive-Summary.pdf
    - 02-Pitch-Deck.pdf
    - 03-Financial-Projections.xlsx
  /Legal
    - Certificate-of-Incorporation.pdf
    - Cap-Table.xlsx
  /Product
    - Demo-Video.mp4
    - Product-Screenshots.pdf
  /Market
    - Customer-Discovery-Summary.pdf
    - Competitive-Analysis.pdf
```

**Share with:** View-only access, trackable link (DocSend if professional)

---

### Step 4: Start Investor Outreach (Ongoing)

**Week 1:**
- [ ] List 20-30 potential investors (angels, friends, family)
- [ ] Research each investor (background, investments, thesis)
- [ ] Draft personalized outreach emails

**Week 2:**
- [ ] Send emails (5-10 per day)
- [ ] Follow up with interested investors
- [ ] Schedule first meetings

**Week 3-4:**
- [ ] Conduct investor meetings
- [ ] Share pitch deck + executive summary
- [ ] Answer questions (use FAQ document)

**Week 5-6:**
- [ ] Negotiate terms (valuation cap, discount)
- [ ] Send SAFE agreements via Clerky ($799)
- [ ] Receive wire transfers
- [ ] Update cap table

**Target Timeline:** 4-8 weeks from first outreach to closed round

---

## 📄 Document Descriptions

### 01-Executive-Summary.md

**What:** 1-page overview of your company
**Length:** 2-3 pages (when printed)
**Use:** Email to investors before meeting
**Format:** Convert to PDF before sending

**Key Sections:**
- Problem & solution
- Market size (TAM, SAM, SOM)
- Business model (pricing tiers)
- Traction & validation
- Team
- Funding ask

**Tip:** This is what gets you the meeting. Make it compelling.

---

### 02-Pitch-Deck.md

**What:** 18-slide presentation (+ appendix slides)
**Length:** 18 main slides, 5 appendix
**Use:** Present during investor meetings
**Format:** Convert to PowerPoint, Google Slides, or Pitch.com

**Key Slides:**
- Problem (Slide 2-3)
- Solution (Slide 4-5)
- Market (Slide 6)
- Competition (Slide 9)
- Traction (Slide 8)
- Financials (Slide 12)
- Team (Slide 13)
- The Ask (Slide 14)

**Tip:** Practice your pitch 10+ times before first investor meeting. Aim for 10-12 minutes, leaving time for Q&A.

---

### 03-Financial-Projections.md

**What:** 5-year revenue, expense, and hiring model
**Length:** Multiple spreadsheet tabs
**Use:** Deep-dive investor discussions
**Format:** Transfer to Excel/Google Sheets with formulas

**Key Tables:**
- Revenue model (Year 0-5)
- Expense breakdown
- Unit economics (LTV, CAC, payback)
- Funding requirements
- Dilution analysis
- Exit scenarios

**Tip:** Be ready to defend assumptions. Investors will challenge your numbers.

---

### 04-SAFE-AGREEMENT-TEMPLATE.md

**What:** Explanation of SAFE notes + template
**Length:** Educational guide
**Use:** Understanding investment terms
**Format:** Reference document (don't send to investors)

**Key Concepts:**
- What is a SAFE?
- Valuation cap vs. discount
- How SAFEs convert
- When to use SAFE vs. priced equity

**Tip:** Use Clerky.com ($799) to issue actual SAFE documents. This is a reference guide only.

---

### 05-CAP-TABLE-TEMPLATE.md

**What:** Track equity ownership over time
**Length:** Multiple spreadsheet tabs
**Use:** Internal tracking, investor transparency
**Format:** Excel/Google Sheets or Carta

**Key Sections:**
- Equity ownership table
- Option pool tracking
- SAFEs & convertible notes
- Funding rounds history
- Dilution analysis

**Tip:** Update after every equity transaction. Keep it clean and organized.

---

### 06-DUE-DILIGENCE-CHECKLIST.md

**What:** What investors will ask for during due diligence
**Length:** Comprehensive checklist
**Use:** Preparation before investor meetings
**Format:** Checklist (don't send unless requested)

**Key Sections:**
- Legal documents (incorporation, IP)
- Financial information (projections, burn rate)
- Product & technology (demo, architecture)
- Market & customers (interviews, LOIs)
- Team & advisors

**Tip:** Have 80% of this ready before first investor meeting. You'll look prepared.

---

### 07-INVESTOR-FAQ.md

**What:** Answers to every question investors will ask
**Length:** 40+ Q&A pairs
**Use:** Preparation, reference during meetings
**Format:** Internal reference (don't send unless specific Q asked)

**Key Sections:**
- About the opportunity
- Competition
- Traction & validation
- Team & execution
- Fundraising
- Product & technology
- Market & growth
- Exit strategy

**Tip:** Read this before every investor meeting. Practice answers out loud.

---

## 🎯 Recommended Workflow

### For a Friends & Family Round ($25K-$100K)

**Use:**
- ✅ Executive Summary (email it)
- ✅ Pitch Deck (simplified, 10 slides)
- ✅ Financials (high-level only)
- ✅ SAFE Agreement (via Clerky)

**Skip:**
- ❌ Detailed due diligence (they trust you)
- ❌ Extensive FAQ prep (casual conversations)

**Timeline:** 1-2 weeks to close

---

### For Angel Investors ($100K-$500K)

**Use:**
- ✅ Executive Summary (email before meeting)
- ✅ Full Pitch Deck (18 slides)
- ✅ Detailed Financials (all tabs)
- ✅ Product Demo (video or live)
- ✅ FAQ (prepare answers)
- ✅ Due Diligence Checklist (have ready)

**Timeline:** 2-6 weeks to close

---

### For Seed VCs ($500K-$2M)

**Use:**
- ✅ All documents above
- ✅ Comprehensive due diligence
- ✅ Customer references
- ✅ Competitive analysis
- ✅ Technical architecture docs
- ✅ Legal review (they'll send to lawyers)

**Timeline:** 4-12 weeks to close

---

## 💰 Valuation Guidance

### Typical Valuations by Stage

**Pre-Seed (Pre-Revenue, MVP development):**
- **Conservative:** $1M - $1.5M valuation cap
- **Moderate:** $1.5M - $2.5M valuation cap
- **Aggressive:** $2.5M - $4M valuation cap

**Seed (Early Revenue, $50K-$500K ARR):**
- **Conservative:** $3M - $5M valuation cap
- **Moderate:** $5M - $8M valuation cap
- **Aggressive:** $8M - $12M valuation cap

**Series A ($1M+ ARR, proven product-market fit):**
- **Priced equity round:** $10M - $30M valuation
- Based on metrics: 10-20x ARR multiple

**Recommendation for Pre-Seed:**
- Start with **$2M valuation cap** on SAFE with 20% discount
- Fair for pre-revenue stage
- Leaves room for Series A at higher valuation
- Attractive terms for early-risk investors

---

## 📧 Sample Investor Email Template

**Subject:** Introduction - [Your Product Name] in [Your Market]

**Body:**

```
Hi [Investor Name],

[Mutual connection] suggested I reach out. I'm building [brief product description] that [key value proposition].

Quick context:
• Market: [TAM/SAM with numbers]
• Problem: [Core pain point]
• Solution: [Your approach in 1 sentence]
• Traction: [Key validation: interviews, pilots, customers, revenue]
• Ask: Raising [funding range] on a SAFE ([cap], [discount])

Attached is a 1-page executive summary. Happy to send the full deck and schedule a call if this is interesting to you.

Would you have 15 minutes this week to chat?

Best,
[Your Name]
[Your Title]
[Email]
[Phone]
[LinkedIn]
```

**Attachments:**
- 01-Executive-Summary.pdf (always attach)
- Do NOT attach pitch deck yet (send after they reply)

**Customization tips:**
- Use specific numbers (market size, traction metrics)
- Mention mutual connection if possible
- Keep under 150 words
- Clear call-to-action (request specific time)

---

## ✅ Pre-Meeting Checklist

**Day Before Meeting:**

- [ ] Review pitch deck (practice 2-3 times)
- [ ] Read Investor FAQ (refresh on common questions)
- [ ] Research investor (recent investments, thesis, background)
- [ ] Prepare 3-5 questions to ask them
- [ ] Test demo (if showing product)
- [ ] Confirm meeting time/location/Zoom link
- [ ] Send calendar invite with pitch deck attached

**Day of Meeting:**

- [ ] Dress appropriately (business casual)
- [ ] Bring printed handouts (if in-person)
- [ ] Laptop charged, demo loaded
- [ ] Have financial model ready on laptop
- [ ] Arrive 10 minutes early (or join Zoom 5 min early)
- [ ] Silence phone
- [ ] Bring enthusiasm and confidence!

---

## 🚨 Common Mistakes to Avoid

### Mistake 1: Sending Pitch Deck in First Email

**Wrong:** "Here's my 20-slide pitch deck attached"
**Right:** "Here's a 1-page summary. Happy to send full deck if interested"

**Why?** Investors get 100+ decks/week. They won't read yours unless you give them a reason.

---

### Mistake 2: Not Practicing Your Pitch

**Wrong:** Winging it, reading slides verbatim
**Right:** Practice 10+ times, tell a story, engage audience

**Why?** First impression matters. Confidence comes from preparation.

---

### Mistake 3: Overvaluing Your Company

**Wrong:** "$10M valuation for pre-revenue solo founder"
**Right:** "$2M cap SAFE, leaves room for Series A upside"

**Why?** Overvaluing scares away investors. Better to raise at fair terms quickly.

---

### Mistake 4: Not Being Ready for Due Diligence

**Wrong:** "Uh, I don't have that document. Let me get back to you in 2 weeks."
**Right:** "Yes, here's the link to our data room. All documents are there."

**Why?** Slow response = loss of momentum. Investors move on.

---

### Mistake 5: Talking Too Much About Product, Not Enough About Market

**Wrong:** "Let me show you every feature in detail for 30 minutes"
**Right:** "The market is $X billion. Here's the pain point. Here's our solution (2 min demo)."

**Why?** Investors care about market size > product features.

---

## 📚 Additional Resources

### Fundraising Guides
- Y Combinator Startup School: https://www.startupschool.org
- "Venture Deals" by Brad Feld (book)
- First Round Review: https://review.firstround.com

### Legal & Tools
- Clerky (SAFE agreements): https://www.clerky.com ($799)
- Carta (cap table): https://carta.com ($2K-$5K/year)
- DocSend (track pitch deck views): https://www.docsend.com

### Investor Databases
- AngelList: https://angellist.com
- Crunchbase: https://crunchbase.com
- Gust: https://gust.com

### Pitch Deck Tools
- Pitch.com: https://pitch.com (templates)
- Beautiful.ai: https://beautiful.ai (AI-powered)
- Google Slides: Free, collaborative

---

## 🎯 Next Steps

### Immediate (Next 24 Hours)
1. [ ] Read through all 7 documents
2. [ ] Replace ALL placeholders with your project details
3. [ ] Practice elevator pitch (30 seconds)

### This Week
1. [ ] Convert pitch deck to slides (PowerPoint or Google Slides)
2. [ ] Transfer financial model to Excel/Google Sheets
3. [ ] Create product demo video (3-5 minutes)
4. [ ] List 20 potential investors
5. [ ] Draft investor outreach emails

### This Month
1. [ ] Send 20-30 investor emails
2. [ ] Schedule 5-10 investor meetings
3. [ ] Present pitch, gather feedback
4. [ ] Negotiate terms with interested investors
5. [ ] Close first $25K-$100K

### Next 3 Months
1. [ ] Close full round ($100K-$500K)
2. [ ] Update cap table with all investors
3. [ ] Send first investor update email
4. [ ] Start building with the capital!

---

## 💡 Pro Tips

### Tip 1: Create Urgency
"Raising $400K on a rolling basis. First $200K at $2M cap, last $200K at $2.5M cap."
→ Investors move faster when they think they'll miss out

### Tip 2: Ask for Introductions
"Not a fit for you? No problem. Who else should I talk to?"
→ Turn "no" into warm introductions

### Tip 3: Update Investors Regularly
Monthly email updates (even to those who passed)
→ They may invest in your next round

### Tip 4: Take Every Meeting
Even if you don't think they'll invest
→ Practice makes perfect. You'll get better each time.

### Tip 5: Celebrate Small Wins
First $10K committed? Celebrate!
→ Fundraising is hard. Acknowledge progress.

---

## 📞 Questions?

If you need help with any of these documents:

1. **Legal/SAFE questions:** Consult a startup lawyer or use Clerky
2. **Financial modeling:** Hire a fractional CFO or use templates
3. **Pitch feedback:** Practice with other founders, accelerators, or advisors
4. **Investor intros:** Leverage your network, join founder communities

**Remember:** Fundraising is a skill. You'll get better with practice. Don't get discouraged by early "no"s.

---

## 🏆 Success Metrics

**You've succeeded when:**
- [ ] Closed target amount from 5-10 investors
- [ ] Terms are fair (reasonable valuation cap, 15-20% discount)
- [ ] Investors are value-add (not just money)
- [ ] Cap table is clean (no complicated terms)
- [ ] You can focus on building (not fundraising) for 12 months

**Typical conversion rates:**
- 100 emails → 10 meetings → 2-3 investors → 1 closes

**Don't give up after 5-10 rejections. Keep going.**

---

**Good luck with your fundraise!**

**Now go build something amazing. 🚀**

---

**Last Updated:** 2025-11-14
**Version:** 2.0 (Generic Template)
**Template System:** C:\devop\.template-system
