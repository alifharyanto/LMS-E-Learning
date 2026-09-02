document.addEventListener('DOMContentLoaded', () => {
  const themeStorageKey = 'courseup-theme';
  const savedTheme = localStorage.getItem(themeStorageKey);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
  const nav = document.querySelector('header nav');

  const applyTheme = (theme) => {
    const isDark = theme === 'dark';
    document.body.classList.toggle('dark-mode', isDark);
    localStorage.setItem(themeStorageKey, theme);

    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
      themeToggle.textContent = isDark ? '☀️' : '🌙';
      themeToggle.setAttribute('aria-label', isDark ? 'Aktifkan light mode' : 'Aktifkan dark mode');
      themeToggle.setAttribute('title', isDark ? 'Light mode' : 'Dark mode');
    }
  };

  if (nav && !nav.querySelector('.theme-toggle')) {
    const themeToggle = document.createElement('button');
    themeToggle.type = 'button';
    themeToggle.className = 'theme-toggle';
    themeToggle.addEventListener('click', () => {
      applyTheme(document.body.classList.contains('dark-mode') ? 'light' : 'dark');
    });
    nav.appendChild(themeToggle);
  }

  applyTheme(initialTheme);

  // Initialize AOS (Animate On Scroll)
  if (window.AOS) {
    document.querySelectorAll('[data-aos]').forEach((element) => {
      if (element.dataset.aos === 'fade-left' || element.dataset.aos === 'fade-right' || element.dataset.aos === 'zoom-in') {
        element.dataset.aos = 'fade-up';
      }
    });
    window.AOS.init({
      duration: 450,
      easing: 'cubic-bezier(.22, 1, .36, 1)',
      offset: 24,
      once: true,
      disable: window.matchMedia('(prefers-reduced-motion: reduce)').matches
    });
  }

  // Navbar Scroll Effect
  const navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

      if (scrollTop > 50) {
        navbar.classList.add('navbar-scroll');
      } else {
        navbar.classList.remove('navbar-scroll');
      }
    });
  }

  // Navbar Links Active State
  const navLinks = document.querySelectorAll('nav a[href^="#"]');
  const sections = document.querySelectorAll('section[id]');

  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach((section) => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;
      if (pageYOffset >= sectionTop - 200) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach((link) => {
      link.classList.remove('text-emerald-600', 'font-semibold');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('text-emerald-600', 'font-semibold');
      }
    });
  });

  // Scroll to top smooth
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  console.log('CourseUp Platform Loaded ✨');
});
