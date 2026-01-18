# Setup Checklist ✓

Use this checklist to ensure your Gym Management System is set up correctly.

---

## Pre-Installation

- [ ] Node.js 18+ installed
  ```bash
  node --version
  # Should show v18.x.x or higher
  ```
- [ ] Git installed
- [ ] Code editor ready (VS Code recommended)
- [ ] Supabase account created
- [ ] Vercel account created (for deployment)

---

## Initial Setup

### 1. Project Setup
- [ ] Cloned/downloaded the project
- [ ] Navigated to project directory
  ```bash
  cd "Sample Project"
  ```
- [ ] Installed dependencies
  ```bash
  npm install
  ```
- [ ] No installation errors

### 2. Supabase Setup
- [ ] Created new Supabase project
- [ ] Project is fully initialized (wait 2-3 minutes)
- [ ] Noted project name: _______________
- [ ] Saved database password: _______________

### 3. Database Migration
- [ ] Opened Supabase Dashboard → SQL Editor
- [ ] Created new query
- [ ] Copied entire `supabase/migrations/001_initial_schema.sql` file
- [ ] Pasted into SQL Editor
- [ ] Ran the query successfully
- [ ] Saw "Success. No rows returned" message
- [ ] Verified tables exist (Dashboard → Table Editor):
  - [ ] gyms
  - [ ] members
  - [ ] invoices
  - [ ] services
  - [ ] member_services

### 4. Storage Setup
- [ ] Checked Storage → Buckets
- [ ] Confirmed `gym-logos` bucket exists
- [ ] Bucket is marked as Public

### 5. Environment Configuration
- [ ] Copied `.env.example` to `.env.local`
  ```bash
  cp .env.example .env.local
  ```
- [ ] Got Supabase URL from: Settings → API → Project URL
- [ ] Got Supabase Anon Key from: Settings → API → anon public
- [ ] Filled in `.env.local`:
  ```env
  NEXT_PUBLIC_SUPABASE_URL=https://________.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci________
  NEXT_PUBLIC_APP_URL=http://localhost:3000
  ```
- [ ] Saved `.env.local` file

### 6. Development Server
- [ ] Started dev server
  ```bash
  npm run dev
  ```
- [ ] No errors in terminal
- [ ] Opened http://localhost:3000 in browser
- [ ] Redirected to `/login` page
- [ ] Login page loads correctly

---

## First Use

### 7. Create Account
- [ ] Clicked "Sign up" link
- [ ] Filled in gym details:
  - Gym Name: _______________
  - Email: _______________
  - Password: _______________ (min 6 chars)
- [ ] Clicked "Sign Up" button
- [ ] Redirected to dashboard
- [ ] Dashboard loads without errors
- [ ] Sidebar shows gym name

### 8. Test Core Features

#### Members
- [ ] Clicked "Members" in sidebar
- [ ] Clicked "Add Member" button
- [ ] Added test member:
  - Name: Test Member
  - Phone: 1234567890
  - Plan Type: Monthly
  - Start Date: Today
  - Amount: 1000
- [ ] Member appears in list
- [ ] Member shows "Active" badge

#### Invoices
- [ ] Clicked "Invoices" in sidebar
- [ ] Invoice automatically created for new member
- [ ] Clicked download icon
- [ ] PDF downloaded successfully
- [ ] Opened PDF - shows correct details

#### Analytics
- [ ] Clicked "Analytics" in sidebar
- [ ] Charts load (may be minimal with 1 member)
- [ ] Stats show correct numbers
- [ ] No errors in browser console

#### Settings
- [ ] Clicked "Settings" in sidebar
- [ ] Settings page loads
- [ ] Can see gym name
- [ ] Can see color pickers

### 9. Test Branding

#### Logo Upload
- [ ] Prepared a square image (200x200px+)
- [ ] Clicked "Upload Logo" button
- [ ] Selected image file
- [ ] Logo uploaded successfully
- [ ] Logo appears in preview
- [ ] Logo appears in sidebar
- [ ] Refreshed page - logo persists

#### Colors
- [ ] Changed primary color
- [ ] Changed secondary color
- [ ] Clicked "Save Changes"
- [ ] Success message appears
- [ ] Colors updated in preview
- [ ] Refreshed page - colors persist
- [ ] Checked sidebar - colors applied

### 10. Test Search & Filter
- [ ] Added 2-3 more members with different names
- [ ] Used search bar in Members page
- [ ] Search filters correctly
- [ ] Cleared search - all members show

---

## Optional: Email Setup

### 11. Resend Configuration (Optional)
- [ ] Signed up at https://resend.com
- [ ] Created API key
- [ ] Added to `.env.local`:
  ```env
  RESEND_API_KEY=re_________________
  ```
- [ ] Restarted dev server
- [ ] Tested email sending from Invoices page
- [ ] Email sent successfully

---

## Production Deployment (Optional)

### 12. GitHub Setup
- [ ] Created GitHub repository
- [ ] Initialized git
  ```bash
  git init
  ```
