---
name: canadian-financial-audit
description: Use when analyzing a Canadian resident's financial profile to identify overlooked government benefits, non-government claims, debt relief strategies, and optimization loopholes. Triggered by Zara during personal coaching sessions or when a user asks "what money am I missing?".
---

# Canadian Financial Audit

## Overview

Scans a Canadian resident's personal financial profile and surfaces every overlooked source of money — government benefits, non-government claims, debt relief strategies, and optimization loopholes. The agent feeds the profile into a structured catalog, cross-references eligibility, and produces a prioritized action plan with dollar estimates.

**Core principle:** The right questions don't change — only the answers do. Every profile gets the same audit protocol.

## When to Use

- Personal coaching sessions (Zara) when finances are discussed
- User asks "what money am I missing?" or "what can I claim?"
- Profile has been updated and a re-audit is needed
- Debt strategy evaluation is requested

**When NOT to use:** For tax filing advice (recommend a CPA), legal advice (recommend a lawyer), or immigration advice (recommend a consultant). This skill identifies what's out there — it doesn't prepare filings or applications.

## Audit Protocol

For each profile field, the agent runs the following checklist against the entire Program Catalog. Do not skip any catalog entry — check every row against every profile field.

### Input: The Profile

The agent reads from a structured profile containing:

| Field | What to Check |
|-------|--------------|
| **Income** | Net monthly/bi-weekly take-home. Determines eligibility thresholds for income-tested programs. |
| **Expenses** | Rent, groceries, utilities, transportation, subscriptions, insurance. Identifies spending leaks. |
| **Family** | Marital status, children (ages). Determines family-based benefits (CCB, dental, child care). |
| **Debt** | Credit cards (balances + APRs), lines of credit, car financing. Determines debt strategy options. |
| **Housing** | Rent vs own, monthly cost. Determines property tax credits, housing programs. |
| **Location** | Province, city. Determines which provincial programs apply. |
| **Immigration Status** | PR, work permit, citizenship, expiry dates. Determines which programs have residency requirements. |
| **Insurance** | Auto, health, life, disability. Identifies coverage gaps and bundling opportunities. |
| **Employer Benefits** | HSA, RRSP match, wellness credits, tuition reimbursement. Many employees don't use these. |
| **Tax Filing Status** | Years filed, years unfiled, estimated returns. Identifies immediate cash opportunities. |
| **Health** | Medical conditions, prescriptions. Identifies medical expense tax credit, disability programs. |
| **Spending Habits** | Subscriptions, phone plans, gym memberships. Identifies cancellations and optimizations. |

### Process

For each catalog entry:

1. **Does the person qualify?** Check income thresholds, family size, immigration status, residency requirements, age, health status.
2. **Have they already claimed this?** If the profile says they already receive it, skip.
3. **What's the estimated value?** Calculate using profile numbers (income, rent, debt, family size). Use mid-range estimates when thresholds are range-based.
4. **What's the next step?** Specific action the person can take — phone number, website, form name, office to visit.
5. **What's the priority?** Score each item as: **(estimated value ÷ effort to claim)**. Higher score = higher priority.

### Priority Scoring

| Value | Effort | Priority |
|-------|--------|----------|
| High (>$1,000/yr) | Easy (phone call / online) | **1 — Do This Week** |
| High (>$1,000/yr) | Medium (paperwork / appointment) | **2 — Do This Month** |
| Medium ($100-1,000/yr) | Easy | **2 — Do This Month** |
| Medium ($100-1,000/yr) | Medium | **3 — Plan For** |
| Low (<$100/yr) | Easy | **3 — Plan For** |
| Any | Hard (legal / multi-step) | **4 — Research First** |

## Program Catalog

### Government — Federal

