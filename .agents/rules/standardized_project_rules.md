# Standardized Engineering & Design Rules

This rule sets the mandatory project standards across UI/UX design, zero-regression governance, pre-deployment data audits, and code quality.

---

## 1. UI/UX Design & Global System Standards (Apple-Caliber Excellence)
- **Form Follows Function with Uncompromising Beauty**: Interface elements must be clean, deliberate, and aesthetically breathtaking.
- **Design System Adherence**: Always use project design tokens (`globals.css`, CSS variables, responsive typography, `.card`, `.btn`, `.badge`, `.stat-card`) rather than ad-hoc inline styles.
- **Glassmorphism & Depth**: Refined translucency, background blur, subtle gradients, and crisp 1px borders for dark & light modes.
- **Micro-Interactions**: Fluid transitions and tactile hover states.

---

## 2. Zero-Regression Policy & Issues Register
- **Mandatory Register Logging**: Every bug fix and data correction must be logged in [`CORRECTED_ISSUES_REGISTER.md`](file:///c:/Ezzy/Projects/Money/CORRECTED_ISSUES_REGISTER.md) (ID, Date, Symptom, Root Cause, Exact Resolution, and Test Reference).
- **Automated Regression Tests**: Every fix must be accompanied by an automated regression test in [`tests/regressionAuditSuite.test.ts`](file:///c:/Ezzy/Projects/Money/tests/regressionAuditSuite.test.ts).
- **Git History Auditing**: Regularly inspect git diffs to generate additional test coverage.

---

## 3. Mandatory Pre-Commit & Pre-Deployment Audit Gates
- Run Master Audit Engine: `npx tsx scripts/run_all_audits.ts`
- Run Vitest Suite: `npx vitest run`
- Verify all 6 pillars pass with zero failures before commit or deployment to EC2.

---

## 4. Ground-Truth Data & Extraction Protocol
- Zero tolerance for fake or fallback mock data; all data must originate from verified source databases and documents.
- If binary files (PDFs, Excel) cannot be read directly, use helper scripts in `Tools/` or construct dedicated Python/Node extraction scripts.

---

## 5. Development & Code Quality Guidelines
- Verify features in the running application upon completion.
- Maintain clean builds with zero TypeScript compilation errors or unaddressed warnings.
- Avoid duplicate files; refactor in-place.
- Verify database schemas and use parameterized SQL queries with transactions.
