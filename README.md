# ZU Developers Frontend

The public website and admin pages for **ZU Developers**, a construction and building company based in Bhopal, India. It is a React single-page app with a scroll-driven "construction journey" intro, a Project Library, a photo Gallery, and a contact section. Content for the Gallery and Projects is loaded from the [ZU Backend](https://github.com/Atul1-17/ZU-Backend) API.

## Features

- Pinned scroll story with cross-fading background photos
- Animated hero, marquee, split-word headings and reveal-on-scroll effects
- Founder, directors, services, process, testimonials, clients and FAQ sections
- **Project Library** with location filter (All / Bhopal / Other Towns) and a project detail popup with stage tabs
- **Gallery** with category filters, "show more" paging and a full-screen lightbox (swipe and keyboard support)
- Contact form (FormSubmit) with WhatsApp fallback, plus a floating WhatsApp button
- Admin area for uploading and deleting gallery photos (session login)
- Performance-minded: lightweight mode on phones, lazy-loaded images, Cloudinary image optimization
- Accessible dialogs: focus trap, Escape to close, ARIA roles

## Tech Stack

- React (Vite)
- Redux Toolkit and **RTK Query** for API calls and caching
- React Redux
- React Router (for the admin pages)
- Plain CSS
- Cloudinary delivery URLs for optimized images

## Project Structure

```
ZU-Frontend/
├── public/                # static assets
├── src/
│   ├── App.jsx            # all public site sections
│   ├── config.js          # ASSET base path, contact details, feature flags
│   ├── data.jsx           # static content and fallback data
│   ├── utils.js           # assetUrl() and cld() image helpers
│   ├── services/
│   │   ├── galleryApi.js  # RTK Query: gallery endpoints
│   │   └── authApi.js     # RTK Query: admin login, logout, check
│   ├── store/
│   │   └── store.js       # Redux store
│   ├── pages/             # AdminLogin, AdminGallery (admin pages)
│   └── main.jsx           # entry point (Provider and routes)
├── .env
└── package.json
```

> Adjust the folder names above if your layout differs.

## Getting Started

### Prerequisites

- Node.js 20 or newer
- The [ZU Backend](https://github.com/Atul1-17/ZU-Backend) running locally or deployed

### Installation

```bash
git clone https://github.com/Atul1-17/ZU-Frontend.git
cd ZU-Frontend
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

- Variables must start with `VITE_` to be visible in the browser.
- Restart the dev server after changing `.env`.
- Avoid ports that browsers block (for example 6000, 6666, 4045, 5060), or requests fail with `ERR_UNSAFE_PORT`.

### Run

```bash
npm run dev       # start the dev server
npm run build     # production build
npm run preview   # preview the production build locally
```

## Pages

| Path | Description |
|---|---|
| `/` | Public website |
| `/admin/login` | Admin login (not linked from the public navigation) |
| `/admin` | Admin dashboard (gallery upload and delete), login required |

## How It Talks to the Backend

- API calls use RTK Query with `credentials: 'include'`, so the admin session cookie is sent automatically.
- The backend must allow this site's origin with `credentials: true` in its CORS settings.
- If the API is unavailable, the Gallery and Projects fall back to the static data in `data.jsx`.

Endpoints used:

| Purpose | Endpoint |
|---|---|
| Admin login | `POST /admin/login` |
| Auth check | `GET /admin/check` |
| Logout | `POST /admin/logout` |
| List photos | `GET /gallery` |
| Upload photos | `POST /gallery/uploadImg` |
| Delete photo | `DELETE /gallery/:id` |
| List projects | `GET /projects` |

## Configuration

Site-wide settings (contact email, WhatsApp number, page title, feature flags such as `ENABLE_PROJECT_MODAL` and `ENABLE_FORMSUBMIT`) live in `src/config.js`. Static sections such as services, FAQs and testimonials live in `src/data.jsx`.

## Deployment

1. Set `VITE_API_BASE_URL` to your production API URL on your hosting platform.
2. Build with `npm run build` and deploy the `dist/` folder.
3. Because of client-side routing, configure your host to serve `index.html` for unknown paths so `/admin/login` works on refresh:
   - Netlify: add `public/_redirects` containing `/* /index.html 200`
   - Vercel: add a rewrite to `/index.html`
4. Add your production URL to the backend's allowed CORS origins. For a frontend and API on different domains, the backend session cookie needs `sameSite: "none"` and `secure: true`.

## Troubleshooting

- **Requests go to the wrong URL or return 404:** check `VITE_API_BASE_URL` and restart Vite.
- **`ERR_UNSAFE_PORT`:** the API port is on the browser's blocked list. Use a different port.
- **CORS error or admin calls return 401:** make sure the backend CORS `origin` matches this site exactly and `credentials: true` is set.
- **Gallery shows old static photos:** the API request failed. Check the Network tab.

## License

Add your license here (for example MIT), or remove this section.