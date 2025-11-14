# Cap Table Template
## Capitalization Table for Tracking Equity Ownership

**Project:** saas202545
**Date:** 2025-11-14

**Instructions:** Use this template in Excel/Google Sheets or transfer to Carta/Pulley for professional cap table management.

---

## What is a Cap Table?

A **Capitalization Table (Cap Table)** tracks who owns what percentage of your company.

**Tracks:**
- Founders
- Employees (with stock options)
- Investors (angels, VCs)
- Advisors
- SAFEs / convertible notes (before conversion)

**Why it matters:**
- Know who owns what % at any time
- Calculate dilution from new investments
- Required for fundraising (investors want to see it)
- Legal requirement for issuing equity

---

## Simple Cap Table Template

### Current State (Pre-Investment)

| Shareholder | Share Class | Shares Owned | % Ownership | Value (if valued) |
|-------------|-------------|--------------|-------------|-------------------|
| [Founder Name] | Common Stock | 10,000,000 | 100.00% | $0 (pre-revenue) |
| **Total Outstanding** | | **10,000,000** | **100.00%** | |

**Notes:**
- Single founder holds all shares
- No investors yet
- No employee options issued yet

---

### After $[Amount] SAFE at $[Cap] (Unconverted)

**SAFEs don't convert until priced round, so cap table shows them separately:**

####Outstanding Equity

| Shareholder | Share Class | Shares Owned | % Ownership |
|-------------|-------------|--------------|-------------|
| [Founder Name] | Common Stock | 10,000,000 | 100.00% |
| **Total Outstanding** | | **10,000,000** | **100.00%** |

#### SAFEs (Unconverted)

| Investor | Investment | Valuation Cap | Discount | Date | Status |
|----------|------------|---------------|----------|------|--------|
| [Investor Name] | $[amount] | $[cap] | [X]% | 2025-11-14 | Unconverted |

**Estimated Post-Conversion Ownership (at Series A @ $[Next Round Valuation]):**

| Shareholder | Estimated % | Notes |
|-------------|-------------|-------|
| Founder | ~[X]% | Depends on Series A terms |
| SAFE Investor | ~[X]% | Converts at $[cap] cap |
| Series A Investor | ~[X]% | Assuming $[amount] raise |

---

### After Series A ($[Amount] at $[Pre-Money])

**SAFEs convert, Series A closes:**

