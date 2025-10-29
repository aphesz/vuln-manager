# VulnManager - Quick Start & Development Guide

## 🚀 Quick Start

### Development Mode (with hot-reload)
```bash
cd vuln-manager
ENVIRONMENT=development docker-compose -f docker-compose.dev.yml up --build -d
# Access frontend at http://localhost:3000
# API docs at http://localhost:8000/docs
```

### Production Mode
```bash
cd vuln-manager
docker-compose up --build -d
# Access frontend at http://localhost:3000
# API at http://localhost:8000
```

### Stop Services
```bash
docker-compose down -v  # -v removes volumes (database data)
```

---

## 📋 API Quick Reference

### Projects
```bash
# List all projects
curl http://localhost:8000/projects/

# Create project
curl -X POST http://localhost:8000/projects/ \
  -H "Content-Type: application/json" \
  -d '{"name":"My Audit","consultant_name":"John Doe"}'

# Get project with findings
curl http://localhost:8000/projects/1

# Get risk summary (for charts)
curl http://localhost:8000/projects/1/risk_summary
```

### File Upload
```bash
# Upload with auto-detection (recommended)
curl -X POST http://localhost:8000/projects/1/upload/auto \
  -F "file=@report.xml"

# Upload specific format
curl -X POST http://localhost:8000/projects/1/upload/burp \
  -F "file=@report.xml"

curl -X POST http://localhost:8000/projects/1/upload/nessus \
  -F "file=@report.nessus"
```

### Report Generation
```bash
# Download PDF
curl -o report.pdf http://localhost:8000/projects/1/report.pdf

# Download DOCX
curl -o report.docx http://localhost:8000/projects/1/report.docx
```

---

## 🔧 Environment Variables

### Backend
```env
DATABASE_URL=postgresql://pgakar:katakunci@db:5432/vulndb
ENVIRONMENT=production  # or 'development'
WORKERS=2              # Number of uvicorn workers
```

### Frontend
```env
REACT_APP_API_URL=/api  # API base path (proxied by Nginx)
REACT_APP_WS_URL=ws://localhost:3000/api/ws  # WebSocket URL
```

---

## 📁 Project Structure

```
backend/
├── app/
│   ├── main.py        # FastAPI routes & middleware
│   ├── models.py      # SQLModel definitions
│   ├── parsers.py     # XML parsing logic (Burp, Nessus)
│   ├── reports.py     # PDF/DOCX generation
│   ├── websocket.py   # WebSocket connection management
│   └── db.py          # Database configuration
├── requirements.txt   # Python dependencies
└── Dockerfile         # Backend container setup

frontend/
├── src/
│   ├── main.tsx       # React entry point (Vite)
│   ├── App.tsx        # Main app router
│   ├── components/    # React components
│   │   ├── Dashboard.tsx
│   │   ├── FindingsTable.tsx
│   │   ├── ProjectsList.tsx
│   │   └── RiskChart.tsx
│   ├── services/      # API/WebSocket clients
│   │   ├── WebSocketService.ts
│   │   └── UserPreferencesService.ts
│   ├── theme/         # Material-UI theme
│   └── types.ts       # TypeScript definitions
├── package.json       # JavaScript dependencies
├── vite.config.ts     # Vite build configuration
├── nginx.conf         # Nginx SPA serving
└── Dockerfile         # Frontend container setup

docker-compose.yml      # Production orchestration
docker-compose.dev.yml  # Development with hot-reload
```

---

## 🧪 Testing

### Test Data
Pre-created sample report in `/tmp/sample_burp_report.xml` with:
- SQL Injection (High)
- Reflected XSS (High)
- Weak SSL/TLS (Medium)
- Missing Headers (Low)

