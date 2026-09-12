// ---------- Mobile menu toggle ----------
function initMobileMenu() {
  var toggle = document.querySelector('.menu-toggle');
  var links = document.querySelector('.nav-links');
  if (!toggle || !links) return;
  toggle.onclick = function () {
    links.classList.toggle('open');
    toggle.textContent = links.classList.contains('open') ? '✕' : '☰';
  };
  links.querySelectorAll('a').forEach(function (a) {
    a.onclick = function () {
      links.classList.remove('open');
      toggle.textContent = '☰';
    };
  });
}

// ---------- Persistent live audio player (multi-station) ----------
var STATIONS = {
  kampala: { url: 'https://stream.sunnygh.com/spiritfm', label: '96.6 FM Kampala' },
  koboko: { url: 'https://stream.sunnygh.com/spirit1045', label: '104.5 FM Koboko' }
};
var DEFAULT_STATION = 'kampala';
var currentStation = DEFAULT_STATION;

function siteAudioEl() {
  return document.getElementById('site-audio');
}

function updatePlayerUI(playing, statusText, stationKey) {
  document.querySelectorAll('[data-role="site-play-toggle"]').forEach(function (btn) {
    var btnStation = btn.getAttribute('data-station');
    var isActiveBtn = !btnStation || btnStation === (stationKey || currentStation);
    btn.textContent = (playing && isActiveBtn) ? '❚❚' : '▶';
    btn.classList.toggle('is-playing', playing && isActiveBtn);
  });
  document.querySelectorAll('[data-role="site-play-status"]').forEach(function (el) {
    var elStation = el.getAttribute('data-station');
    if (!elStation) {
      // Global/mini player bar status — always reflects current station
      el.textContent = statusText;
    } else if (elStation === (stationKey || currentStation)) {
      el.textContent = statusText;
    } else {
      el.textContent = 'Tap to listen live';
    }
  });
  document.querySelectorAll('[data-role="site-live-dot"]').forEach(function (dot) {
    dot.classList.toggle('on', playing);
  });
  document.querySelectorAll('[data-role="site-station-name"]').forEach(function (el) {
    el.textContent = STATIONS[stationKey || currentStation].label;
  });
}

function toggleSitePlayback(stationKey) {
  var audio = siteAudioEl();
  if (!audio) return;
  stationKey = stationKey || currentStation || DEFAULT_STATION;
  var station = STATIONS[stationKey] || STATIONS[DEFAULT_STATION];

  var switchingStation = stationKey !== currentStation;

  if (!audio.paused && !switchingStation) {
    audio.pause();
    updatePlayerUI(false, 'Tap to listen live', stationKey);
    return;
  }

  currentStation = stationKey;
  audio.pause();
  audio.src = station.url;
  updatePlayerUI(false, 'Connecting…', stationKey);
  audio.play().then(function () {
    updatePlayerUI(true, 'Live now — ' + station.label, stationKey);
  }).catch(function () {
    updatePlayerUI(false, 'Could not connect. Try again.', stationKey);
  });
}

document.addEventListener('click', function (e) {
  var btn = e.target.closest('[data-role="site-play-toggle"]');
  if (btn) {
    e.preventDefault();
    toggleSitePlayback(btn.getAttribute('data-station'));
  }
});

// ---------- AJAX page navigation (keeps the audio player alive across pages) ----------
function isNavigable(link) {
  if (!link || !link.href) return false;
  if (link.target === '_blank' || link.hasAttribute('download')) return false;
  var url;
  try { url = new URL(link.href, window.location.href); } catch (e) { return false; }
  if (url.origin !== window.location.origin) return false;
  if (url.protocol === 'mailto:' || url.protocol === 'tel:') return false;
  // Same-page anchor links (e.g. "#listen") should behave normally
  if (url.pathname === window.location.pathname && url.hash) return false;
  return true;
}

function setActiveNav(pathname) {
  document.querySelectorAll('.nav-links a').forEach(function (a) {
    var linkPath = new URL(a.href, window.location.href).pathname;
    var isHome = linkPath === '/' && (pathname === '/' || pathname === '/index.html');
    if (linkPath === pathname || isHome) {
      a.classList.add('active');
    } else {
      a.classList.remove('active');
    }
  });
}

function navigateTo(url, opts) {
  opts = opts || {};
  var content = document.getElementById('page-content');
  if (!content) {
    window.location.href = url;
    return;
  }

  fetch(url, { credentials: 'same-origin' })
    .then(function (res) {
      if (!res.ok) throw new Error('Navigation fetch failed');
      return res.text();
    })
    .then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var newContent = doc.getElementById('page-content');
      if (!newContent) throw new Error('No #page-content in fetched page');

      content.innerHTML = newContent.innerHTML;
      document.title = doc.title;

      var urlObj = new URL(url, window.location.href);
      if (!opts.noPush) {
        window.history.pushState({}, '', urlObj.pathname + urlObj.hash);
      }
      setActiveNav(urlObj.pathname);
      if (urlObj.hash) {
        var target = document.querySelector(urlObj.hash);
        if (target) { target.scrollIntoView({ behavior: 'smooth' }); }
      } else if (!opts.keepScroll) {
        window.scrollTo(0, 0);
      }

      initMobileMenu();
      document.dispatchEvent(new CustomEvent('page:navigated'));
    })
    .catch(function () {
      // Fall back to a normal full page load if anything goes wrong
      window.location.href = url;
    });
}

document.addEventListener('click', function (e) {
  var link = e.target.closest('a');
  if (!link) return;
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (!isNavigable(link)) return;
  e.preventDefault();
  navigateTo(link.href);
});

window.addEventListener('popstate', function () {
  navigateTo(window.location.href, { noPush: true });
});

document.addEventListener('DOMContentLoaded', initMobileMenu);
