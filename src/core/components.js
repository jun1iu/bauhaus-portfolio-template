// Mounts JavaScript components declared in HTML:
//   <section data-component="gallery">…</section>
// Each name maps to a module in src/components/ that exports mount(el).
// Modules are loaded on demand, so a page only downloads the code it uses.
// Add data-hydrate="visible" to wait until the element is near the viewport.

export async function mountComponents(registry, root = document) {
  const els = Array.from(root.querySelectorAll('[data-component]'));
  const lazy = [];
  const jobs = els.map((el) => {
    if (el.dataset.hydrate === 'visible' && 'IntersectionObserver' in window) { lazy.push(el); return null; }
    return mountOne(registry, el);
  });
  if (lazy.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); mountOne(registry, e.target); } });
    }, { rootMargin: '400px 0px' });
    lazy.forEach((el) => io.observe(el));
  }
  await Promise.all(jobs);
}

async function mountOne(registry, el) {
  for (const name of el.dataset.component.split(/\s+/).filter(Boolean)) {
    const load = registry[name];
    if (!load) { console.warn(`Unknown component "${name}"`, el); continue; }
    try {
      const mod = await load();
      mod.mount(el);
    } catch (err) {
      console.error(`Component "${name}" failed to mount`, err);
    }
  }
}
