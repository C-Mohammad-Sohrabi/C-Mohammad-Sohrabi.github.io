/* ============================================================
   Mohammad Sohrabi — site behaviour
   Terminal entry, hash navigation, page transitions and glitch text.
   ============================================================ */
(function () {
  'use strict';

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var body = document.body;
  var entry = document.getElementById('entry');
  var typed = document.getElementById('typedCommand');
  var skipBtn = document.getElementById('skipIntro');
  var loader = document.getElementById('loader');
  var header = document.querySelector('.header');
  var menuButton = document.getElementById('menuButton');
  var headerWrap = document.getElementById('headerWrap');
  var primaryNav = document.getElementById('primaryNav');
  var menuOverlay = document.getElementById('menuOverlay');

  var sections = {
    hello: document.querySelector('.hello'),
    about: document.querySelector('.about'),
    achievements: document.querySelector('.achievements'),
    coding: document.querySelector('.coding'),
    design: document.querySelector('.design'),
    contact: document.querySelector('.contact'),
    error: document.querySelector('.error')
  };

  var currentPage = null;
  var menuOpen = false;
  var entryDone = false;
  var pendingSource = null;
  var introTimers = [];
  var enterTimer = null;
  var scrambleFrame = null;
  var scrambleTimer = null;
  var lastScrollY = window.scrollY || 0;

  /* ------------------------------------------------------------
     Helpers
     ------------------------------------------------------------ */
  function clearIntroTimers() {
    introTimers.forEach(function (id) { clearTimeout(id); });
    introTimers = [];
  }

  function routeFromHash() {
    var raw = (window.location.hash || '').replace(/^#\/?/, '').replace(/\/+$/, '');
    if (!raw) return 'hello';
    var first = raw.split(/[?#]/)[0].split('/')[0];
    if (!first) return 'hello';
    return sections[first] ? first : 'error';
  }

  function updateActiveNav(name) {
    document.querySelectorAll('.primary-nav a[data-name], .hello nav a[data-name]').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-name') === name);
    });
  }

  function closeMenu() {
    menuOpen = false;
    headerWrap.classList.remove('active');
    primaryNav.classList.remove('active');
    menuButton.classList.remove('active');
    menuButton.setAttribute('aria-expanded', 'false');
    body.classList.remove('menu-open');
  }

  function toggleMenu() {
    menuOpen = !menuOpen;
    headerWrap.classList.toggle('active', menuOpen);
    primaryNav.classList.toggle('active', menuOpen);
    menuButton.classList.toggle('active', menuOpen);
    menuButton.setAttribute('aria-expanded', menuOpen ? 'true' : 'false');
    body.classList.toggle('menu-open', menuOpen);
  }

  function cancelScramble() {
    if (scrambleFrame) cancelAnimationFrame(scrambleFrame);
    if (scrambleTimer) clearTimeout(scrambleTimer);
    scrambleFrame = null;
    scrambleTimer = null;
  }

  function scramble(el, duration) {
    var finalText = el.getAttribute('data-text') || '';
    if (!finalText) return;
    if (prefersReduced) {
      el.textContent = finalText;
      el.classList.add('glitch');
      return;
    }

    cancelScramble();
    var chars = '█▓▒░';
    var started = performance.now();
    var length = Math.max(1, finalText.length);
    duration = duration || 720;

    function tick(now) {
      var progress = Math.min(1, (now - started) / duration);
      var revealed = Math.floor(length * progress);
      var out = '';

      for (var i = 0; i < finalText.length; i += 1) {
        var ch = finalText.charAt(i);
        if (ch === ' ') {
          out += ' ';
        } else if (i < revealed) {
          out += ch;
        } else if (!/[a-z0-9]/i.test(ch)) {
          out += ch;
        } else {
          out += chars.charAt(Math.floor(Math.random() * chars.length));
        }
      }

      el.textContent = out;

      if (progress < 1) {
        scrambleFrame = requestAnimationFrame(tick);
      } else {
        el.textContent = finalText;
        el.classList.add('glitch');
        scrambleFrame = null;
      }
    }

    el.textContent = '';
    el.classList.remove('glitch');
    scrambleFrame = requestAnimationFrame(tick);
  }

  function enterPage(section, name) {
    var text = section.querySelector('h1 .text');

    cancelScramble();

    section.classList.remove('entered');
    void section.offsetWidth;

    var revealed = false;
    function reveal() {
      if (revealed) return;
      revealed = true;
      section.classList.add('entered');
      if (text && name === 'hello') {
        scrambleTimer = setTimeout(function () {
          scramble(text, 700);
        }, prefersReduced ? 0 : 380);
      }
    }

    requestAnimationFrame(reveal);
    introTimers.push(setTimeout(reveal, 80));

    window.scrollTo(0, 0);
    header.classList.remove('hide');
    lastScrollY = 0;
  }

  function flyClone(sourceRect, section, name) {
    var icon = section.querySelector('h1 .icon');
    var sourceIcon = document.querySelector('.element-box[data-name="' + name + '"] .icon');
    var clone = document.createElement('div');
    var heading = section.querySelector('h1');
    var targetRect;

    if (!sourceRect || !heading) {
      enterPage(section, name);
      return;
    }

    clone.className = 'element-clone';
    clone.setAttribute('aria-hidden', 'true');
    clone.innerHTML = '<span class="element-box">' + (sourceIcon ? sourceIcon.outerHTML : (icon ? icon.outerHTML : '')) + '</span>';
    clone.style.position = 'fixed';
    clone.style.left = sourceRect.left + 'px';
    clone.style.top = sourceRect.top + 'px';
    clone.style.width = sourceRect.width + 'px';
    clone.style.height = sourceRect.height + 'px';
    clone.style.margin = '0';
    clone.style.pointerEvents = 'none';
    document.body.appendChild(clone);

    targetRect = heading.getBoundingClientRect();

    if (prefersReduced || targetRect.width === 0) {
      clone.remove();
      enterPage(section, name);
      return;
    }

    var animation = clone.animate(
      [
        { left: sourceRect.left + 'px', top: sourceRect.top + 'px', width: sourceRect.width + 'px', height: sourceRect.height + 'px' },
        { left: targetRect.left + 'px', top: targetRect.top + 'px', width: '15px', height: targetRect.height + 'px' }
      ],
      { duration: 560, easing: 'cubic-bezier(.19,1,.22,1)', fill: 'forwards' }
    );

    enterPage(section, name);

    introTimers.push(setTimeout(function () {
      if (clone.parentNode) clone.remove();
    }, 1000));

    animation.onfinish = function () {
      var fade = clone.animate(
        [{ opacity: 1 }, { opacity: 0 }],
        { duration: 170, easing: 'ease-in', fill: 'forwards' }
      );
      fade.onfinish = function () {
        clone.remove();
      };
    };
  }

  function navigate(name, sourceEl, options) {
    options = options || {};
    var section = sections[name] || sections.error;
    var initial = !!options.initial;
    var sourceRect = sourceEl ? sourceEl.getBoundingClientRect() : null;
    var previous = currentPage ? sections[currentPage] : document.querySelector('section.active');

    if (options.replaceHash !== false && !initial) {
      var canonical = '#/' + name + '/';
      if (window.location.hash !== canonical) {
        try { history.replaceState(null, '', canonical); } catch (err) { window.location.hash = canonical; }
      }
    }

    if (!initial && currentPage === name) {
      closeMenu();
      return;
    }

    closeMenu();
    clearTimeout(enterTimer);
    cancelScramble();
    currentPage = name;

    if (previous && previous !== section) {
      previous.classList.remove('entered', 'active');
    }

    window.scrollTo(0, 0);
    header.classList.remove('hide');
    lastScrollY = 0;

    section.classList.add('active');
    updateActiveNav(name);

    if (initial) {
      enterTimer = setTimeout(function () {
        enterPage(section, name);
      }, prefersReduced ? 0 : (options.delay || 320));
      return;
    }

    if (sourceRect && !prefersReduced && !options.noClone) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          flyClone(sourceRect, section, name);
        });
      });
    } else {
      enterPage(section, name);
    }
  }

  /* ------------------------------------------------------------
     Entry sequence
     ------------------------------------------------------------ */
  function typeText(text, el, speed, done) {
    var i = 0;
    function step() {
      el.textContent = text.slice(0, i);
      i += 1;
      if (i <= text.length) {
        introTimers.push(setTimeout(step, speed));
      } else if (done) {
        done();
      }
    }
    step();
  }

  function revealSite(initialRoute, delay) {
    body.classList.remove('booting');
    body.classList.add('site-ready');
    navigate(initialRoute, null, { initial: true, delay: delay || 360, replaceHash: false });

    if (window.location.hash === '') {
      try { history.replaceState(null, '', '#/hello/'); } catch (err) { /* no-op */ }
    }

    if (!prefersReduced) {
      introTimers.push(setTimeout(function () {
        loader.classList.add('hidden');
        introTimers.push(setTimeout(function () {
          if (loader.parentNode) loader.parentNode.removeChild(loader);
        }, 700));
      }, 1400));
    } else {
      loader.classList.add('hidden');
      if (loader.parentNode) loader.parentNode.removeChild(loader);
    }
  }

  function finishIntro(initialRoute) {
    if (entryDone) return;
    entryDone = true;
    clearIntroTimers();
    try { sessionStorage.setItem('ms-portfolio-entered', '1'); } catch (err) { /* no-op */ }

    if (entry && !prefersReduced) {
      entry.classList.add('leaving');
      introTimers.push(setTimeout(function () { entry.classList.add('done'); }, 600));
    } else if (entry) {
      entry.classList.add('done');
    }

    revealSite(initialRoute, 600);
  }

  function startIntro(initialRoute) {
    if (!entry || prefersReduced) {
      finishIntro(initialRoute);
      return;
    }

    introTimers.push(setTimeout(function () {
      typeText('clear', typed, 120, function () {
        introTimers.push(setTimeout(function () {
          finishIntro(initialRoute);
        }, 900));
      });
    }, 900));
  }

  /* ------------------------------------------------------------
     Boot
     ------------------------------------------------------------ */
  var initialRoute = routeFromHash();
  var hasSeenIntro = false;
  var hasSeenIntro = false;
  var hashPointsElsewhere = !!window.location.hash && initialRoute !== 'hello';

  if (prefersReduced || hasSeenIntro || hashPointsElsewhere) {
    if (entry) entry.classList.add('done');
    entryDone = true;
    revealSite(initialRoute, 160);
  } else {
    startIntro(initialRoute);
  }

  /* ------------------------------------------------------------
     Navigation
     ------------------------------------------------------------ */
  document.addEventListener('click', function (event) {
    var link = event.target.closest('a');
    if (!link) return;

    var href = link.getAttribute('href') || '';
    if (href.indexOf('#/') !== 0) return;

    event.preventDefault();

    var name = href.replace(/^#\/?/, '').replace(/\/+$/, '');
    if (!sections[name]) name = 'error';

    if (name === currentPage) {
      closeMenu();
      return;
    }

    pendingSource = link.classList.contains('element-box') ? link : null;

    if (window.location.hash === href) {
      var source = pendingSource;
      pendingSource = null;
      navigate(name, source);
    } else {
      window.location.hash = href;
    }
  });

  window.addEventListener('hashchange', function () {
    var name = routeFromHash();
    var source = pendingSource;
    pendingSource = null;

    if (!entryDone) {
      finishIntro(name);
      return;
    }

    if (name !== currentPage) {
      navigate(name, source, { replaceHash: false });
    }
  });

  /* ------------------------------------------------------------
     Menu and header
     ------------------------------------------------------------ */
  menuButton.addEventListener('click', toggleMenu);
  if (menuOverlay) menuOverlay.addEventListener('click', closeMenu);
  if (skipBtn) skipBtn.addEventListener('click', function () {
    if (!entryDone) finishIntro(routeFromHash());
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && menuOpen) closeMenu();
    if (!entryDone && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      finishIntro(initialRoute);
    }
  });

  window.addEventListener('scroll', function () {
    if (menuOpen) return;
    var y = window.scrollY || window.pageYOffset || 0;
    var shouldHide = y > lastScrollY && y > 160;
    header.classList.toggle('hide', shouldHide);
    lastScrollY = y;
  }, { passive: true });

  /* Hover behaviour on the navigation tiles (desktop only) */
  var desktopQuery = window.matchMedia('(min-width: 1024px)');
  document.querySelectorAll('.hello nav a, .primary-nav a').forEach(function (link) {
    var text = link.querySelector('.text');
    if (!text) return;
    text.style.transition = 'opacity .22s ease, transform .22s ease';

    link.addEventListener('mouseenter', function () {
      if (!desktopQuery.matches) return;
      text.style.opacity = '0';
      text.style.transform = 'scale(1.5)';
    });
    link.addEventListener('mouseleave', function () {
      text.style.opacity = '';
      text.style.transform = '';
    });
  });

  /* Keep the current page active if the hash changes because of an in-page link */
  window.addEventListener('pageshow', function () {
    if (entryDone && !currentPage) {
      navigate(routeFromHash(), null, { initial: true, delay: 0 });
    }
  });
})();
