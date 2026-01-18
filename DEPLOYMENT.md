# Deployment Guide 🚀

This guide covers deploying your Gym Management System to production.

## Vercel Deployment (Recommended)

### Prerequisites
- GitHub account
- Vercel account (free tier is sufficient)
- Supabase project set up

### Step-by-Step Guide

#### 1. Prepare Your Repository

```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Ready for deployment"

# Create GitHub repository and push
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

#### 2. Deploy to Vercel

**Option A: Using Vercel Dashboard**

1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select your repository
4. Configure project:
   - Framework Preset: Next.js
   - Root Directory: `./`
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)

5. Add Environment Variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
   RESEND_API_KEY=your_resend_key (optional)
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   ```

6. Click "Deploy"

**Option B: Using Vercel CLI**

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Follow prompts and add environment variables when asked
```

#### 3. Configure Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update `NEXT_PUBLIC_APP_URL` environment variable

### Post-Deployment Checklist

- [ ] Test authentication (sign up/login)
- [ ] Test member creation
- [ ] Test invoice generation
- [ ] Test PDF download
- [ ] Test email sending (if configured)
- [ ] Test logo upload
- [ ] Verify analytics charts render correctly
- [ ] Check responsive design on mobile

## Supabase Production Setup

### 1. Enable Email Confirmations (Optional)

By default, users can sign up without email confirmation. To enable:

1. Go to Supabase Dashboard → Authentication → Settings
2. Toggle "Enable email confirmations"
3. Configure email templates

### 2. Set Up Custom SMTP (Optional)

For production, use custom SMTP instead of Supabase's built-in:

1. Authentication → Settings → SMTP Settings
2. Add your SMTP credentials

### 3. Database Backups

Supabase free tier includes:
- Daily backups (retained for 7 days)
- Point-in-time recovery

For additional backups, upgrade your plan.

### 4. Monitor Usage

Keep track of:
- Database size (500 MB limit on free tier)
- Storage (1 GB limit on free tier)
- Monthly active users (50,000 limit on free tier)

## Environment-Specific Configuration

### Development
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Staging
```env
NEXT_PUBLIC_APP_URL=https://your-app-staging.vercel.app
```

### Production
```env
NEXT_PUBLIC_APP_URL=https://your-custom-domain.com
```

## Performance Optimization

### 1. Image Optimization

Already configured in `next.config.ts`:
```typescript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: '*.supabase.co',
    },
  ],
}
```

### 2. Caching Strategy

Vercel automatically handles:
- Static asset caching
- Image optimization
- Edge caching

### 3. Bundle Size

Check bundle size:
```bash
npm run build
```

Optimize by:
- Using dynamic imports for heavy components
- Code splitting by route (already done with App Router)

## Monitoring & Analytics

### Vercel Analytics

1. Enable in Vercel Dashboard → Analytics
2. Free for hobby projects

### Supabase Monitoring

Access in Supabase Dashboard:
- Database health
- API usage
- Storage usage

## Security Best Practices

### 1. Environment Variables

✅ **DO:**
- Store all secrets in Vercel environment variables
- Use different keys for staging/production
- Rotate API keys regularly

❌ **DON'T:**
- Commit `.env.local` to git
- Share API keys publicly
- Use development keys in production

### 2. Database Security

- RLS policies are already implemented
- Review policies regularly
- Monitor query patterns for anomalies

### 3. Authentication

- Enforce strong passwords
- Enable MFA (Multi-Factor Authentication) when needed
- Monitor failed login attempts

## Troubleshooting Deployment Issues

### Build Fails

**Error: "Module not found"**
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run build
```

**Error: "Type errors"**
```bash
# Check TypeScript
npm run build
# Fix any type errors shown
```

### Runtime Errors

**Error: "Supabase connection failed"**
- Verify environment variables are set correctly
- Check Supabase project is active
- Verify API keys are not expired

**Error: "Storage upload failed"**
- Verify storage bucket exists
- Check RLS policies on storage
- Ensure file size is within limits

### Performance Issues

**Slow page loads**
- Enable Vercel Analytics to identify bottlenecks
- Check Supabase query performance
- Consider adding indexes to frequently queried columns

**Database connection timeouts**
- Supabase free tier has connection pooling limits
- Consider upgrading plan for more connections
- Optimize queries to reduce connection time

## Scaling Considerations

### When to Upgrade

**Supabase:**
- Database size > 500 MB
- Need more than 1 GB storage
- Require more than 2 GB bandwidth
- Need point-in-time recovery beyond 7 days

**Vercel:**
- Need more than 100 GB bandwidth
- Require team collaboration features
- Need advanced analytics

### Migration Path

1. **Small → Medium (100-500 members)**
   - Stay on free tier
   - Monitor usage

2. **Medium → Large (500-2000 members)**
   - Upgrade Supabase to Pro ($25/mo)
   - Consider Vercel Pro ($20/mo)

3. **Large → Enterprise (2000+ members)**
   - Supabase Team/Enterprise
   - Vercel Enterprise
   - Consider dedicated infrastructure

## Backup Strategy

### Automated Backups

Supabase provides daily backups. For critical data:

1. Set up additional backup scripts
2. Export data regularly via Supabase API
3. Store backups in separate location (AWS S3, etc.)

### Manual Backup

```bash
# Export all data (run from Supabase SQL editor)
# This generates a dump you can download
```

## Rollback Plan

If deployment fails:

1. **Immediate Rollback:**
   - Vercel Dashboard → Deployments → Previous deployment → Promote to Production

2. **Database Rollback:**
   - Supabase Dashboard → Database → Backups → Restore

3. **Code Rollback:**
   ```bash
   git revert HEAD
   git push
   # Vercel auto-deploys
   ```

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs

## Cost Breakdown (Free Tier)

| Service | Free Tier Limits | Monthly Cost |
|---------|------------------|--------------|
| Vercel | 100 GB bandwidth, Unlimited sites | $0 |
| Supabase | 500 MB database, 1 GB storage, 2 GB bandwidth | $0 |
| Resend | 3,000 emails/month | $0 |
| **Total** | | **$0** |

Perfect for small to medium gyms! 💪

---

**Ready to launch? Follow the steps above and your gym management system will be live in minutes!** 🎉
