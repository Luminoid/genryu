// Applies the theme before the first paint: the remembered choice, else the
// system's, so a visitor who chose the light theme never sees a dark flash.
// Loaded as a plain script from the page's <head>; the content security policy
// in _headers allows no inline scripts.
(function () {
  var root = document.documentElement;
  var query = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
  var remembered = function () {
    try {
      var theme = localStorage.getItem('genryu:theme') || '';
      return theme === 'light' || theme === 'dark' ? theme : '';
    } catch (e) {
      return ''; /* storage blocked: follow the system theme */
    }
  };
  var apply = function () {
    root.dataset.theme = remembered() || (query && query.matches ? 'light' : 'dark');
  };
  apply();
  if (query) {
    if (query.addEventListener) query.addEventListener('change', apply);
    else if (query.addListener) query.addListener(apply);
  }
})();
