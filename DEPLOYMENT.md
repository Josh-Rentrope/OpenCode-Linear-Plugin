# Deployment Guide

This guide covers deployment options for the Linear webhook plugin in production environments.

## Option 1: Express Server Deployment

### Prerequisites

- Node.js 18+ installed
- Server with public IP address
- SSL certificate (recommended for production)

### Deployment Steps

1. **Prepare Server Environment**
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2
```

2. **Deploy Application**
```bash
# Clone repository
git clone <your-repo-url>
cd LinearPlugin-dev

# Install dependencies
npm install --production

# Set up environment
cp .env.example .env
# Edit .env with your production values
npm run dev:setup
```

3. **Configure PM2**
```bash
# Start application with PM2
pm2 start server/webhook-server-express.js --name linear-webhook

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

4. **Set Up Reverse Proxy (Nginx)**
```nginx
# /etc/nginx/sites-available/linear-webhook
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

5. **Enable SSL with Let's Encrypt**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Monitoring and Maintenance

```bash
# View application logs
pm2 logs linear-webhook

# Monitor application status
pm2 monit

# Restart application
pm2 restart linear-webhook

# Update application
git pull
npm install --production
pm2 restart linear-webhook
```

## Option 2: Netlify Functions Deployment

### Prerequisites

- Netlify account
- Git repository (GitHub, GitLab, Bitbucket)
- Domain name (optional)

### Deployment Steps

1. **Prepare Repository**
```bash
# Ensure netlify.toml is in repository root
git add netlify.toml
git commit -m "Add Netlify configuration"
git push
```

2. **Connect to Netlify**
- Go to [Netlify](https://app.netlify.com)
- Click "New site from Git"
- Connect your Git provider
- Select your repository
- Build settings: No build command required
- Functions directory: `server`

3. **Configure Environment Variables**
In Netlify dashboard:
- Site settings → Build & deploy → Environment
- Add variables:
  - `LINEAR_API_KEY`: Your Linear API key
  - `LINEAR_WEBHOOK_SECRET`: Your webhook secret
  - `NODE_VERSION`: 18

4. **Deploy**
- Netlify will automatically deploy on git push
- Or trigger manual deploy from Netlify dashboard

### Custom Domain Setup

1. **Add Domain in Netlify**
- Site settings → Domain management → Add custom domain
- Follow DNS instructions provided by Netlify

2. **Update Linear Webhook URL**
- Change webhook URL to: `https://your-domain.com/webhooks/linear`

## Option 3: Docker Deployment

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  linear-webhook:
    build: .
    ports:
      - "3000:3000"
    environment:
      - LINEAR_API_KEY=${LINEAR_API_KEY}
      - LINEAR_WEBHOOK_SECRET=${LINEAR_WEBHOOK_SECRET}
      - WEBHOOK_PORT=3000
    restart: unless-stopped
```

### Deployment Commands

```bash
# Build and start container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop container
docker-compose down
```

## Security Best Practices

### Environment Security

1. **Secure Environment Variables**
```bash
# Use secure secret management
# AWS Secrets Manager, Azure Key Vault, etc.
# Avoid hardcoding secrets in code or Docker images
```

2. **Network Security**
```bash
# Configure firewall
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

3. **Application Security**
- Always use HTTPS in production
- Implement rate limiting
- Monitor for suspicious activity
- Regular security updates

### Monitoring and Alerting

1. **Application Monitoring**
```bash
# PM2 Monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30

# Health checks
curl https://your-domain.com/health
```

2. **Log Management**
```bash
# Centralized logging (optional)
# ELK Stack, Splunk, Datadog, etc.
# Forward application logs for analysis
```

3. **Alerting Setup**
- Configure alerts for:
  - Server downtime
  - High error rates
  - Unusual webhook patterns
  - Resource usage thresholds

## Performance Considerations

### Scaling Express Server

1. **Horizontal Scaling**
```bash
# Use load balancer (Nginx, HAProxy)
# Multiple server instances
# Database connection pooling
```

2. **Vertical Scaling**
```bash
# Monitor CPU and memory usage
# Upgrade server resources as needed
# Optimize application code
```

### Netlify Functions Scaling

- Automatic scaling included
- Pay-per-use pricing
- Global edge distribution
- No manual scaling required

## Backup and Recovery

### Data Backup

```bash
# Backup configuration files
tar -czf backup-$(date +%Y%m%d).tar.gz .env package.json

# Backup PM2 configuration
pm2 save
cp ~/.pm2/dump.pm2 backup/
```

### Disaster Recovery

1. **Document recovery procedures**
2. **Test backup restoration**
3. **Maintain offsite backups**
4. **Regular recovery drills**

## Troubleshooting Production Issues

### Common Problems

1. **Webhook Delivery Failures**
- Check server logs for errors
- Verify webhook signature configuration
- Test webhook endpoint manually
- Check network connectivity

2. **High Memory Usage**
- Monitor memory consumption
- Check for memory leaks
- Implement memory limits
- Restart application if needed

3. **SSL Certificate Issues**
- Verify certificate validity
- Check renewal process
- Test SSL configuration
- Monitor expiration dates

### Debugging Tools

```bash
# System monitoring
htop
iotop
netstat -tulpn

# Application debugging
pm2 logs linear-webhook --lines 100
curl -v https://your-domain.com/health

# Network debugging
ping your-domain.com
traceroute your-domain.com
dig your-domain.com
```

## Maintenance Schedule

### Daily

- Check application logs
- Monitor system resources
- Verify webhook processing

### Weekly

- Review security updates
- Check backup integrity
- Monitor performance metrics

### Monthly

- Apply security patches
- Update dependencies
- Review and rotate secrets
- Test disaster recovery

### Quarterly

- Security audit
- Performance review
- Capacity planning
- Documentation updates