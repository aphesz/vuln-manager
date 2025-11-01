# Project Quick Actions - Testing Guide

**Created**: October 30, 2025  
**Status**: ✅ Ready for Testing  
**Build Hash**: `index-DhWjyWfi.js`  
**Deployment**: Docker Compose (Local)

---

## System Status Check

Before testing, verify all services are running:

```bash
# Check all containers are up
docker ps | grep vuln-manager

# Expected output:
# ✅ vuln-manager-db-1 (PostgreSQL)
# ✅ vuln-manager-backend-1 (FastAPI)
# ✅ vuln-manager-frontend-1 (Nginx + React)

# Quick health checks
curl http://localhost:8000/health      # Backend
curl -s http://localhost:3000 | head   # Frontend
```

---

## Feature 1: Create Project ✅

### Test Steps

1. **Navigate to Projects Page**
   - Open http://localhost:3000 in browser
   - Should see "Assessment Projects" heading with [Create Project] button

2. **Click Create Project Button**
   - Button location: Top-right of "Assessment Projects" header
   - Icon: Plus sign (+)
   - Expected: Dialog appears with two text fields

3. **Fill Form**
   - Project Name: `Test Project Create` (required)
   - Consultant Name: `Alice Consultant` (optional)

4. **Submit**
   - Click [Create] button
   - Expected: Dialog closes, new project appears in list

5. **Verify**
   - New project visible in "Active" tab
   - Project name matches input
   - Consultant name displays correctly
   - Tab count updates: "Active (X+1)"

### API Verification

```bash
# Verify project was created
curl -s http://localhost:8000/projects/ | python3 -m json.tool | grep "Test Project Create"

# Expected response includes:
{
  "id": 2,
  "name": "Test Project Create",
  "consultant_name": "Alice Consultant",
  "is_archived": false,
  "archived_at": null
}
```

### Expected Errors to Handle

- ❌ Click [Create] without name → Should show alert: "Project name is required"
- ✅ Leave consultant blank → Should succeed (optional field)

---

## Feature 2: Rename Project ✅

### Test Steps

1. **Find a Project to Rename**
   - Use "Test Project Create" from Feature 1
   - Or create a new project

2. **Open Menu**
   - Location: Right side of project card, three-dot icon (≡)
   - Click the icon
   - Expected: Dropdown menu appears with 4 options

3. **Click Rename**
   - First menu item: ✏️ Rename
   - Expected: Dialog opens with current values prefilled

4. **Edit Form**
   - Project Name: Change to `Test Project Renamed`
   - Consultant Name: Change to `Bob Consultant`

5. **Submit**
   - Click [Save] button
   - Expected: Dialog closes, project card updates

6. **Verify**
   - Project name shows new value
   - Consultant name shows new value
   - No change to project ID
   - Still in "Active" tab

### API Verification

```bash
# Get the project ID first
PROJECT_ID=$(curl -s http://localhost:8000/projects/ | python3 -c "import sys, json; print(json.load(sys.stdin)[0]['id'])")

# Verify rename
curl -s http://localhost:8000/projects/$PROJECT_ID | python3 -m json.tool | grep -E "name|consultant"

# Expected:
# "name": "Test Project Renamed",
# "consultant_name": "Bob Consultant"
```

### Expected Errors

- ❌ Click [Save] with blank name → Should show alert: "Project name is required"
- ✅ Leave consultant blank → Should succeed

---

## Feature 3: Export Project ✅

### Test Steps

1. **Use Renamed Project**
   - Use "Test Project Renamed" from Feature 2

2. **Open Menu**
   - Click three-dot icon (≡) on project card
   - Expected: Dropdown menu appears

3. **Click Export**
   - Second menu item: ⬇️ Export
   - Expected: Browser downloads a JSON file

4. **Verify Downloaded File**
   - File name should be: `Test_Project_Renamed_export.json`
   - Location: Default downloads folder
   - Size: ~150-200 bytes (small JSON file)

5. **Inspect Contents**
   ```json
   {
     "id": 2,
     "name": "Test Project Renamed",
     "consultant_name": "Bob Consultant",
     "exported_at": "2025-10-30T13:40:00.000Z"
   }
   ```

6. **Verify JSON Format**
   - Valid JSON (can parse with `python3 -m json.tool`)
   - Pretty-printed with 2-space indentation
   - Includes export timestamp

### File Validation