| Program | What It Pays | Eligibility | Est. Value | How to Apply | Priority |
|---------|-------------|-------------|------------|--------------|----------|
| **Canada Child Benefit (CCB)** | Monthly tax-free payment based on income | Canadian resident with child under 18. Income-tested. | $500-620/mo per child (under 6) | CRA — apply at birth or through My Account | 1 |
| **GST/HST Credit** | Quarterly payment to offset consumption taxes | Low/middle income. Must file taxes. | $200-400/quarter (family of 3) | CRA — automatic if you file taxes | 1 |
| **Canada Workers Benefit (CWB)** | Refundable tax credit for low-income workers | Working, income below ~$33K (single) or ~$43K (family). Must file taxes. | $500-1,500/yr | File T1 with Schedule 6 | 1 |
| **Canada Dental Benefit** | Direct payments for children's dental care | Children under 12, no private insurance, household income <$90K | $650/yr per child under 12 | Service Canada: 1-833-537-4342 or online | 1 |
| **Canadian Dental Care Plan (CDCP)** | Subsidized dental care | Families earning <$90K, no employer dental coverage | Variable (covers basic dental) | Service Canada | 2 |
| **Medical Expense Tax Credit** | Tax credit for eligible medical expenses | Must exceed threshold (~$2,500 for family of 3). Includes low-T treatments. | 15% of eligible expenses above threshold | File T1 with Schedule 1 | 1 |
| **Climate Action Incentive (CAIP)** | Quarterly rebate for carbon pricing | Ontario resident. Must file taxes. | $200-400/quarter | CRA — automatic if you file | 1 |
| **Home Buyers' Amount** | Tax credit for first-time buyers | First-time buyer, principal residence | $10,000 credit (~$1,500 tax savings) | File T1 | 2 |
| **FHSA (First Home Savings Account)** | Tax-deductible contributions for home purchase | Canadian resident, 18+, first-time buyer | $8,000/yr contribution room | Open at bank/brokerage | 3 |
| **RRSP Home Buyers' Plan (HBP)** | Withdraw up to $60K tax-free for home purchase | First-time buyer, RRSP contributions | Up to $60K | Apply through CRA My Account | 3 |
| **RESP / CESG** | Government matching grants for child education | Canadian resident, child beneficiary | 20% match on first $2,500/yr ($500/yr) | Open RESP at bank/brokerage | 3 |
| **Canada Learning Bond (CLB)** | Government bonds for low-income families | RESP beneficiary, family income <$57K | $500 first year + $100/yr | Automatic with RESP | 2 |
| **Disability Tax Credit (DTC)** | Non-refundable tax credit | Person with severe, prolonged impairment | ~$8,500/yr credit | Form T2201 from doctor, submit to CRA | 3 |
| **Registered Disability Savings Plan (RDSP)** | Long-term savings for disabled persons | DTC-eligible | Up to $3,500/yr in grants | Open at bank | 3 |
| **EI Maternity/Parental Benefits** | Income replacement during leave | Insured employment, qualifying hours | 55-70% of income (up to $668/wk) | Service Canada | 2 |
| **CPP Disability** | Monthly benefit for severe disability | CPP contributor, unable to work | $1,500+/mo | Service Canada | 4 |
| **Tuition/Education Credits** | Tax credit for tuition fees | Enrolled at qualifying institution | 15% of tuition | File T1 | 3 |

### Government — Ontario

| Program | What It Pays | Eligibility | Est. Value | How to Apply | Priority |
|---------|-------------|-------------|------------|--------------|----------|
| **Ontario Trillium Benefit (OTB)** | Monthly payment combining energy + property tax + sales tax credits | Low/middle income Ontario resident. Renters get the sales tax + energy portions. | $100-200/mo | CRA — automatic if you file Ontario taxes | 1 |
| **Ontario Energy Support Program (OESP)** | Monthly electricity bill credit | Low-income households. Income <~$48K for family of 3. | $30-75/mo | Apply through electricity retailer or OESP portal | 1 |
| **Low-Income Energy Assistance Program (LEAP)** | Emergency energy assistance, bill payment help | Low-income, at risk of disconnection | Up to $500/yr emergency | Contact local utility (Alectra for Brampton) | 2 |
| **Ontario Works (OW)** | Monthly social assistance | Very low income, assets below threshold | $700-1,300/mo | Apply at local Ontario Works office | 4 |
| **Ontario Child Benefit (OCB)** | Provincial child benefit (on top of federal CCB) | Low-moderate income, child under 18 | Up to $1,484/yr per child | CRA — automatic if you file and receive CCB | 1 |
| **Healthy Smiles Ontario** | Free dental care for children | Children 0-17, no insurance, income <$25K household | Free basic dental | Ontario Health: 1-800-721-2131 | 2 |
| **Child Care Fee Subsidy** | Subsidized child care | Low-moderate income, both parents working/studying | Up to 80% of child care costs | Apply through Region of Peel | 3 |
| **Ontario Renovates** | Grants/loans for home modifications | Seniors, disabled, low-income homeowners | Up to $15,000 grant | Apply through local housing authority | 4 |

### Non-Government

