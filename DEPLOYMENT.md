# RAPI Retrieval System - Deployment Guide

## Overview

This guide covers the complete deployment infrastructure for the RAPI knowledge corpus retrieval system, including API server, monitoring, and production-ready configurations.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx Proxy   │────│   RAPI API      │────│  Knowledge      │
│   (Port 80/443) │    │   (Port 3000)   │    │  Corpus         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                       ┌────────┴────────┐
                       │                 │
                ┌──────▼──────┐   ┌──────▼──────┐
                │ Prometheus  │   │   Grafana   │
                │ (Port 9090) │   │ (Port 3001) │
                └─────────────┘   └─────────────┘
```

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 14+ (for local development)
- Git

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the API server:**
   ```bash
   npm start
   # or
   node api/server.js
   ```

3. **Test with the client:**
   ```bash
   node client/example_client.js
   ```

### Docker Deployment

1. **Deploy to development environment:**
   ```bash
   chmod +x deployment/deploy.sh
   ./deployment/deploy.sh dev
   ```

2. **Deploy to production:**
   ```bash
   ./deployment/deploy.sh prod
   ```

## Configuration

### Environment Variables

Create environment files for different environments:

**`.env.dev`** (Development):
```bash
NODE_ENV=development
PORT=3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
ENABLE_FILE_LOGGING=true
```

**`.env.prod`** (Production):
```bash
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://your-domain.com
ENABLE_FILE_LOGGING=true
GRAFANA_PASSWORD=your-secure-password
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/retrieve` | Main retrieval endpoint |
| GET | `/api/status` | System status and metrics |
| GET | `/api/config` | Configuration (read-only) |

### Retrieval Endpoint Usage

```bash
curl -X POST http://localhost:3000/api/retrieve \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Bagaimana cara merespons atasan yang menyindir?",
    "context": {
      "user_role": "subordinate",
      "channel": "public"
    }
  }'
```

## Monitoring

### Prometheus Metrics

The system exposes metrics at `/metrics` (when configured):
- Request rate and response times
- Error rates by endpoint
- System resource usage
- Retrieval performance metrics

### Grafana Dashboards

Access Grafana at `http://localhost:3001` (admin/admin):

- **API Performance**: Response times, request rates
- **System Health**: Memory, CPU usage
- **Retrieval Metrics**: Chunk usage, processing times
- **Error Tracking**: Error rates and types

### Log Monitoring

Request logs are stored in `logs/requests-YYYY-MM-DD.log`:
```json
{
  "timestamp": "2026-01-31T15:30:00.000Z",
  "ip": "127.0.0.1",
  "user_agent": "axios/1.6.2",
  "input_length": 45,
  "response_mode": "guided",
  "chunks_used": 8,
  "processing_time_ms": 67,
  "risk_level": "medium"
}
```

## Security

### Rate Limiting

- **API endpoints**: 100 requests per 15 minutes per IP
- **Health checks**: 30 requests per 15 minutes per IP
- **Nginx layer**: Additional rate limiting

### Security Headers

- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: "1; mode=block"
- Referrer-Policy: strict-origin-when-cross-origin

### Input Validation

- Maximum input length: 1000 characters
- Request body size limit: 10MB
- Content-type validation

## Production Considerations

### SSL/TLS Configuration

1. **Obtain SSL certificates** (Let's Encrypt recommended)
2. **Place certificates** in `deployment/ssl/`
3. **Update nginx.conf** with SSL configuration
4. **Uncomment HTTPS server block**

### Scaling

#### Horizontal Scaling

```yaml
# docker-compose.scale.yml
version: '3.8'
services:
  rapi-api:
    deploy:
      replicas: 3
    # ... other config
```

#### Load Balancing

Nginx provides load balancing across multiple API instances.

### Backup Strategy

1. **Knowledge Corpus**: Version-controlled in Git
2. **Logs**: Rotate and archive to S3/cloud storage
3. **Metrics**: Prometheus retention (200h default)

### Performance Optimization

1. **Enable Gzip compression** (configured in Nginx)
2. **Use CDN** for static assets
3. **Optimize chunk sizes** if needed
4. **Monitor memory usage** and adjust limits

## Troubleshooting

### Common Issues

1. **API not responding:**
   ```bash
   docker-compose logs rapi-api
   curl http://localhost:3000/health
   ```

2. **High memory usage:**
   ```bash
   docker stats
   # Consider reducing max_chunks in retrieval_rules.json
   ```

3. **Slow responses:**
   ```bash
   # Check processing time in logs
   tail -f logs/requests-$(date +%Y-%m-%d).log
   ```

### Health Checks

```bash
# API health
curl -f http://localhost:3000/health

# System status
curl http://localhost:3000/api/status

# Through Nginx
curl http://localhost/health
```

## Maintenance

### Updates

1. **Update knowledge corpus:**
   ```bash
   # Run ingestion pipeline
   node ingestion/run_ingestion.js
   
   # Restart services
   docker-compose restart rapi-api
   ```

2. **Update application:**
   ```bash
   git pull
   docker-compose up -d --build
   ```

### Monitoring Setup

1. **Configure alerts** in Grafana/Prometheus
2. **Set up log aggregation** (ELK stack recommended)
3. **Configure uptime monitoring** (Pingdom, UptimeRobot)

## Support

For deployment issues:
1. Check logs: `docker-compose logs -f`
2. Verify configuration files
3. Test with example client
4. Review health checks

---

**Deployment Status**: ✅ Production Ready  
**Last Updated**: 2026-01-31  
**Version**: 1.0