| Shareholder | Share Class | Shares Owned | % Ownership | Investment | Value @ $[Post-Money] |
|-------------|-------------|--------------|-------------|------------|-----------------------|
| Founder | Common | 10,000,000 | [X]% | $0 | $[amount] |
| SAFE Investor | Series A Preferred | [#] | [X]% | $[amount] | $[amount] |
| Series A Lead | Series A Preferred | [#] | [X]% | $[amount] | $[amount] |
| **Total** | | **[total shares]** | **100.00%** | **$[total raised]** | **$[post-money]** |

**Dilution:**
- Founder dilution: 100% → [X]% ([X]% given up)
- Total capital raised: $[amount]
- Post-money valuation: $[amount]

---

## Detailed Cap Table Template (Copy to Excel)

### Sheet 1: Equity Ownership

| Name | Investor Type | Share Class | Shares Owned | % Fully Diluted | Investment | Value | Date Invested |
|------|---------------|-------------|--------------|-----------------|------------|-------|---------------|
| [Founder] | Founder | Common | 10,000,000 | [X]% | $0 | $[amount] | [Date] |
| [SAFE Investor 1] | Angel | Series A Preferred | [#] | [X]% | $[amount] | $[amount] | [Date] |
| [Series A Lead] | VC | Series A Preferred | [#] | [X]% | $[amount] | $[amount] | [Date] |
| **Total** | | | **[total]** | **100.00%** | **$[total]** | **$[valuation]** | |

---

### Sheet 2: Option Pool

| Name | Role | Options Granted | Strike Price | Vesting Schedule | Grant Date | Vested | Exercised |
|------|------|-----------------|--------------|------------------|------------|--------|-----------|
| [Employee 1] | [Role] | [#] | $[price] | 4yr/1yr cliff | [Date] | [#] | [#] |
| [Employee 2] | [Role] | [#] | $[price] | 4yr/1yr cliff | [Date] | [#] | [#] |
| **Total Pool** | | **[# reserved]** | | | | **[# vested]** | **[# exercised]** |

**Option Pool:** [X]% of fully diluted shares reserved for employees

---

### Sheet 3: SAFEs & Convertible Notes

| Investor | Type | Amount | Valuation Cap | Discount | Interest | Date | Status |
|----------|------|--------|---------------|----------|----------|------|--------|
| [Investor 1] | SAFE | $[amount] | $[cap] | [X]% | - | [Date] | Unconverted |
| [Investor 2] | Convertible Note | $[amount] | $[cap] | [X]% | [X]% | [Date] | Unconverted |
| **Total** | | **$[total]** | | | | | |

---

### Sheet 4: Funding Rounds History

| Round | Date | Amount Raised | Pre-Money Valuation | Post-Money Valuation | Lead Investor | Dilution |
|-------|------|---------------|---------------------|----------------------|---------------|----------|
| Pre-Seed (SAFE) | [Date] | $[amount] | - | - | [Investor] | TBD |
| Seed | [Date] | $[amount] | $[amount] | $[amount] | [Investor] | [X]% |
| Series A | [Date] | $[amount] | $[amount] | $[amount] | [Investor] | [X]% |

---

### Sheet 5: Dilution Analysis

| Event | Founder % Before | Founder % After | Dilution | Total Raised | Valuation |
|-------|------------------|-----------------|----------|--------------|-----------|
| Incorporation | 100.00% | 100.00% | 0% | $0 | $0 |
| Option Pool (10%) | 100.00% | 90.00% | 10% | $0 | $0 |
| Pre-Seed SAFE | 90.00% | 90.00% | 0% (not converted) | $[amount] | - |
| Seed Round | 90.00% | [X]% | [X]% | $[total] | $[amount] |
| Series A | [X]% | [X]% | [X]% | $[total] | $[amount] |

---

## Cap Table Best Practices

### Do's ✅

1. **Update immediately** after every equity transaction
2. **Keep it simple** in early stages (Excel is fine until Series A)
3. **Use professional tools** (Carta, Pulley) when you have 10+ shareholders
4. **Share with investors** - transparency builds trust
5. **Include option pool** in fully diluted calculations
6. **Model dilution** before raising new rounds
7. **Get 83(b) elections** filed for all founders (within 30 days)

### Don'ts ❌

1. **Don't let it get messy** - outdated cap tables kill deals
2. **Don't forget advisors** - track their equity too
3. **Don't ignore vesting** - unvested shares shouldn't count as fully owned
4. **Don't miscalculate dilution** - use fully diluted share count
5. **Don't delay updates** - update within 1 week of any transaction
6. **Don't lose track of SAFEs** - they convert eventually
7. **Don't forget liquidation preferences** - track these carefully

---

## Key Terms to Track

### Share Classes
- **Common Stock:** Founders, employees (via options)
- **Preferred Stock:** Investors (Series A, B, C, etc.)
- **Options:** Employee equity (not yet exercised)

### Vesting
- **Standard:** 4-year vest, 1-year cliff
- **Cliff:** No shares vest until 1 year
- **Acceleration:** Vesting speeds up (e.g., on acquisition)

### Dilution
- **Pre-Money Valuation:** Company value before investment
- **Post-Money Valuation:** Company value after investment
- **Fully Diluted:** Includes all options, SAFEs, convertible notes

### Liquidation Preferences
- **1x:** Investors get investment back first, then participate in remaining
- **Participating:** Investors get preference + pro-rata share
- **Non-Participating:** Investors choose preference OR pro-rata share

---

## Example Scenarios

### Scenario 1: Solo Founder, No Investors
```
Founder: 10,000,000 shares (100%)
Option Pool: 0 shares (0%)
Investors: 0 shares (0%)
Total: 10,000,000 shares
```

### Scenario 2: Founder + 10% Option Pool
```
Founder: 9,000,000 shares (90%)
Option Pool: 1,000,000 shares (10% reserved)
Investors: 0 shares (0%)
Total: 10,000,000 shares fully diluted
```

### Scenario 3: After $500K Seed at $5M Pre
```
Founder: 9,000,000 shares (81.8%)
Option Pool: 1,000,000 shares (9.1%)
Seed Investors: 1,000,000 shares (9.1%)
Total: 11,000,000 shares
Post-Money Valuation: $5.5M
```

---

## When to Use Professional Cap Table Tools

**Use Excel/Google Sheets when:**
- Pre-revenue, just founders
- 1-5 shareholders total
- No SAFEs or convertible notes yet
- Simple common stock only

**Switch to Carta/Pulley when:**
- 10+ shareholders
- Multiple SAFEs or notes outstanding
- Series A or later
- Need 409A valuations
- Issuing employee options at scale
- International investors or employees

**Cost:**
- Carta: $2K-$5K/year
- Pulley: $1K-$3K/year
- Shoobx: $3K-$6K/year

---

## Resources

**Cap Table Tools:**
- Carta: https://carta.com (most popular)
- Pulley: https://pulley.com (startup-friendly)
- Shoobx: https://shoobx.com (includes legal docs)

**Learning:**
- Y Combinator: https://www.ycombinator.com/library (cap table basics)
- Venture Deals (book by Brad Feld)

**Legal:**
- Clerky: https://www.clerky.com (issue stock, SAFEs)
- Cooley GO: https://www.cooleygo.com (free legal docs)

---

## 📝 How to Use This Template

1. **Copy to Excel/Google Sheets**
2. **Replace [placeholders]** with actual shareholder info
3. **Add formulas** for automatic % calculations
4. **Update after every transaction** (stock grants, investments, exercises)
5. **Model future rounds** to understand dilution
6. **Share with investors** when fundraising
7. **Migrate to Carta/Pulley** at Series A

**Last Updated:** 2025-11-14
**Version:** 2.0 (Generic Template)
