# PRISM Quality Contract

**Last Updated**: 2025-12-14  
**Status**: ✅ Active

---

## 🎯 Quality Gates

PRISM enforces strict quality standards through automated checks at multiple stages:

### Pre-Commit Hooks
- **Formatting**: Prettier auto-formats staged files
- **Linting**: ESLint checks for code quality issues
- **Type Checking**: TypeScript checkJs validation (warnings)
- **Core Tests**: Must pass before commit

### CI/CD Quality Checks
The `.github/workflows/quality.yml` workflow runs on every push/PR to `main`/`develop`:

| Check | Status | Description |
|-------|--------|-------------|
| **Format** | ✅ Blocking | `npm run format:check` - Code must be formatted |
| **Lint** | ✅ Blocking | `npm run lint` - No linting errors allowed |
| **Type Check** | ⚠️  Warnings | `npm run typecheck` - Progressive adoption (non-blocking) |
| **Core Tests** | ✅ Blocking | `npm test` - All core tests must pass |
| **Property Tests** | ✅ Blocking | `npm run test:properties` - Invariant tests must pass |

### Legacy Tests
Legacy tests (`npm run test:legacy`) run in **quarantine mode**:
- ✅ Executed in CI (job: `legacy-tests`)
- ⚠️  Non-blocking (`continue-on-error: true`)
- 📊 Results reported but do not prevent merges
- 🔧 Work in progress to fix failures

---

## 🧪 Test Strategy

### Core Tests (CI-Blocking)
**Command**: `npm test` (aliases to `npm run test:core`)

**Includes**:
- Property-based tests (`__tests__/properties/**`)
- Adversarial tests (`__tests__/adversarial/**`)
- Audit/log tests (`__tests__/audit/**`)
- Consensus tests (`tests/consensus/**`)
- Fuzz tests (`__tests__/fuzz/**`)

**Config**: `vitest.config.core-only.js`

**Excludes**:
- Legacy tests (`__tests_legacy__/**`, `legacy_tests/**`)
- UI/infographic/voice tests (browser environment)
- Integration tests (may require full stack)

### Legacy Tests (Quarantine)
**Command**: `npm run test:legacy`

**Includes**:
- All legacy test suites
- UI/infographic/voice tests
- Integration tests

**Status**: ⚠️ 392 failures (pre-existing, non-blocking)

---

## 📝 Code Quality Tools

### ESLint
- **Config**: `eslint.config.js`
- **Rules**: Strict (no-unused-vars, eqeqeq, prefer-const, etc.)
- **Auto-fix**: `npm run lint:fix`

### Prettier
- **Config**: `.prettierrc`
- **Format**: `npm run format`
- **Check**: `npm run format:check`

### TypeScript (checkJs)
- **Config**: `tsconfig.json`
- **Mode**: `checkJs: true` (progressive adoption)
- **Check**: `npm run typecheck`
- **Status**: Warnings non-blocking (core modules prioritized)

---

## 🔧 Runtime Files Policy

### Untracked Runtime State
The following files are **runtime state** and should not be committed:
- `data/server-memory.json`
- `test_orchestration_journal/checkpoint.json`
- `test_journal/checkpoint.json`

### Templates (Versioned)
Instead, we version **sample templates**:
- `data/server-memory.sample.json`
- `test_orchestration_journal/checkpoint.sample.json`

### Auto-Initialization
Code automatically initializes runtime files from samples or defaults if absent:
- `ServerMemoryStore` loads from sample if `server-memory.json` missing
- `SecureJournalManager` creates default checkpoint if missing

**Why?**
- ✅ Repo stays clean (no runtime mutations)
- ✅ Fresh clones work immediately
- ✅ CI/CD reproducible
- ✅ No accidental commits of state

---

## 📊 Quality Metrics

### Target Coverage (Core)
- **Lines**: 80%+
- **Functions**: 80%+
- **Branches**: 75%+
- **Statements**: 80%+

### Test Stability
- **Core Tests**: 100% pass rate required
- **Property Tests**: 100% pass rate (5 consecutive runs)
- **Legacy Tests**: Work in progress (392 failures → 0 target)

---

## 🚀 Development Workflow

### Before Committing
```bash
# Format code
npm run format

# Fix linting issues
npm run lint:fix

# Run core tests
npm test

# (Optional) Check types
npm run typecheck
```

### CI/CD Pipeline
1. **Pre-commit hook** runs automatically
2. **Quality workflow** validates on push/PR
3. **Legacy tests** run in quarantine (non-blocking)
4. **Merge** only if quality gates pass

---

## 📊 Technical Debt Baseline

### Legacy Test Failures
**Baseline (2025-12-14)**: 392 failures  
**Target**: <100 failures (by end of Q1 2026)  
**Progress**: Tracked weekly

**Rules**:
- ✅ Core tests remain **blocking** (100% pass required)
- ⚠️  Legacy tests in **quarantine** (non-blocking, but tracked)
- 🎯 Weekly reduction goal: ~20 failures/week

**Current Status**:
- Core tests: **61/61 passing** ✅ (100% green)
- Legacy tests: **392 failures** ⚠️  (quarantine mode)

---

## 🎯 Next Steps

### Short Term (Q1 2026)
- [ ] Reduce legacy test failures (392 → <100)
- [ ] Enable strict typecheck (currently warnings)
- [ ] Add coverage gates to CI

### Medium Term
- [ ] Migrate legacy tests to core (or remove)
- [ ] Achieve 90%+ core coverage
- [ ] Enable mutation testing (Stryker)

---

## 📚 References

- [ESLint Rules](./eslint.config.js)
- [Prettier Config](./.prettierrc)
- [TypeScript Config](./tsconfig.json)
- [Vitest Core Config](./vitest.config.core-only.js)
- [Quality CI Workflow](./.github/workflows/quality.yml)

---

**Quality is not negotiable.** Every commit must meet these standards.
