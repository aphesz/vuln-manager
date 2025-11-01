# Changelog Guidelines

**Rule**: Keep the Changelog.md brief and focused. Combine same-day commits into single versions.

## Format Template

```markdown
## [X.Y.Z] - Date (YYYY-MM-DD)

### ✨ Added
- **Feature Name** - Brief 1-line description

### 🐛 Fixed
- **Issue Name** - Brief 1-line description

### 📝 Changed
- **File/Component** - Brief 1-line description

### 📊 Build Info
- Build hash: `index-XXXXX.js`
- Status: ✅ Production ready
```

## Guidelines

### 1. **Combine Same-Day Work**
- If multiple commits happen on same day, combine into ONE version number
- Example: All work on October 30 → v1.1.0

### 2. **Keep Descriptions Brief**
- ✅ **Good**: "Added theme toggle button to header"
- ❌ **Bad**: "Added a new theme toggle button to the application header that allows users to switch between light and dark modes with smooth CSS transitions and proper icon rendering"

### 3. **Use Bullet Points**
- One feature/fix per line
- Bold the feature name
- Follow with hyphen and description

### 4. **Include Build Hash**
- Always include the build hash that deployed the changes
- Format: `index-XXXXX.js` (from webpack/vite build output)

### 5. **Only Include Essentials**
- ❌ Don't include: Individual test cases, step-by-step implementation details, version numbers for dependencies
- ✅ Do include: What changed, why it matters, build verification

### 6. **Sections to Use**
- `✨ Added` - New features
- `🐛 Fixed` - Bug fixes
- `📝 Changed` - Changes to existing functionality
- `⚠️ Deprecated` - Soon-to-be removed features (rare)
- `🗑️ Removed` - Removed features (rare)
- `🔒 Security` - Security fixes (if applicable)
- `📊 Build Info` - Build hash and deployment status

## Example

### ✅ Good Example

```markdown
## [1.2.0] - November 1, 2025

### ✨ Added
- **WebSocket Real-Time Updates** - Live finding notifications
- **Project Search** - Full-text search for projects and findings

### 🐛 Fixed
- Dashboard loading lag on large datasets
- Export button text color in dark mode

### 📝 Changed
- FindingsTable now uses virtual scrolling for 1000+ items
- Risk chart colors updated for better contrast

### 📊 Build Info
- Build hash: `index-AbCdEfGh.js`
- Status: ✅ Production ready
```

### ❌ Bad Example (Too Verbose)

```markdown
## [1.2.0] - November 1, 2025

### Added
- WebSocket Real-Time Updates feature
  - Implementation uses Socket.io library
  - Connected to backend WebSocket endpoint
  - Sends notifications every 5 seconds
  - Updated UserPreferencesService
  - Modified Dashboard component to handle events
  - Added 3 new event listeners
  - Tested with 50 concurrent connections
  
- Project Search functionality
  - Uses Elasticsearch backend
  - Configured with Lucene analyzer
  - Supports regex patterns
  - Case-insensitive search
  - Response time < 100ms
  - Cached results for 5 minutes
```

## Workflow

1. **Make code changes** across one or more files
2. **Commit to git** with proper commit messages
3. **At end of day**: Update Changelog.md with ONE entry combining all changes
4. **Format**: Follow template above
5. **Include**: Build hash from successful build
6. **Commit**: `git commit -m "docs: update Changelog for [feature name] (v1.2.0)"`

## Quick Checklist

- [ ] Combined all same-day commits into single version
- [ ] Used brief 1-line descriptions (max 80 chars)
- [ ] Bolded feature/file names
- [ ] Included build hash
- [ ] Added build status
- [ ] Removed implementation details
- [ ] Removed test case descriptions
- [ ] File is concise (aim for <400 lines total)

## Examples of Descriptions

| Feature | ✅ Good | ❌ Bad |
|---------|--------|--------|
| Dark Mode | "Professional dark theme with WCAG AA contrast" | "Added dark mode which changes the background color to #0d1117 and text color to #e6edf3, also includes smooth CSS transitions when toggling between modes" |
| Bug Fix | "Fixed Dashboard title color in light mode" | "The dashboard title was hard to read in light mode because it was using the wrong CSS class, we fixed it by adding theme.palette.text.primary" |
| UI Change | "Improved project card spacing and typography" | "We adjusted the margin-bottom from 16px to 20px and also increased the font-weight from 400 to 600 for better visual hierarchy" |

## Questions?

For any questions about Changelog format, refer back to this guide or check recent entries in Changelog.md for consistency.
