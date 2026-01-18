# Quick Start Guide ⚡

Get your Gym Management System up and running in 10 minutes!

## Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] Git installed
- [ ] Text editor (VS Code recommended)
- [ ] Supabase account (free)

## Setup Steps

### 1️⃣ Install Dependencies (2 minutes)

```bash
npm install
```

### 2️⃣ Create Supabase Project (3 minutes)

1. Go to https://app.supabase.com
2. Click **"New Project"**
3. Fill in:
   - Name: `gym-management`
   - Database Password: (save this!)
   - Region: Choose closest to you
4. Click **"Create new project"**
5. Wait 2-3 minutes for setup to complete

### 3️⃣ Set Up Database (2 minutes)

1. In Supabase Dashboard, click **"SQL Editor"** (left sidebar)
2. Click **"New query"**
3. Open `supabase/migrations/001_initial_schema.sql` from this project
4. Copy ALL the content and paste into the SQL Editor
5. Click **"Run"** (or press Ctrl/Cmd + Enter)
6. You should see "Success. No rows returned"

### 4️⃣ Get API Keys (1 minute)

1. In Supabase Dashboard, go to **Settings** → **API**
2. Copy these two values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (the long string under "Project API keys")

### 5️⃣ Configure Environment (1 minute)

1. Create `.env.local` file in the project root:

```bash
# On Windows
copy .env.example .env.local

# On Mac/Linux
cp .env.example .env.local
```

2. Open `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Optional (skip for now, add later if you want email)
RESEND_API_KEY=

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 6️⃣ Start the App (1 minute)

```bash
npm run dev
```

Open http://localhost:3000 in your browser! 🎉

## First Login

1. Click **"Sign up"**
2. Enter:
   - Gym Name: Your gym's name
   - Email: Your email
   - Password: At least 6 characters
3. Click **"Sign Up"**
4. You're in! 🏋️

## What to Try First

### Add Your First Member

1. Click **"Members"** in the sidebar
2. Click **"Add Member"**
3. Fill in:
   - Name: John Doe
   - Phone: 1234567890
   - Plan Type: Monthly
   - Start Date: Today
   - Amount: 1000
4. Click **"Add Member"**
5. An invoice is automatically created! ✅

### View Invoice

1. Click **"Invoices"** in the sidebar
2. You'll see the auto-generated invoice
3. Click the **download icon** to get PDF
4. (Optional) Click the **email icon** to send it

### Customize Your Gym

1. Click **"Settings"** in the sidebar
2. Upload your logo
3. Pick your brand colors
4. Click **"Save Changes"**
5. See the colors applied throughout the app! 🎨

### Check Analytics

1. Click **"Analytics"** in the sidebar
2. See revenue and member trends
3. Charts will populate as you add more data

## Common Issues & Fixes

### ❌ "Can't connect to database"

**Fix:**
- Check your `.env.local` has correct Supabase URL and key
- Restart dev server (`Ctrl+C` then `npm run dev`)

### ❌ "Table 'gyms' does not exist"

**Fix:**
- Re-run the SQL migration in Supabase SQL Editor
- Make sure you copied the ENTIRE SQL file

### ❌ "Logo upload failed"

**Fix:**
- Check that `gym-logos` bucket exists in Supabase Storage
- The migration should create it automatically
- If not, go to Storage → Create bucket → Name: `gym-logos` → Public: Yes

### ❌ "Email not sending"

**Fix:**
- Get free API key from https://resend.com
- Add to `.env.local`: `RESEND_API_KEY=re_xxxxx`
- Restart dev server

## Next Steps

### Optional: Enable Email (5 minutes)

1. Go to https://resend.com
2. Sign up (free for 3,000 emails/month)
3. Click **"API Keys"**
4. Click **"Create API Key"**
5. Copy the key
6. Add to `.env.local`:
   ```env
   RESEND_API_KEY=re_your_key_here
   ```
7. Restart dev server

Now you can send invoices via email! 📧

### Deploy to Production (10 minutes)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for step-by-step instructions to deploy on Vercel (free!).

## Video Tutorial

> Note: Add your own video walkthrough here if creating one

## Getting Help

- **Documentation**: See [README.md](./README.md) for full docs
- **Deployment**: See [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Supabase Issues**: https://supabase.com/docs
- **Next.js Issues**: https://nextjs.org/docs

## Feature Checklist

Try these features to explore the app:

- [ ] Sign up and create gym account
- [ ] Add a member (Monthly plan)
- [ ] Add a member (Yearly plan)
- [ ] View auto-generated invoices
- [ ] Download invoice as PDF
- [ ] Edit a member's details
- [ ] Renew an expiring membership
- [ ] Upload gym logo
- [ ] Change brand colors
- [ ] View analytics charts
- [ ] Search for members
- [ ] Search for invoices

## Tips for Best Results

1. **Use Real Data**: Add 5-10 test members with different plan types
2. **Test Renewals**: Set a member's end date to tomorrow, then try the renew button
3. **Customize Branding**: Upload your actual gym logo for a professional look
4. **Explore Analytics**: Add members over different dates to see trends
5. **Test on Mobile**: The app is responsive - try it on your phone!

## What's Next?

Once you're comfortable with the basics:

1. Deploy to production (see DEPLOYMENT.md)
2. Add your real members
3. Customize the branding
4. Set up email notifications
5. Share with your team!

---

**That's it! You now have a fully functional gym management system. Welcome aboard! 🎉**

Need help? Check the full [README.md](./README.md) or open an issue on GitHub.