### Test Deduplication
```bash
# First upload (creates 4 findings)
curl -X POST http://localhost:8000/projects/1/upload/auto \
  -F "file=@sample_burp_report.xml"

# Second upload (adds instances to existing findings)
curl -X POST http://localhost:8000/projects/1/upload/auto \
  -F "file=@sample_burp_report.xml"

# Verify: should still have 4 findings, but 8 instances
curl http://localhost:8000/projects/1 | jq '.findings | map({title, instances: (.instances | length)})'
```

---

## 🔍 Debugging

### View Backend Logs
```bash
docker-compose logs backend --tail 50
```

### View Frontend Logs
```bash
docker-compose logs frontend --tail 50
```

### Test Database Connection
```bash
docker exec vuln-manager-db-1 psql -U pgakar -d vulndb -c "SELECT COUNT(*) FROM finding;"
```

### Access Database Shell
```bash
docker exec -it vuln-manager-db-1 psql -U pgakar -d vulndb
```

### Rebuild Without Cache
```bash
docker-compose build --no-cache
docker-compose up -d
```

---

## 📝 Common Issues & Solutions

### Issue: "Connection refused" on startup
**Solution:** Wait 10 seconds for database to initialize, then manually restart backend
```bash
sleep 10 && docker-compose restart backend
```

### Issue: Frontend showing "Failed to load projects"
**Solution:** Verify backend is running and accessible
```bash
curl http://localhost:8000/projects/
# If fails, check backend logs: docker-compose logs backend
```

### Issue: Port already in use
**Solution:** Change ports in docker-compose.yml or stop conflicting services
```bash
lsof -i :3000      # Find what's using port 3000
sudo kill -9 <PID> # Kill the process
```

### Issue: File upload fails with "Unknown scanner type"
**Solution:** Ensure XML file format is valid Burp or Nessus
- Check file starts with `<?xml` and contains `<issues burpversion` or `<NessusClientData`

---

## ✅ Verification Checklist

After starting services, verify:

- [ ] Backend health check passes: `curl http://localhost:8000/health`
- [ ] Projects list returns data: `curl http://localhost:8000/projects/`
- [ ] Frontend loads: `curl http://localhost:3000`
- [ ] Frontend assets are served: Check browser Network tab (200 status)
- [ ] API proxy works: `curl http://localhost:3000/api/projects/`
- [ ] Database has tables: `docker exec vuln-manager-db-1 psql -U pgakar -d vulndb -c "\dt"`

---

## 🚢 Deployment Considerations

### Production Requirements
1. **Authentication** - Add user login before exposing to internet
2. **HTTPS** - Configure SSL/TLS certificates
3. **Environment Secrets** - Use secret management (not .env files)
4. **Database Backups** - Set up automated PostgreSQL backups
5. **Monitoring** - Add logging and alerting
6. **Rate Limiting** - Protect API from abuse
7. **Input Validation** - Already implemented, but review before production

### Scaling Recommendations
- **Increase Workers** - `WORKERS=4` for higher load
- **Database Pooling** - Adjust `pool_size` and `max_overflow`
- **Separate Database** - Move PostgreSQL to dedicated server
- **Reverse Proxy** - Add HAProxy or AWS ALB in front of Nginx
- **CDN** - Serve static assets (JS/CSS) through CDN

---

## 📚 Documentation

- **API Docs** - Available at `http://localhost:8000/docs` (Swagger UI)
- **Testing Results** - See `TESTING_RESULTS.md`
- **Copilot Instructions** - See `.github/copilot-instructions.md`
- **README** - See `README.md` for architecture overview

---

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes and test locally with docker-compose.dev.yml
3. Ensure no linting errors: `cd frontend && npm run lint`
4. Push and create pull request
5. Wait for CI/CD checks to pass

---

## 📞 Support

For issues or questions:
1. Check `TESTING_RESULTS.md` for known limitations
2. Review logs: `docker-compose logs [service] --tail 100`
3. Test with curl before reporting frontend bugs
4. Include relevant log excerpts when reporting issues

---

**Last Updated:** October 29, 2024  
**Version:** 1.0.0  
**Status:** Production Ready