- [ ] Added files
  ```bash
  git add .
  ```
- [ ] Committed
  ```bash
  git commit -m "Initial commit"
  ```
- [ ] Pushed to GitHub
  ```bash
  git remote add origin YOUR_REPO_URL
  git push -u origin main
  ```

### 13. Vercel Deployment
- [ ] Went to https://vercel.com/new
- [ ] Imported GitHub repository
- [ ] Added environment variables (same as `.env.local`)
- [ ] Clicked "Deploy"
- [ ] Deployment succeeded
- [ ] Opened production URL
- [ ] Tested login/signup on production
- [ ] All features work on production

### 14. Production Domain (Optional)
- [ ] Added custom domain in Vercel
- [ ] Updated DNS records
- [ ] Updated `NEXT_PUBLIC_APP_URL` in Vercel env vars
- [ ] Redeployed
- [ ] Custom domain works

---

## Troubleshooting Checks

### If Login Fails
- [ ] Checked `.env.local` has correct Supabase URL and key
- [ ] Restarted dev server after changing `.env.local`
- [ ] Checked browser console for errors
- [ ] Verified Supabase project is active

### If Database Errors
- [ ] Verified SQL migration ran successfully
- [ ] Checked all 5 tables exist in Table Editor
- [ ] Verified RLS is enabled on tables
- [ ] Checked Supabase project isn't paused

### If Logo Upload Fails
- [ ] Verified `gym-logos` bucket exists in Storage
- [ ] Checked bucket is set to Public
- [ ] Verified RLS policies on storage
- [ ] Tried a smaller image file

### If Invoices Don't Generate
- [ ] Checked member was created successfully
- [ ] Verified invoices table has records
- [ ] Checked browser console for errors
- [ ] Verified RLS policies are correct

### If Email Fails
- [ ] Checked `RESEND_API_KEY` is set in `.env.local`
- [ ] Verified API key is valid on Resend dashboard
- [ ] Restarted dev server after adding key
- [ ] Checked Resend dashboard for error logs

### If Charts Don't Show
- [ ] Added multiple members with different dates
- [ ] Checked browser console for errors
- [ ] Verified data exists in database
- [ ] Refreshed the Analytics page

---

## Performance Checks

### Development
- [ ] Pages load quickly (< 2 seconds)
- [ ] No console errors
- [ ] No console warnings (minor ones OK)
- [ ] Smooth navigation between pages
- [ ] Forms submit quickly

### Production (After Deployment)
- [ ] First load < 3 seconds
- [ ] Subsequent loads < 1 second
- [ ] Mobile performance is good
- [ ] No 404 errors
- [ ] HTTPS working
- [ ] All features work same as local

---

## Security Verification

- [ ] Can only see own gym's data when logged in
- [ ] Cannot access dashboard without login
- [ ] Logout works correctly
- [ ] Cannot access other gym's data by URL manipulation
- [ ] `.env.local` is in `.gitignore`
- [ ] No API keys committed to Git
- [ ] RLS policies tested (created separate gym to verify isolation)

---

## Documentation Review

- [ ] Read README.md
- [ ] Read QUICKSTART.md
- [ ] Reviewed FEATURES.md
- [ ] Bookmarked DEPLOYMENT.md for later

---

## Final Checks

### Functionality
- [ ] ✅ Can sign up
- [ ] ✅ Can log in
- [ ] ✅ Can log out
- [ ] ✅ Can add members
- [ ] ✅ Can edit members
- [ ] ✅ Can delete members
- [ ] ✅ Can renew memberships
- [ ] ✅ Can view invoices
- [ ] ✅ Can download PDFs
- [ ] ✅ Can upload logo
- [ ] ✅ Can change colors
- [ ] ✅ Can view analytics

### UI/UX
- [ ] ✅ Responsive on mobile
- [ ] ✅ Responsive on tablet
- [ ] ✅ Responsive on desktop
- [ ] ✅ Brand colors apply globally
- [ ] ✅ Logo shows in sidebar
- [ ] ✅ Navigation works smoothly
- [ ] ✅ Loading states show
- [ ] ✅ Error messages clear

### Data
- [ ] ✅ Member data persists
- [ ] ✅ Invoice data persists
- [ ] ✅ Settings persist after logout
- [ ] ✅ Branding persists
- [ ] ✅ Can search and filter

---

## 🎉 Setup Complete!

If you checked all the boxes above, your Gym Management System is fully set up and ready to use!

### Next Steps:
1. Add your real gym members
2. Customize your branding
3. Generate real invoices
4. Deploy to production (see DEPLOYMENT.md)
5. Share with your team

### Need Help?
- Check troubleshooting section above
- Review README.md
- Check Supabase docs: https://supabase.com/docs
- Check Next.js docs: https://nextjs.org/docs

---

**Date Completed:** ________________

**Setup By:** ________________

**Gym Name:** ________________

**Notes:**
_____________________________________________
_____________________________________________
_____________________________________________
