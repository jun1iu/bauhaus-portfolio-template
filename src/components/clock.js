// Live local time for a time zone: <span data-component="clock" data-tz="UTC">
export function mount(el) {
  const tz = el.dataset.tz || 'UTC';
  const tick = () => {
    try { el.textContent = new Date().toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }); }
    catch { el.textContent = ''; }
  };
  tick();
  el.dataset.ready = ''; // reveals the time (see shared.css); until then it is invisible, not a "--:--" placeholder
  setInterval(tick, 15000);
}
