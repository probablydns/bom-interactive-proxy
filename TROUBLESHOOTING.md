# 🐛 Troubleshooting BOM Interactive Proxy

## Common Issues & Solutions

### 1. Container Won't Start (nginx error)

**Error:** `"add_header" directive is not allowed here`

**Solution:** Fixed in v1.1.1+. Update to latest image:
```bash
docker pull ghcr.io/probablydns/bom-interactive-proxy:latest
docker restart bom-proxy
```

### 2. Port Mapping Issues  

**Correct port mapping:** Container exposes port 80 (not 8080)
```bash
# ✅ Correct
docker run -p 8083:80 ghcr.io/probablydns/bom-interactive-proxy:latest

# ❌ Wrong 
docker run -p 8083:8080 ghcr.io/probablydns/bom-interactive-proxy:latest
```

### 3. Connection Refused

**Check if proxy is running:**
```bash
docker ps | grep bom-proxy
curl http://localhost:8083/health
```

**Check logs:**
```bash
docker logs bom-proxy
```

### 4. CORS Errors in Browser

**Symptoms:** Console errors about cross-origin requests

**Check CORS headers:**
```bash
curl -I http://localhost:8083/health | grep -i cors
# Should see: Access-Control-Allow-Origin: *
```

### 5. Map Not Loading

**Test the proxy directly:**
```bash
# Download test page
curl -O https://raw.githubusercontent.com/probablydns/bom-interactive-proxy/main/test-page.html
# Open in browser
```

**Check BOM connectivity:**
```bash
curl -I http://localhost:8083/location/australia
# Should get 200/301/302 response
```

### 6. Build Failures

**If GitHub Actions build fails:**

1. Check [Actions tab](https://github.com/probablydns/bom-interactive-proxy/actions)
2. Look for red X indicators  
3. Click on failed workflow to see logs
4. Common issues:
   - nginx config syntax errors
   - Docker build context problems
   - Missing files

### 7. Home Assistant Integration

**Card not loading:**
1. Verify proxy is accessible from HA host
2. Check HA logs for errors
3. Test with standalone test page first
4. Ensure card JavaScript is loaded correctly

**iframe blocked:**
- Check HA's `X-Frame-Options` settings
- Verify CORS headers include `X-Frame-Options: ALLOWALL`

## Quick Restart Commands

```bash
# Stop and remove container
docker stop bom-proxy && docker rm bom-proxy

# Pull latest and restart
docker pull ghcr.io/probablydns/bom-interactive-proxy:latest
docker run -d --name bom-proxy -p 8083:80 ghcr.io/probablydns/bom-interactive-proxy:latest

# Check status
curl http://localhost:8083/health
```

## Debug Information

**Get container info:**
```bash
docker inspect bom-proxy
docker logs bom-proxy --tail 50
```

**Test from inside container:**
```bash
docker exec -it bom-proxy sh
curl localhost/health
nginx -t  # Test config
```

**Network debugging:**
```bash
# Test from HA host
curl -v http://HOME_ASSISTANT_HOST_OR_IP:8083/health

# Check port binding
netstat -tlnp | grep :8083
```
