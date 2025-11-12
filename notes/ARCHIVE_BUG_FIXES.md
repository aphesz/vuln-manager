# 🐛 Archived Bug Fixes

Historical bug fixes and technical debt cleanup. Issues documented here have been resolved.

---

## CVE Import Title Bug (November 2025) - v0.7.3.1 🔥 CRITICAL

**Issue:** All CVE imports failing with 500 Internal Server Error  
**Error:** `psycopg2.errors.NotNullViolation: null value in column "title"`  
**Root Cause:** NVD API doesn't provide `title` field, `parse_nvd_vulnerability()` wasn't generating it  
**Impact:** Production CVE imports completely broken  

**Fix:**
- Auto-generate title: `"CVE-{id} - {first sentence of description}"`
- Fallback: Use CVE ID alone if no description
- Truncate at 100 characters with "..." suffix

**Test Fix:** Mock data updated to match real NVD API responses  
**Why Tests Missed:** Mocks included title field that real API doesn't provide  
**Prevention:** Mocks now accurately reflect production data flow  

**Files:** `backend/app/nvd.py` (+13 lines), `backend/tests/test_cve_import.py` (~20 lines)  

---

## HTML Export Display Fix (November 2025) - v0.10.0

**Issue:** HTML export showing escaped HTML tags like `&lt;p&gt;` instead of rendering  
**Iterations:** 3 debugging sessions  

**Problems:**
1. Double-escaping: Backend escaping + Jinja2 autoescape
2. CSS display conflict: Details row not showing
3. Toggle function using generic `'block'` instead of `'table-row'`

**Fixes:**
1. Removed backend HTML escaping (let Jinja2 handle it)
2. Fixed CSS specificity for detail rows
3. Changed toggle to explicitly use `'table-row'` for table elements

**Result:** HTML reports now render properly with full formatting and working expand/collapse  

---

## Timezone Bug - Comment Timestamps (Earlier)

**Issue:** Comment timestamps showing inconsistent times across users  
**Root Cause:** TIMESTAMP field without timezone awareness  
**Impact:** Multi-timezone teams seeing wrong comment times  

**Fix:**
- Migration: TIMESTAMP → TIMESTAMPTZ for all timestamp fields
- Backend: Timezone utilities and documentation
- Consistent UTC storage with local display

**Files:** Migration file, timezone utilities module  

---

## Template Save Authentication (November 2025) - v0.10.0

**Issue:** 401 Unauthorized when creating report templates  
**Root Cause:** `Depends(get_current_user)` required but auth not fully implemented  
**Temporary Fix:** Removed auth dependency until v1.0.0, set `created_by_user_id=None`  
**Future:** Will be re-enabled with full user management system  

---

## Database Schema Fixes - Report Templates (November 2025)

**Issue:** 500 Internal Server Error on GET `/templates`  
**Root Cause:** Missing columns (layout_config, is_public, usage_count, last_used_at)  
**Migration Issue:** Bypassed migration system with direct SQL  
**Fix:** Added columns directly via SQL ALTER TABLE statements  
**Note:** Migration chain to be cleaned up in future release  

---

## Migration Chain Conflict (November 2025) - v0.8.1

**Issue:** Multiple migration heads preventing Alembic operations  
**Error:** `alembic.util.exc.CommandError: Multiple heads in the database`  
**Fix:** Resolved with migration 013, merged conflicting branches  
**Prevention:** Better coordination on concurrent database changes  

---

## React Hooks Violations (November 2025) - v0.10.2

**Issue:** Infinite re-render loops in FindingsTable  
**Root Cause:** useState calls inside map() functions  
**Symptoms:** Browser freezing, memory exhaustion  

**Fix:**
- Centralized state management outside map loops
- Proper dependency arrays in useEffect
- Memoization for expensive computations

**Files:** `FindingsTable.tsx` refactored  

---

## Docker Permissions - File Upload (November 2025)

**Issue:** POC artifact uploads failing with permission denied  
**Root Cause:** /code/uploads/ directory owned by root, appuser can't write  
**Fix:** Changed directory ownership to appuser:appuser with chmod 755/644  
**Verification:** Docker cp command now works for file uploads  

---

## NPM Upgrade Decision (Earlier)

**Decision:** Stay on npm 10.x, skip npm 11 alpha  
**Reason:** npm 11 stability concerns, no breaking features needed  
**Strategy:** Wait for stable npm 11 release before upgrading  

---

## Forward Reference Resolution (Earlier)

**Issue:** `FindingReadWithInstances` model failing with forward reference error  
**Fix:** Proper model ordering and relationship configuration  
**Impact:** API responses now correctly include nested instances  

---

## TagUpdate Model Validation (Earlier)

**Issue:** Tag updates failing validation  
**Root Cause:** Required fields expected but should be optional  
**Fix:** Made all TagUpdate fields optional with default values  

---

## Migration Fix - General (Earlier)

**Issue:** Various Alembic migration failures  
**Fixes:** Idempotent migrations with conditional DDL, proper dependency ordering  
**Documentation:** MIGRATION_FIX.md created  

---

## WebSocket Fixes (Earlier - 3 separate fixes)

**Issues:**
1. WebSocket error quick fix
2. Connection management improvements
3. Complete technical refactor

**Final State:** Production-grade WebSocket implementation with proper error handling  
**Documentation:** WEBSOCKET_COMPLETE_TECHNICAL_DOCS.md  

---

## Report POC Fix (Earlier)

**Issue:** Proof-of-concept fields not appearing in reports  
**Fix:** Added poc_description field to report generation  
**Documentation:** REPORT_POC_FIX.md  

---

## Troubleshooting Upload (Earlier)

**Issue:** Scanner uploads failing with "Unknown scanner type"  
**Fix:** XML format validation and better error messages  
**Guide:** TROUBLESHOOTING_UPLOAD.md created  

---

**Note:** These bug fixes are archived for historical reference. Check git history for detailed code changes.
