// Meta pixel — the browser half. Worker mirror: worker/lib/meta-capi.js
//
// One file so the pixel id exists in exactly one place. Every public surface
// loads this in <head>; it installs fbq and fires PageView itself, so a page
// never pastes the base snippet again.
//
// The event vocabulary (docs/SPEC_META_PIXEL.md):
//   Lead        an email given for a freebie
//   Schedule    a class registration completed, by any route ($11, trial, credit)
//   StartTrial  the 7-day Ruby/Om trial opened
//   Purchase    money actually moved. NEVER fired at $0.
//
// window.ywePixel.track() is a no-op until fbq loads, so call sites never guard.
// window.ywePixel.cookies() returns {fbp, fbc} for hand-off to the Worker, which
// is not on the cookie domain and would otherwise report a conversion Meta
// cannot tie back to the click.
(function () {
  // Ethan's original pixel, carried over from the Framer site. Its conversion
  // history is what Meta optimises from, so this id must not be replaced.
  var PIXEL_ID = '1345928067443807';

  if (window.ywePixel) return;

  /* eslint-disable */
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */

  fbq('init', PIXEL_ID);
  fbq('track', 'PageView');

  // Every event this session already sent, so a back-button return or a
  // re-render cannot double-count. The server sends the same event_id and Meta
  // dedupes across the two — but it does NOT dedupe two identical browser sends.
  var sent = {};

  function track(name, params, eventId) {
    try {
      if (typeof fbq !== 'function') return;
      var key = name + ':' + (eventId || '');
      if (eventId && sent[key]) return;
      if (eventId) sent[key] = true;
      fbq('track', name, params || {}, eventId ? { eventID: eventId } : undefined);
    } catch (_) { /* an ad pixel must never break a checkout */ }
  }

  function cookie(name) {
    try {
      var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
      return m ? decodeURIComponent(m[1]) : '';
    } catch (_) { return ''; }
  }

  function cookies() { return { fbp: cookie('_fbp'), fbc: cookie('_fbc') }; }

  function eventId(prefix) {
    return (prefix || 'ev') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  window.ywePixel = { id: PIXEL_ID, track: track, cookies: cookies, eventId: eventId };
})();
