# VulnManager v0.6.0 User Guide
## Dashboard Analytics & Enhanced Export Features

**Version**: 0.6.0  
**Release Date**: November 5, 2025  
**Audience**: End Users, Security Analysts, Project Managers

---

## 📋 Table of Contents

1. [What's New in v0.6.0](#whats-new-in-v060)
2. [Dashboard Widgets](#dashboard-widgets)
3. [Export Dialog](#export-dialog)
4. [Quick Start Guide](#quick-start-guide)
5. [Common Tasks](#common-tasks)
6. [Tips & Best Practices](#tips--best-practices)
7. [Troubleshooting](#troubleshooting)

---

## What's New in v0.6.0

v0.6.0 introduces powerful dashboard analytics and enhanced export capabilities to help you track project health and extract data more efficiently.

### New Features at a Glance

✨ **4 Dashboard Widgets** - Real-time project metrics  
📊 **SLA Compliance Tracking** - Monitor deadline adherence  
👥 **Review Progress** - Track peer review workflow  
🎯 **Top Vulnerabilities** - Identify most common issues  
📤 **Enhanced Export** - Customizable Excel/CSV export with filters  

---

## Dashboard Widgets

Access your project dashboard by clicking on any project name. You'll see four informative widgets providing instant insights into your project's status.

### 1. SLA Compliance Widget

**What it shows**: Deadline adherence for all findings in your project.

**Visual Elements**:
- **Circular Progress Bar**: Overall compliance percentage
- **Color Coding**:
  - 🟢 **Green**: On-track findings (deadline not approaching)
  - 🟡 **Yellow**: At-risk findings (deadline approaching)
  - 🔴 **Red**: Overdue findings (past deadline)

**How to Read It**:
```
Example Display:
┌─────────────────────┐
│   SLA Compliance    │
│                     │
│      [75%]          │  ← Compliance Rate
│   ●●●●●●●○○○        │
│                     │
│  On Track: 15       │
│  At Risk: 3         │
│  Overdue: 2         │
└─────────────────────┘
```

**What to Do**:
- **High Compliance (>80%)**: ✅ Project on track
- **Medium Compliance (50-80%)**: ⚠️ Review at-risk items
- **Low Compliance (<50%)**: 🚨 Immediate attention needed

**Pro Tip**: Click on the overdue count to filter your findings list to only show overdue items (future feature).

---

### 2. Review Progress Widget

**What it shows**: Status of peer review workflow across all findings.

**Visual Elements**:
- **Linear Progress Bar**: Percentage of findings approved
- **Status Breakdown**:
  - **Pending**: Not yet submitted for review
  - **In Review**: Currently being reviewed
  - **Approved**: Review complete and approved
  - **Rejected**: Review complete but rejected

**How to Read It**:
```
Example Display:
┌─────────────────────────────┐
│    Review Progress          │
│                             │
│  Completion: 25%            │
│  ████████░░░░░░░░░░░░░      │
│                             │
│  [Pending: 10] [In Review: 5]
│  [Approved: 3] [Rejected: 2]│
└─────────────────────────────┘
```

**What to Do**:
- **High Pending Count**: Assign findings for review
- **High In Review Count**: Follow up with reviewers
- **High Rejection Rate**: Review and address feedback

**Pro Tip**: Hover over each status chip to see which specific findings are in that state.

---

### 3. Top Vulnerabilities Widget

**What it shows**: The 5 most frequently occurring vulnerability types in your project.

**Visual Elements**:
- **Ranked List**: Ordered by instance count (most to least)
- **Risk Badges**: Color-coded risk rating for each vulnerability
- **Instance Count**: Number of times this vulnerability appears

**How to Read It**:
```
Example Display:
┌─────────────────────────────────┐
│   Top Vulnerabilities           │
│                                 │
│ 1. SQL Injection        [Critical] (15 instances)
│ 2. XSS                  [High]     (12 instances)
│ 3. CSRF                 [Medium]   (8 instances)
│ 4. Insecure Crypto      [Medium]   (5 instances)
│ 5. Info Disclosure      [Low]      (3 instances)
└─────────────────────────────────┘
```

**What to Do**:
- **Critical/High Risk**: Prioritize remediation
- **High Instance Count**: Consider creating remediation template
- **Trending Patterns**: Train developers on common issues

**Pro Tip**: Click on a vulnerability title to filter your findings list to show only that vulnerability type (future feature).

---

### 4. Key Metrics Overview

**What it shows**: Essential project statistics at a glance.

**Metric Cards**:

**Total Findings**
- Count of unique vulnerability types
- Includes deduplicated findings only

**Total Instances**
- Count of individual occurrences
- All instances across all findings

**Jira Sync Rate**
- Percentage of findings synced to Jira
- Shows integration health

**How to Read It**:
```
Example Display:
┌────────────┐  ┌────────────┐  ┌────────────┐
│  Findings  │  │ Instances  │  │ Jira Sync  │
│     25     │  │     43     │  │    75%     │
│            │  │            │  │            │
│ Avg: 1.72  │  │            │  │            │
└────────────┘  └────────────┘  └────────────┘
```

**Understanding Averages**:
- **Avg Instances/Finding**: Higher = more widespread issue
- Example: 1.72 means each vulnerability appears in ~2 places on average

---

## Export Dialog

The enhanced export dialog gives you complete control over what data to export and how to filter it.

### Opening the Export Dialog

1. Navigate to your project dashboard
2. Click the **"Export"** button in the top-right corner
3. The export dialog will open

### Export Format Selection

**Choose between two formats**:

**Excel (.xlsx)**
- ✅ Best for: Analysis, pivot tables, formatting
- ✅ Features: Multiple sheets, formulas, charts
- ✅ Opens in: Excel, Google Sheets, LibreOffice

**CSV (.csv)**
- ✅ Best for: Import to other tools, scripts, databases
- ✅ Features: Simple, universal, fast
- ✅ Opens in: Any spreadsheet app, text editors

**How to Choose**:
- Click the radio button next to your preferred format
- Default: Excel

---

### Column Selection

**Available Columns** (13 total):

| Column | Description | Default |
|--------|-------------|---------|
| **ID** | Finding identifier | ❌ |
| **Title** | Vulnerability name | ✅ |
| **Description** | Detailed description | ❌ |
| **Risk Rating** | Critical/High/Medium/Low | ✅ |
| **Status** | Open/In Progress/Closed | ✅ |
| **Instances** | Number of occurrences | ✅ |
| **Peer Reviewed** | Yes/No | ❌ |
| **Review Status** | Pending/Approved/etc | ❌ |
| **SLA Deadline** | Deadline date | ❌ |
| **Tags** | Custom tags | ❌ |
| **Created At** | Creation timestamp | ❌ |
| **Updated At** | Last modified timestamp | ❌ |
| **Notes** | Additional notes | ❌ |

**How to Select Columns**:

1. **Individual Selection**: Click checkboxes next to desired columns
2. **Select All**: Click "Select All" button to choose all 13 columns
3. **Deselect All**: Click "Deselect All" button to clear all selections
4. **Default Selection**: Click "Reset" to restore the 4 default columns

**Column Count Display**:
- Shows "X columns selected" in real-time
- Minimum: 1 column required
- Export button disabled if 0 columns selected

---

### Advanced Filters

Filter your export data before downloading. All filters are optional.

#### 1. Status Filter

**Options**: Open, In Progress, Closed

**How to Use**:
- Click on status chips to select/deselect
- Selected chips appear **filled**
- Unselected chips appear **outlined**
- Select multiple statuses (OR logic)

**Example**:
```
[Open●] [In Progress○] [Closed○]
→ Exports only "Open" findings
```

#### 2. Risk Rating Filter

**Options**: Critical, High, Medium, Low, Informational

**Color Coding**:
- 🔴 **Critical**: Red chip
- 🟠 **High**: Orange chip
- 🟡 **Medium**: Yellow chip
- 🟢 **Low**: Green chip
- 🔵 **Informational**: Blue chip

**How to Use**:
- Click on risk chips to select/deselect
- Selected chips appear **filled** with color
- Unselected chips appear **outlined**
- Select multiple risk levels (OR logic)

**Example**:
```
[Critical●] [High●] [Medium○] [Low○] [Info○]
→ Exports only Critical and High risk findings
```

#### 3. Tags Filter

**How to Use**:
1. Click the "Tags" dropdown
2. Select one or more tags from the list
3. Only findings with selected tags will be exported

**Example**: Select "Web App" tag to export only web application findings

#### 4. Peer Review Filter

**Options**:
- **All**: Include all findings (default)
- **Yes**: Only peer-reviewed findings
- **No**: Only non-reviewed findings

**How to Use**: Select from dropdown

#### 5. Review Status Filter

**Options**: Pending, In Review, Approved, Rejected

**How to Use**:
- Click on status chips to select/deselect
- Works same as Status filter
- Select multiple statuses (OR logic)

---

### Reset and Export

**Reset Button**:
- Restores all default settings:
  - Format: Excel
  - Columns: Title, Risk Rating, Status, Instances (4 defaults)
  - Filters: All cleared (export all data)
- Useful for starting fresh

**Export Button**:
- **Enabled**: When at least 1 column selected
- **Disabled**: When 0 columns selected
- Click to download file immediately
- File naming: `project_[ID]_findings_export.[xlsx/csv]`

---

## Quick Start Guide

### First Time User: View Dashboard

1. Log in to VulnManager
2. Click on any project name
3. View the 4 dashboard widgets
4. Check SLA compliance percentage
5. Review top vulnerabilities

**Time**: 30 seconds

---

### Export Your First Report

**Basic Export (All Data)**:
1. Click "Export" button
2. Keep default format (Excel)
3. Keep default columns (4 selected)
4. Click "Export" button
5. Open downloaded file

**Time**: 10 seconds

**Filtered Export (Critical Issues Only)**:
1. Click "Export" button
2. Select format: Excel
3. Columns: Select All (13 columns)
4. Risk Rating: Click only "Critical" chip
5. Click "Export" button
6. Review critical findings in downloaded file

**Time**: 30 seconds

---

## Common Tasks

### Task 1: Export Critical and High Risk Items for Management

**Goal**: Create a report of urgent findings for stakeholder review.

**Steps**:
1. Click "Export" button
2. Format: **Excel** (for formatting options)
3. Columns: Click "Select All" (all details needed)
4. Risk Rating: Select **Critical** and **High** chips only
5. Status: Select **Open** and **In Progress** (exclude closed)
6. Click "Export"

**Result**: Excel file with only active high-priority findings

---

### Task 2: Track Review Progress

**Goal**: Export findings pending peer review.

**Steps**:
1. Click "Export" button
2. Format: **CSV** (for import to tracking tool)
3. Columns: Title, Risk Rating, Status, Peer Reviewed, Review Status
4. Peer Review: Select **No**
5. Click "Export"

**Result**: CSV file with findings awaiting review

---

### Task 3: Monitor SLA Compliance

**Goal**: Identify findings approaching or past deadlines.

**Steps**:
1. View **SLA Compliance Widget**
2. Note the "At Risk" and "Overdue" counts
3. Click "Export" button
4. Columns: Title, Risk Rating, Status, SLA Deadline, Instances
5. Click "Export"
6. Sort Excel file by "SLA Deadline" column
7. Focus on dates in red (past) or yellow (approaching)

**Result**: Prioritized list of deadline-critical findings

---

### Task 4: Generate Weekly Summary Report

**Goal**: Create consistent weekly report for team standups.

**Steps**:
1. View dashboard widgets (screenshot for presentation)
2. Note key metrics:
   - Total findings count
   - SLA compliance percentage
   - Review completion rate
   - Top 3 vulnerabilities
3. Click "Export" button
4. Use **Reset** to restore defaults
5. Format: **Excel**
6. Columns: Keep defaults (Title, Risk Rating, Status, Instances)
7. Click "Export"

**Result**: Standardized weekly report (widgets + data export)

---

## Tips & Best Practices

### Dashboard Usage

✅ **Check dashboard daily** to monitor compliance trends  
✅ **Track week-over-week** changes in top vulnerabilities  
✅ **Set SLA targets** based on compliance widget data  
✅ **Use review progress** to identify bottlenecks  
✅ **Screenshot widgets** for stakeholder reports  

### Export Best Practices

✅ **Use Excel for analysis** - Supports sorting, filtering, formulas  
✅ **Use CSV for automation** - Easy to parse, import to other tools  
✅ **Export regularly** - Weekly snapshots track progress  
✅ **Filter before export** - Reduces file size and clutter  
✅ **Document export criteria** - Note filters used for reproducibility  

### Filtering Strategies

**For Management Reports**:
- Risk Rating: Critical + High only
- Status: Open + In Progress only
- Columns: Essential fields (Title, Risk, Status, SLA Deadline)

**For Developer Assignments**:
- Tags: Filter by team/component
- Status: Open only
- Columns: All technical details (Description, Instances, Notes)

**For Compliance Audits**:
- Columns: Select All
- Filters: None (export everything)
- Format: Excel (for official documentation)

### Performance Tips

⚡ **Parallel loading** - Dashboard loads project + metrics simultaneously  
⚡ **Responsive design** - Works on desktop, tablet, mobile  
⚡ **Filter first** - Smaller exports = faster downloads  
⚡ **Use CSV for large datasets** - Faster than Excel for 1000+ rows  

---

## Troubleshooting

### Issue: "Export button is disabled"

**Cause**: No columns selected

**Solution**: 
1. Check column selection area
2. At least 1 checkbox must be checked
3. Click "Reset" to restore 4 default columns

---

### Issue: "Exported file is empty"

**Cause**: Filters exclude all findings

**Solution**:
1. Click "Reset" to clear all filters
2. Export again
3. If still empty, project has no findings

---

### Issue: "Widgets show 'No data available'"

**Cause**: Project has no findings yet

**Solution**:
1. Upload a scan report (Burp/Nessus)
2. Or manually add findings
3. Refresh page to see updated widgets

---

### Issue: "SLA compliance shows 0%"

**Cause**: No SLA deadlines set on findings

**Solution**:
1. Edit findings to add SLA deadlines
2. Widget will update automatically
3. Or this is expected if SLA tracking not used

---

### Issue: "Excel file won't open"

**Cause**: Browser download issue or file corruption

**Solution**:
1. Try downloading again
2. Try CSV format instead
3. Check browser downloads folder
4. Disable browser ad-blockers

---

### Issue: "Widget data seems outdated"

**Cause**: Browser cache

**Solution**:
1. Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+F5)
2. Or close and reopen tab
3. Widgets fetch fresh data on page load

---

### Issue: "Risk chips are all the same color"

**Cause**: Browser caching old version

**Solution**:
1. Hard refresh browser (Cmd+Shift+R)
2. Clear browser cache
3. Expected colors:
   - Critical = Red
   - High = Orange
   - Medium = Yellow
   - Low = Green
   - Informational = Blue

---

## Keyboard Shortcuts

| Action | Shortcut | Description |
|--------|----------|-------------|
| Open Export Dialog | `E` | Quick export access |
| Close Dialog | `Esc` | Close any open dialog |
| Toggle Select All | `Ctrl+A` | In column selection |
| Reset Filters | `R` | Restore defaults |

*(Note: Keyboard shortcuts are planned for future release)*

---

## FAQ

**Q: How often does the dashboard update?**  
A: Dashboard widgets load fresh data every time you navigate to the project page. No automatic refresh while viewing.

**Q: Can I export findings from multiple projects at once?**  
A: Not yet. Each export is per-project. This feature is planned for v0.7.0.

**Q: What's the maximum number of findings I can export?**  
A: No limit. Excel supports 1M+ rows, CSV is unlimited. For very large exports (10,000+ findings), CSV is recommended.

**Q: Can I save my export filter settings?**  
A: Not yet. Each export starts fresh (or with Reset defaults). Export templates are planned for future release.

**Q: Do the widgets show historical data?**  
A: The Finding Trends widget shows 31 days of historical data. Other widgets show current snapshot only.

**Q: Can I customize which widgets appear on my dashboard?**  
A: Not yet. All 4 widgets always appear. Customization is planned for future release.

**Q: What happens if I select conflicting filters?**  
A: Filters use OR logic within a category (e.g., "Critical OR High") and AND logic across categories (e.g., "Critical/High AND Open status").

**Q: Can I export to PDF?**  
A: Not yet. PDF export is planned for v0.7.0.

---

## What's Next?

**Upcoming Features** (v0.7.0+):
- Click widgets to filter findings list
- Export templates (save filter presets)
- PDF export format
- Multi-project export
- Customizable widget layout
- Historical trend charts
- Scheduled export emails

---

## Getting Help

**Need Assistance?**
- Check this user guide first
- Review the [Troubleshooting](#troubleshooting) section
- Contact your VulnManager administrator
- File a bug report on GitHub

**Version Information**:
- Guide Version: 1.0
- Last Updated: November 5, 2025
- Applies to: VulnManager v0.6.0+

---

*Happy vulnerability managing! 🚀*