```bash
# After downloading, verify the JSON is valid
cd ~/Downloads
python3 -m json.tool Test_Project_Renamed_export.json

# Should output pretty-printed JSON without errors
```

### Expected Behavior

- ✅ Multiple exports create new files (not overwrite)
- ✅ Timestamp updates with each export
- ✅ File naming handles special characters (spaces → underscores)

---

## Feature 4: Archive Project ✅

### Test Steps

1. **Create Test Projects**
   - Create "Archive Test A" and "Archive Test B"
   - Both should be in "Active" tab
   - Tab shows: "Active (3+)"

2. **Open Menu on First Project**
   - Click three-dot icon on "Archive Test A"
   - Third menu item should show: 📦 Archive

3. **Click Archive**
   - Expected: Dialog closes, page updates
   - Project disappears from Active list
   - Project appears in Archived list

4. **Verify Tab Updates**
   - "Active" tab count decreased by 1
   - "Archived" tab count increased by 1
   - Click "Archived" tab to view archived projects

5. **Check Archived Project Display**
   - Project name visible
   - Consultant name visible
   - Archive date shown: "Archived: 10/30/2025"
   - Project card appears dimmed (opacity 70%)
   - [View Dashboard] button appears disabled (grayed out)

### API Verification

```bash
# Get archived project
curl -s http://localhost:8000/projects/ | python3 -c "
import sys, json
projects = json.load(sys.stdin)
archived = [p for p in projects if p['is_archived']]
print(json.dumps(archived, indent=2))
"

# Expected output includes:
# "is_archived": true,
# "archived_at": "2025-10-30T13:40:..."
```

### Expected Behavior

- ✅ Archived projects stay in database (not deleted)
- ✅ Dashboard button disabled but visible
- ✅ Menu still available (can unarchive)
- ✅ Archive timestamp preserved

---

## Feature 5: Unarchive Project ✅

### Test Steps

1. **View Archived Tab**
   - Click "Archived (X)" tab
   - Should see "Archive Test A" and other archived projects

2. **Open Menu**
   - Click three-dot icon on archived project
   - Third menu item should now show: 📂 Unarchive

3. **Click Unarchive**
   - Expected: Dialog closes, project disappears from Archived tab
   - Project reappears in Active tab

4. **Verify Tab Updates**
   - "Archived" tab count decreased by 1
   - "Active" tab count increased by 1
   - Click "Active" tab to confirm project is back

5. **Check Project Status**
   - Project card appears normal (opacity 100%)
   - [View Dashboard] button enabled (clickable)
   - Archived date removed

### API Verification

```bash
# Verify project is unarchived
curl -s http://localhost:8000/projects/ | python3 -c "
import sys, json
projects = json.load(sys.stdin)
unarchived = [p for p in projects if not p['is_archived'] and 'Archive' in p['name']]
print(json.dumps(unarchived, indent=2))
"

# Expected:
# "is_archived": false,
# "archived_at": null
```

---

## Feature 6: Delete Project ✅

### Test Steps

1. **Use Test Project**
   - Use "Archive Test B" from previous tests (in Active tab)

2. **Open Menu**
   - Click three-dot icon
   - Fourth menu item: 🗑️ Delete (RED COLOR)

3. **Click Delete**
   - Expected: Confirmation dialog appears
   - Confirmation text: 'Are you sure you want to delete "Archive Test B"?'
   - Warning: "This action cannot be undone. All findings and instances will be permanently deleted."

4. **Verify Confirmation**
   - Dialog shows project name
   - Warning message is clear
   - Two buttons: [Cancel] and [Delete] (red)

5. **Cancel Delete (First Test)**
   - Click [Cancel]
   - Dialog closes
   - Project still visible in list
   - Tab count unchanged

6. **Delete Confirmation (Second Test)**
   - Open menu again
   - Click Delete
   - Click [Delete] button (red)
   - Expected: Confirmation dialog closes, project disappears from list

7. **Verify Deletion**
   - Project no longer in Active tab
   - Project no longer in Archived tab
   - Tab count decreased by 1
   - Refreshing page doesn't restore project

### API Verification

```bash
# Verify project was deleted
curl -s http://localhost:8000/projects/ | python3 -c "
import sys, json
projects = json.load(sys.stdin)
count = len(projects)
print(f'Remaining projects: {count}')
"

# Verify via direct endpoint (should return 404)
curl -s -w '\nStatus: %{http_code}\n' http://localhost:8000/projects/DELETED_ID
```

