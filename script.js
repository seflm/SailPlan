/**
 * SailPlan - Interactive Demo Script
 * Handles navigation, forms, modals, and admin panel functionality
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize all components
    initNavigation();
    initScrollEffects();
    initForms();
    initModals();
    initAdminPanel();
    initCopyLink();
});

/**
 * Navigation functionality
 */
function initNavigation() {
    const nav = document.getElementById('mainNav');
    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');
    
    // Mobile menu toggle
    toggle?.addEventListener('click', () => {
        links.classList.toggle('active');
        toggle.classList.toggle('active');
    });
    
    // Close mobile menu when clicking a link
    links?.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            links.classList.remove('active');
            toggle.classList.remove('active');
        });
    });
    
    // Scroll effect for navigation
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            nav?.classList.add('scrolled');
        } else {
            nav?.classList.remove('scrolled');
        }
    });
    
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

/**
 * Scroll-based effects and animations
 */
function initScrollEffects() {
    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe sections
    document.querySelectorAll('.section').forEach(section => {
        section.style.opacity = '0';
        observer.observe(section);
    });
    
    // Hero parallax effect (subtle)
    const hero = document.querySelector('.hero');
    if (hero) {
        window.addEventListener('scroll', () => {
            const scrolled = window.scrollY;
            if (scrolled < window.innerHeight) {
                hero.style.setProperty('--parallax-offset', `${scrolled * 0.3}px`);
            }
        });
    }
}

/**
 * Form handling
 */
function initForms() {
    const signupForm = document.getElementById('signupForm');
    
    signupForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Validate form
        const formData = new FormData(signupForm);
        const data = Object.fromEntries(formData.entries());
        
        // Check required fields
        if (!data.name || !data.email || !data.phone) {
            showNotification('Prosím vyplňte všechna povinná pole.', 'error');
            return;
        }
        
        // Check GDPR consent
        if (!data.gdpr) {
            showNotification('Pro pokračování musíte souhlasit se zpracováním osobních údajů.', 'error');
            return;
        }
        
        // Simulate form submission
        const submitBtn = signupForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span>Odesílám...</span>';
        submitBtn.disabled = true;
        
        setTimeout(() => {
            // Reset form
            signupForm.reset();
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            
            // Show success modal
            openModal('successModal');
        }, 1500);
    });
    
    // Real-time phone number formatting
    const phoneInput = document.getElementById('phone');
    phoneInput?.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.startsWith('420')) {
            value = '+420 ' + value.slice(3);
        } else if (value.length > 0 && !value.startsWith('+')) {
            // Format as Czech number
            if (value.length > 3) {
                value = value.slice(0, 3) + ' ' + value.slice(3);
            }
            if (value.length > 7) {
                value = value.slice(0, 7) + ' ' + value.slice(7);
            }
        }
        e.target.value = value.slice(0, 15);
    });
    
    // Email validation on blur
    const emailInput = document.getElementById('email');
    emailInput?.addEventListener('blur', (e) => {
        const email = e.target.value;
        if (email && !isValidEmail(email)) {
            e.target.style.borderColor = 'var(--coral)';
        } else {
            e.target.style.borderColor = '';
        }
    });
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Show notification (toast)
 */
