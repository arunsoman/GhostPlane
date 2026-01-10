# NLB+ Production Deployment

## Quick Start

### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+

### Deploy with Docker Compose

1. **Clone and navigate to the project:**
   ```bash
   cd /home/arun/GhostVM/nlb
   ```

2. **Configure environment (optional):**
   ```bash
   cp .env.example .env
   # Edit .env to set custom credentials
   ```

3. **Deploy:**
   ```bash
   ./scripts/deploy.sh
   ```

4. **Access the application:**
   - **UI**: http://localhost:3000
   - **API**: http://localhost:8081
   - **Proxy**: http://localhost:8080

5. **Default credentials:**
   - Username: `admin`
   - Password: `admin123`
   - **⚠️ Change these in production!**

### Management Commands

```bash
# View logs
docker-compose logs -f

# Stop services
./scripts/stop.sh

# Rebuild images
./scripts/build.sh

# Restart services
docker-compose restart
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NLB_JWT_SECRET` | `change-this-in-production-please` | JWT signing secret |
| `NLB_ADMIN_USERNAME` | `admin` | Admin username |
| `NLB_ADMIN_PASSWORD` | `admin123` | Admin password |
| `NEXT_PUBLIC_API_URL` | `http://nlb-backend:8081` | API URL for UI |

### Security Notes

1. **Change default credentials** before deploying to production
2. **Use a strong JWT secret** (32+ random characters)
3. **Enable HTTPS** with a reverse proxy (nginx/Caddy)
4. **Restrict network access** to management ports

### Troubleshooting

**Services won't start:**
```bash
# Check logs
docker-compose logs

# Ensure ports are free
lsof -i:3000 -i:8080 -i:8081
```

**UI can't connect to API:**
- Check `NEXT_PUBLIC_API_URL` in `.env`
- Ensure backend is healthy: `curl http://localhost:8081/health`

**Authentication fails:**
- Verify credentials in `.env`
- Check backend logs: `docker-compose logs nlb-backend`
