# Volunteer Hub

A volunteer management platform built with Next.js, Supabase, and TypeScript. This platform connects volunteers with organizations and opportunities, featuring multilingual support (English, Spanish, Portuguese), email notifications, roll-call functionality, and senior project management.

**Note:** This project is no longer actively maintained and is provided as a portfolio piece. All previous comits are hidden due to security concerns

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Features

- 🔐 Authentication with Supabase Auth
- 🌍 Multilingual support (English, Spanish, Portuguese)
- 📧 Automated email notifications (Resend)
- 📍 Location-based opportunity search (Google Places API)
- 🎯 Organization and opportunity management
- 📊 Volunteer hour tracking
- 🎓 Senior project management
- 📱 Responsive design with dark mode support

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Environment Variables

Create a `.env.local` file in the root directory and add the following environment variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Email Configuration (Resend)
RESEND_API_KEY=your_resend_api_key_here

# Google Places API
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=your_google_places_api_key_here

# Site URL (for production)
NEXT_PUBLIC_SITE_URL=https://yourdomain.com

# Admin Configuration (optional - defaults provided)
ADMIN_EMAIL=your_admin_email@example.com
NEXT_PUBLIC_ADMIN_EMAIL=your_admin_email@example.com  # For client-side usage
TEST_ACCOUNT_EMAIL=test@example.com  # Optional: test account email
NEXT_PUBLIC_TEST_ACCOUNT_EMAIL=test@example.com  # For client-side usage
ORG_ADMIN_EMAIL=admin@example.com  # Email for organization verification notifications
```

### Getting API Keys:

1. **Supabase**: Get your project URL and anon key from your [Supabase Dashboard](https://supabase.com/dashboard)
2. **Resend**: Get your API key from [Resend Dashboard](https://resend.com/api-keys)
3. **Google Places**: Get your API key from the [Google Cloud Console](https://console.cloud.google.com/)

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
