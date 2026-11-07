# Bauhaus portfolio template

A minimal, Bauhaus-inspired portfolio site with a built-in back-end and admin. It's a complete starting point for a personal site: a primary-colour geometric hero, a filterable photo gallery with a full-screen viewer, About and Contact pages, and an admin dashboard for managing everything without touching code.

**All the content is placeholder Lorem ipsum text.** Replace it from the admin (see [Back-end and admin](#back-end-and-admin)) or by editing the HTML. The palette and fonts live in `src/styles/tokens.css`.

## What's in the box

- **Front-end:** four pages (Home, About, Frames, Contact) plus a 404, with scroll-driven and ambient animation, a page transition, and full keyboard and reduced-motion support.
- **Gallery:** nine generated Bauhaus illustrations as placeholders; upload real photos from the admin.
- **Back-end:** a small [Hono](https://hono.dev) server with Node's built-in SQLite, a cookie-session login, spam-trapped contact form, and image uploads that check real file contents.
- **Admin:** a CMS-style dashboard for messages, the gallery, page content and settings.
- **Tests:** about 130 tests covering the logic and the server.

Built with [Vite](https://vite.dev) and plain JavaScript modules, with no framework. Pages are ordinary HTML, and JavaScript is added to them in small components.

## Getting started

You need [Node.js](https://nodejs.org) 22.13 or newer (the back-end uses the SQLite built into Node).

```bash
npm install
```

```bash
npm run dev
```

That starts a local server (usually http://localhost:5173) that reloads as you edit. Other commands:

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server with live reload |
| `npm test` | Runs the tests in `tests/` |
| `npm run build` | Builds the finished site into `dist/` |
| `npm run preview` | Serves `dist/` locally to check the build |

## How it's organised

```
index.html, gallery.html, about.html, contact.html, 404.html
                         Pages. Any .html file in the root becomes a page.
partials/                HTML shared by every page (head, nav, footer)
public/                  Files copied as-is (put photos in public/photos/)
src/
  main.js                Entry point loaded by every page
  state.js               Shared state (gallery filter, open lightbox frame)
  components/            One file per interactive piece, listed in components/index.js
  core/                  Shared building blocks: scroll loop, store, reveal, helpers
  data/                  Content: gallery frames and their Bauhaus artwork
  scenes/                Draws the frame artwork onto canvases
  styles/                CSS, one file per section, all imported by main.css
tests/                   Unit tests (Vitest)
```

### Components

Interactive parts are declared in HTML with `data-component`:

```html
<section data-component="gallery">…</section>
<span data-component="clock" data-tz="UTC"></span>
```

Each name maps to a file in `src/components/` that exports `mount(element)`. A page only downloads the components it uses. Add `data-hydrate="visible"` to load one only when it scrolls near the screen. If you do, give the element a fixed size in CSS so the page doesn't jump when it loads.

To add a component:
1. Create `src/components/my-thing.js`:
   ```js
   export function mount(el) {
     el.addEventListener('click', () => el.classList.toggle('on'));
   }
   ```
2. Register it in `src/components/index.js`: `'my-thing': () => import('./my-thing.js'),`
3. Use it in any page: `<div data-component="my-thing"></div>`

Useful building blocks in `src/core/`:
- **`onScroll(fn)` / `onResize(fn)`** (`scroll.js`): one shared, frame-synced loop for scroll effects. Use these instead of adding your own `scroll` listeners.
- **`createStore()`** (`store.js`): shared state that components subscribe to. `src/state.js` holds the site-wide store. The gallery and lightbox talk to each other through it.
- **`reveal(el)`** (`reveal.js`): fade an element in as it scrolls into view. In HTML, just add `class="rv"`.
- **`h()`, `qs()`, `qsa()`, `asset()`, `escapeHtml()`** (`dom.js`), **`clamp()`, `rng()`…** (`math.js`), **`REDUCED`** (`env.js`)

### Page transitions

Moving between pages is animated. Browsers with cross-document View Transitions (Chrome, Edge, Safari 18.2+) use the CSS in the `<style>` block of `partials/head.html`: the new page pushes in from the right, trailing the three primary colours. Others get a fade from `src/core/page-transition.js`. Reduced-motion users get no animation. To add a page to the menu, add a link with `data-page="name"` in `partials/nav.html`.

### Holding the page until it's ready

Nothing is shown until the page is fully built: components mounted, images decoded and fonts loaded (`src/core/ready.js`, awaited in `src/main.js`). The main script is render-blocking, so most browsers never paint a half-built page, and `html.preload` hides the body as a fallback. The page's entrance animations are paused until it appears. If something goes wrong the page is shown after 8 seconds anyway.

### Adding a page

Create `about.html` (for example) in the project root. Start it like `404.html`: include the partials with `<!-- include: head.html -->`, `<!-- include: nav.html -->` and `<!-- include: footer.html -->`. It's built automatically. In page and partial HTML, write `%BASE_URL%` for links to the homepage so they work on GitHub Pages.

### Adding real photos

1. Put images in `public/photos/`. Resize them to about 2000px on the long edge first.
2. In `src/data/frames.js`, add `src` and `alt` to the frame you're replacing:
   ```js
   { title: 'Lorem Ipsum', ..., ratio: [4, 5], src: 'photos/lorem-ipsum.jpg', alt: 'Lorem ipsum dolor sit amet' }
   ```
3. Set `ratio` to the photo's shape, e.g. `[3, 2]` for landscape or `[4, 5]` for portrait.

If a file is missing, the illustration is shown instead. `npm test` checks that every frame is complete and that photos have alt text.

### Contact form

The Contact section has a form instead of a visible email address. With the back-end running, messages arrive in the admin Inbox. Without it, messages go to a form service that forwards them to your inbox, so your address never appears on the site.

To connect it (one time):
1. Go to [web3forms.com](https://web3forms.com), enter your email, and copy the access key they email you.
2. Paste it into `src/config.js`: `key: 'your-access-key'`.
3. Commit and push. Once the site is published, send yourself a test message.

Until a key is added, the form shows "isn't connected yet" instead of failing silently. The key is safe to publish: it can only send messages to you and doesn't reveal your address. To use [Formspree](https://formspree.io) instead, set `provider: 'formspree'` and use your form ID as the key.

The form checks fields in the browser, has a hidden honeypot field to catch spam bots, keeps the message if sending fails, and announces errors and success to screen readers.

### Colours and fonts

Edit the variables in `src/styles/tokens.css`. The site uses a single dark theme.

## Back-end and admin

A small server and an admin website, so you can manage the site without touching code. From the admin you can:

The admin is laid out like a CMS, with a sidebar grouped into Content, Messages and Site (it becomes a slide-out menu on phones):

- **Dashboard:** unread messages, gallery counts, when each page was last saved, your recent messages, a feed of recent activity (edits, uploads, new messages) and quick actions.
- **Home page / About page:** edit the Home tagline and intro, and everything on About (intro, details, jobs, skills, education).
- **Gallery:** upload, caption, reorder and delete photos on the Frames page.
- **Inbox:** read the messages sent through your Contact page, mark them read, reply by email, delete them.
- **Settings:** your location, "open to" line, availability, and social links (a link left blank hides its icon).
- **Account:** change your password.

The server uses [Hono](https://hono.dev) and Node's built-in SQLite (Node 22.13 or newer), so there is no database to install. Everything it stores lives in the `data/` folder (`site.db` and the `uploads/` photos), which git ignores.

The public site works without the server: if it can't reach one, every page keeps the content already in it, and the Contact form falls back to the form service in `src/config.js`.

### Running it

```bash
npm install
npm run dev:all
```

That starts the site at http://localhost:5173 and the server at http://localhost:3001. Open **http://localhost:3001/admin/** to sign in. On the first run the server invents an admin password and prints it **once** in the terminal, so copy it then (you can change it under Account). To choose it yourself, copy `.env.example` to `.env` and set `ADMIN_PASSWORD` before the first run. Forgot it? `npm run admin:reset` sets a new one.

To run only the server: `npm run server`.

### Putting it online

Run one server that does everything:

```bash
npm install
npm run build
NODE_ENV=production npm run server
```

It serves the built site, the admin at `/admin/`, the API and your uploaded photos from one address. Put it behind HTTPS (for example Caddy or nginx), keep it running with something like pm2 or systemd, and set these in `.env`:

| Setting | What it does |
| --- | --- |
| `HOST=0.0.0.0` | Accept connections from outside this computer (the default is `127.0.0.1`, private) |
| `COOKIE_SECURE=1` | Sign-in cookie only over HTTPS (also turned on by `NODE_ENV=production`) |
| `TRUST_PROXY=1` | Use the visitor address your proxy sends, so rate limits count real visitors. Set only behind a proxy you control |
| `DATA_DIR`, `PORT` | Where data is kept, and the port |
| `CORS_ORIGINS` | Other sites allowed to use the API (see below) |

**Back up the `data/` folder.** It holds all your content, messages and photos.

**Keeping the site on GitHub Pages:** the server can live elsewhere. Set `CORS_ORIGINS=https://YOUR-NAME.github.io` on the server, and add a repository variable named `API_BASE` (Settings > Secrets and variables > Actions > Variables) with the server's address, for example `https://admin.example.com`. The next deploy will read content from it.

### How it keeps things safe

- Passwords are stored as salted scrypt hashes. Sign-in cookies are `HttpOnly` and `SameSite=Strict`, and only a hash of each session token is stored.
- Wrong passwords are rate limited (8 tries per 15 minutes), and so are contact messages (5 per hour per visitor, with a hidden spam trap).
- Admin requests from other websites are refused.
- Photos are accepted only if their contents really are JPEG, PNG, WebP or AVIF (SVG is refused because it can carry scripts), at most 8 MB, and are stored under random names.
- Everything typed into the admin or the contact form is checked and length-limited. Links must be `https://`, `http://` or `mailto:`, and text is always shown as text, never as HTML.
- The admin page blocks inline scripts and loads only its own files.

### Where things are

```
server/        The back-end (index.js starts it; app.js has the routes)
admin/         The admin website (plain HTML, CSS and JavaScript, no build step)
data/          Your database and uploaded photos (created on first run, not in git)
src/core/site.js, apply-site.js   How the public site reads the content
tests/server/  Tests for the back-end
```

The career roadmap chart on the About page and the page layouts are part of the site's code, not the admin. To change those, edit the HTML.

## Publishing on GitHub Pages

`.github/workflows/deploy.yml` runs the tests on every push and pull request. When `main` changes, it also builds the site and publishes it.

One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions.** GitHub Pages on a private repository needs a paid GitHub plan.
