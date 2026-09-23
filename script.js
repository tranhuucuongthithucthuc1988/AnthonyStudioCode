document.addEventListener('DOMContentLoaded', () => {
    // ══════════════════════════════════════════════════════
    // PROGRESS BAR
    // ══════════════════════════════════════════════════════
    const progressBar = document.getElementById('progress-bar');
    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = (scrollTop / docHeight) * 100;
        if (progressBar) progressBar.style.width = progress + '%';
    });

    // ══════════════════════════════════════════════════════
    // TYPING EFFECT
    // ══════════════════════════════════════════════════════
    const typingElement = document.getElementById('typing-text');
    if (typingElement) {
        const words = ['ANTHONY STUDIO', 'CODE EDITOR', 'HTML MASTER'];
        let wordIndex = 0, charIndex = 0, isDeleting = false, typeSpeed = 100;
        function type() {
            const currentWord = words[wordIndex];
            if (isDeleting) {
                typingElement.textContent = currentWord.substring(0, charIndex - 1);
                charIndex--; typeSpeed = 50;
            } else {
                typingElement.textContent = currentWord.substring(0, charIndex + 1);
                charIndex++; typeSpeed = 100;
            }
            if (!isDeleting && charIndex === currentWord.length) { isDeleting = true; typeSpeed = 2000; }
            else if (isDeleting && charIndex === 0) { isDeleting = false; wordIndex = (wordIndex + 1) % words.length; typeSpeed = 500; }
            setTimeout(type, typeSpeed);
        }
        setTimeout(type, 1000);
    }

    // ══════════════════════════════════════════════════════
    // STATS COUNTER
    // ══════════════════════════════════════════════════════
    const statNumbers = document.querySelectorAll('.stat-number');
    const animateCounter = (el) => {
        const target = parseInt(el.dataset.target);
        const suffix = el.dataset.suffix || '';
        const duration = 1500;
        const startTime = performance.now();

        const update = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // easeOutQuart
            const eased = 1 - Math.pow(1 - progress, 4);
            const current = Math.floor(eased * target);

            if (target >= 1000) {
                el.textContent = current.toLocaleString('vi-VN') + suffix;
            } else {
                el.textContent = current + suffix;
            }

            if (progress < 1) requestAnimationFrame(update);
        };
        requestAnimationFrame(update);
    };

    const statObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                statObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    statNumbers.forEach(el => statObserver.observe(el));

    // ══════════════════════════════════════════════════════
    // MOBILE MENU
    // ══════════════════════════════════════════════════════
    const mobileMenuBtn = document.getElementById('mobile-menu');
    const navbar = document.getElementById('navbar')?.querySelector('ul');
    if (mobileMenuBtn && navbar) {
        mobileMenuBtn.addEventListener('click', () => {
            navbar.classList.toggle('active');
            const icon = mobileMenuBtn.querySelector('i');
            icon.classList.toggle('fa-bars');
            icon.classList.toggle('fa-xmark');
        });
    }
    document.querySelectorAll('nav ul li a').forEach(link => {
        link.addEventListener('click', () => {
            if (navbar && navbar.classList.contains('active')) {
                navbar.classList.remove('active');
                const icon = mobileMenuBtn.querySelector('i');
                icon.classList.remove('fa-xmark');
                icon.classList.add('fa-bars');
            }
        });
    });

    // ══════════════════════════════════════════════════════
    // SCROLL REVEAL
    // ══════════════════════════════════════════════════════
    const revealElements = document.querySelectorAll('.reveal');
    const revealOnScroll = () => {
        const windowHeight = window.innerHeight;
        revealElements.forEach(el => {
            if (el.getBoundingClientRect().top < windowHeight - 100) el.classList.add('active');
        });
    };
    revealOnScroll();
    window.addEventListener('scroll', revealOnScroll);

    // ══════════════════════════════════════════════════════
    // SCROLL TO TOP + PROGRESS RING
    // ══════════════════════════════════════════════════════
    const scrollTopBtn = document.getElementById('scrollTop');
    const ringCircle = scrollTopBtn?.querySelector('.progress-ring-circle');
    const RING_CIRCUMFERENCE = 125.6;

    if (scrollTopBtn) {
        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = scrollY / docHeight;

            if (scrollY > 500) {
                scrollTopBtn.style.display = 'flex';
                scrollTopBtn.style.alignItems = 'center';
                scrollTopBtn.style.justifyContent = 'center';
                if (ringCircle) {
                    ringCircle.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - progress);
                }
            } else {
                scrollTopBtn.style.display = 'none';
            }
        });
        scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }

    // ══════════════════════════════════════════════════════
    // HEADER SCROLL EFFECT
    // ══════════════════════════════════════════════════════
    const header = document.getElementById('header');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.8)';
                header.style.backgroundColor = 'rgba(11, 14, 19, 0.95)';
            } else {
                header.style.boxShadow = 'none';
                header.style.backgroundColor = 'rgba(11, 14, 19, 0.7)';
            }
        });
    }

    // ══════════════════════════════════════════════════════
    // FAQ ACCORDION
    // ══════════════════════════════════════════════════════
    document.querySelectorAll('.faq-question').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.parentElement;
            const isActive = item.classList.contains('active');
            document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
            if (!isActive) item.classList.add('active');
        });
    });

    // ══════════════════════════════════════════════════════
    // SHORTCUT SEARCH
    // ══════════════════════════════════════════════════════
    const shortcutSearch = document.getElementById('shortcut-search');
    if (shortcutSearch) {
        shortcutSearch.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            document.querySelectorAll('#shortcut-tbody tr').forEach(row => {
                const text = row.textContent.toLowerCase();
                row.classList.toggle('hidden', term && !text.includes(term));
            });
        });
    }

    // ══════════════════════════════════════════════════════
    // COMMAND PALETTE (Ctrl+K)
    // ══════════════════════════════════════════════════════
    const palette = document.getElementById('command-palette');
    const paletteInput = document.getElementById('command-input');
    const paletteItems = document.querySelectorAll('.command-item');
    const searchTrigger = document.getElementById('search-trigger');

    function openPalette() {
        palette.classList.add('active');
        paletteInput.value = '';
        paletteInput.focus();
        paletteItems.forEach(i => i.classList.remove('hidden'));
        updateSelection(0);
    }
    function closePalette() {
        palette.classList.remove('active');
    }

    let selectedIndex = 0;
    function updateSelection(idx) {
        const visible = Array.from(paletteItems).filter(i => !i.classList.contains('hidden'));
        visible.forEach(i => i.classList.remove('selected'));
        if (visible[idx]) {
            visible[idx].classList.add('selected');
            visible[idx].scrollIntoView({ block: 'nearest' });
        }
        selectedIndex = idx;
    }

    if (searchTrigger) searchTrigger.addEventListener('click', openPalette);
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            palette.classList.contains('active') ? closePalette() : openPalette();
        }
        if (e.key === 'Escape' && palette.classList.contains('active')) closePalette();

        if (palette.classList.contains('active')) {
            const visible = Array.from(paletteItems).filter(i => !i.classList.contains('hidden'));
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                updateSelection(Math.min(selectedIndex + 1, visible.length - 1));
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                updateSelection(Math.max(selectedIndex - 1, 0));
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                const sel = visible[selectedIndex];
                if (sel) {
                    const href = sel.dataset.href;
                    const target = sel.dataset.target;
                    closePalette();
                    if (target) window.open(href, target);
                    else window.location.href = href;
                }
            }
        }
    });

    palette?.addEventListener('click', (e) => {
        if (e.target === palette) closePalette();
    });

    paletteInput?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        paletteItems.forEach(item => {
            const text = (item.querySelector('.command-title')?.textContent || '').toLowerCase()
                       + (item.querySelector('.command-desc')?.textContent || '').toLowerCase();
            item.classList.toggle('hidden', term && !text.includes(term));
        });
        updateSelection(0);
    });

    paletteItems.forEach((item, idx) => {
        item.addEventListener('click', () => {
            const href = item.dataset.href;
            const target = item.dataset.target;
            closePalette();
            if (target) window.open(href, target);
            else window.location.href = href;
        });
        item.addEventListener('mouseenter', () => {
            const visible = Array.from(paletteItems).filter(i => !i.classList.contains('hidden'));
            updateSelection(visible.indexOf(item));
        });
    });

    // ══════════════════════════════════════════════════════
    // PARTICLE BACKGROUND
    // ══════════════════════════════════════════════════════
    const canvas = document.getElementById('particles');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let particles = [];
        let w, h;

        function resize() {
            w = canvas.width = window.innerWidth;
            h = canvas.height = window.innerHeight;
            initParticles();
        }

        function initParticles() {
            particles = [];
            const count = Math.min(60, Math.floor((w * h) / 25000));
            for (let i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    vx: (Math.random() - 0.5) * 0.3,
                    vy: (Math.random() - 0.5) * 0.3,
                    r: Math.random() * 1.5 + 0.5,
                    alpha: Math.random() * 0.5 + 0.2,
                });
            }
        }

        function animate() {
            ctx.clearRect(0, 0, w, h);
            particles.forEach((p, i) => {
                p.x += p.vx; p.y += p.vy;
                if (p.x < 0 || p.x > w) p.vx *= -1;
                if (p.y < 0 || p.y > h) p.vy *= -1;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 138, 61, ${p.alpha})`;
                ctx.fill();

                // Connect nearby particles
                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dx = p.x - p2.x, dy = p.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 120) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle = `rgba(255, 138, 61, ${0.15 * (1 - dist / 120)})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            });
            requestAnimationFrame(animate);
        }

        resize();
        animate();
        window.addEventListener('resize', resize);
    }

    // ══════════════════════════════════════════════════════
    // COPY CODE BUTTON
    // ══════════════════════════════════════════════════════
    const copyBtn = document.getElementById('copy-demo');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const codeEl = document.querySelector('#demo-code code');
            if (codeEl) {
                navigator.clipboard.writeText(codeEl.textContent).then(() => {
                    showToast('Đã copy code!');
                    const icon = copyBtn.querySelector('i');
                    icon.classList.remove('fa-copy');
                    icon.classList.add('fa-check');
                    setTimeout(() => {
                        icon.classList.remove('fa-check');
                        icon.classList.add('fa-copy');
                    }, 2000);
                }).catch(() => showToast('Không copy được', 'error'));
            }
        });
    }

    // ══════════════════════════════════════════════════════
    // TOAST HELPER
    // ══════════════════════════════════════════════════════
    function showToast(msg, type = 'success') {
        const toast = document.getElementById('toast');
        if (!toast) return;
        const icon = type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check';
        toast.innerHTML = `<i class="fa-solid ${icon}"></i>${msg}`;
        toast.classList.add('show');
        clearTimeout(showToast._t);
        showToast._t = setTimeout(() => toast.classList.remove('show'), 2500);
    }

    // ══════════════════════════════════════════════════════
    // NEWSLETTER FORM
    // ══════════════════════════════════════════════════════
    const newsletterForm = document.getElementById('newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = newsletterForm.querySelector('input').value;
            showToast(`Đã đăng ký với email: ${email}`);
            newsletterForm.reset();
        });
    }

    // ══════════════════════════════════════════════════════
    // TILT EFFECT ON FEATURE CARDS
    // ══════════════════════════════════════════════════════
    if (window.matchMedia('(hover: hover)').matches) {
        document.querySelectorAll('.tilt').forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const rotateX = ((y / rect.height) - 0.5) * -6;
                const rotateY = ((x / rect.width) - 0.5) * 6;
                card.style.transform = `translateY(-8px) perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
            });
        });
    }
});