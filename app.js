document.addEventListener('DOMContentLoaded', () => {
  // Initialize AOS (Animate On Scroll)
  if (window.AOS) {
    AOS.init({ duration: 800, once: true });
  }

  // Navbar Scroll Effect
  const navbar = document.getElementById('navbar');
  let lastScrollTop = 0;

  window.addEventListener('scroll', () => {
    let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    if (scrollTop > 50) {
      navbar.classList.add('navbar-scroll');
    } else {
      navbar.classList.remove('navbar-scroll');
    }
    lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
  });

  // Parallax Effect for Hero Section
  const heroSection = document.querySelector('.hero-pattern');
  if (heroSection) {
    window.addEventListener('scroll', () => {
      const scrollTop = window.pageYOffset;
      heroSection.style.backgroundPosition = `0 ${scrollTop * 0.5}px`;
    });
  }

  // Add smooth parallax to floating elements
  const glowElements = document.querySelectorAll('.hero-glow');
  window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset;
    glowElements.forEach((element, index) => {
      const speed = 0.3 + (index * 0.1);
      element.style.transform = `translateY(${scrollTop * speed}px)`;
    });
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
