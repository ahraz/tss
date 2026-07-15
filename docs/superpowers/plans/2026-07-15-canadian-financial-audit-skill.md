# Canadian Financial Audit Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create the `canadian-financial-audit` skill at `skills/canadian-financial-audit/SKILL.md`

**Architecture:** Single SKILL.md file with three sections: program catalog (reference tables), audit protocol (step-by-step checklist), and output template (4-section report structure). The skill follows the writing-skills TDD cycle: RED (baseline without skill) → GREEN (write skill) → REFACTOR (test + close loopholes).

**Tech Stack:** Markdown skill file, following writing-skills conventions

---

### Task 1: RED Phase — Baseline Test (agent without skill)

**Files:**
- Create: `skills/canadian-financial-audit/pressure-scenario.txt`

- [ ] **Step 1: Create the pressure scenario**

Write `skills/canadian-financial-audit/pressure-scenario.txt`:

```
You are Zara, a personal life coach. Your client Ahraz has this profile:

- Income: $1,766.19 bi-weekly ($3,827/mo net)
- Rent: $1,500/mo
- Groceries: $500/mo
- Car payment: $276/mo (car parked 6 months — not driving)
- Phones: $60 + $70
- Gas: ~$185/mo
- Fit4Less: $30/mo (unused)
- Misc: ~$150/mo
- Debt: ~$25,000 across 4-5 credit cards + 1 LOC (high interest)
- Child benefit: ~$700/mo
- Family: Wife + 5-month-old baby (sole earner)
- Location: Brampton, ON
- Immigration: Spousal work permit, expires Sep 30, 2026
- Taxes: 5 years unfiled. 2025 filed. 2020-2024 pending.
- Est. tax return: $12,000-20,000
- Testosterone: 3 nmol/L (clinically low)
- Health: 1 year no gym, chronic sleep deprivation

Your task: Find every possible source of money this person is missing — government benefits, non-government claims, debt strategies, tax loopholes. Give him a structured, prioritized action plan.

You do NOT have the canadian-financial-audit skill available.
```

- [ ] **Step 2: Run baseline test**

Run a subagent (general) with the pressure scenario and NO skill loaded. Capture the output verbatim. Document:
- What did they find?
- What did they miss?
- What structure did they produce?

Save findings as `skills/canadian-financial-audit/baseline-output.txt`.

**Expected failure patterns (hypotheses):**
- Misses Ontario-specific benefits (Trillium, OESP)
- Doesn't check immigration eligibility
- Gives generic debt advice without ranking options
- No dollar estimates
- Misses non-government sources (unclaimed property, class actions)
- No prioritization

- [ ] **Step 3: Commit**

```bash
git add skills/canadian-financial-audit/pressure-scenario.txt skills/canadian-financial-audit/baseline-output.txt
git commit -m "test: add RED phase baseline scenario for financial audit skill"
```

---

### Task 2: GREEN Phase — Write the SKILL.md

**Files:**
- Create: `skills/canadian-financial-audit/SKILL.md`

This task produces the full skill file. It contains three sections:

**Section A — Frontmatter + Overview (YAML + intro)**

```yaml
---
name: canadian-financial-audit
description: Use when analyzing a Canadian resident's financial profile to identify overlooked government benefits, non-government claims, debt relief strategies, and optimization loopholes. Triggered by Zara during personal coaching sessions or when a user asks "what money am I missing?".
---
```

**Section B — Audit Protocol**

The step-by-step process an agent follows. For each section of the profile (income, expenses, family, debt, housing, location, immigration, insurance, employer benefits, tax status), the agent:
1. Checks every catalog entry for eligibility
2. Skips if already claimed
3. Calculates estimated value from profile numbers
4. Records next step (application method, link, difficulty)
5. Scores priority by value ÷ effort

**Section C — Program Catalog**

Structured as tables with these columns: Program/Strategy | Type (Govt-Fed/Govt-ON/Non-Gov/Debt/Optimization) | Eligibility | Est. Value | How to Apply | Priority Score

Includes ALL entries from the spec catalog plus any discovered in baseline testing.

**Section D — Output Template**

The 4-section report format the agent must produce:
1. Immediate Cash (one-time)
2. Monthly Savings (recurring)
3. Debt Strategy (ranked)
4. Long-Term Optimization

- [ ] **Step 1: Write the complete SKILL.md**

Following writing-skills conventions:
- Description = triggering conditions, NOT workflow summary
- Keywords for discoverability (CRA, benefits, tax credits, Ontario, debt, bankruptcy)
- Small flowchart only if decision non-obvious
- Quick reference table for catalog
- Common mistakes section
- Legal disclaimers for bankruptcy/debt advice

- [ ] **Step 2: Commit**

```bash
git add skills/canadian-financial-audit/SKILL.md
git commit -m "feat: create canadian-financial-audit skill with catalog protocol and output template"
```

---

### Task 3: REFACTOR Phase — Test with Skill, Close Loopholes

**Files:**
- Modify: `skills/canadian-financial-audit/SKILL.md`

- [ ] **Step 1: Run test WITH skill loaded**

Run the same pressure scenario from Task 1, but this time with the `canadian-financial-audit` skill loaded. Use a subagent (general) with the skill in context.

Document output at `skills/canadian-financial-audit/skill-output.txt`.

- [ ] **Step 2: Compare baseline vs. skill output**

Identify remaining gaps:
- Did the agent follow the audit protocol correctly?
- Did it miss any catalog entries that apply?
- Were dollar estimates reasonable?
- Did it rank debt strategies correctly?
- Did it check immigration eligibility properly?
- Any new rationalizations/loopholes the agent found?

- [ ] **Step 3: Close loopholes**

Add to SKILL.md:
- Missing catalog entries found during testing
- Additional red flags / rationalization counters
- Clarify ambiguous protocol steps
- Add any new edge cases discovered

- [ ] **Step 4: Re-test and verify**

Run pressure scenario again. Output should now be comprehensive and structured.

- [ ] **Step 5: Commit**

```bash
git add skills/canadian-financial-audit/SKILL.md skills/canadian-financial-audit/skill-output.txt
git commit -m "refactor: close loopholes after testing canadian-financial-audit skill"
```

---

### Task 4: Apply Skill to Ahraz's Profile

- [ ] **Step 1: Load canadian-financial-audit skill**

Invoke the skill with Ahraz's current profile from `personal/profile.md`.

- [ ] **Step 2: Run the audit**

Follow the audit protocol. Produce the 4-section report.

- [ ] **Step 3: Write results to personal/financial-audit/**

Create `personal/financial-audit/2026-07-15-audit.md` with the full report.

- [ ] **Step 4: Update Zara commitments**

Add any financial commitments from the audit to `personal/commitments.md`.

- [ ] **Step 5: Commit**

```bash
git add personal/financial-audit/2026-07-15-audit.md personal/commitments.md
git commit -m "feat: run initial financial audit on Ahraz profile"
```
