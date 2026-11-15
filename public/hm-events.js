// Forwards the app's own "hivemind:analytics" events (scorecard_start,
// scorecard_complete, booking_start) to whichever analytics tool is installed.
// Does nothing until one is added. The ?src= tag on a link records where the
// visitor came from (li-dm, li-profile, li-post, workshop).
(function () {
  var src = new URLSearchParams(location.search).get("src");
  try {
    if (src) sessionStorage.setItem("hm_src", src);
    else src = sessionStorage.getItem("hm_src");
  } catch (e) {}
  src = src || "direct";
  window.addEventListener("hivemind:analytics", function (e) {
    var d = e.detail || {};
    var props = { src: src, page: location.pathname };
    if (d.score !== undefined) props.score = d.score;
    if (d.label !== undefined) props.label = d.label;
    if (window.plausible) window.plausible(d.name, { props: props });
    if (window.va) window.va("event", { name: d.name, data: props });
    if (window.gtag) window.gtag("event", d.name, props);
  });
})();
