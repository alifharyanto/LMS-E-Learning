function togglePasswordVisibility(toggle) {
  const passwordInput = document.getElementById(toggle.dataset.passwordToggle);
  if (!passwordInput) return;

  const isPasswordHidden = passwordInput.type === 'password';
  passwordInput.type = isPasswordHidden ? 'text' : 'password';
  toggle.setAttribute('aria-label', isPasswordHidden ? 'Sembunyikan password' : 'Tampilkan password');
  toggle.setAttribute('title', isPasswordHidden ? 'Sembunyikan password' : 'Tampilkan password');
}

document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('is-ready');

  const mobileMenuButton = document.getElementById('mobileMenuButton');
  const mobileMenu = document.getElementById('mobileMenu');
  if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.addEventListener('click', () => {
      const isOpen = !mobileMenu.classList.contains('hidden');
      mobileMenu.classList.toggle('hidden', isOpen);
      mobileMenuButton.setAttribute('aria-expanded', String(!isOpen));
      mobileMenuButton.setAttribute('aria-label', isOpen ? 'Buka menu' : 'Tutup menu');
    });

    mobileMenu.addEventListener('click', (event) => {
      if (event.target.closest('a')) {
        mobileMenu.classList.add('hidden');
        mobileMenuButton.setAttribute('aria-expanded', 'false');
        mobileMenuButton.setAttribute('aria-label', 'Buka menu');
      }
    });
  }

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
    const updateNavbar = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

      navbar.classList.toggle('navbar-scroll', scrollTop > 32);
    };

    updateNavbar();
    window.addEventListener('scroll', updateNavbar, { passive: true });
  }

  const revealElements = document.querySelectorAll('.site-main > section, .site-main > div > section, .site-main > div > aside, .site-main article, .site-main details');
  revealElements.forEach((element, index) => {
    element.dataset.reveal = 'true';
    element.style.animationDelay = `${Math.min(index * 45, 240)}ms`;
  });

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
