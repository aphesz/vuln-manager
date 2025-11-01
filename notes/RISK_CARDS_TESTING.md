# 🎯 Risk Rating Cards - Testing Guide

## ✅ Feature Complete
**Issue Status + Interactive Risk Rating Cards** - Deployed and ready for testing!

---

## 🎨 What Was Built

### Backend (✅ Deployed)
1. **Issue Status Field**: Track finding resolution state
   - `Open` - Finding is active and unresolved (default)
   - `Partially Closed` - Finding is being addressed with optional comments
   - `Closed` - Finding is fully resolved
2. **API Endpoint**: `PATCH /api/findings/{id}/issue-status`
   - Updates status and comments
   - Creates audit log entry
   - Returns updated finding

### Frontend (✅ Deployed)
1. **Issue Status Column**: Color-coded chips in FindingsTable
   - 🔴 Open → Red chip
   - 🟠 Partially Closed → Orange chip
   - 🟢 Closed → Green chip
2. **Issue Status Tab**: Management interface in Finding dialog
   - Dropdown to change status
   - Text field for comments
   - Status guide with explanations
3. **Interactive Risk Rating Cards**: 5 summary cards on Dashboard
   - Critical, High, Medium, Low, Informational
   - Shows count of **Open findings only** (excludes Closed)
   - Click card → filtered table appears
   - Click again → table disappears
4. **Filtered Findings Table**: Shows findings for selected risk level
   - Only displays Open and Partially Closed findings
   - Closed findings are excluded from counts and filters
   - Clear Filter button to reset

---

## 🧪 Testing Checklist

### 1️⃣ Issue Status Management
- [ ] Open a finding in FindingsTable → Click on row
- [ ] Navigate to "Issue Status" tab (5th tab)
- [ ] Change status from "Open" to "Partially Closed"
- [ ] Add comment: "Working with dev team to fix"
- [ ] Click "Save Changes" button
- [ ] Verify chip in table changes to orange 🟠
- [ ] Close dialog and reopen → Verify status persists
- [ ] Change status to "Closed" → Verify green chip 🟢

### 2️⃣ Interactive Risk Rating Cards
**Initial State:**
- [ ] Navigate to Dashboard
- [ ] See 5 risk rating cards at top
- [ ] Verify each card shows count of Open findings
- [ ] Verify Closed findings are NOT counted in cards

**Click Behavior:**
- [ ] Click on "Critical" card
- [ ] Verify card scales up and gets border highlight
- [ ] Verify filtered table appears below cards
- [ ] Verify filtered table shows ONLY Open Critical findings
- [ ] Verify count matches: "Critical Risk - Open Findings (X)"
- [ ] Click "Critical" card again
- [ ] Verify filtered table disappears

**Different Risk Levels:**
- [ ] Click "High" card → See Open High findings
- [ ] Click "Medium" card → See Open Medium findings
- [ ] Click "Low" card → See Open Low findings
- [ ] Click "Informational" card → See Open Informational findings

### 3️⃣ Status Filtering Integration
**Test that Closed findings are excluded:**
1. [ ] Note the count on "Critical" card (e.g., 2)
2. [ ] Click "Critical" card → See 2 findings in filtered table
3. [ ] Open one Critical finding → Change status to "Closed"
4. [ ] Return to Dashboard
5. [ ] Verify "Critical" card now shows 1 (count decreased)
6. [ ] Click "Critical" card
7. [ ] Verify filtered table shows only 1 finding (the Open one)
8. [ ] Verify the Closed finding does NOT appear

**Test Partially Closed:**
1. [ ] Set a finding to "Partially Closed" with comment
2. [ ] Verify it still appears in card counts
3. [ ] Click risk card → Verify Partially Closed finding appears
4. [ ] Verify chip is orange 🟠 in filtered table

