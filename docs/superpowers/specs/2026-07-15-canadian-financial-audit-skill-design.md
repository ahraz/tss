# Canadian Financial Audit Skill — Design Spec

## Overview

A skill (`canadian-financial-audit`) for scanning a Canadian resident's personal financial profile and surfacing overlooked money — government benefits, non-government claims, debt relief strategies, and optimization loopholes. Designed as a companion to the Zara personal coaching persona; Zara calls this skill against the profile in `personal/profile.md` and gets a prioritized action plan.

## Core Concept

Given a filled financial profile (income, expenses, family, debt, location, immigration status), the skill cross-references every applicable program and strategy, then outputs a structured report with dollar estimates and next steps.

## Input

The skill reads from a structured profile. The profile feeds into every eligibility check:

- **Income:** Net monthly, bi-weekly take-home
- **Expenses:** Rent, groceries, utilities, transportation, insurance, debt payments, subscriptions
- **Family:** Marital status, children (ages), child benefit received
- **Debt:** Credit cards (balances + APRs), lines of credit, car financing, any other debt
- **Housing:** Rent vs own, monthly housing cost
- **Location:** Province, city (for provincial/municipal programs)
- **Immigration status:** PR, work permit, citizenship, expiry dates
- **Insurance:** Auto, health, life, disability — what's covered and what's not
- **Employer benefits:** Any benefits provided but not used (health spending account, RRSP match, etc.)
- **Tax filing status:** Years filed, years unfiled, estimated returns

## Output Structure

The skill produces a 4-section report:

### 1. Immediate Cash (one-time claims to make this week)
- Tax credits/benefits you can file for now
- Unclaimed property (Bank of Canada database)
- Class action settlements currently open
- CRA payment arrangements or relief programs
- Any current sign-up bonuses (banking, CCs) worth pursuing

Each item: estimated amount, application method, difficulty (Easy/Medium/Hard), timeline

### 2. Monthly Savings (recurring money left on the table)
- Ongoing government benefits (GST/HST credit, Trillium, etc.)
- Subsidies (child care, housing, pharmacare, dental)
- Utility rebates and low-income programs
- Insurance bundling/policy review savings
- Subscription/bill optimization

Each item: monthly/ annual estimated value, eligibility check, how to apply

### 3. Debt Strategy (ranked options)
From least to most destructive:
1. Balance transfers / low-interest consolidation loans
2. Credit counselling / debt management program (DMP)
3. Consumer proposal
4. Bankruptcy

Each option: how it works, impact on credit score, timeline, cost, and whether it makes sense given the specific debt profile

### 4. Long-Term Optimization (moves that compound)
- FHSA / RRSP / TFSA timing strategies
- RESP for children (CESG grants)
- Income splitting possibilities
- Prescribed rate loan strategies
- Tax filing strategy for future years

## Audit Protocol

For each line item in the profile, the agent follows this logic:

1. **Does the person qualify?** Check income thresholds, family size, immigration status, residency requirements
2. **Have they already claimed this?** If yes, skip
3. **What's the estimated value?** Base calculation on profile numbers
4. **What's the next step?** Specific action + link/resource
5. **What's the priority?** Score by (value ÷ effort)

## Coverage (Program Catalog)

### Government — Federal
- Canada Child Benefit (CCB)
- GST/HST Credit
- Canada Workers Benefit (CWB)
- Canada Dental Benefit
- Canada Housing Benefit
- EI / Maternity / Parental Benefits
- Disability Tax Credit (DTC)
- Registered Disability Savings Plan (RDSP)
- Medical Expense Tax Credit
- Tuition / Education Credits
- Home Buyers' Amount
- Home Accessibility Tax Credit
- Multigenerational Home Renovation Tax Credit
- First-Time Home Buyer Incentive
- RESP / CESG
- FHSA
- CRA Voluntary Disclosures Program (VDP)
- CRA taxpayer relief / payment arrangement

### Government — Ontario
- Ontario Trillium Benefit (OTB) — Energy + Property Tax + Sales Tax credits
- Ontario Works (OW)
- Ontario Disability Support Program (ODSP)
- Ontario Child Benefit (OCB)
- Ontario Staycation Tax Credit
- Ontario Seniors Care at Home Tax Credit
- Low-Income Energy Assistance Program (LEAP)
- Ontario Electricity Support Program (OESP)
- Ontario Renovates program
- Healthy Smiles Ontario (dental)
- Child care fee subsidies

### Non-Government
- Bank of Canada Unclaimed Properties
- Class action settlements (active/pending)
- Bank account switching bonuses
- Credit card sign-up bonuses and rewards optimization
- Cashback apps (Rakuten, etc.)
- Price adjustment / price matching policies
- Employer benefits audit (health spending account, RRSP match, wellness credits, tuition reimbursement)
- Insurance policy audits (bundling, switching, reducing coverage)
- Utility bill audits (overcharges, incorrect plan)
- Cell phone / internet plan optimization
- Subscription audit (services paid but unused)
- Aeroplan / loyalty points optimization

### Debt Strategies
- Balance transfer credit cards (0% intro APR)
- Debt consolidation loan (bank / credit union)
- Credit counselling / Debt Management Program (DMP — non-profit)
- Consumer proposal (licensed insolvency trustee)
- Bankruptcy (last resort)

### Optimization Loopholes
- Prescribed rate loan (income splitting with spouse)
- RRSP Home Buyers' Plan (HBP)
- RRSP Lifelong Learning Plan (LLP)
- TFSA contribution room maximization
- RESPR timing for maximum CESG
- Donation tax credit bundling
- Medical expense bundling (12-month window)
- Capital gains harvesting in low-income years
- Spousal RRSP timing

## Integration with Zara

Zara is the primary consumer of this skill. Workflow:

1. Zara maintains `personal/profile.md` (updated during coaching sessions)
2. When financial audit is needed, Zara invokes the `canadian-financial-audit` skill with the profile
3. The skill returns the 4-section report
4. Zara writes findings to `personal/financial-audit/` directory and sets commitments/targets

## File Structure

The skill lives at:
```
skills/canadian-financial-audit/
  SKILL.md              # Main skill — catalog + protocol + output template
```

SKILL.md contains all three sections inline (catalog, audit protocol, output template). No separate files needed — the catalog is structured as a reference table within the skill.

## Risks

- **Program changes:** Government benefits change frequently. The skill should flag that eligibility/amounts should be verified on official sites before applying.
- **Bankruptcy advice:** The debt strategy section must clearly state it's informational, not legal advice, and recommend consulting a Licensed Insolvency Trustee.
- **Immigration dependency:** Some programs have residency/status requirements. The skill must check immigration status before recommending applications.
