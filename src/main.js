// Entry point for every page. Loads the global styles, starts scroll-reveal
// for elements marked .rv, and mounts whatever components the page declares.
// The page stays hidden until it is fully built, then appears all at once.
import './styles/main.css';
import { registry } from './components/index.js';
import { mountComponents } from './core/components.js';
import { whenReady } from './core/ready.js';
import { reveal } from './core/reveal.js';
import { qsa } from './core/dom.js';
import { pageTransitions } from './core/page-transition.js';
import { fetchSite } from './core/site.js';
import { applySite } from './core/apply-site.js';

// Content managed in the admin. If the server isn't there, the pages keep what they already say.
const site = await fetchSite();
if (site) applySite(site);

reveal(qsa('.rv'));
pageTransitions();
await whenReady(mountComponents(registry));

// Show the page and let its own entrance animations start (they are held while "preload" is set).
document.documentElement.classList.remove('preload');
performance.mark('page-ready');