function showNotification(message, type = 'info') {
    // Remove existing notifications
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button class="notification-close">&times;</button>
    `;
    
    // Add styles if not already present
    if (!document.getElementById('notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 3000;
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 16px 20px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 8px 30px rgba(0,0,0,0.15);
                animation: slideIn 0.3s ease;
            }
            .notification-error {
                border-left: 4px solid var(--coral);
            }
            .notification-success {
                border-left: 4px solid var(--ocean-500);
            }
            .notification-close {
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                opacity: 0.5;
            }
            .notification-close:hover {
                opacity: 1;
            }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(notification);
    
    // Close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.remove();
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => notification.remove(), 5000);
}

/**
 * Modal handling
 */
function initModals() {
    // GDPR modal links
    document.querySelectorAll('[href="#gdpr-modal"], .gdpr-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            openModal('gdprModal');
        });
    });
    
    // Close modal on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', () => {
            const modal = overlay.closest('.modal');
            if (modal) closeModal(modal.id);
        });
    });
    
    // Close buttons
    document.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            if (modal) closeModal(modal.id);
        });
    });
    
    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(modal => {
                closeModal(modal.id);
            });
        }
    });
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

/**
 * Admin panel functionality
 */
function initAdminPanel() {
    const loginSection = document.getElementById('adminLogin');
    const panelSection = document.getElementById('adminPanel');
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    // Simulate Google login
    googleLoginBtn?.addEventListener('click', () => {
        googleLoginBtn.innerHTML = `
            <svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" stroke-dasharray="30 60"/>
            </svg>
            Přihlašuji...
        `;
        googleLoginBtn.disabled = true;
        
        // Add spinner animation
        const style = document.createElement('style');
        style.textContent = `
            .spinner {
                width: 20px;
                height: 20px;
                animation: spin 1s linear infinite;
            }
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        
        setTimeout(() => {
            loginSection.style.display = 'none';
            panelSection.style.display = 'block';
            showNotification('Přihlášení úspěšné!', 'success');
        }, 1500);
    });
    
    // Logout
    logoutBtn?.addEventListener('click', () => {
        panelSection.style.display = 'none';
        loginSection.style.display = 'block';
        googleLoginBtn.innerHTML = `
            <svg viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Přihlásit se přes Google
        `;
        googleLoginBtn.disabled = false;
    });
    
    // Tab switching
    const tabs = document.querySelectorAll('.admin-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show corresponding content
            document.querySelectorAll('.admin-content').forEach(content => {
                content.style.display = 'none';
            });
            document.getElementById(`tab-${targetTab}`).style.display = 'block';
        });
    });
    
    // Role select styling
    document.querySelectorAll('.role-select').forEach(select => {
        select.addEventListener('change', (e) => {
            select.classList.remove('role-captain', 'role-helper');
            if (e.target.value === 'captain') {
                select.classList.add('role-captain');
            } else if (e.target.value === 'helper') {
                select.classList.add('role-helper');
            }
        });
    });
    
    // Add boat button
    document.querySelector('.btn-add-boat')?.addEventListener('click', () => {
        const boatsList = document.querySelector('.boats-admin-list');
        const newBoat = document.createElement('div');
        newBoat.className = 'boat-admin-item';
        newBoat.innerHTML = `
            <div class="boat-admin-header">
                <input type="text" class="boat-name-input" value="Nová loď" placeholder="Název lodi">
                <button class="btn-icon btn-delete" title="Smazat loď">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3,6 5,6 21,6"/>
                        <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6M8,6V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"/>
                    </svg>
                </button>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Typ</label>
                    <input type="text" placeholder="Např. Bavaria 46">
                </div>
                <div class="form-group">
                    <label>Kapacita</label>
                    <input type="number" value="4" min="1">
                </div>
                <div class="form-group">
                    <label>Počet pomocníků</label>
                    <input type="number" value="1" min="0">
                </div>
            </div>
        `;
        boatsList.appendChild(newBoat);
        
        // Add delete handler
        newBoat.querySelector('.btn-delete').addEventListener('click', () => {
            if (confirm('Opravdu chcete smazat tuto loď?')) {
                newBoat.remove();
            }
        });
        
        // Focus on name input
        newBoat.querySelector('.boat-name-input').focus();
        newBoat.querySelector('.boat-name-input').select();
    });
    
    // Delete boat handlers
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const boatItem = e.target.closest('.boat-admin-item');
            if (boatItem && confirm('Opravdu chcete smazat tuto loď?')) {
                boatItem.remove();
            }
        });
    });
    
    // Save changes button (demo feedback)
    document.querySelectorAll('.admin-form .btn-primary').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.textContent = 'Ukládám...';
            btn.disabled = true;
            
            setTimeout(() => {
                btn.textContent = 'Uložit změny';
                btn.disabled = false;
                showNotification('Změny byly uloženy!', 'success');
            }, 1000);
        });
    });
}

/**
 * Copy link functionality
 */
function initCopyLink() {
    const copyBtn = document.getElementById('copyLink');
    const shareLink = document.getElementById('shareLink');
    
    copyBtn?.addEventListener('click', async () => {
        const link = shareLink.value;
        
        try {
            await navigator.clipboard.writeText(link);
            
            // Visual feedback
            const originalHTML = copyBtn.innerHTML;
            copyBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20,6 9,17 4,12"/>
                </svg>
                Zkopírováno!
            `;
            copyBtn.style.background = 'var(--ocean-500)';
            
            setTimeout(() => {
                copyBtn.innerHTML = originalHTML;
                copyBtn.style.background = '';
            }, 2000);
        } catch (err) {
            // Fallback for older browsers
            shareLink.select();
            document.execCommand('copy');
            showNotification('Odkaz zkopírován!', 'success');
        }
    });
}

/**
 * Additional feature: Countdown timer
 */
function initCountdown() {
    const eventDate = new Date('2025-07-15T10:00:00');
    const countdownEl = document.querySelector('.countdown');
    
    if (!countdownEl) return;
    
    function updateCountdown() {
        const now = new Date();
        const diff = eventDate - now;
        
        if (diff <= 0) {
            countdownEl.textContent = 'Akce právě probíhá!';
            return;
        }
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        countdownEl.innerHTML = `
            <span class="countdown-item">${days} <small>dní</small></span>
            <span class="countdown-item">${hours} <small>hodin</small></span>
            <span class="countdown-item">${minutes} <small>minut</small></span>
        `;
    }
    
    updateCountdown();
    setInterval(updateCountdown, 60000);
}

// Initialize countdown if element exists
document.addEventListener('DOMContentLoaded', initCountdown);



