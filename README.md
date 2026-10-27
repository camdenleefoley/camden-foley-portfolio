This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

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

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

## Portfolio maintenance

Use Node.js 24.x. Ongoing work and production use the `camden-foley-portfolio-new` branch. Keep `camden-foley-portfolio-original` unchanged as the handover baseline.

Open a pull request for changes and check its Vercel preview before merging into New. The existing Vercel project is `camden-foley-portfolio`; do not create a replacement project to deploy updates. Keep credentials in Vercel environment variables, never in repository files.

Contentful production content comes from `camden-foley-portfolio-new`. The `master` alias points to that environment. Publishing entry or asset changes triggers the authenticated `/api/revalidation` webhook; the preserved Original comparison reads its separate Original environment.

After reconnecting GitHub, verify Vercel's Production environment still tracks `camden-foley-portfolio-new`; a successful branch preview alone does not verify production deployment.

Password access uses signed eight-hour sessions. Configure a randomly generated `SESSION_SECRET` of at least 32 characters as a Vercel Secret, with independent values for Production, Preview and Development. Rotating it invalidates existing sessions without changing project passwords. Never reuse `SITE_PASSWORD` as the signing key. Old unsigned cookies are intentionally rejected.

Run `npm test` and `npm run lint` before release. `npm run build` also starts the built app on localhost for authenticated regression checks using the configured service credentials; it does not print passwords, session values or private content. Local full builds require the Contentful and authentication environment variables. Contentful preview/publishing credentials are separate from the session-signing key.