### 4️⃣ Clear Filter Button
- [ ] Click any risk rating card
- [ ] Verify "Clear Filter" button appears in filtered table header
- [ ] Click "Clear Filter" button
- [ ] Verify filtered table disappears
- [ ] Verify card deselects (no border/scale)

### 5️⃣ Visual Feedback
**Hover Effects:**
- [ ] Hover over each risk card
- [ ] Verify card scales up slightly
- [ ] Verify shadow increases

**Selected State:**
- [ ] Click a card
- [ ] Verify thick colored border appears
- [ ] Verify card is scaled up (1.05x)
- [ ] Click different card
- [ ] Verify first card deselects, new card selects

### 6️⃣ Data Accuracy
- [ ] Manually count Open Critical findings in main table
- [ ] Verify count matches "Critical" card number
- [ ] Repeat for each risk level
- [ ] Change a finding's risk rating
- [ ] Refresh Dashboard
- [ ] Verify cards update with new counts

---

## 🎯 Test Scenarios

### Scenario A: Triage Workflow
1. Project has 10 findings: 2 Critical, 3 High, 3 Medium, 2 Low
2. Click "Critical" card → See 2 findings
3. Open first Critical finding → Set to "Partially Closed"
4. Add comment: "Patch applied, testing in progress"
5. Return to Dashboard → Critical card still shows 2
6. Open second Critical finding → Set to "Closed"
7. Return to Dashboard → Critical card now shows 1
8. Click "Critical" card → Only see the "Partially Closed" finding

### Scenario B: Multi-Risk Review
1. Click "High" card → Review High findings
2. Click "Medium" card (without closing High)
3. Verify High deselects, Medium table appears
4. Close 2 Medium findings
5. Click "Medium" card again to close filter
6. Verify Medium card count decreased by 2

### Scenario C: Complete Closure
1. Note total findings count across all cards
2. Set all findings to "Closed"
3. Verify all cards show 0
4. Click any card
5. Verify filtered table shows "No findings" or empty state

---

## 🐛 Known Issues / Edge Cases

### Expected Behavior
- **Partially Closed findings**: Should appear in counts and filters
- **Closed findings**: Should NOT appear anywhere in risk cards/filters
- **Undefined status**: Treated as "Open" (backward compatibility)

### Potential Issues to Watch
- [ ] Card counts not updating after status change → Refresh issue
- [ ] Filtered table shows Closed findings → Filter logic bug
- [ ] Multiple cards selected → State management issue
- [ ] Card animation laggy → CSS performance issue

---

## 📊 Test Data Setup

### Create Test Dataset (if needed)
```bash
# Use existing Project 8, or create findings with specific risks:
# 2 Critical (1 Open, 1 Closed)
# 3 High (2 Open, 1 Partially Closed)
# 3 Medium (3 Open)
# 2 Low (1 Open, 1 Closed)
# 1 Informational (1 Open)
```

### Expected Card Counts (After Setup)
- Critical: 1 (only Open)
- High: 3 (Open + Partially Closed)
- Medium: 3 (all Open)
- Low: 1 (only Open)
- Informational: 1 (Open)

---

## ✅ Success Criteria

All checkboxes above should be ✅ with:
1. **Card counts accurate**: Exclude Closed, include Open/Partially Closed
2. **Click interaction smooth**: Card selects, table appears, click again to close
3. **Filter works correctly**: Only shows findings for selected risk level
4. **Status management functional**: Can change status, see color-coded chips
5. **Real-time updates**: Changing status updates card counts
6. **Visual feedback**: Hover, selection, and transitions work smoothly

---

## 🔗 Related Features

This builds on:
- **SLA Dashboard**: Same interactive card pattern
- **Peer Review**: Similar status tracking workflow
- **Issue Status**: Foundation for resolution tracking

---

## 📝 Notes

- Access at: http://localhost:3000 (or your Docker host)
- Backend API: http://localhost:8000/docs
- Test user: analyst@example.com (in code)
- All containers must be running: `docker-compose ps`

---

**Happy Testing! 🚀**
