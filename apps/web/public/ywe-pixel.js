// Meta pixel — the browser half. Worker mirror: worker/lib/meta-capi.js
//
// One file so the pixel id exists in exactly one place. Every surface that
// tracks loads this in <head>; it installs fbq and fires PageView itself, so a
// page never pastes the base snippet again.
//
// The event vocabulary is deliberate and documented in docs/SPEC_META_PIXEL.md:
//
//   Schedule   a class registration COMPLETED — fires for the $11 purchase, the
//              trial's free class, and a member spending a class credit alike.
//              This is the campaign objective: it is the union of every route
//              to the thing the ads actually want, so it is also the event with
//              enough volume for Meta to learn from.
//   StartTrial the 7-day Ruby/Om trial opened.
//   Purchase   money actually moved. NEVER fired at $0 — a free trial class or
//              a credit booking is a Schedule, not a Purchase. Keeping this
//              clean is what makes Purchase-revenue mean revenue a year from now.
//
// window.ywePixel.track() is a no-op until fbq loads, so call sites never guard.
(function () {
  // Ethan's original pixel, carried over from the Framer site. Its conversion
  // history is the thing Meta optimises from, so this id must not be replaced
  // with a freshly minted one. Server mirror: meta-capi.js META_PIXEL_ID.
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

  // Every event this session already sent, so a back-button return or a re-render
  // cannot double-count. The server sends the same event_id, and Meta dedupes
  // across the two — but it does NOT dedupe two identical browser sends.
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

  window.ywePixel = { id: PIXEL_ID, track: track };
})();
