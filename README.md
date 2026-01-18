# Gym Management System 🏋️

A complete, full-stack Gym Management SaaS application built with Next.js 15, TypeScript, Tailwind CSS, and Supabase. This app is designed to run on Vercel's free plan with Supabase's free tier, making it perfect for small to medium-sized gyms.

## 🎯 Features

### Core Functionality
- **Multi-tenant Architecture**: Each gym owner sees only their own data (filtered by `gym_id`)
- **Authentication**: Secure sign up/login using Supabase Auth
- **Member Management**: Add, edit, delete, and renew member subscriptions
- **Invoice System**: Automatic invoice generation with PDF download and email capabilities
- **Add-on Services**: Create and manage additional services per gym
- **Renewal Workflow**: Track expiring memberships and renew with one click
- **Analytics Dashboard**: View revenue trends, member stats, and performance metrics
- **Dynamic Branding**: Customize logo and theme colors per gym

### Technical Features
- **Row Level Security (RLS)**: Data isolation at the database level
- **Automatic End Date Calculation**: Based on plan type (Monthly/Quarterly/Yearly)
- **PDF Generation**: Professional invoices using jsPDF
- **Email Delivery**: Send invoices via Resend API
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS
- **Type Safety**: Full TypeScript coverage

## 📋 Prerequisites

- Node.js 18+ installed
- A [Supabase](https://supabase.com) account (free tier)
- A [Vercel](https://vercel.com) account (free tier)
- A [Resend](https://resend.com) account for email (optional, free tier)

## 🚀 Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd Sample\ Project
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Fill in project details and create the project
4. Wait for the project to finish setting up

### 4. Run Database Migration

1. In your Supabase project, go to the **SQL Editor**
2. Copy the contents of `supabase/migrations/001_initial_schema.sql`
3. Paste and run the SQL script
4. This will create all necessary tables, indexes, RLS policies, and storage buckets

### 5. Configure Environment Variables

1. Copy the example environment file:

```bash
cp .env.example .env.local
```

2. Fill in your Supabase credentials:

```env
# Get these from Supabase Dashboard > Project Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: For email functionality (get from resend.com)
RESEND_API_KEY=re_your_api_key_here

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### 7. Create Your First Gym Account

1. Click "Sign Up"
2. Enter your gym name, email, and password
3. You'll be automatically logged in and redirected to the dashboard

## 🌐 Deployment to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. Deploy on Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Configure environment variables (same as `.env.local`)
5. Click "Deploy"

Your app will be live in minutes! 🎉

## 📁 Project Structure

```
.
├── app/                      # Next.js 15 App Router
│   ├── api/                  # API routes
│   │   └── send-invoice/     # Email sending endpoint
│   ├── analytics/            # Analytics page
│   ├── dashboard/            # Main dashboard
│   ├── invoices/             # Invoice management
│   ├── login/                # Login page
│   ├── members/              # Member management
│   ├── settings/             # Gym settings & branding
│   ├── signup/               # Signup page
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Home (redirects)
├── components/               # Reusable components
│   ├── DashboardLayout.tsx   # Main app layout
│   └── Sidebar.tsx           # Navigation sidebar
├── hooks/                    # Custom React hooks
│   └── useGymBranding.ts     # Branding state management
├── supabase/                 # Database migrations
│   └── migrations/
│       └── 001_initial_schema.sql
├── types/                    # TypeScript definitions
│   └── database.types.ts     # Supabase types
├── utils/                    # Utility functions
│   ├── supabase/             # Supabase clients
│   ├── date.ts               # Date utilities
│   └── pdf.ts                # PDF generation
├── .env.example              # Environment template
├── middleware.ts             # Auth middleware
├── next.config.ts            # Next.js config
├── package.json              # Dependencies
├── tailwind.config.ts        # Tailwind config
└── tsconfig.json             # TypeScript config
```

## 🗄️ Database Schema

### Tables

1. **gyms** - Stores gym owner information and branding
2. **members** - Member records with subscription details
3. **invoices** - Payment invoices linked to members
4. **services** - Additional services offered by each gym
5. **member_services** - Junction table for member-service relationships

### Key Features

- **Row Level Security (RLS)**: Ensures data isolation between gyms
- **Automatic Invoice Numbers**: Generated via PostgreSQL function
- **Storage Bucket**: For gym logos with public access

## 🎨 Customization

### Branding

Each gym can customize:
- **Logo**: Upload via Settings page (stored in Supabase Storage)
- **Primary Color**: Main brand color (buttons, links)
- **Secondary Color**: Accent color

Colors are dynamically applied throughout the app using Zustand state management.

### Adding New Features

The codebase is modular and easy to extend:

1. **New Table**: Add to `001_initial_schema.sql` and create migration
2. **New Page**: Create in `app/` directory following existing patterns
3. **New Types**: Update `types/database.types.ts`
4. **New API Route**: Create in `app/api/`

## 🔧 Configuration

### Supabase Storage

The app uses Supabase Storage for gym logos. Storage policies are automatically created by the migration script. Ensure the `gym-logos` bucket exists.

### Email Configuration

To enable invoice emails:

1. Sign up at [Resend](https://resend.com)
2. Get your API key
3. Add to `.env.local`: `RESEND_API_KEY=re_xxxxx`
4. Update the "from" address in `app/api/send-invoice/route.ts` to your verified domain

### Invoice Numbering

Invoices are auto-numbered using format: `INV-YYYYMMDD-XXXX`

Example: `INV-20250117-0001`

## 📊 Analytics

The analytics page shows:
- Monthly revenue trends (bar chart)
- New member trends (line chart)
- Total revenue (6 months)
- Average monthly revenue
- Retention rate

Built with [Recharts](https://recharts.org/) for beautiful, responsive charts.

## 🔐 Security

- **Authentication**: Managed by Supabase Auth
- **Row Level Security**: All tables have RLS policies
- **Server-side Validation**: API routes validate user ownership
- **Secure Storage**: Logos stored with proper access policies

## 🐛 Troubleshooting

### "Relation 'gyms' does not exist"
Run the migration script in Supabase SQL Editor.

### "Logo upload failed"
Check that the `gym-logos` storage bucket exists in Supabase Storage.

### "Email sending failed"
Verify your Resend API key is correct and not expired.

### Members not showing
Check RLS policies are correctly applied and user is logged in.

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `RESEND_API_KEY` | Resend API key for emails | No |
| `NEXT_PUBLIC_APP_URL` | Your app's URL | Yes |

## 🚦 Roadmap

Future enhancements:
- [ ] Member attendance tracking
- [ ] Payment gateway integration (Stripe/Razorpay)
- [ ] SMS notifications for renewals
- [ ] Member mobile app
- [ ] Workout plan management
- [ ] Staff management
- [ ] Equipment inventory tracking

## 📄 License

MIT License - feel free to use this for your gym!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 💬 Support

For issues or questions:
1. Check the troubleshooting section
2. Review Supabase docs: https://supabase.com/docs
3. Review Next.js docs: https://nextjs.org/docs

## 🎉 Credits

Built with:
- [Next.js 15](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Recharts](https://recharts.org/)
- [jsPDF](https://github.com/parallax/jsPDF)
- [Resend](https://resend.com/)
- [Lucide Icons](https://lucide.dev/)
- [Zustand](https://zustand-demo.pmnd.rs/)

---

**Made with ❤️ for gym owners worldwide**
