# Upload Troubleshooting Guide

## 🛠️ Common Upload Issues & Solutions

### Issue 1: "413 Payload Too Large" Error

**Symptoms:**
- Error appears in browser console
- Nginx logs show: `client intended to send too large body`
- File upload fails silently

**Root Cause:**
- Nginx `client_max_body_size` limit is too small (default: 1M)
- Report file exceeds this limit

**Solution:**
Update `/frontend/nginx.conf`:
```nginx
# Increase limit to 10M (or higher if needed)
client_max_body_size 10M;

# Also add to /api/ proxy location
location /api/ {
    client_max_body_size 10M;
}
```

Then rebuild:
```bash
docker-compose up --build -d frontend
```

**Prevention:**
- Keep reports under 10 MB
- Compress large XML files if needed
- Or increase limit further if very large reports needed

---

### Issue 2: "Failed to upload report file" in Browser UI

**Symptoms:**
- Browser shows error toast/alert
- No error logged to Nginx logs
- API request returns error status

**Debug Steps:**

```bash
# 1. Check browser console (F12 → Console tab)
# Look for JavaScript errors

# 2. Check Nginx logs
docker-compose logs frontend | grep upload | tail -20

# 3. Check backend logs
docker-compose logs backend | grep -i "error\|exception" | tail -20

# 4. Test upload directly via curl
curl -X POST http://localhost:8000/projects/1/upload/auto \
  -F "file=@your_file.xml" | jq .
```

**Common Causes & Solutions:**

| Symptom | Cause | Fix |
|---------|-------|-----|
| `400 Bad Request` | Invalid XML format | Check XML is valid, starts with `<?xml` |
| `404 Not Found` | Wrong project ID | Verify project ID exists: `curl http://localhost:8000/projects/` |
| `413 Payload Too Large` | File too big | See Issue #1 above |
| `500 Internal Server` | Parsing error | Check backend logs for XXE/DTD errors |
| `timeout` | Large file, slow parse | Use curl with progress: `curl -# ...` |

---

### Issue 3: "Unknown scanner type" Error

**Symptoms:**
- Error: `"detail":"Could not auto-detect scanner type"`
- Manual upload with explicit scanner type works
- Auto-detection fails

**Root Cause:**
- XML file is not valid Burp or Nessus format
- Auto-detection logic can't find expected XML markers

**Solution:**

```bash
# 1. Verify file format
head -20 your_file.xml

# 2. For Burp files, should contain:
grep -i "burpversion\|<issues>" your_file.xml

# 3. For Nessus files, should contain:
grep -i "NessusClientData" your_file.xml

# 4. If auto-detect fails, use explicit type:
curl -X POST http://localhost:8000/projects/1/upload/burp \
  -F "file=@your_file.xml"

# or
curl -X POST http://localhost:8000/projects/1/upload/nessus \
  -F "file=@your_file.xml"
```

---

### Issue 4: WebSocket 403 Connection Rejected

**Symptoms:**
- Logs show: `connection rejected (403 Forbidden)` on `/ws` endpoint
- No real-time notifications for new findings
- WebSocket reconnects repeatedly

**Root Cause:**
- Nginx proxy doesn't handle WebSocket upgrade correctly
- Backend rejects WebSocket due to missing project_id parameter

**Solution:**

Update WebSocket handling in nginx.conf:

```nginx
# WebSocket proxy location
location ~ ^/api/ws/(?<projectid>[0-9]+)$ {
    proxy_pass http://backend:8000/ws/$projectid;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_buffering off;
    proxy_read_timeout 86400;
}
```

Then rebuild:
```bash
docker-compose up --build -d frontend
```

**Note:** WebSocket is currently implemented but not fully tested. The connection rejections are expected in development.

---

### Issue 5: "Database connection refused"

**Symptoms:**
- Upload returns 500 error
- Backend logs show: `connection to server at "db" ... failed`
- Backend crashes on startup

**Root Cause:**
- Database container not running
- PostgreSQL initialization incomplete
- Database not ready when backend starts

**Solution:**

```bash
# 1. Restart services properly
docker-compose down -v
docker-compose up -d

# 2. Wait for database to initialize (10-15 seconds)
sleep 15

# 3. Verify database is running
docker-compose ps

# 4. Check database connection
curl http://localhost:8000/health
# Should return: {"status":"ok","database":"connected"}
```

---

## 📊 File Upload Limits