### Important Notes

- ⚠️ DELETE IS PERMANENT - no recovery
- ⚠️ Cascades to all findings and instances
- ✅ Confirmation dialog prevents accidental deletes
- ✅ Menu allows easy re-access (no confirmation on hover)

---

## Feature 7: Tabs and Organization ✅

### Test Steps

1. **Create Multiple Projects**
   - Create 3 active projects
   - Archive 1 project
   - Tab shows: "Active (3)" and "Archived (1)"

2. **Active Tab (Default)**
   - Click "Active (3)" tab
   - Should show 3 projects
   - All project cards appear normal opacity
   - [View Dashboard] buttons enabled

3. **Archived Tab**
   - Click "Archived (1)" tab
   - Should show 1 project (the archived one)
   - Project card dimmed
   - Archive date visible
   - [View Dashboard] button disabled

4. **Switch Tabs Multiple Times**
   - Tab A → Tab B → Tab A
   - Should remember scroll position (browser default)
   - No errors in console

5. **Tab Counts Update Dynamically**
   - From Archived tab, unarchive project
   - Count updates: "Archived (0)"
   - From Active tab, archive project
   - Count updates: "Active (2)", "Archived (1)"

---

## Full Integration Test (End-to-End)

### Complete Workflow

```
START
  ↓
1. Create "E2E Test Project"
  ↓ (Verify: appears in Active tab)
  ↓
2. Rename to "E2E Renamed"
  ↓ (Verify: name updated)
  ↓
3. Export to JSON
  ↓ (Verify: file downloaded and valid)
  ↓
4. Archive project
  ↓ (Verify: moved to Archived tab, dimmed)
  ↓
5. Unarchive project
  ↓ (Verify: back in Active tab, normal opacity)
  ↓
6. Delete project
  ↓ (Verify: gone, no longer visible)
  ↓
END ✅
```

### Execution

```bash
# Run this sequence manually in browser:
1. Click [Create Project]
2. Name: "E2E Test Project", Consultant: "E2E"
3. Click [Create]
4. Click menu → Rename
5. Change name to "E2E Renamed"
6. Click [Save]
7. Click menu → Export (check downloads)
8. Click menu → Archive
9. Click "Archived (1)" tab
10. Click menu on project → Unarchive
11. Click "Active (X)" tab (verify return)
12. Click menu → Delete
13. Click [Delete] (red button)
14. Verify project gone ✅
```

---

## Error Scenarios & Recovery

### Scenario 1: Network Error During Create
```
User clicks Create, network disconnects
Expected: Toast/alert shows error
Recovery: Retry - create button still clickable
```

### Scenario 2: Rapid Click Delete Multiple Times
```
User clicks delete, immediately clicks again
Expected: Confirmation shows once only
Recovery: Cancel first, then retry
```

### Scenario 3: Close Browser During Archive
```
User closes tab, browser crashes
Expected: Server persists state (DB committed)
Recovery: Reopen app, archived state preserved
```

### Scenario 4: Enter Special Characters in Name
```
User enters: "Project <Test> & Export!"
Expected: Saves as-is (no sanitization needed)
Recovery: Export filename sanitizes: underscores
```

---

## Browser Compatibility Testing

### Recommended Browsers

- ✅ Chrome 120+
- ✅ Firefox 121+
- ✅ Safari 17+
- ✅ Edge 120+

### Test Cases per Browser

1. Create project
2. Open menu and verify all 4 items visible
3. Export and verify download works
4. Archive and unarchive
5. Check responsive design (F12 DevTools)
   - Desktop: 1920x1080
   - Tablet: 768x1024
   - Mobile: 375x667

---

## Performance Testing

### Load Test: Create 50 Projects

```bash
# Script to create 50 projects
for i in {1..50}; do
  curl -s -X POST http://localhost:8000/projects/ \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"Project $i\", \"consultant_name\": \"Consultant\"}" > /dev/null
  echo "Created project $i"
done

# Frontend should still be responsive
# - Tab loading < 1 second
# - Scrolling smooth
# - Menu opens instantly
```

### Memory Usage

- Open DevTools (F12)
- Performance tab
- Create/delete/rename projects 10 times each
- Monitor memory (should not leak)

---

## Console Output Verification

### Expected Console Logs (when API calls complete)

