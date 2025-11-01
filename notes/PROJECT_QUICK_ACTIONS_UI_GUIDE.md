# Project Quick Actions - UI Guide

## Projects List Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│  🏠 VulnManager Dashboard                    ☀️  ⚙️          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📋 Assessment Projects          [+ Create Project]         │
│                                                              │
│  [ Active (3) ]  [ Archived (0) ]  ← Tab control           │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Project 1                                  [▼]      │   │
│  │ Consultant: Consultant 1                           │   │
│  │          [View Dashboard]  [≡ Menu]              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Project 2                                  [▼]      │   │
│  │ Consultant: Consultant 2                           │   │
│  │          [View Dashboard]  [≡ Menu]              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Project 3                                  [▼]      │   │
│  │ Consultant: Consultant 3                           │   │
│  │          [View Dashboard]  [≡ Menu]              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Quick Actions Menu (Dropdown)

When clicking the [≡] Menu icon on a project card:

```
┌──────────────────────┐
│ ✏️  Rename           │  ← Edit project name/consultant
├──────────────────────┤
│ ⬇️  Export           │  ← Download as JSON
├──────────────────────┤
│ 📦 Archive           │  ← Hide from active list
│    (or Unarchive)    │
├──────────────────────┤
│ 🗑️  Delete           │  ← Remove permanently (red)
└──────────────────────┘
```

## Dialogs

### 1️⃣ Create Project Dialog

```
╔════════════════════════════════╗
║  Create New Project            ║
╠════════════════════════════════╣
║                                ║
║  Project Name                  ║
║  ┌──────────────────────────┐  ║
║  │ [Enter project name...]  │  ║
║  └──────────────────────────┘  ║
║                                ║
║  Consultant Name (optional)    ║
║  ┌──────────────────────────┐  ║
║  │ [Enter consultant name]  │  ║
║  └──────────────────────────┘  ║
║                                ║
║  [Cancel]         [Create]     ║
╚════════════════════════════════╝
```

### 2️⃣ Rename Project Dialog

```
╔════════════════════════════════╗
║  Rename Project                ║
╠════════════════════════════════╣
║                                ║
║  Project Name                  ║
║  ┌──────────────────────────┐  ║
║  │ Current Project Name     │  ║
║  └──────────────────────────┘  ║
║                                ║
║  Consultant Name               ║
║  ┌──────────────────────────┐  ║
║  │ Current Consultant       │  ║
║  └──────────────────────────┘  ║
║                                ║
║  [Cancel]         [Save]       ║
╚════════════════════════════════╝
```

### 3️⃣ Delete Confirmation Dialog

```
╔════════════════════════════════╗
║  Delete Project                ║
╠════════════════════════════════╣
║                                ║
║  Are you sure you want to      ║
║  delete "Project 1"?           ║
║                                ║
║  This action cannot be undone. ║
║  All findings and instances    ║
║  will be permanently deleted.  ║
║                                ║
║  [Cancel]      [Delete]        ║
║                 (red button)    ║
╚════════════════════════════════╝
```

## Archived Tab Example

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  [ Active (2) ]  [ Archived (1) ]  ← Showing Archived tab  │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Project 3 (appears dimmed)         [▼]      │   │
│  │ Consultant: Consultant 3                           │   │
│  │ Archived: 10/30/2025         (📝 timestamp added)  │   │
│  │          [View Dashboard (disabled)] [≡ Menu]    │   │
│  └─────────────────────────────────────────────────────┘   │
│     Note: Dashboard button is disabled for archived        │
│     projects. Unarchive to access again.                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Feature Flow Diagram

```
START
  │
  ├─→ [Create Project] ─→ Dialog ─→ POST /projects/ ─→ New Project Added ✅
  │
  ├─→ [View Dashboard] ─→ Project Details Page
  │
  ├─→ [Menu] ─→ ├─→ Rename ─→ Dialog ─→ PUT /projects/{id} ✅
  │             │
  │             ├─→ Export ─→ Download JSON file ✅
  │             │
  │             ├─→ Archive ─→ PUT /projects/{id} ✅
  │             │             (is_archived=true)
  │             │
  │             └─→ Delete ─→ Confirmation ─→ DELETE /projects/{id} ✅
  │                          (Cascades to findings/instances)
  │
  └─→ Archived Tab ─→ Shows archived projects
                      │
                      └─→ Can Unarchive ─→ Moves back to Active
```

## Keyboard Shortcuts (Future Enhancement)

```
Currently not implemented, but could add:

Ctrl+N / Cmd+N    - Create new project
Ctrl+E / Cmd+E    - Export selected project
Escape            - Close dialogs
Enter             - Submit forms in dialogs
```

## Icons Used

| Icon | Name | Action |
|------|------|--------|
| ➕ | AddIcon | Create Project button |
| ✏️ | EditIcon | Rename project |
| ⬇️ | DownloadIcon | Export project |
| 📦 | ArchiveIcon | Archive project |
| 📂 | UnarchiveIcon | Unarchive project |
| 🗑️ | DeleteIcon | Delete project |
| ≡ | MoreVertIcon | Open menu |

---

## Color Scheme

- **Primary Actions**: Blue (#1976d2)
- **Dangerous Actions**: Red (error.main) for Delete
- **Archived Projects**: Opacity 0.7 (dimmed)
- **Success**: Green (after API success)
- **Error**: Red (if API fails)

---

## Responsive Behavior

### Desktop (> 600px)
- All buttons visible
- Menu items horizontal on hover
- Full project names displayed

### Tablet (600px - 900px)
- Buttons compressed
- More menu emphasized
- Project names may truncate

### Mobile (< 600px)
- Stacked layout
- Menu becomes primary way to access actions
- Consider adding hamburger menu in future

---

## Accessibility Features

✅ **Implemented**
- Semantic HTML (Dialog, Button, Menu components)
- Proper button labeling
- Tab navigation support
- Color not only indicator (icons + text)
- Confirmation for destructive actions

⚠️ **To Add**
- ARIA labels for icons
- Screen reader announcements for dialogs
- Focus management in dialogs
- Keyboard shortcuts

---

## Testing Quick Reference

### Happy Path (Create → Rename → Archive → Unarchive → Delete)
```
1. Click [Create Project] → Create "Test Project"
2. Click [Menu] → Rename → Change to "Test Renamed"
3. Click [Menu] → Archive → Move to Archived tab
4. Click [Menu] → Unarchive → Move back to Active
5. Click [Menu] → Delete → Confirm → Project gone ✅
```

### Error Cases
```
- Create without name → Alert: "Project name is required"
- Create with duplicate name → Should succeed (currently allows)
- Delete → Cancel → Dialog closes, project remains ✅
- Archive active project → Moves to Archive tab ✅
- View Dashboard (archived) → Button disabled ✅
```

---

**Last Updated**: October 30, 2025  
**Status**: Production Ready ✅