| Source | What It Pays | Eligibility | Est. Value | How to Access | Priority |
|--------|-------------|-------------|------------|---------------|----------|
| **Bank of Canada Unclaimed Properties** | Forgotten bank accounts, deposits, investments | Any Canadian with unclaimed funds | $100-$10,000+ | Search: unclaimedproperties.ca | 1 |
| **Class Action Settlements** | Payouts from lawsuits against companies | Anyone who purchased/use specific products/services | $20-500+ per claim | Search: canadianclassactions.ca or settlement administrator sites | 2 |
| **Bank Account Switching Bonuses** | Cash bonuses for switching primary banking | New customer, meet minimum requirements | $100-500 | Open new chequing account at promo rate | 2 |
| **Credit Card Sign-Up Bonuses** | Points/cash bonuses for new cards | New cardholder, meet spend requirement | $200-500+ | Apply for card, meet minimum spend | 2 |
| **Cashback Apps (Rakuten, etc.)** | Cash back on online purchases | Anyone making online purchases | $50-300/yr | Sign up, use app for purchases | 3 |
| **Price Adjustment Programs** | Refund difference when price drops | Recent purchase, store has price match policy | $10-200 per item | Contact retailer with receipt | 3 |
| **Employer Benefits Audit** | Unused HSA, RRSP match, tuition reimbursement | Employed, check what's available | $500-5,000/yr | Review employment contract, talk to HR | 1 |
| **Insurance Bundling Discount** | Reduced premiums for bundling auto + home | Multiple insurance policies | $200-500/yr savings | Contact insurance broker | 2 |
| **Cell Phone Plan Optimization** | Lower monthly bill by switching MVNO | Current plan >$50/mo | $20-40/mo savings | Switch to Public Mobile, Lucky Mobile, etc. | 2 |
| **Subscription Audit** | Cancel unused subscriptions | Active subscriptions not being used | $20-200/mo recovered | Review bank statements, cancel unused | 1 |
| **Utility Bill Audit** | Identify overcharges, wrong plans | Monthly utility bills | $10-50/mo savings | Review bills, contact providers | 2 |
| **Aeroplan/Loyalty Points** | Maximize existing points value | Accumulated points | Variable | Check balances, redeem strategically | 3 |

### Debt Strategies (Ranked Least to Most Destructive)

| Strategy | How It Works | Impact on Credit | Timeline | Cost | When to Use |
|----------|-------------|------------------|----------|------|-------------|
| **1. Balance Transfer Cards** | Move debt to 0% intro APR card (12-18 months) | Small ding (new inquiry + new account) | 12-18 months | 2-3% transfer fee | <$10K debt, good credit score |
| **2. Debt Consolidation Loan** | Single loan at lower rate replaces multiple debts | Small ding (new inquiry) | 2-5 years | Interest at 8-18% APR | $10-30K debt, can qualify for lower rate |
| **3. Credit Counselling / DMP** | Non-profit agency negotiates reduced rates with creditors | Moderate ding (noted on credit report) | 3-5 years | Reduced interest, admin fee | $15-50K debt, can't qualify for consolidation |
| **4. Consumer Proposal** | Formal offer to pay portion of debt, stops all interest | Severe ding (stays 3 years after completion) | Up to 5 years | Pay back portion (typically 25-50%) | $20-100K debt, cannot pay in full |
| **5. Bankruptcy** | Legal discharge of most debts | Most severe (stays 6-7 years) | 9-21 months | Surplus income payments if applicable | Last resort, unmanageable debt |

**IMPORTANT DISCLAIMER:** This is informational only and does not constitute legal or financial advice. Consult a Licensed Insolvency Trustee before making decisions about consumer proposals or bankruptcy. Each situation is unique.

### Optimization Loopholes

| Strategy | What It Saves | Eligibility | Est. Value | How to Implement | Priority |
|----------|--------------|-------------|------------|------------------|----------|
| **Prescribed Rate Loan** | Income splitting with spouse | Spouse in lower tax bracket, loan at CRA prescribed rate | $500-5,000/yr | Loan to spouse at prescribed rate, invest in spouse's name | 4 |
| **Medical Expense Bundling** | Claim more medical expenses | Any medical expenses | 15% tax credit above threshold | Bundle 12-month window of expenses | 2 |
| **Donation Tax Credit** | Higher credit for larger donations | Charitable donations | 29-33% federal + provincial | Bundle 2 years of donations in one year | 3 |
| **RRSP Contribution Timing** | Defer income tax | RRSP contribution room | Depends on bracket | Contribute in high-income year, withdraw in low-income year | 3 |
| **TFSA Over RRSP** | Tax-free growth | TFSA contribution room | Varies | Use TFSA for short-term, RRSP for long-term | 3 |
| **RESP Timing for CESG** | Maximize government grants | RESP beneficiary | $500/yr CESG | Contribute $2,500/yr per child | 3 |
| **Capital Loss Harvesting** | Offset capital gains | Investment losses | Varies | Sell losing investments to offset gains | 4 |
| **CRA Payment Arrangement** | Avoid penalties/interest on tax debt | Owe CRA money | Avoids 5-10% annual interest | Call CRA: 1-800-959-8281 to negotiate | 1 |
| **Voluntary Disclosures Program (VDP)** | Avoid penalties on unfiled taxes | Unfiled taxes, non-compliance | Avoids penalties | File through CRA VDP program | 1 |
| **Work-From-Home Deduction** | Tax deduction for home office | Work from home regularly | $500-1,000/yr | File T777S | 2 |

