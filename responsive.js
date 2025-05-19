/**
 * Portfolio - Gianlivio Iemolo
 * Menu Hamburger e Funzioni Responsive
 * 
 * Questo script si integra con il tuo script.js principale
 * e aggiunge le funzionalità per il menu hamburger mobile
 * e altri aggiustamenti responsivi.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Aggiungi il menu hamburger alla navigazione
    setupHamburgerMenu();
    
    // Aggiungi altre funzioni responsive
    setupResponsiveFeatures();
    
    // Ascoltatore per il ridimensionamento della finestra
    window.addEventListener('resize', handleResize);
    
    // Esegui l'handler del resize all'avvio
    handleResize();
});

/**
 * Crea e inizializza il menu hamburger
 */
function setupHamburgerMenu() {
    // Ottieni il container della navigazione
    const nav = document.querySelector('nav');
    const navLeft = document.querySelector('.nav-left');
    
    if (!nav || !navLeft) return;
    
    // Crea l'hamburger menu
    const hamburger = document.createElement('div');
    hamburger.className = 'hamburger-menu';
    hamburger.innerHTML = `
        <span></span>
        <span></span>
        <span></span>
    `;
    
    // Aggiungi l'hamburger alla navigazione
    navLeft.appendChild(hamburger);
    
    // Event listener per il click
    hamburger.addEventListener('click', () => {
        // Toggle classe active sull'hamburger
        hamburger.classList.toggle('active');
        
        // Toggle classe mobile-menu-active sul nav
        nav.classList.toggle('mobile-menu-active');
        
        // Quando il menu è aperto, imposta overflow: hidden sul body
        // per prevenire lo scrolling della pagina
        if (nav.classList.contains('mobile-menu-active')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    });
    
    // Chiudi il menu quando un link viene cliccato
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            nav.classList.remove('mobile-menu-active');
            document.body.style.overflow = '';
        });
    });
}

/**
 * Configura caratteristiche responsive aggiuntive
 */
function setupResponsiveFeatures() {
    // Fix per i modal su mobile
    const projectModal = document.getElementById('project-modal');
    if (projectModal) {
        // Impedisci che il pinch zoom faccia zoom sulla pagina quando si usa il modal su mobile
        projectModal.addEventListener('touchmove', function(e) {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });
    }
    
    // Migliora il comportamento del tap su mobile
    const interactiveElements = document.querySelectorAll('a, button, .nav-link, .tech-stack span, .filter-btn');
    interactiveElements.forEach(element => {
        element.addEventListener('touchstart', function() {
            this.classList.add('touch-active');
        });
        
        element.addEventListener('touchend', function() {
            this.classList.remove('touch-active');
        });
    });
    
    // Fix per la visualizzazione sulla filosofia su mobile
    adjustPhilosophyVisualizer();
    
    // Adatta l'altezza della hero section su mobile
    const heroSection = document.querySelector('.hero-section');
    if (heroSection) {
        if (window.innerWidth <= 768) {
            heroSection.style.height = 'auto';
            heroSection.style.minHeight = '60vh';
        }
    }
}

/**
 * Adatta il visualizzatore della filosofia per dispositivi mobili
 */
function adjustPhilosophyVisualizer() {
    const philosophyCanvas = document.querySelector('.philosophy-canvas');
    if (!philosophyCanvas) return;
    
    const centralNode = document.getElementById('central-node');
    const orbitingNodes = document.querySelectorAll('.orbiting-node');
    
    if (window.innerWidth <= 768) {
        // Posizionamento più compatto per mobile
        const mobileNodePositions = [
            { x: 20, y: 25 }, // node-1
            { x: 75, y: 25 }, // node-2
            { x: 20, y: 75 }, // node-3
            { x: 75, y: 75 }  // node-4
        ];
        
        orbitingNodes.forEach((node, index) => {
            if (mobileNodePositions[index]) {
                node.setAttribute('data-base-x', mobileNodePositions[index].x);
                node.setAttribute('data-base-y', mobileNodePositions[index].y);
                node.style.left = `${mobileNodePositions[index].x}%`;
                node.style.top = `${mobileNodePositions[index].y}%`;
            }
        });
    } else {
        // Ripristina posizionamento desktop
        const desktopNodePositions = [
            { x: 25, y: 30 }, // node-1
            { x: 70, y: 20 }, // node-2
            { x: 25, y: 70 }, // node-3
            { x: 70, y: 70 }  // node-4
        ];
        
        orbitingNodes.forEach((node, index) => {
            if (desktopNodePositions[index]) {
                node.setAttribute('data-base-x', desktopNodePositions[index].x);
                node.setAttribute('data-base-y', desktopNodePositions[index].y);
                node.style.left = `${desktopNodePositions[index].x}%`;
                node.style.top = `${desktopNodePositions[index].y}%`;
            }
        });
    }
    
    // Aggiorna le connessioni
    if (typeof updateConnections === 'function') {
        updateConnections();
    }
}

/**
 * Gestisce il ridimensionamento della finestra
 */
function handleResize() {
    const isMobile = window.innerWidth <= 768;
    const isTablet = window.innerWidth <= 1024 && window.innerWidth > 768;
    
    // Aggiungi la classe appropriata al body
    document.body.classList.remove('is-mobile', 'is-tablet');
    if (isMobile) {
        document.body.classList.add('is-mobile');
    } else if (isTablet) {
        document.body.classList.add('is-tablet');
    }
    
    // Ajusta il visualizzatore della filosofia
    adjustPhilosophyVisualizer();
    
    // Adatta le altezze per i progetti su mobile
    if (isMobile) {
        const featuredCards = document.querySelectorAll('.featured-card');
        featuredCards.forEach(card => {
            const cardImage = card.querySelector('.project-image');
            if (cardImage) {
                cardImage.style.height = '200px';
            }
        });
    }
    
    // Aggiungi altri aggiustamenti responsivi specifici qui
    
    // Fix per l'altezza della pagina
    fixPageLayout();
}

/**
 * Aggiungi classi "touch-active" per migliori feedback su touch
 * Questa funzione è utile su dispositivi mobili
 */
function addTouchActiveClass() {
    // Seleziona tutti gli elementi interattivi
    const touchElements = document.querySelectorAll('a, button, .nav-link, .filter-btn, .project-card, .featured-card, .social-item');
    
    touchElements.forEach(el => {
        el.addEventListener('touchstart', function() {
            this.classList.add('touch-active');
        }, {passive: true});
        
        el.addEventListener('touchend', function() {
            this.classList.remove('touch-active');
            // Piccolo ritardo per l'effetto visivo
            setTimeout(() => {
                this.classList.remove('touch-active');
            }, 150);
        }, {passive: true});
        
        // Rimuovi la classe se il touch viene annullato o esce dall'elemento
        el.addEventListener('touchcancel', function() {
            this.classList.remove('touch-active');
        }, {passive: true});
        
        el.addEventListener('touchmove', function(e) {
            // Se il dito si sposta troppo, considera il touch annullato
            const touch = e.touches[0];
            const rect = this.getBoundingClientRect();
            if (
                touch.clientX < rect.left - 20 || 
                touch.clientX > rect.right + 20 || 
                touch.clientY < rect.top - 20 || 
                touch.clientY > rect.bottom + 20
            ) {
                this.classList.remove('touch-active');
            }
        }, {passive: true});
    });
}

// Esegui la funzione quando il DOM è completamente caricato
document.addEventListener('DOMContentLoaded', addTouchActiveClass);