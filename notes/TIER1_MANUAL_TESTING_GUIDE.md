# Tier 1 Features - Manual Testing Guide

**Date:** November 1, 2025  
**Version:** 0.3.0  
**Status:** Ready for Testing

## 🎯 Testing Overview

This guide walks through manual testing of all Tier 1 features:
1. **Peer Review Workflow** - Review status, comments, audit logs
2. **Jira Integration** - Settings, connection testing, issue creation
3. **SLA Tracking** - Deadlines, status calculation, overdue findings

---

## 📋 Pre-Testing Checklist

- [ ] All services running: `docker-compose ps` shows 3 containers up
- [ ] Backend healthy: `curl http://localhost:8000/health` returns 200
- [ ] Frontend accessible: http://localhost:3000 loads
- [ ] At least one project with findings exists for testing

---

## 🧪 Test Scenario 1: Peer Review Workflow

### Test 1.1: Update Review Status

**Steps:**
1. Navigate to Dashboard (http://localhost:3000)
2. Select a project with findings
3. Click on a finding to open the Finding Dialog
4. Switch to the **"Review & Comments"** tab
5. Change review status from dropdown:
   - Options: `Pending`, `In Review`, `Approved`, `Rejected`
6. Optionally enter reviewer ID (integer)
7. Click **"Update Status"**

**Expected Results:**
- ✅ Success notification appears
- ✅ Status updates immediately in the UI
- ✅ Finding card/table shows new status with colored chip
- ✅ Audit log entry created (see Test 1.3)

**API Endpoint:** `PATCH /findings/{id}/review`

---

### Test 1.2: Add Comments to Finding

**Steps:**
1. Open Finding Dialog → **"Review & Comments"** tab
2. Scroll to **"Add Comment"** section
3. Enter comment text (at least 1 character)
4. Enter author name (required)
5. Click **"Add Comment"**
6. Verify comment appears in the thread above

**Expected Results:**
- ✅ Comment appears immediately with timestamp
- ✅ Comment list shows author and text
- ✅ Chronological order (oldest first)
- ✅ Empty form after successful submission

**Validation Tests:**
- Try submitting empty comment → Error: "Comment text is required"
- Try submitting without author → Error: "Author is required"

**API Endpoint:** `POST /findings/{id}/comments`

---

### Test 1.3: View Audit Log

**Steps:**
1. Open Finding Dialog → **"Review & Comments"** tab
2. Scroll to **"Audit Log"** section
3. Review the audit trail entries

**Expected Results:**
- ✅ All status changes logged with:
  - Timestamp (formatted date/time)
  - User who made the change
  - Action type (e.g., "review_status_changed")
  - Changes (old value → new value)
- ✅ Chronological order (oldest first)
- ✅ JSON changes displayed in readable format

**Sample Audit Log Entry:**
```
2025-11-01 10:30:45
User: john.doe
Action: review_status_changed
Changes: {"field": "review_status", "old_value": "Pending", "new_value": "Approved"}
```

**API Endpoint:** `GET /findings/{id}/audit-log`

---

## 🔗 Test Scenario 2: Jira Integration

### Test 2.1: Configure Jira Settings

**Steps:**
1. Navigate to Dashboard
2. Click **"Jira Settings"** button (in project quick actions or settings area)
3. Fill in the Jira configuration form:
   - **Jira URL**: `https://your-company.atlassian.net`
   - **Project Key**: `VULN` (or your Jira project key)
   - **API Token**: Enter a test token (will be encrypted)
   - **User Email**: Your Jira account email
   - **Is Active**: Toggle ON
4. Click **"Save Settings"**

**Expected Results:**
- ✅ Success notification: "Jira settings saved successfully"
- ✅ Settings persist (refresh and verify)
- ✅ API token shows as encrypted (🔒 indicator)
- ✅ Form resets or shows saved values

**API Endpoint:** `POST /jira/settings`

---

### Test 2.2: Test Jira Connection

**Steps:**
1. Open Jira Settings dialog
2. Enter valid credentials (or use saved settings)
3. Click **"Test Connection"** button
4. Wait for async validation

**Expected Results (Success Case):**
- ✅ Success message: "Connection successful"
- ✅ Green checkmark or success icon
- ✅ No errors in console

**Expected Results (Failure Case - No Real Credentials):**
- ⚠️ Error message: "Connection failed" or specific error
- ⚠️ Red error icon
- ⚠️ Helpful error message (e.g., "Invalid credentials", "URL not reachable")

**Note:** Without real Jira credentials, this will fail - that's expected!

**API Endpoint:** `POST /jira/test-connection`

---

### Test 2.3: Create Jira Issue from Finding

**Steps:**
1. Ensure Jira settings are configured (Test 2.1)
2. Open a finding that doesn't have a Jira issue yet
3. Look for **"Create Jira Issue"** button
4. Click the button
5. Confirm creation (if prompted)

**Expected Results (Success - with valid settings):**
- ✅ Success notification: "Jira issue created"
- ✅ Finding shows Jira issue key (e.g., `VULN-123`)
- ✅ Jira status appears in finding details
- ✅ Audit log entry created

**Expected Results (Failure - no settings):**
- ⚠️ Error: "Jira settings not configured for this project"
- ⚠️ 400 status code

**Expected Results (Failure - invalid credentials):**
- ⚠️ Error from Jira API (authentication failed, etc.)

**API Endpoint:** `POST /findings/{id}/create-jira-issue`

---

### Test 2.4: Retrieve Jira Settings

**Steps:**
1. After saving settings (Test 2.1)
2. Refresh the page or navigate away and back
3. Open Jira Settings dialog again

**Expected Results:**
- ✅ Previously saved settings load automatically
- ✅ All fields populated (except encrypted token shows as masked)
- ✅ "Is Active" toggle reflects saved state

**API Endpoint:** `GET /jira/settings/{project_id}`

---

## 📊 Test Scenario 3: SLA Tracking & Remediation

### Test 3.1: View SLA Dashboard

**Steps:**
1. Navigate to **SLA Dashboard** (check navigation/tabs)
2. Review the summary cards at the top
3. Review the findings table below

**Expected Results:**
- ✅ **Summary Cards** display:
  - On Track (count + green color)
  - At Risk (count + yellow/orange color)
  - Overdue (count + red color)
- ✅ **Findings Table** shows:
  - Finding title
  - Risk rating (with color coding)
  - SLA status
  - Remediation deadline (if set)
  - Remediation owner (if set)
- ✅ Color coding matches risk levels:
  - Critical: Red
  - High: Orange
  - Medium: Yellow
  - Low: Blue
  - Informational: Gray

**API Endpoint:** `GET /sla/summary?project_id={id}`

---

### Test 3.2: View Overdue Findings

**Steps:**
1. In SLA Dashboard, look for **"Overdue"** filter or section
2. Click to view only overdue findings
3. Review the list

**Expected Results:**
- ✅ Only findings past their SLA deadline are shown
- ✅ Red color coding or warning indicators
- ✅ Deadline dates in the past
- ✅ Empty state message if no overdue findings

**API Endpoint:** `GET /findings/overdue`

---

### Test 3.3: Update Remediation Deadline

**Steps:**
1. Open a finding (from SLA Dashboard or Findings Table)
2. Look for **"Remediation Deadline"** field
3. Click to open date/time picker
4. Select a future date and time
5. Save the change

**Expected Results:**
- ✅ Deadline updates immediately
- ✅ SLA status recalculates automatically:
  - **On Track**: Deadline > 2 days away
  - **At Risk**: Deadline 0-2 days away
  - **Overdue**: Deadline in the past
- ✅ Finding moves to correct SLA category
- ✅ Audit log entry created
- ✅ Datetime format is correct (ISO 8601)

**Validation Test:**
- Try setting a past date → Should work but mark as "Overdue"

**API Endpoint:** `PATCH /findings/{id}/remediation`

---

### Test 3.4: Assign Remediation Owner

**Steps:**
1. Open a finding
2. Look for **"Remediation Owner"** field
3. Enter owner name (text field)
4. Save the change

**Expected Results:**
- ✅ Owner name saves successfully
- ✅ Displays in finding details and SLA table
- ✅ Audit log entry created with change

**API Endpoint:** `PATCH /findings/{id}/remediation`

---

### Test 3.5: SLA Status Auto-Calculation

**Test Data Setup:**
Create or modify findings with different deadlines to test all SLA statuses.

**Test Cases:**

| Risk Rating | Baseline Days | Deadline Offset | Expected SLA Status |
|-------------|---------------|-----------------|---------------------|
| Critical    | 3 days        | -1 day (past)   | Overdue ⚠️         |
| Critical    | 3 days        | +1 day (future) | At Risk ⚠️         |
| Critical    | 3 days        | +5 days (future)| On Track ✅        |
| High        | 7 days        | -1 day (past)   | Overdue ⚠️         |
| High        | 7 days        | +2 days (future)| At Risk ⚠️         |
| Medium      | 30 days       | +10 days        | At Risk ⚠️         |
| Low         | 90 days       | +50 days        | On Track ✅        |

**Expected Results:**
- ✅ SLA status calculated correctly based on risk rating and deadline
- ✅ Status updates automatically when deadline is modified
- ✅ Color coding matches status

**API Endpoint:** Calculated on the fly by backend logic

---

## 🎨 UI/UX Testing

### Accessibility Testing

- [ ] All buttons have clear labels
- [ ] Keyboard navigation works (Tab through form fields)
- [ ] ARIA labels present on interactive elements
- [ ] Screen reader compatibility (if possible)
- [ ] Focus indicators visible

### Responsive Design

- [ ] Test on different screen sizes:
  - Desktop (1920x1080)
  - Tablet (768x1024)
  - Mobile (375x667)
- [ ] Tables scroll horizontally on small screens
- [ ] Dialogs/modals adapt to screen size
- [ ] No overlapping elements

### Theme Consistency

- [ ] Colors match Material-UI theme
- [ ] Risk rating colors consistent across all views:
  - Critical: Red (#f44336)
  - High: Orange (#ff9800)
  - Medium: Yellow (#fbc02d)
  - Low: Blue (#2196f3)
  - Informational: Gray (#9e9e9e)
- [ ] Status chips styled consistently
- [ ] Typography follows theme settings

---

## 🐛 Error Handling Testing

### Network Errors

**Steps:**
1. Stop backend: `docker-compose stop backend`
2. Try any Tier 1 operation in UI
3. Restart backend: `docker-compose start backend`

**Expected Results:**
- ✅ User-friendly error messages (not raw error codes)
- ✅ No app crashes
- ✅ Can retry after backend recovers

### Validation Errors

Test invalid inputs for each feature:

- **Review Status**: Try empty status → Should prevent submission
- **Comments**: Try empty text → Error message shown
- **Jira Settings**: Try invalid URL → Validation error
- **Remediation Deadline**: Try invalid date format → Error handling

**Expected Results:**
- ✅ Client-side validation prevents bad requests
- ✅ Server-side validation returns 422 with clear messages
- ✅ Error messages displayed in UI

---

## ✅ Testing Completion Checklist

### Peer Review Workflow
- [ ] Test 1.1: Update Review Status
- [ ] Test 1.2: Add Comments to Finding
- [ ] Test 1.3: View Audit Log

### Jira Integration
- [ ] Test 2.1: Configure Jira Settings
- [ ] Test 2.2: Test Jira Connection
- [ ] Test 2.3: Create Jira Issue from Finding
- [ ] Test 2.4: Retrieve Jira Settings

### SLA Tracking
- [ ] Test 3.1: View SLA Dashboard
- [ ] Test 3.2: View Overdue Findings
- [ ] Test 3.3: Update Remediation Deadline
- [ ] Test 3.4: Assign Remediation Owner
- [ ] Test 3.5: SLA Status Auto-Calculation

### UI/UX
- [ ] Accessibility Testing
- [ ] Responsive Design
- [ ] Theme Consistency

### Error Handling
- [ ] Network Errors
- [ ] Validation Errors

---

## 📝 Testing Notes Template

Use this template to record your testing observations:

```markdown
### Test: [Test Name/Number]
**Date:** [Date]
**Tester:** [Your Name]

**Status:** ✅ Pass / ⚠️ Partial / ❌ Fail

**Observations:**
- [What worked well]
- [Issues encountered]
- [Screenshots/evidence]

**Issues Found:**
1. [Description of issue #1]
2. [Description of issue #2]

**Follow-up Actions:**
- [ ] [Action item 1]
- [ ] [Action item 2]
```

---

## 🚀 Quick Test Data Setup

If you need to quickly create test data, use these API calls:

```bash
# Create a test project
curl -X POST http://localhost:8000/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Project", "description": "For manual testing"}'

# Create a test finding (requires project_id)
curl -X POST http://localhost:8000/projects/1/findings \
  -H "Content-Type: application/json" \
  -d '{
    "title": "SQL Injection Vulnerability",
    "description": "Test finding for review workflow",
    "severity": "High",
    "host": "testapp.example.com",
    "path": "/api/users"
  }'
```

Or upload a scanner report using the existing upload functionality!

---

## 📞 Support & Resources

- **Backend API Docs:** http://localhost:8000/docs (FastAPI Swagger UI)
- **Health Check:** http://localhost:8000/health
- **Frontend:** http://localhost:3000
- **Database:** PostgreSQL on port 5432 (internal)

**Need Help?**
- Check Docker logs: `docker-compose logs -f [backend|frontend|db]`
- Review automated test results: `docker exec vuln-manager-backend-1 pytest -v`
- Consult `.github/copilot-instructions.md` for architecture details

---

**Happy Testing! 🎉**
