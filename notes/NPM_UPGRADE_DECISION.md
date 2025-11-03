# NPM Upgrade Decision - November 2025

## Decision Summary
**DECISION: DO NOT UPGRADE npm from 10.8.2 → 11.6.2**

**Date**: November 3, 2025  
**Status**: Deferred pending Node.js upgrade  
**Rationale**: Incompatibility with current Node.js version

---

## Context

During frontend testing development, npm displayed an upgrade notice:
```
npm notice New major version of npm available! 10.8.2 -> 11.6.2
```

## Analysis

### Current Platform Stack
- **Node.js**: 18.20.8 (LTS until April 2025)
- **npm**: 10.8.2
- **Docker Base Image**: `node:18-alpine`
- **Status**: Stable, production-ready

### npm 11.x Requirements
**CRITICAL BLOCKER**: npm 11 requires Node.js `^20.17.0 || >=22.9.0`

Our Node.js 18.20.8 is **incompatible** with npm 11.x.

### Breaking Changes in npm 11

From [npm v11.0.0 release notes](https://github.com/npm/cli/releases/tag/v11.0.0):

1. **Node.js Version Requirement** ⚠️
   - Minimum: Node.js 20.17.0 or 22.9.0+
   - Our version: 18.20.8 ❌

2. **Pre-release Publishing**
   - Now requires explicit tag specification
   - Impact: Low (we don't publish pre-release packages)

3. **Lifecycle Scripts**
   - `--ignore-scripts` now applies to ALL scripts including `prepare`
   - Impact: Medium (affects security-conscious installations)

4. **Removed Commands**
   - `npm hook` command removed
   - Impact: None (we don't use npm hooks)

5. **Publishing Behavior**
   - Default "latest" tag requires version > latest semver in registry
   - Impact: None (we don't publish to npm registry)

6. **Ignore List Changes**
   - `bun.lockb` files now in strict ignore list
   - Impact: None (we don't use Bun)

### Impact Assessment

#### If We Upgrade npm Only (❌ NOT POSSIBLE)
```bash
# This would FAIL:
docker run --rm node:18-alpine npm install -g npm@11.6.2
# Error: npm 11 requires Node.js >=20.17.0
```

#### If We Upgrade Both Node.js + npm (⚠️ HIGH RISK)

**Required Changes:**
1. Update `frontend/Dockerfile` from `node:18-alpine` → `node:20-alpine` or `node:22-alpine`
2. Update `backend/Dockerfile` if using Node.js tools
3. Update CI/CD pipeline Node.js versions
4. Full dependency compatibility testing
5. Regression testing across all features

**Risk Areas:**
- **Dependencies**: Some packages may not support Node.js 20/22 yet
- **Build Process**: Vite, TypeScript compiler changes with newer Node
- **Native Modules**: May require recompilation
- **Testing**: All 113 tests need re-validation
- **Production Stability**: Untested runtime behavior

**Effort Estimate:**
- Testing: 4-8 hours
- Debugging issues: 2-4 hours
- Documentation: 1 hour
- **Total: 1-2 days**

## Decision Rationale

### Why NOT to Upgrade Now

1. **No Urgent Need**
   - npm 10.8.2 is stable and fully functional
   - Node.js 18 LTS supported until April 2025
   - All current features working perfectly
   - 113 tests passing (59 backend + 54 frontend)

2. **Development Phase**
   - Active feature development (Vulnerability Repository just completed)
   - Frontend testing in progress
   - Introducing platform instability is risky

3. **Risk vs. Reward**
   - **Reward**: Newer npm features (none critical for our use case)
   - **Risk**: Breaking changes, dependency issues, testing overhead
   - Ratio is unfavorable

4. **Timing**
   - Better to upgrade during a planned maintenance window
   - Should be coordinated with Node.js LTS upgrade
   - Node.js 20 LTS is current, Node.js 22 LTS is latest

### When to Reconsider

**Trigger Events:**
1. Node.js 18 approaches EOL (April 2025)
2. Critical npm 11 security fix
3. Dependency requires Node.js 20+
4. New feature needs npm 11 functionality
5. Planned platform upgrade cycle

## Recommended Future Path

### Phase 1: Planning (Q1 2025)
- [ ] Audit all dependencies for Node.js 20/22 compatibility
- [ ] Review npm 11 changelog for relevant changes
- [ ] Identify potential breaking changes
- [ ] Create upgrade testing checklist

### Phase 2: Testing (Development Environment)
- [ ] Update `docker-compose.dev.yml` with Node 20
- [ ] Run full test suite (backend + frontend)
- [ ] Test build process (`npm run build`)
- [ ] Verify all Docker containers work
- [ ] Load test with actual data

### Phase 3: Deployment (Staging → Production)
- [ ] Update Dockerfiles to `node:20-alpine`
- [ ] Deploy to staging environment
- [ ] Run smoke tests
- [ ] Monitor for 48 hours
- [ ] Production deployment with rollback plan

## Technical Details

### Current Configuration
```dockerfile
# frontend/Dockerfile
FROM node:18-alpine
# npm 10.8.2 comes bundled with Node 18
```

### Future Configuration (Example)
```dockerfile
# frontend/Dockerfile - FUTURE
FROM node:20-alpine
# npm 11.x comes bundled with Node 20
# OR
FROM node:22-alpine
# Latest LTS with npm 11.x
```

### Version Compatibility Matrix

| Component | Current | npm 11 Required | Compatible? |
|-----------|---------|----------------|-------------|
| Node.js | 18.20.8 | ^20.17.0 \|\| >=22.9.0 | ❌ No |
| npm | 10.8.2 | 11.6.2 | N/A |
| Vite | 5.0.0 | ✅ | ✅ Yes |
| TypeScript | 5.3.3 | ✅ | ✅ Yes |
| React | 18.2.0 | ✅ | ✅ Yes |
| Vitest | 1.0.4 | ✅ | ✅ Yes |

## Alternatives Considered

### Alternative 1: Upgrade npm Only
**Verdict**: ❌ Impossible - Version incompatibility

### Alternative 2: Upgrade Node.js + npm Together
**Verdict**: ⏸️ Deferred - No urgent business need

### Alternative 3: Stay on Current Versions (SELECTED ✅)
**Verdict**: ✅ Recommended - Stable, low risk, sufficient for current needs

## Monitoring

### Watch for These Signals
- Security advisories for Node.js 18 or npm 10.8.2
- Dependency updates requiring newer Node.js
- Community adoption of Node.js 20/22
- Performance improvements in newer versions

### Quarterly Review
- Review this decision every quarter
- Check Node.js 18 EOL timeline
- Assess new npm 11 features
- Monitor ecosystem trends

## References

- [npm v11.0.0 Release Notes](https://github.com/npm/cli/releases/tag/v11.0.0)
- [npm v11.6.2 Release Notes](https://github.com/npm/cli/releases/tag/v11.6.2)
- [Node.js Release Schedule](https://github.com/nodejs/release#release-schedule)
- Node.js 18 LTS EOL: April 2025
- Node.js 20 LTS EOL: April 2026
- Node.js 22 LTS EOL: April 2027

## Conclusion

Maintaining **Node.js 18.20.8 + npm 10.8.2** is the correct decision for our current development phase. The platform is stable, all tests pass, and there's no compelling reason to introduce upgrade risk during active feature development.

We will revisit this decision in **Q1 2025** or when Node.js 18 approaches EOL, whichever comes first.

---

**Document Owner**: Development Team  
**Last Updated**: November 3, 2025  
**Next Review**: February 2025
