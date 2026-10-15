# TwoPaws Pet App Landing Page

A modern, responsive marketing landing page for TwoPaws - the comprehensive mobile app for pet lovers in Egypt.

![TwoPaws Logo](./attached_assets/logos[1]_1748043489395.png)

## 🐾 About TwoPaws

TwoPaws is your pet's best friend in Egypt, connecting pet families with the care and community they deserve. From bustling Cairo to beautiful Alexandria, we're building the ultimate platform for pet owners across Egypt.

## ✨ Key Features

### 🔄 LoopDrop Auto-Delivery
Never run out of pet essentials! Set up automatic delivery schedules for food, treats, and supplies with smart recommendations based on your pet's needs.

### 💕 Pet Match Swiper
Find the perfect playmate or breeding partner for your pet! Swipe through profiles just like dating apps, but for your furry friends to find their soulmates.

### 🏥 Find Trusted Vets
Book appointments with verified veterinarians near you. Read reviews, compare prices, and ensure your pet gets the best care in Egypt.

### 📱 Health & Vaccination Tracker
Keep digital records of your pet's health history and get timely reminders for checkups and vaccinations.

### 🗺️ Pet-Friendly Places
Discover parks, cafés, hotels, and restaurants that welcome your furry friends across Egypt.

### 👥 Pet Owner Community
Connect with fellow pet lovers, share tips, arrange playdates, and get advice from experienced pet owners.

### 🛒 Pet Supplies Marketplace
Shop for premium pet food, toys, accessories, and more with fast delivery across Egypt.

### 🚨 Emergency Care
Quick access to emergency vet services and 24/7 pet helpline when your pet needs it most.

## 🛠️ Tech Stack

- **Frontend:** React 18 with TypeScript
- **Styling:** Tailwind CSS with shadcn/ui components
- **Build Tool:** Vite
- **Routing:** Wouter
- **Forms:** React Hook Form with Zod validation
- **Animations:** Framer Motion

## 🎨 Design

The landing page features:
- Custom TwoPaws branding with earth-tone colors (cream #FFF7E1, dark green #5C7039, olive #928946)
- Responsive design optimized for all devices
- Smooth animations and interactive elements
- Professional pet-friendly aesthetic

## 🚀 Getting Started

1. Clone the repository:
```bash
git clone https://github.com/hassanredaa/twopaws-landing-page.git
cd twopaws-landing-page
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and visit `http://localhost:5173` (or the port Vite shows)

## 📱 Features Showcase

- **Waitlist Signup:** Collect emails from interested users
- **Newsletter Subscription:** Keep users engaged with updates
- **App Store Badges:** Direct links to iOS and Android downloads
- **Testimonials:** Real user feedback from Egyptian pet owners
- **FAQ Section:** Address common questions
- **Social Media Integration:** Connect across platforms

## 🌟 Screenshots

The landing page includes:
- Hero section with app mockups
- Feature highlights for LoopDrop and Pet Match Swiper
- Customer testimonials
- Frequently asked questions
- Call-to-action sections

## 🤝 Contributing

We welcome contributions to improve the TwoPaws landing page! Please feel free to submit issues and pull requests.

## 📄 License

This project is licensed under the MIT License.

## 📞 Contact

For questions about TwoPaws, please visit our website or contact our support team.

---

Built with ❤️ for pet lovers in Egypt 🇪🇬
## Shop Setup

### Firebase client env vars
Set these in your root `.env` (see `.env.example`):

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

### Paymob (Functions)
The Paymob integration is implemented in Firebase Functions and requires server-side environment variables:

- `PAYMOB_API_KEY`
- `PAYMOB_INTEGRATION_ID`
- `PAYMOB_IFRAME_ID`
- `PAYMOB_HMAC_SECRET`

Configure your Paymob dashboard to send webhooks to the deployed `paymobWebhook` HTTPS function and use the same HMAC secret.

### Firestore indexes
No new composite indexes are required with the current queries. If you later add `orderBy` clauses to the cart, address, or order queries, Firestore may prompt you to create composite indexes.

## Build, deploy and CI

`npm run build` runs `vite build` and then `scripts/postbuild.mjs`, which runs
each post-build step with `SSG_STRICT=true` and stops at the first failure:

1. `generate-product-ssg.mjs` - one `dist/shop/product/<id>/index.html` per product
2. `generate-shop-ssg.mjs` - `dist/shop/`, `dist/shop/suppliers/`, `dist/shop/supplier/<id>/`
3. `generate-download-ssg.mjs` - `dist/download/` (noindex, self-canonical)
4. `run-react-snap.mjs` - prerenders the static marketing routes
5. `generate-sitemap.mjs` and `generate-merchant-feed.mjs`
6. `check-dist.mjs` - fails unless `dist/shop/index.html`,
   `dist/shop/suppliers/index.html`, `dist/download/index.html`, at least one
   supplier page and at least 1,000 product pages exist with the right canonicals

Never run `vite build` on its own before deploying: it empties `dist/` and
leaves it without the prerendered pages, and Firebase Hosting serves `/shop/`
as a copy of the homepage. `firebase.json` has a `predeploy` hook that runs
`npm run build`, so `firebase deploy --only hosting` always builds first.

The build reads `client/.env` (git-ignored) or the same variables from the
environment. `REACT_SNAP_SKIP=true` skips only the react-snap step.

### Build secrets

`.github/workflows/ci.yml` builds and runs the dist check on pull requests and
pushes to `main`. It takes the `VITE_*` values from repository secrets
(Settings > Secrets and variables > Actions). Required for the build to pass:

- `VITE_FIREBASE_API_KEY` (the public web API key) and `VITE_FIREBASE_PROJECT_ID`:
  the SSG scripts read products and suppliers through the Firestore REST API
  with these, and the dist check fails without them.

Set to match `client/.env` so the CI bundle equals the deployed one:
`VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_APP_ID`,
`VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`,
`VITE_GOOGLE_MAPS_API_KEY`, `VITE_GOOGLE_MAPS_MAP_ID`, `VITE_META_PIXEL_ID`.

CI does not deploy. Deploy from a checkout whose `client/.env` is complete:

```bash
firebase hosting:channel:deploy preview --project pets-13gvj0   # preview URL
firebase deploy --only hosting --project pets-13gvj0            # live
```