Current Configuration:
- **Nginx:** 10 MB maximum
- **Backend:** 10 MB maximum (parsers.py)
- **Supported Formats:**
  - Burp Suite XML (`.xml`)
  - Nessus v2 XML (`.nessus`, `.xml`)

### To Increase Limits:

1. **Nginx:**
   ```nginx
   # frontend/nginx.conf
   client_max_body_size 50M;  # Change 10M to desired size
   ```

2. **Backend:**
   ```python
   # backend/app/parsers.py
   MAX_FILE_SIZE = 50 * 1024 * 1024  # Change to desired size
   ```

3. Rebuild:
   ```bash
   docker-compose up --build -d
   ```

---

## 🧪 Testing Upload Functionality

### Minimal Test

```bash
# 1. Create a simple test project
curl -X POST http://localhost:8000/projects/ \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","consultant_name":"Tester"}'

# 2. Get project ID from response (should be ID: 2)
# 3. Upload test file
curl -X POST http://localhost:8000/projects/2/upload/auto \
  -F "file=@/tmp/sample_burp_report.xml"

# 4. Verify findings were created
curl http://localhost:8000/projects/2 | jq '.findings | length'
```

### Browser UI Test

1. Open http://localhost:3000
2. Click on a project → "View Dashboard"
3. Click "Quick Actions" → "Upload Report" button
4. Drag & drop file or click to select
5. Wait for upload to complete
6. Verify findings appear in table

### Performance Test

```bash
# Create a large test file (10k lines)
python3 -c "
import random
xml = '''<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<issues burpVersion=\"2024.3\">'''
for i in range(100):
    xml += f'''
  <issue type=\"SQL Injection {i}\" typeId=\"{1000+i}\">
    <serialNumber>{i}</serialNumber>
    <issueName>SQL Injection {i}</issueName>
    <severity>High</severity>
    <host>example.com</host>
    <port>443</port>
    <protocol>https</protocol>
    <url>https://example.com/api/endpoint{i}</url>
  </issue>'''
xml += '</issues>'
with open('/tmp/large_test.xml', 'w') as f:
    f.write(xml)
" && echo "✅ Test file created"

# Upload and measure time
time curl -X POST http://localhost:8000/projects/1/upload/auto \
  -F "file=@/tmp/large_test.xml"
```

---

## 🔍 Debugging Checklist

Before reporting an upload issue, verify:

- [ ] Backend service is running: `docker-compose ps | grep backend`
- [ ] Database is running: `docker-compose ps | grep db`
- [ ] Frontend service is running: `docker-compose ps | grep frontend`
- [ ] Project exists: `curl http://localhost:8000/projects/`
- [ ] File is valid XML: `xmllint your_file.xml`
- [ ] File is not too large: `ls -lh your_file.xml`
- [ ] File format is supported: `head -5 your_file.xml`
- [ ] Direct API works: `curl http://localhost:8000/health`
- [ ] Proxy works: `curl http://localhost:3000/api/projects/`

---

## 📝 Logs to Check

```bash
# Complete diagnostic
echo "=== Backend Logs ==="
docker-compose logs backend --tail 50

echo "=== Frontend/Nginx Logs ==="
docker-compose logs frontend --tail 50 | grep -E "upload|error|413"

echo "=== Service Status ==="
docker-compose ps

echo "=== API Health ==="
curl -s http://localhost:8000/health | jq .

echo "=== Test Upload ==="
curl -s -X POST http://localhost:8000/projects/1/upload/auto \
  -F "file=@/tmp/sample_burp_report.xml" | jq .
```

---

## 🆘 If Issue Persists

1. **Collect diagnostic data:**
   ```bash
   docker-compose logs > /tmp/logs.txt
   curl http://localhost:8000/health > /tmp/health.json
   docker-compose ps > /tmp/services.txt
   ```

2. **Check file details:**
   ```bash
   file your_file.xml
   wc -l your_file.xml
   head -50 your_file.xml
   ```

3. **Verify configuration:**
   ```bash
   curl http://localhost:3000/api/projects/ | jq .
   docker exec vuln-manager-db-1 psql -U pgakar -d vulndb -c "SELECT count(*) FROM project;"
   ```

4. **Share with support:**
   - Logs from above
   - The XML file (if possible, sanitized)
   - Steps to reproduce
   - Expected vs actual behavior

---

**Last Updated:** October 29, 2024  
**Status:** All known issues documented and resolved