## Output Template

The agent MUST produce the report in this exact format:

```
# Financial Audit Report — [Client Name]

**Date:** [Date]
**Province:** [Province]
**Family:** [Description]
**Immigration Status:** [Status]

---

## 1. Immediate Cash (One-Time Claims)

| Opportunity | Est. Amount | How to Claim | Difficulty | Deadline |
|-------------|------------|-------------|------------|----------|
| [Program] | $X | [Action] | Easy/Med/Hard | [Timeline] |

**Total Immediate Cash:** $[sum]

---

## 2. Monthly Savings (Recurring)

| Opportunity | Monthly Value | Annual Value | Action Needed | Timeline |
|-------------|-------------|-------------|--------------|----------|
| [Program] | $X | $X | [Action] | [Timeline] |

**Total Monthly Savings:** $[sum]/mo ($[sum]/yr)

---

## 3. Debt Strategy (Ranked)

| Rank | Strategy | Monthly Payment | Total Cost | Credit Impact | Next Step |
|------|----------|----------------|-----------|--------------|-----------|
| 1 | [Strategy] | $X | $X | [Impact] | [Action] |
| 2 | [Strategy] | $X | $X | [Impact] | [Action] |
| 3 | [Strategy] | $X | $X | [Impact] | [Action] |
| 4 | [Strategy] | $X | $X | [Impact] | [Action] |
| 5 | [Strategy] | $X | $X | [Impact] | [Action] |

**Recommendation:** [Which strategy makes sense for this specific profile and why]

**IMPORTANT DISCLAIMER:** Debt strategies are informational only. Consult a Licensed Insolvency Trustee before making decisions about consumer proposals or bankruptcy.

---

## 4. Long-Term Optimization

| Strategy | Annual Benefit | Action Required | Timeline |
|----------|---------------|----------------|----------|
| [Strategy] | $X | [Action] | [Timeline] |

---

## 7-Day Action Plan

| Day | Task |
|-----|------|
| Day 1 | [Highest priority action] |
| Day 2 | [Second priority] |
| Day 3 | [Third priority] |
| Day 4 | [Fourth priority] |
| Day 5 | [Fifth priority] |
| Day 6 | [Sixth priority] |
| Day 7 | [Seventh priority] |

**Report back in 7 days with:** [key metrics to track]
```

## Common Mistakes

| Mistake | Why It's Wrong | Fix |
|---------|---------------|-----|
| Skipping non-government sources | Agents focus only on CRA benefits and miss 40%+ of available money | Always check the Non-Government table |
| Not ranking debt strategies | Generic "consolidate your debt" advice is useless without comparison | Use the 5-rank debt table and recommend the specific strategy for the profile |
| Ignoring immigration status | Some programs require PR or citizenship; others accept work permits | Always check immigration status before recommending |
| Missing Ontario-specific programs | Federal-only advice misses Trillium, OESP, LEAP, etc. | Always check the Ontario table for renters |
| Not verifying existing claims | Recommending programs the person already receives wastes time | Ask "are you receiving X?" for each program |
| Giving dollar estimates without calculation | Guessing amounts destroys credibility | Calculate based on profile numbers; use ranges when thresholds are range-based |
| Recommending bankruptcy first | It's the nuclear option and should be last resort | Always rank from least to most destructive |
| Missing the subscription/gym audit | Small recurring leaks add up to $500+/yr | Always check the Non-Government table for spending optimizations |
| Ignoring employer benefits | Many employees don't use HSA, RRSP match, or tuition reimbursement | Ask specifically about employer benefits |

## Disclaimer

This skill provides informational guidance only. It does not constitute legal, tax, financial, or immigration advice. All eligibility criteria, dollar amounts, and application procedures should be verified on official government websites or with qualified professionals before taking action. Program details change frequently — always confirm current information at canada.ca or ontario.ca.
