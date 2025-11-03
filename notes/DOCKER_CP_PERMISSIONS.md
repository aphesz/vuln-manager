# Docker CP Permission Issue - Quick Reference

## Problem
After using `docker cp` to copy built frontend files to the nginx container, the application returns **403 Forbidden** errors.

## Root Cause
Files copied with `docker cp` inherit the source file permissions and ownership, which may not be readable by the nginx user inside the container.

## Symptoms
- Browser shows: `403 Forbidden`
- Nginx logs show: `open() "/usr/share/nginx/html/index.html" failed (13: Permission denied)`
- Files show incorrect permissions: `-rw-------` (600) or `drwx------` (700)

## Solution
Fix permissions inside the container after copying files:

```bash
# Fix permissions to allow nginx to read files
docker exec vuln-manager-frontend-1 chmod -R 755 /usr/share/nginx/html/

# Verify permissions are correct
docker exec vuln-manager-frontend-1 ls -la /usr/share/nginx/html/
```

Expected output:
```
drwxr-xr-x    1 root     root          4096 Nov  3 09:41 assets
-rwxr-xr-x    1 501      dialout        915 Nov  3 09:41 index.html
```

## Better Approach for Production
Instead of using `docker cp` for updates:

1. **Rebuild the container** (recommended for production):
   ```bash
   docker-compose up -d --build frontend
   ```

2. **Use a volume mount** (for development):
   ```yaml
   volumes:
     - ./frontend/dist:/usr/share/nginx/html:ro
   ```

## Quick Fix Workflow (Development)
```bash
# Build frontend
docker run --rm -v $(pwd)/frontend:/app -w /app node:20-alpine sh -c "npm install && npm run build"

# Copy to container
docker cp frontend/dist/. vuln-manager-frontend-1:/usr/share/nginx/html/

# Fix permissions
docker exec vuln-manager-frontend-1 chmod -R 755 /usr/share/nginx/html/

# Reload nginx (optional, usually not needed)
docker exec vuln-manager-frontend-1 nginx -s reload
```

## Related Issues
- Date: November 3, 2025
- Context: After implementing duplicate cleanup feature, needed to rebuild frontend
- npm build permission issue prevented full container rebuild
- Used `docker cp` as workaround, encountered 403 error
- Fixed with `chmod -R 755`