```javascript
// After Create:
// (no errors, just normal React renders)

// After Rename:
// (no errors)

// After Export:
// (may see: "Downloaded: test_project_export.json")

// After Delete:
// (no errors - cascading delete completes on backend)
```

### Check for Errors

```bash
# Open DevTools Console (F12)
# Should see NO red errors
# Only normal info/debug logs allowed
# Check for:
# - ❌ 404 errors
# - ❌ 500 errors
# - ❌ "Cannot read property of undefined"
```

---

## Accessibility Testing

### Keyboard Navigation

1. **Tab Through Elements**
   ```
   Tab → Focus on [Create Project] button
   Tab → Focus on first project [View Dashboard]
   Tab → Focus on menu icon [≡]
   Tab → Focus enters menu, cycles through items
   ```

2. **Dialog Navigation**
   ```
   Tab → Focus in text field
   Tab → Focus on [Save] button
   Shift+Tab → Back to text field
   Escape → Close dialog
   ```

3. **Screen Reader (if available)**
   ```
   Should announce:
   - "Assessment Projects heading"
   - "Create Project button"
   - "Project card: [name], [consultant]"
   - "Menu button with more actions"
   - Dialog title and fields
   ```

---

## Checklist: Manual Test Sign-Off

### Backend API (✓ = Working)
- [ ] `POST /projects/` creates project with all fields
- [ ] `PUT /projects/{id}` updates name and consultant
- [ ] `PUT /projects/{id}` toggles is_archived flag
- [ ] `DELETE /projects/{id}` removes project
- [ ] 404 errors for non-existent projects
- [ ] All responses return correct status codes

### Frontend UI (✓ = Working)
- [ ] Create Project button visible and clickable
- [ ] Create dialog appears with two text fields
- [ ] Can create project and see in list
- [ ] Menu (≡) icon appears on each project
- [ ] Menu shows all 4 actions
- [ ] Rename dialog prefills current values
- [ ] Export downloads JSON file
- [ ] Archive moves to Archived tab
- [ ] Unarchive moves back to Active tab
- [ ] Delete shows confirmation dialog
- [ ] Confirmation dialog shows project name
- [ ] Delete removes project permanently

### Tabs & Organization (✓ = Working)
- [ ] Active tab shows only non-archived projects
- [ ] Archived tab shows only archived projects
- [ ] Tab counts are accurate
- [ ] Tab counts update dynamically
- [ ] Archived projects appear dimmed
- [ ] View Dashboard disabled for archived

### Error Handling (✓ = Working)
- [ ] Cannot create project without name
- [ ] Cannot rename project without name
- [ ] Cancel buttons work on all dialogs
- [ ] Menu closes when clicking elsewhere
- [ ] No console errors
- [ ] Network errors handled gracefully

### Performance (✓ = Working)
- [ ] Page loads in < 3 seconds
- [ ] Menu opens instantly
- [ ] Dialogs appear without lag
- [ ] Scrolling smooth with 50+ projects
- [ ] Tab switching instant

### Accessibility (✓ = Working)
- [ ] Can navigate with keyboard only
- [ ] Tab order is logical
- [ ] Can close dialogs with Escape
- [ ] Delete button is red (clear danger)
- [ ] Confirmation dialogs are clear

---

## Known Issues & Workarounds

### None Currently Identified ✅

All features working as expected. Report any issues to development team.

---

## Testing Report Template

When testing is complete, provide report with:

```markdown
# Project Quick Actions Testing Report

**Date**: [Date Tested]
**Tester**: [Name]
**Browser**: [Browser/Version]
**Platform**: [OS/Platform]

## Results Summary
- ✅ Feature 1: Create Project
- ✅ Feature 2: Rename Project
- ✅ Feature 3: Export Project
- ✅ Feature 4: Archive Project
- ✅ Feature 5: Unarchive Project
- ✅ Feature 6: Delete Project
- ✅ Feature 7: Tabs/Organization

## Issues Found
[List any bugs/issues]

## Performance Notes
[Any performance issues or observations]

## Browser Compatibility
[Notes on tested browsers]

## Recommendations
[Suggestions for improvements]

## Sign-Off
- Tester: _______ Date: _______
- Developer: _______ Date: _______
```

---

**Total Testing Time**: ~30-45 minutes for complete coverage

**Quick Test**: ~10 minutes (core features only)

**Status**: Ready for Testing ✅
