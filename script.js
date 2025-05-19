/*
* Portfolio - Gianlivio Iemolo
* Web Developer
* 
* Script principale ottimizzato e migliorato
*/

document.addEventListener('DOMContentLoaded', () => {
    // Inizializza il cursore personalizzato
    initCustomCursor();
  
    // Setup della navigazione tra pagine
    setupPageNavigation();
  
    // Inizializza il selettore di lingua
    setupLanguageSelector();
  
    // Inizializza gli effetti interattivi generali
    initInteractiveEffects();
  
    // Inizializza le funzionalità specifiche di ogni sezione
    initHomePage();
    initProjectsPage();
    initAboutPage();
    initCVPage();
    initContactPage();
  
    // Aggiungi classe visible agli elementi con transizione
    applyPageTransitions();
    
    // Fix per l'altezza della pagina
    setTimeout(fixPageLayout, 300);
  });
  
  // FUNZIONI PRINCIPALI
  
  // Funzione per inizializzare il cursore personalizzato
  function initCustomCursor() {
    const cursor = document.querySelector('.custom-cursor');
    if (!cursor) return; // Verifica che l'elemento cursore esista
    
    const interactiveElements = document.querySelectorAll('a, button, .nav-link, input, textarea, .project-card, .featured-card, .filter-btn, .timeline-control, .skill-tag');
    
    // Imposta immediatamente il cursore come visibile
    cursor.style.opacity = '1';
    
    // Mostra/nascondi il cursore in base all'hover sulla finestra
    document.addEventListener('mouseleave', () => {
        cursor.style.opacity = '0';
    });
    
    document.addEventListener('mouseenter', () => {
        cursor.style.opacity = '1';
    });
    
    // Aggiorna la posizione del cursore al movimento del mouse
    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    });
    
    // Aggiungi effetto hover sugli elementi interattivi
    interactiveElements.forEach(element => {
        element.addEventListener('mouseenter', () => {
            cursor.classList.add('hover');
        });
        
        element.addEventListener('mouseleave', () => {
            cursor.classList.remove('hover');
        });
    });
    
    // Disabilita il cursore personalizzato sui dispositivi touch
    if ('ontouchstart' in window) {
        cursor.style.display = 'none';
        document.body.style.cursor = 'auto'; // Ripristina il cursore standard
    }
  }
  
  // Funzione per la navigazione tra pagine
  function setupPageNavigation() {
    const pageLinks = document.querySelectorAll('[data-page]');
  
    pageLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPage = link.getAttribute('data-page');
            navigateTo(targetPage);
        });
    });
  
    // Funzione per navigare alla pagina target
    function navigateTo(pageId) {
        // Nascondi tutte le pagine
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
  
        // Mostra la pagina target
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
            
            // Cambia colore background in base alla pagina
            updateBackgroundColor(pageId);
            
            // Aggiungi effetti di transizione
            applyPageTransitions();
            
            // Scorri all'inizio della pagina
            window.scrollTo(0, 0);
            
            // Fix per l'altezza della pagina
            setTimeout(fixPageLayout, 100);
        }
    }
  
    // Funzione per cambiare il colore di sfondo in base alla pagina
    function updateBackgroundColor(pageId) {
        const colors = {
            'home': 'white',
            'progetti': 'linear-gradient(140deg, #f9fafb 0%, #f1f5f9 100%)',
            'about': 'linear-gradient(140deg, #e0f2fe 0%, #f0f9ff 100%)',
            'cv': 'linear-gradient(140deg, #f1f5f9 0%, #e2e8f0 100%)',
            'contact': 'linear-gradient(140deg, #fef2f2 0%, #fee2e2 100%)'
        };
  
        document.body.style.background = colors[pageId] || 'white';
        document.body.style.backgroundAttachment = 'fixed';
    }
  }
  
  // Funzione per configurare il selettore di lingua
  function setupLanguageSelector() {
    const languageToggle = document.getElementById('language-toggle');
    const languageDropdown = document.querySelector('.language-dropdown');
    const languageOptions = document.querySelectorAll('.language-option');
  
    // Imposta lingua iniziale da localStorage o default
    const currentLang = localStorage.getItem('site-language') || 'it';
  
    // Aggiorna bottone con la lingua corrente
    updateLanguageButton(currentLang);
  
    // Traduci all'avvio
    translatePage(currentLang);
  
    // Toggle dropdown
    if (languageToggle) {
        languageToggle.addEventListener('click', () => {
            languageDropdown.classList.toggle('show');
        });
    }
  
    // Clic su opzione lingua
    languageOptions.forEach(option => {
        option.addEventListener('click', () => {
            const selectedLang = option.getAttribute('data-lang');
            localStorage.setItem('site-language', selectedLang);
            
            // Aggiorna pulsante
            updateLanguageButton(selectedLang);
            languageDropdown.classList.remove('show');
            
            // Traduci
            translatePage(selectedLang);
        });
    });
  
    // Chiudi dropdown cliccando fuori
    window.addEventListener('click', (e) => {
        if (languageToggle && languageDropdown) {
            if (!languageToggle.contains(e.target) && !languageDropdown.contains(e.target)) {
                languageDropdown.classList.remove('show');
            }
        }
    });
  }
  
  // Funzione per aggiornare il testo e l'icona del pulsante
  function updateLanguageButton(lang) {
    const languageToggle = document.getElementById('language-toggle');
    if (languageToggle) {
        // Mappa del codice lingua alla classe icona
        const flagMap = {
            'en': 'us',
            'it': 'it',
            'es': 'es'
        };
  
        languageToggle.innerHTML = `
            <span class="flag-icon flag-icon-${flagMap[lang] || 'us'}"></span>
            ${lang.toUpperCase()}
        `;
    }
  }
  
  // FUNZIONI SPECIFICHE PER OGNI PAGINA
  
  // Inizializza la home page
  function initHomePage() {
    // Animazione per i featured projects
    const featuredCards = document.querySelectorAll('.featured-card');
    if (featuredCards.length) {
        featuredCards.forEach((card, index) => {
            card.style.animationDelay = `${index * 0.2}s`;
        });
    }
  }
  
  // Inizializza la pagina progetti
  function initProjectsPage() {
    // Dati progetto con traduzioni
    const projectDetails = {
        'puntoluce': {
            title: {
                'it': 'PuntoLuce E-commerce',
                'en': 'PuntoLuce E-commerce',
                'es': 'PuntoLuce E-commerce'
            },
            description: {
                'it': 'Sviluppo di un nuovo sito e-commerce per PuntoLuce utilizzando Open2b. Il progetto ha incluso la progettazione dell\'interfaccia utente, l\'implementazione del backend e l\'ottimizzazione SEO.',
                'en': 'Development of a new e-commerce website for PuntoLuce using Open2b. The project included user interface design, backend implementation, and SEO optimization.',
                'es': 'Desarrollo de un nuevo sitio web de comercio electrónico para PuntoLuce utilizando Open2b. El proyecto incluyó diseño de interfaz de usuario, implementación de backend y optimización SEO.'
            },
            image: 'puntoluce.png',
            technologies: ['HTML', 'CSS', 'JavaScript', 'Open2b', 'Responsive Design', 'SEO'],
            features: {
                'it': [
                    'Interfaccia utente moderna e intuitiva',
                    'Carrello acquisti ottimizzato',
                    'Sistema di filtri prodotti avanzato',
                    'Integrazione con sistemi di pagamento',
                    'Ottimizzazione per dispositivi mobili'
                ],
                'en': [
                    'Modern and intuitive user interface',
                    'Optimized shopping cart',
                    'Advanced product filter system',
                    'Integration with payment systems',
                    'Mobile device optimization'
                ],
                'es': [
                    'Interfaz de usuario moderna e intuitiva',
                    'Carrito de compras optimizado',
                    'Sistema avanzado de filtros de productos',
                    'Integración con sistemas de pago',
                    'Optimización para dispositivos móviles'
                ]
            },
            liveSite: 'https://shop.puntoluce.net/open2b/design/Slide-definitiva/~/'
        },
        'agenzia': {
            title: {
                'it': 'Agenzia Immobiliare Bologna',
                'en': 'Bologna Real Estate Agency',
                'es': 'Agencia Inmobiliaria Bologna'
            },
            description: {
                'it': 'Sito web moderno e responsive per un\'agenzia immobiliare di Bologna. Focus su design pulito e facilità di navigazione per gli utenti alla ricerca di proprietà.',
                'en': 'Modern and responsive website for a real estate agency in Bologna. Focus on clean design and ease of navigation for users looking for properties.',
                'es': 'Sitio web moderno y responsivo para una agencia inmobiliaria en Bolonia. Enfoque en diseño limpio y facilidad de navegación para usuarios que buscan propiedades.'
            },
            image: 'bologna.jpg',
            technologies: ['HTML', 'CSS', 'JavaScript', 'Responsive Design'],
            features: {
                'it': [
                    'Galleria proprietà con filtri avanzati',
                    'Form di contatto personalizzato',
                    'Ottimizzazione SEO locale',
                    'Design mobile-first',
                    'Caricamento lazy delle immagini'
                ],
                'en': [
                    'Property gallery with advanced filters',
                    'Custom contact form',
                    'Local SEO optimization',
                    'Mobile-first design',
                    'Lazy loading of images'
                ],
                'es': [
                    'Galería de propiedades con filtros avanzados',
                    'Formulario de contacto personalizado',
                    'Optimización SEO local',
                    'Diseño mobile-first',
                    'Carga diferida de imágenes'
                ]
            },
            liveSite: 'https://gianlivio.github.io/agenzia-musei/'
        },
        'discord': {
            title: {
                'it': 'Discord Clone',
                'en': 'Discord Clone',
                'es': 'Discord Clone'
            },
            description: {
                'it': 'Ricostruzione completa dell\'interfaccia di Discord utilizzando solo HTML e CSS. Un progetto tecnico per dimostrare competenze avanzate in layout e stilizzazione.',
                'en': 'Complete reconstruction of the Discord interface using only HTML and CSS. A technical project to demonstrate advanced layout and styling skills.',
                'es': 'Reconstrucción completa de la interfaz de Discord utilizando solo HTML y CSS. Un proyecto técnico para demostrar habilidades avanzadas en layout y estilización.'
            },
            image: 'discord.png',
            technologies: ['HTML', 'CSS', 'Flexbox', 'Grid'],
            features: {
                'it': [
                    'Layout responsive fedele all\'originale',
                    'Sistema di navigazione completo',
                    'Stilizzazione avanzata con CSS',
                    'Ottimizzazione per diversi dispositivi',
                    'Animazioni UI'
                ],
                'en': [
                    'Responsive layout faithful to the original',
                    'Complete navigation system',
                    'Advanced CSS styling',
                    'Optimization for different devices',
                    'UI animations'
                ],
                'es': [
                    'Diseño responsivo fiel al original',
                    'Sistema de navegación completo',
                    'Estilización avanzada con CSS',
                    'Optimización para diferentes dispositivos',
                    'Animaciones de UI'
                ]
            },
            liveSite: 'https://gianlivio.github.io/htmlcss-discord/'
        }
    };
  
    // Filtri progetto
    const filterButtons = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card');
  
    if (filterButtons.length && projectCards.length) {
        // Aggiungi indice per animazioni
        projectCards.forEach((card, index) => {
            card.style.setProperty('--card-index', index);
        });
        
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Rimuovi classe active da tutti i pulsanti
                filterButtons.forEach(btn => btn.classList.remove('active'));
                
                // Aggiungi classe active al pulsante cliccato
                button.classList.add('active');
                
                // Ottieni la categoria del filtro
                const filterValue = button.getAttribute('data-filter');
                
                // Filtri dei progetti
                projectCards.forEach(card => {
                    if (filterValue === 'all' || card.getAttribute('data-category') === filterValue) {
                        card.style.display = 'block';
                        setTimeout(() => {
                            card.style.opacity = '1';
                            card.style.transform = 'translateY(0)';
                        }, 100);
                    } else {
                        card.style.opacity = '0';
                        card.style.transform = 'translateY(20px)';
                        setTimeout(() => {
                            card.style.display = 'none';
                        }, 300);
                    }
                });
            });
        });
    }
  
    // Mostra dettagli progetto
    const viewProjectLinks = document.querySelectorAll('.view-project');
    const projectModal = document.getElementById('project-modal');
    const modalBody = projectModal ? projectModal.querySelector('.modal-body') : null;
    const closeModal = projectModal ? projectModal.querySelector('.close-modal') : null;
  
    if (viewProjectLinks.length && projectModal && modalBody && closeModal) {
        // Apri modal con dettagli progetto
        viewProjectLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const projectId = link.getAttribute('data-project');
                const project = projectDetails[projectId];
                
                if (project) {
                    // Ottieni la lingua corrente
                    const currentLang = localStorage.getItem('site-language') || 'it';
                    
                    // Gestisci i titoli che potrebbero essere stringhe o oggetti
                    let projectTitle = project.title;
                    if (typeof project.title === 'object') {
                        projectTitle = project.title[currentLang] || project.title['it'];
                    }
                    
                    // Gestisci le descrizioni
                    const projectDesc = project.description[currentLang] || project.description['it'];
                    
                    // Gestisci le features
                    const projectFeatures = project.features[currentLang] || project.features['it'];
                    
                    // Traduci etichette in base alla lingua
                    const techTitle = currentLang === 'it' ? 'Tecnologie' : 
                                     (currentLang === 'es' ? 'Tecnologías' : 'Technologies');
                    
                    const featuresTitle = currentLang === 'it' ? 'Caratteristiche' : 
                                         (currentLang === 'es' ? 'Características' : 'Features');
                    
                    const visitSite = currentLang === 'it' ? 'Visita il sito' : 
                                     (currentLang === 'es' ? 'Visitar sitio' : 'Visit site');
                    
                    // Popola il modal
                    modalBody.innerHTML = `
                        <div class="modal-project-details" data-project-id="${projectId}">
                            <h2>${projectTitle}</h2>
                            <div class="modal-project-image" style="background-image: url('${project.image}')"></div>
                            <div class="modal-project-description">
                                <p>${projectDesc}</p>
                                
                                <h3>${techTitle}</h3>
                                <div class="tech-stack">
                                    ${project.technologies.map(tech => `<span>${tech}</span>`).join('')}
                                </div>
                                
                                <h3>${featuresTitle}</h3>
                                <ul class="feature-list">
                                    ${projectFeatures.map(feature => `<li>${feature}</li>`).join('')}
                                </ul>
                                
                                <a href="${project.liveSite}" target="_blank" class="live-site-link">
                                    ${visitSite}
                                    <svg class="arrow-icon" viewBox="0 0 24 24">
                                        <path d="M5,12H19M19,12L12,5M19,12L12,19"></path>
                                    </svg>
                                </a>
                            </div>
                        </div>
                    `;
                    
                    // Mostra il modal
                    projectModal.classList.add('open');
                    setTimeout(() => {
                        projectModal.querySelector('.modal-content').style.transform = 'translateY(0)';
                        projectModal.querySelector('.modal-content').style.opacity = '1';
                    }, 100);
                }
            });
        });
  
        // Chiudi modal
        closeModal.addEventListener('click', () => {
            projectModal.querySelector('.modal-content').style.transform = 'translateY(20px)';
            projectModal.querySelector('.modal-content').style.opacity = '0';
            
            setTimeout(() => {
                projectModal.classList.remove('open');
            }, 300);
        });
  
        // Chiudi modal cliccando fuori
        projectModal.addEventListener('click', (e) => {
            if (e.target === projectModal) {
                closeModal.click();
            }
        });
    }
  }
  
  // Inizializza la pagina about
  function initAboutPage() {
    // Visualizzazione filosofia
    initPhilosophyVisualizer();
  
    // Effetto matrix
    initMatrixEffect();
  }
  
  // Inizializza la pagina CV
  function initCVPage() {
    // Timeline professionale
    const timelineControls = document.querySelectorAll('.timeline-control');
    const timelinePanels = document.querySelectorAll('.timeline-panel');
  
    if (timelineControls.length && timelinePanels.length) {
        timelineControls.forEach(control => {
            control.addEventListener('click', () => {
                // Rimuovi active da tutti i controlli
                timelineControls.forEach(btn => btn.classList.remove('active'));
                
                // Aggiungi active al controllo cliccato
                control.classList.add('active');
                
                // Nascondi tutti i pannelli
                timelinePanels.forEach(panel => panel.classList.remove('active'));
                
                // Mostra il pannello corrispondente
                const year = control.getAttribute('data-year');
                const targetPanel = document.querySelector(`.timeline-panel[data-year="${year}"]`);
                if (targetPanel) {
                    targetPanel.classList.add('active');
                }
            });
        });
    }
  
    // Animazione barre competenze
    const skillGraph = document.querySelector('.skill-graph');
    if (skillGraph) {
        const progressBars = skillGraph.querySelectorAll('.skill-progress');
  
        // Prepara le barre di progresso
        progressBars.forEach(bar => {
            const width = bar.style.width;
            bar.style.setProperty('--progress-width', width);
            bar.style.width = '0';
        });
  
        // Funzione per animare le barre al momento giusto
        const animateSkillBars = () => {
            if (isElementInViewport(skillGraph)) {
                skillGraph.classList.add('in-view');
                
                // Rimuovi l'observer dopo l'animazione
                if (observer && typeof observer.disconnect === 'function') {
                    observer.disconnect();
                }
            }
        };
  
        // Usa Intersection Observer se supportato
        let observer;
        if ('IntersectionObserver' in window) {
            observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        animateSkillBars();
                    }
                });
            }, { threshold: 0.2 });
            
            observer.observe(skillGraph);
        } else {
            // Fallback per browser che non supportano IntersectionObserver
            window.addEventListener('scroll', () => {
                if (isElementInViewport(skillGraph)) {
                    animateSkillBars();
                }
            });
        }
    }
  }
  
  // Inizializza la pagina contatti
  function initContactPage() {
    // Gestione form di contatto
    const contactForm = document.getElementById('contact-form');
  
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Ottieni i dati dal form
            const formData = {
                name: contactForm.querySelector('#name').value,
                email: contactForm.querySelector('#email').value,
                subject: contactForm.querySelector('#subject').value,
                message: contactForm.querySelector('#message').value
            };
            
            // Simulazione invio form (in produzione integreresti un vero backend)
            const submitBtn = contactForm.querySelector('.form-submit');
            const originalText = submitBtn.textContent;
            
            // Cambio testo pulsante
            submitBtn.textContent = 'Invio in corso...';
            submitBtn.disabled = true;
            
            // Implementazione reale - invia email usando EmailJS o servizio simile
            // In questo esempio, uso EmailJS, ma dovresti sostituire con il tuo servizio
            // Aggiunta di un link per scrivere direttamente alla mail come fallback
            
            const emailLink = document.createElement('a');
            emailLink.href = `mailto:gianlivioiemolo@gmail.com?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent('Nome: ' + formData.name + '\nEmail: ' + formData.email + '\n\n' + formData.message)}`;
            emailLink.style.display = 'none';
            document.body.appendChild(emailLink);
            
            // Opzione 1: Apri client email con i dati precompilati
            emailLink.click();
            document.body.removeChild(emailLink);
            
            // Simula risposta server
            setTimeout(() => {
                // Ripristina pulsante
                submitBtn.textContent = 'Messaggio inviato!';
                
                // Reset form
                contactForm.reset();
                
                // Dopo qualche secondo ripristina lo stato originale
                setTimeout(() => {
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                }, 3000);
            }, 1500);
        });
    }
  }
  
  // FUNZIONI DI UTILITÀ
  
  // Funzione per applicare le transizioni di pagina
  function applyPageTransitions() {
    const elements = document.querySelectorAll('.page.active *');
  
    elements.forEach((el, index) => {
        if (!el.classList.contains('page-transition')) {
            el.classList.add('page-transition');
        }
  
        setTimeout(() => {
            el.classList.add('visible');
        }, 100 + (index * 50));
    });
  }
  
  // Controlla se un elemento è nel viewport
  function isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
        rect.top <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.bottom >= 0
    );
  }
  
  // Funzione per inizializzare il visualizzatore di filosofia
  function initPhilosophyVisualizer() {
    const centralNode = document.getElementById('central-node');
    if (!centralNode) return;
  
    // Aggiorna connessioni SVG
    updateConnections();
  
    // Animazione hover sul nodo centrale
    centralNode.addEventListener('mouseover', function() {
        this.style.transform = 'translate(-50%, -50%) scale(1.1)';
        this.style.boxShadow = '0 0 30px rgba(255, 68, 0, 0.3)';
  
        // Attiva nodi orbitanti
        const orbitingNodes = document.querySelectorAll('.orbiting-node');
        orbitingNodes.forEach(node => {
            node.style.boxShadow = '0 10px 25px rgba(255, 68, 0, 0.2)';
        });
  
        // Intensifica connessioni
        const connections = document.querySelectorAll('.connection');
        connections.forEach(conn => {
            conn.style.stroke = 'rgba(255, 68, 0, 0.4)';
            conn.style.strokeWidth = '3';
        });
    });
  
    centralNode.addEventListener('mouseout', function() {
        this.style.transform = 'translate(-50%, -50%)';
        this.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.08)';
  
        // Ripristina nodi orbitanti
        const orbitingNodes = document.querySelectorAll('.orbiting-node');
        orbitingNodes.forEach(node => {
            node.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.08)';
        });
  
        // Ripristina connessioni
        const connections = document.querySelectorAll('.connection');
        connections.forEach(conn => {
            conn.style.stroke = 'rgba(255, 68, 0, 0.2)';
            conn.style.strokeWidth = '2';
        });
    });
  
    // Animazione dei nodi orbitanti
    animateOrbitingNodes();
  }
  
  // Funzione per aggiornare le connessioni SVG tra nodi
  function updateConnections() {
    const centralNode = document.getElementById('central-node');
    const node1 = document.getElementById('node-1');
    const node2 = document.getElementById('node-2');
    const node3 = document.getElementById('node-3');
    const node4 = document.getElementById('node-4');
  
    if (!centralNode || !node1 || !node2 || !node3 || !node4) return;
  
    // Ottieni il container
    const container = document.querySelector('.node-container');
    const containerRect = container.getBoundingClientRect();
  
    // Funzioni per ottenere le coordinate relative
    const getCenterX = (element) => {
        const rect = element.getBoundingClientRect();
        return rect.left + rect.width / 2 - containerRect.left;
    };
  
    const getCenterY = (element) => {
        const rect = element.getBoundingClientRect();
        return rect.top + rect.height / 2 - containerRect.top;
    };
  
    // Aggiorna i percorsi SVG
    updatePath('connection-1', getCenterX(centralNode), getCenterY(centralNode), getCenterX(node1), getCenterY(node1));
    updatePath('connection-2', getCenterX(centralNode), getCenterY(centralNode), getCenterX(node2), getCenterY(node2));
    updatePath('connection-3', getCenterX(centralNode), getCenterY(centralNode), getCenterX(node3), getCenterY(node3));
    updatePath('connection-4', getCenterX(centralNode), getCenterY(centralNode), getCenterX(node4), getCenterY(node4));
  }
  
  // Funzione per aggiornare singolo percorso SVG
  function updatePath(id, x1, y1, x2, y2) {
    const path = document.getElementById(id);
    if (!path) return;
  
    // Crea percorso curvo
    const dx = x2 - x1;
    const dy = y2 - y1;
    const ctrl1x = x1 + dx / 4;
    const ctrl1y = y1 + dy / 2;
    const ctrl2x = x1 + dx * 3 / 4;
    const ctrl2y = y1 + dy / 2;
  
    path.setAttribute('d', `M${x1},${y1} C${ctrl1x},${ctrl1y} ${ctrl2x},${ctrl2y} ${x2},${y2}`);
  }
  
  // Funzione per animare i nodi orbitanti
  function animateOrbitingNodes() {
    const centralNode = document.getElementById('central-node');
    if (!centralNode) return;
  
    const orbitingNodes = document.querySelectorAll('.orbiting-node');
  
    // Posizioni iniziali dei nodi
    const nodePositions = [
        { x: 25, y: 30 }, // node-1
        { x: 70, y: 20 }, // node-2
        { x: 25, y: 70 }, // node-3
        { x: 70, y: 70 }  // node-4
    ];
  
    // Posiziona i nodi inizialmente
    orbitingNodes.forEach((node, index) => {
        if (nodePositions[index]) {
            node.style.left = `${nodePositions[index].x}%`;
            node.style.top = `${nodePositions[index].y}%`;
        }
    });
  
    // Aggiungi attributi per l'animazione
    orbitingNodes.forEach((node, index) => {
        const orbit = index + 1;
        const angle = index * Math.PI / 2;
        const radius = 20 + (orbit * 5);
        const speed = 0.0001 + (Math.random() * 0.0001);
  
        node.setAttribute('data-angle', angle);
        node.setAttribute('data-radius', radius);
        node.setAttribute('data-speed', speed);
        node.setAttribute('data-base-x', nodePositions[index].x);
        node.setAttribute('data-base-y', nodePositions[index].y);
    });
  
    // Animazione
    let lastTime = 0;
  
    function animateNodes(timestamp) {
        if (!lastTime) lastTime = timestamp;
        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;
  
        orbitingNodes.forEach(node => {
            let angle = parseFloat(node.getAttribute('data-angle') || 0);
            const speed = parseFloat(node.getAttribute('data-speed') || 0.0001);
            const baseX = parseFloat(node.getAttribute('data-base-x') || 50);
            const baseY = parseFloat(node.getAttribute('data-base-y') || 50);
            
            // Aggiorna l'angolo
            angle += speed * deltaTime;
            node.setAttribute('data-angle', angle);
            
            // Calcola offset per movimento orbitale
            const offsetX = Math.cos(angle) * 3;
            const offsetY = Math.sin(angle) * 3;
            
            // Applica nuova posizione
            node.style.left = `${baseX + offsetX}%`;
            node.style.top = `${baseY + offsetY}%`;
        });
  
        // Aggiorna connessioni
        updateConnections();
  
        // Continua animazione
        if (document.querySelector('.philosophy-canvas')) {
            requestAnimationFrame(animateNodes);
        }
    }
  
    requestAnimationFrame(animateNodes);
  }
  
  // Funzione per l'effetto matrix
  function initMatrixEffect() {
    const canvas = document.getElementById('matrix-canvas');
    if (!canvas) return;
  
    const ctx = canvas.getContext('2d');
  
    // Imposta dimensioni
    function resizeCanvas() {
        const container = canvas.parentElement;
        if (container) {
            canvas.width = container.offsetWidth;
            canvas.height = container.offsetHeight;
        }
    }
  
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  
    // Caratteri per effetto matrix
    const chars = '01';
    const fontSize = 14;
    const columns = Math.ceil(canvas.width / fontSize);
  
    // Array per posizione Y di ciascuna colonna
    const drops = Array(columns).fill(1);
  
    // Funzione per disegnare
    function drawMatrix() {
        // Trasparenza per trail
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
  
        // Colore caratteri
        ctx.fillStyle = 'rgba(255, 68, 0, 0.3)';
        ctx.font = `${fontSize}px monospace`;
  
        // Loop per ogni goccia
        for (let i = 0; i < drops.length; i++) {
            // Carattere casuale
            const char = chars.charAt(Math.floor(Math.random() * chars.length));
            
            // Disegna carattere
            ctx.fillText(char, i * fontSize, drops[i] * fontSize);
            
            // Incrementa Y, reset casuale
            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            
            // Incremento con probabilità casuale
            if (Math.random() > 0.5) {
                drops[i]++;
            }
        }
    }
  
    // Avvia animazione
    let matrixInterval = setInterval(drawMatrix, 80);
  
    // Ferma quando la pagina non è visibile
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            clearInterval(matrixInterval);
        } else {
            matrixInterval = setInterval(drawMatrix, 80);
        }
    });
  }
  
  // Funzioni ausiliarie
  function initInteractiveEffects() {
    // Effetto hover sui progetti con immagine di sfondo
    setupHoverEffects();
  
    // Effetto glitch sui titoli con data-text
    setupGlitchEffect();
  }
  
  // Setup effetti hover
  function setupHoverEffects() {
    const hoverElements = document.querySelectorAll('.tech-stack span, .social-item, .timeline-control, .project-card, .featured-card');
  
    hoverElements.forEach(element => {
        element.addEventListener('mouseenter', () => {
            element.classList.add('hover-active');
        });
  
        element.addEventListener('mouseleave', () => {
            element.classList.remove('hover-active');
        });
    });
  }
  
  // Setup effetto glitch per titoli con data-text
  function setupGlitchEffect() {
    const glitchTitles = document.querySelectorAll('[data-text]');
  
    glitchTitles.forEach(title => {
        title.addEventListener('mouseenter', () => {
            title.classList.add('glitch-active');
        });
  
        title.addEventListener('mouseleave', () => {
            title.classList.remove('glitch-active');
        });
    });
  }
  
  // Funzione per risolvere il problema dell'altezza della pagina
  function fixPageLayout() {
    // Ottieni la pagina attiva
    const activePage = document.querySelector('.page.active');
    
    if (activePage) {
        // Imposta l'altezza minima della pagina attiva
        activePage.style.minHeight = 'auto';
        
        // Assicurati che la pagina attiva sia completamente visibile
        const mainContent = document.getElementById('content');
        if (mainContent) {
            mainContent.style.height = 'auto';
        }
    }
  }
  
  // TRADUZIONE
  function translatePage(lang) {
    // Definizione delle traduzioni
    const translations = {
        'en': {
            'nav': {
                'progetti': 'PROJECTS',
                'about': 'ABOUT',
                'cv': 'CV',
                'contatti': 'CONTACT',
                'webDev': 'WEB DEVELOPER'
            },
            'home': {
                'heroTitle': 'FULL STACK <span class="highlight">DEVELOPER</span>',
                'heroSubtitle': 'From the code of signs to the code of functions',
                'ctaProjects': 'Explore projects',
                'ctaContact': 'Contact me',
                'featuredProjects': 'FEATURED PROJECTS',
                'viewAll': 'View all projects',
                'viewDetails': 'View details',
                'skills': 'SKILLS'
            },
            'projects': {
                'title': 'WEB PROJECTS',
                'description': 'FRONTEND / BACKEND / UI-UX / API DEVELOPMENT<br>MODERN FRAMEWORKS / CUSTOM SOLUTIONS',
                'filters': {
                    'all': 'All',
                    'ecommerce': 'E-commerce',
                    'landing': 'Landing Page',
                    'app': 'Web App',
                    'clone': 'UI Clone'
                },
                'viewProject': 'Visit site',
                'projectDescriptions': {
                    'puntoluce': 'E-commerce developed with Open2b',
                    'studioDentistico': 'Modern landing page for a dental clinic',
                    'studioPsicologi': 'Complete website for a psychology practice in Bologna',
                    'agenzia': 'Modern website for a real estate agency in Bologna',
                    'gestioneViaNoce': 'Platform for room rental and contract management',
                    'flappyBird': 'Recreation of the classic mobile game',
                    'discord': 'Reconstruction of the Discord interface',
                    'trainTicket': 'Interactive form for ticket booking',
                    'dropbox': 'Clone of the Dropbox interface',
                    'neonSnake': 'Interactive implementation of a game',
                    'anticoStradello': 'Website for a historic pizzeria'
                }
            },
            'about': {
                'title': 'ABOUT',
                'subtitle': 'Web Developer with Semiotic Background',
                'approachTitle': 'MY APPROACH',
                'approachHint': 'Interact with the nodes',
                'nodes': {
                    'central': 'Creative Development',
                    'problemSolving': 'Problem Solving',
                    'humanCentric': 'Human-Centric',
                    'crossDisciplinary': 'Cross-Disciplinary',
                    'meaningOriented': 'Meaning-Oriented'
                },
                'drivesTitle': 'WHAT DRIVES ME',
                'connectText': 'Interested in my professional journey and skills?',
                'exploreCV': 'Explore my CV',
                'intro': {
                    'paragraph1': 'I create digital solutions that communicate effectively, combining technical skills and humanistic understanding to develop meaningful web experiences.',
                    'paragraph2': '"The sign is the place of mediation between mind and reality. It enables us to refer to what is absent, and to take a position on the possible and the impossible." - Umberto Eco',
                    'degree1': 'Master\'s Degree in Semiotics',
                    'school1': 'University of Bologna - School of Umberto Eco',
                    'grade': 'Grade: 108/110',
                    'degree2': 'Full Stack Development',
                    'school2': 'Boolean',
                    'year': '2023'
                }
            },
            'cv': {
                'title': 'CURRICULUM',
                'subtitle': 'Full Stack Developer with Semiotic Background',
                'quote': '"Problem solver with a humanistic soul. Bringing together technical expertise and human understanding to create meaningful digital solutions."',
                'skills': 'TECHNICAL EXPERTISE',
                'skillLevels': {
                    'advanced': 'Advanced',
                    'intermediate': 'Intermediate',
                    'basic': 'Basic'
                },
                'experience': 'PROFESSIONAL JOURNEY',
                'education': 'EDUCATION & APPROACH',
                'philosophy': 'Professional Philosophy',
                'download': 'Download Full CV',
                'professionalPhilosophy': {
                    'main': 'Combining technical excellence with human understanding. Leading teams with empathy and precision, ensuring technical quality and team well-being.',
                    'point1': 'Applying semiotic analysis to digital problems',
                    'point2': 'Bridging the gap between technical and humanistic perspectives',
                    'point3': 'Continuous learning and constant adaptation'
                },
                'keyResults': 'Key Results',
        'keyResultsList': [
            'Development of cutting-edge website layouts implementing modern design principles',
            'Implementation of comprehensive event tracking using Google Tag Manager',
            'Creation of custom API integrations to enhance site functionality'
        ]
            },
            'contact': {
                'title': 'CONTACT',
                'lead': "Let's create something meaningful together.",
                'location': 'Location',
                'email': 'Email',
                'phone': 'Phone',
                'message': 'Send me a message',
                'formLabels': {
                    'name': 'Name',
                    'email': 'Email',
                    'subject': 'Subject',
                    'message': 'Message',
                    'send': 'Send Message'
                },
                'connect': 'CONNECT'
            },
            'footer': {
                'copyright': '© 2025 Gianlivio Iemolo - Web Developer'
            }
        },
        'it': {
            'nav': {
                'progetti': 'PROGETTI',
                'about': 'CHI SONO',
                'cv': 'CV',
                'contatti': 'CONTATTI',
                'webDev': 'SVILUPPATORE WEB'
            },
            'home': {
                'heroTitle': 'SVILUPPATORE <span class="highlight">FULL STACK</span>',
                'heroSubtitle': 'Dal codice dei segni al codice delle funzioni',
                'ctaProjects': 'Esplora i progetti',
                'ctaContact': 'Contattami',
                'featuredProjects': 'PROGETTI IN EVIDENZA',
                'viewAll': 'Vedi tutti i progetti',
                'viewDetails': 'Vedi dettagli',
                'skills': 'COMPETENZE'
            },
            'projects': {
                'title': 'PROGETTI WEB',
                'description': 'FRONTEND / BACKEND / UI-UX / SVILUPPO API<br>FRAMEWORK MODERNI / SOLUZIONI PERSONALIZZATE',
                'filters': {
                    'all': 'Tutti',
                    'ecommerce': 'E-commerce',
                    'landing': 'Landing Page',
                    'app': 'Web App',
                    'clone': 'UI Clone'
                },
                'viewProject': 'Visita il sito',
                'projectDescriptions': {
                    'puntoluce': 'E-commerce sviluppato con Open2b',
                    'studioDentistico': 'Landing page moderna per un ambulatorio dentistico',
                    'studioPsicologi': 'Sito completo per uno studio di psicologia a Bologna',
                    'agenzia': 'Sito moderno per un\'agenzia immobiliare a Bologna',
                    'gestioneViaNoce': 'Piattaforma per l\'affitto di stanze e gestione contratti',
                    'flappyBird': 'Ricreazione del classico gioco mobile',
                    'discord': 'Ricostruzione dell\'interfaccia Discord',
                    'trainTicket': 'Form interattivo per la prenotazione di biglietti',
                    'dropbox': 'Clone dell\'interfaccia Dropbox',
                    'neonSnake': 'Implementazione interattiva di un gioco',
                    'anticoStradello': 'Sito web per una pizzeria storica'
                }
            },
            'about': {
                'title': 'CHI SONO',
                'subtitle': 'Sviluppatore Web con Background Semiotico',
                'approachTitle': 'IL MIO APPROCCIO',
                'approachHint': 'Interagisci con i nodi',
                'nodes': {
                    'central': 'Sviluppo Creativo',
                    'problemSolving': 'Problem Solving',
                    'humanCentric': 'Centrato sull\'Umano',
                    'crossDisciplinary': 'Cross-Disciplinare',
                    'meaningOriented': 'Orientato al Significato'
                },
                'drivesTitle': 'COSA MI GUIDA',
                'connectText': 'Interessato al mio percorso professionale e alle mie competenze?',
                'exploreCV': 'Esplora il mio CV',
                'intro': {
                    'paragraph1': 'Creo soluzioni digitali che comunicano efficacemente, unendo competenze tecniche e comprensione umanistica per sviluppare esperienze web significative.',
                    'paragraph2': '"Il segno è il luogo di mediazione tra mente e realtà. Ci consente di riferirci a ciò che è assente, e di prendere posizione sul possibile e sull\'impossibile." - Umberto Eco',
                    'degree1': 'Laurea Magistrale in Semiotica',
                    'school1': 'Università di Bologna - Scuola di Umberto Eco',
                    'grade': 'Voto: 108/110',
                    'degree2': 'Sviluppo Full Stack',
                    'school2': 'Boolean',
                    'year': '2023'
                }
            },
            'cv': {
                'title': 'CURRICULUM',
                'subtitle': 'Sviluppatore Full Stack con Background Semiotico',
                'quote': '"Problem solver con un\'anima umanistica. Unisco competenze tecniche e comprensione umana per creare soluzioni digitali significative."',
                'skills': 'COMPETENZE TECNICHE',
                'skillLevels': {
                    'advanced': 'Avanzato',
                    'intermediate': 'Intermedio',
                    'basic': 'Base'
                },
                'experience': 'PERCORSO PROFESSIONALE',
                'education': 'FORMAZIONE & APPROCCIO',
                'philosophy': 'Filosofia Professionale',
                'download': 'Scarica CV Completo',
                'professionalPhilosophy': {
                    'main': 'Unire l\'eccellenza tecnica alla comprensione umana. Guidare i team con empatia e precisione, garantendo qualità tecnica e benessere del gruppo.',
                    'point1': 'Applicare l\'analisi semiotica ai problemi digitali',
                    'point2': 'Colmare il divario tra prospettive tecniche e umanistiche',
                    'point3': 'Apprendimento continuo e adattamento costante'
                },
                'keyResults': 'Risultati Chiave',
                'keyResultsList': [
                    'Sviluppo di layout di siti web all\'avanguardia implementando moderni principi di design',
                    'Implementazione di un monitoraggio completo degli eventi utilizzando Google Tag Manager',
                    'Creazione di integrazioni API personalizzate per migliorare la funzionalità del sito'
                ]
            },
            'contact': {
                'title': 'CONTATTI',
                'lead': 'Creiamo qualcosa di significativo insieme.',
                'location': 'Posizione',
                'email': 'Email',
                'phone': 'Telefono',
                'message': 'Inviami un messaggio',
                'formLabels': {
                    'name': 'Nome',
                    'email': 'Email',
                    'subject': 'Oggetto',
                    'message': 'Messaggio',
                    'send': 'Invia Messaggio'
                },
                'connect': 'CONNETTI'
            },
            'footer': {
                'copyright': '© 2025 Gianlivio Iemolo - Sviluppatore Web'
            }
        },
        'es': {
            'nav': {
                'progetti': 'PROYECTOS',
                'about': 'SOBRE MÍ',
                'cv': 'CV',
                'contatti': 'CONTACTO',
                'webDev': 'DESARROLLADOR WEB'
            },
            'home': {
                'heroTitle': 'DESARROLLADOR <span class="highlight">FULL STACK</span>',
                'heroSubtitle': 'Del código de los signos al código de las funciones',
                'ctaProjects': 'Explorar proyectos',
                'ctaContact': 'Contáctame',
                'featuredProjects': 'PROYECTOS DESTACADOS',
                'viewAll': 'Ver todos los proyectos',
                'viewDetails': 'Ver detalles',
                'skills': 'HABILIDADES'
            },
            'projects': {
                'title': 'PROYECTOS WEB',
                'description': 'FRONTEND / BACKEND / UI-UX / DESARROLLO API<br>FRAMEWORKS MODERNOS / SOLUCIONES PERSONALIZADAS',
                'filters': {
                    'all': 'Todos',
                    'ecommerce': 'E-commerce',
                    'landing': 'Landing Page',
                    'app': 'Web App',
                    'clone': 'UI Clone'
                },
                'viewProject': 'Visitar sitio',
                'projectDescriptions': {
                    'puntoluce': 'E-commerce desarrollado con Open2b',
                    'studioDentistico': 'Landing page moderna para una clínica dental',
                    'studioPsicologi': 'Sitio web completo para un consultorio de psicología en Bolonia',
                    'agenzia': 'Sitio web moderno para una agencia inmobiliaria en Bolonia',
                    'gestioneViaNoce': 'Plataforma para alquiler de habitaciones y gestión de contratos',
                    'flappyBird': 'Recreación del juego móvil clásico',
                    'discord': 'Reconstrucción de la interfaz de Discord',
                    'trainTicket': 'Formulario interactivo para reserva de billetes',
                    'dropbox': 'Clon de la interfaz de Dropbox',
                    'neonSnake': 'Implementación interactiva de un juego',
                    'anticoStradello': 'Sitio web para una pizzería histórica'
                }
            },
            'about': {
                'title': 'SOBRE MÍ',
                'subtitle': 'Desarrollador Web con Base Semiótica',
                'approachTitle': 'MI ENFOQUE',
                'approachHint': 'Interactúa con los nodos',
                'nodes': {
                    'central': 'Desarrollo Creativo',
                    'problemSolving': 'Resolución de Problemas',
                    'humanCentric': 'Centrado en el Usuario',
                    'crossDisciplinary': 'Multidisciplinario',
                    'meaningOriented': 'Orientado al Significado'
                },
                'drivesTitle': 'QUÉ ME IMPULSA',
                'connectText': '¿Interesado en mi trayectoria profesional y habilidades?',
                'exploreCV': 'Explorar mi CV',
                'intro': {
                    'paragraph1': 'Creo soluciones digitales que comunican eficazmente, combinando habilidades técnicas y comprensión humanística para desarrollar experiencias web significativas.',
                    'paragraph2': '"El signo es el lugar de mediación entre la mente y la realidad. Nos permite referirnos a lo que está ausente, y tomar posición sobre lo posible y lo imposible." - Umberto Eco',
                    'degree1': 'Maestría en Semiótica',
                    'school1': 'Universidad de Bolonia - Escuela de Umberto Eco',
                    'grade': 'Calificación: 108/110',
                    'degree2': 'Desarrollo Full Stack',
                    'school2': 'Boolean',
                    'year': '2023'
                }
            },
            'cv': {
                'title': 'CURRÍCULUM',
                'subtitle': 'Desarrollador Full Stack con Base Semiótica',
                'quote': '"Resolutor de problemas con un alma humanista. Fusionando conocimientos técnicos y comprensión humana para crear soluciones digitales significativas."',
                'skills': 'EXPERTICIA TÉCNICA',
                'skillLevels': {
                    'advanced': 'Avanzado',
                    'intermediate': 'Intermedio',
                    'basic': 'Básico'
                },
                'experience': 'TRAYECTORIA PROFESIONAL',
                'education': 'EDUCACIÓN & ENFOQUE',
                'philosophy': 'Filosofía Profesional',
                'download': 'Descargar CV Completo',
                'professionalPhilosophy': {
                    'main': 'Combinar la excelencia técnica con la comprensión humana. Liderar equipos con empatía y precisión, garantizando calidad técnica y bienestar del grupo.',
                    'point1': 'Aplicar el análisis semiótico a los problemas digitales',
                    'point2': 'Cerrar la brecha entre perspectivas técnicas y humanísticas',
                    'point3': 'Aprendizaje continuo y adaptación constante'
                },
                'keyResults': 'Resultados Clave',
        'keyResultsList': [
            'Desarrollo de diseños de sitios web de vanguardia implementando principios modernos de diseño',
            'Implementación de seguimiento completo de eventos utilizando Google Tag Manager',
            'Creación de integraciones API personalizadas para mejorar la funcionalidad del sitio'
        ]
            },
            'contact': {
                'title': 'CONTACTO',
                'lead': 'Creemos algo significativo juntos.',
                'location': 'Ubicación',
                'email': 'Email',
                'phone': 'Teléfono',
                'message': 'Envíame un mensaje',
                'formLabels': {
                    'name': 'Nombre',
                    'email': 'Email',
                    'subject': 'Asunto',
                    'message': 'Mensaje',
                    'send': 'Enviar Mensaje'
                },
                'connect': 'CONECTAR'
            },
            'footer': {
                'copyright': '© 2025 Gianlivio Iemolo - Desarrollador Web'
            }
        }
    };
  
    const t = translations[lang] || translations['it'];
  
    // Navigazione
    document.querySelectorAll('.nav-link').forEach(link => {
        const page = link.getAttribute('data-page');
        if (page && t.nav[page]) {
            link.textContent = t.nav[page];
        }
    });
  
    // Web Developer nella barra di navigazione
    const navRight = document.querySelector('.nav-right span');
    if (navRight) {
        navRight.textContent = t.nav.webDev;
    }
  
    // Home page
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
        heroTitle.innerHTML = t.home.heroTitle;
    }
  
    const heroSubtitle = document.querySelector('.hero-subtitle');
    if (heroSubtitle) {
        heroSubtitle.textContent = t.home.heroSubtitle;
    }
  
    // CTA buttons
    const ctaButtons = document.querySelectorAll('.cta-button');
    if (ctaButtons.length >= 2) {
        const primaryCta = ctaButtons[0].querySelector('span');
        const secondaryCta = ctaButtons[1].querySelector('span');
  
        if (primaryCta) primaryCta.textContent = t.home.ctaProjects;
        if (secondaryCta) secondaryCta.textContent = t.home.ctaContact;
    }
  
    // Featured projects
    const featuredTitle = document.querySelector('.featured-projects .section-title');
    if (featuredTitle) {
        featuredTitle.textContent = t.home.featuredProjects;
    }
  
    // View all projects link
    const viewAllLink = document.querySelector('.section-cta .text-link span');
    if (viewAllLink) {
        viewAllLink.textContent = t.home.viewAll;
    }
  
    // View details links
    document.querySelectorAll('.view-project').forEach(link => {
        link.textContent = t.home.viewDetails;
    });
  
    // Skills section
    const skillsTitle = document.querySelector('.skills-overview .section-title');
    if (skillsTitle) {
        skillsTitle.textContent = t.home.skills;
    }
  
    // Projects page
    const projectsTitle = document.querySelector('#progetti h1');
    if (projectsTitle) {
        projectsTitle.textContent = t.projects.title;
    }
  
    const projectsDesc = document.querySelector('#progetti .description');
    if (projectsDesc) {
        projectsDesc.innerHTML = t.projects.description;
    }
  
    // Filtri progetti
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        const filter = btn.getAttribute('data-filter');
        if (filter && t.projects.filters[filter]) {
            btn.textContent = t.projects.filters[filter];
        }
    });
  
    // Link ai progetti
    document.querySelectorAll('.project-link').forEach(link => {
        link.textContent = t.projects.viewProject;
    });
  
    // Traduci le descrizioni dei progetti
    document.querySelectorAll('.project-card').forEach(card => {
        const title = card.querySelector('h3').textContent.trim();
        let projectKey = '';
        
        // Mappa i titoli dei progetti alle chiavi
        if (title === 'PuntoLuce') projectKey = 'puntoluce';
        else if (title === 'Studio Dentistico') projectKey = 'studioDentistico';
        else if (title === 'Studio Psicologi') projectKey = 'studioPsicologi';
        else if (title.includes('Agenzia Immobiliare')) projectKey = 'agenzia';
        else if (title.includes('Gestione via Noce')) projectKey = 'gestioneViaNoce';
        else if (title === 'Flappy Bird') projectKey = 'flappyBird';
        else if (title === 'Discord Clone') projectKey = 'discord';
        else if (title.includes('Train Ticket')) projectKey = 'trainTicket';
        else if (title === 'Dropbox Clone') projectKey = 'dropbox';
        else if (title === 'Neon Snake') projectKey = 'neonSnake';
        else if (title === 'Antico Stradello') projectKey = 'anticoStradello';
        
        if (projectKey && t.projects.projectDescriptions[projectKey]) {
            const description = card.querySelector('p');
            if (description) {
                description.textContent = t.projects.projectDescriptions[projectKey];
            }
        }
    });
  
    // About page
    const aboutTitle = document.querySelector('#about .about-title');
    if (aboutTitle) {
        aboutTitle.textContent = t.about.title;
        aboutTitle.setAttribute('data-text', t.about.title);
    }
  
    const aboutSubtitle = document.querySelector('#about .about-subtitle');
    if (aboutSubtitle) {
        aboutSubtitle.textContent = t.about.subtitle;
    }
  
    // Traduci i paragrafi nella sezione About
    const aboutIntroText = document.querySelectorAll('.intro-text p');
    if (aboutIntroText.length >= 2) {
        aboutIntroText[0].textContent = t.about.intro.paragraph1;
        aboutIntroText[1].innerHTML = t.about.intro.paragraph2;
    }
  
    const approachTitle = document.querySelector('.philosophy-visualizer .section-title');
    if (approachTitle) {
        approachTitle.textContent = t.about.approachTitle;
        approachTitle.setAttribute('data-text', t.about.approachTitle);
    }
  
    const approachHint = document.querySelector('.interaction-hint .hint-text');
    if (approachHint) {
        approachHint.textContent = t.about.approachHint;
    }
  
    // Nodi filosofia
    const centralNode = document.querySelector('#central-node .node-label');
    if (centralNode) {
        centralNode.textContent = t.about.nodes.central;
    }
  
    document.querySelectorAll('.orbiting-node').forEach((node, index) => {
        const labels = [
            t.about.nodes.problemSolving,
            t.about.nodes.humanCentric,
            t.about.nodes.crossDisciplinary,
            t.about.nodes.meaningOriented
        ];
  
        const nodeLabel = node.querySelector('.node-label');
        if (nodeLabel && index < labels.length) {
            nodeLabel.textContent = labels[index];
        }
    });
  
    const drivesTitle = document.querySelector('.passion-section .section-title');
    if (drivesTitle) {
        drivesTitle.textContent = t.about.drivesTitle;
        drivesTitle.setAttribute('data-text', t.about.drivesTitle);
    }
  
    const connectText = document.querySelector('.connect-text');
    if (connectText) {
        connectText.textContent = t.about.connectText;
    }
  
    const exploreCV = document.querySelector('.connect-button .button-text');
    if (exploreCV) {
        exploreCV.textContent = t.about.exploreCV;
    }
  
    // Traduci le info sulla formazione
    const educationDegree1 = document.querySelector('.education-degree');
    const educationInstitution1 = document.querySelector('.education-institution');
    const educationGrade = document.querySelector('.education-grade');
    const educationNote = document.querySelector('.education-note');
  
    if (educationDegree1) educationDegree1.textContent = t.about.intro.degree1;
    if (educationInstitution1) educationInstitution1.textContent = t.about.intro.school1;
    if (educationGrade) educationGrade.textContent = t.about.intro.grade;
    if (educationNote) educationNote.innerHTML = t.about.intro.paragraph2;
  
    const educationItems = document.querySelectorAll('.education-item');
    if (educationItems.length >= 2) {
        const secondItem = educationItems[1];
        const degree2 = secondItem.querySelector('.education-degree');
        const institution2 = secondItem.querySelector('.education-institution');
        const period2 = secondItem.querySelector('.education-period');
        
        if (degree2) degree2.textContent = t.about.intro.degree2;
        if (institution2) institution2.textContent = t.about.intro.school2;
        if (period2) period2.textContent = t.about.intro.year;
    }
  
    // CV page
    const cvTitle = document.querySelector('#cv .cv-title');
    if (cvTitle) {
        cvTitle.textContent = t.cv.title;
        cvTitle.setAttribute('data-text', t.cv.title);
    }
  
    const cvSubtitle = document.querySelector('#cv .cv-subtitle');
    if (cvSubtitle) {
        cvSubtitle.textContent = t.cv.subtitle;
    }
  
    const cvQuote = document.querySelector('.philosophy-quote');
    if (cvQuote) {
        cvQuote.textContent = t.cv.quote;
    }
  
    // Competenze
    const skillsTitle2 = document.querySelector('.skill-graph-container .section-title');
    if (skillsTitle2) {
        skillsTitle2.textContent = t.cv.skills;
        skillsTitle2.setAttribute('data-text', t.cv.skills);
    }
  
    // Livelli di competenza
    document.querySelectorAll('.skill-level').forEach((level, index) => {
        const levels = [t.cv.skillLevels.advanced, t.cv.skillLevels.intermediate, t.cv.skillLevels.basic];
        if (index < levels.length) {
            level.textContent = levels[index];
        }
    });
  
    const experienceTitle = document.querySelector('.experience-timeline-container .section-title');
    if (experienceTitle) {
        experienceTitle.textContent = t.cv.experience;
        experienceTitle.setAttribute('data-text', t.cv.experience);
    }
  
    const educationTitle = document.querySelector('.education-approach-container .section-title');
    if (educationTitle) {
        educationTitle.textContent = t.cv.education;
        educationTitle.setAttribute('data-text', t.cv.education);
    }
  
    const philosophyTitle = document.querySelector('.approach-block h3');
    if (philosophyTitle) {
        philosophyTitle.textContent = t.cv.philosophy;
    }
  
    // Traduci la filosofia professionale
    const philosophyContent = document.querySelector('.approach-content p');
    if (philosophyContent) {
        philosophyContent.textContent = t.cv.professionalPhilosophy.main;
    }
  
    const approachHighlights = document.querySelectorAll('.approach-highlight .highlight-text');
    if (approachHighlights.length >= 3) {
        approachHighlights[0].textContent = t.cv.professionalPhilosophy.point1;
        approachHighlights[1].textContent = t.cv.professionalPhilosophy.point2;
        approachHighlights[2].textContent = t.cv.professionalPhilosophy.point3;
    }

    const jobHighlightsTitle = document.querySelector('.timeline-panel[data-year="2024"] .job-highlights h4');
    if (jobHighlightsTitle) {
        jobHighlightsTitle.textContent = t.cv.keyResults;
    }

    const jobHighlightsList = document.querySelectorAll('.timeline-panel[data-year="2024"] .job-highlights ul li');
    if (jobHighlightsList && jobHighlightsList.length) {
        jobHighlightsList.forEach((item, index) => {
            if (t.cv.keyResultsList && t.cv.keyResultsList[index]) {
                item.textContent = t.cv.keyResultsList[index];
            }
        });
    }
  
    const downloadBtn = document.querySelector('.cv-download-button .download-text');
    if (downloadBtn) {
        downloadBtn.textContent = t.cv.download;
    }
  
    // Contact page
    const contactTitle = document.querySelector('#contact h1');
    if (contactTitle) {
        contactTitle.textContent = t.contact.title;
    }
  
    const contactLead = document.querySelector('.contact-lead');
    if (contactLead) {
        contactLead.textContent = t.contact.lead;
    }
  
    // Etichette info contatto
    const infoLabels = document.querySelectorAll('.info-item h3');
    if (infoLabels.length >= 3) {
        infoLabels[0].textContent = t.contact.location;
        infoLabels[1].textContent = t.contact.email;
        infoLabels[2].textContent = t.contact.phone;
    }
  
    // Form di contatto
    const formTitle = document.querySelector('.contact-form-container h3');
    if (formTitle) {
        formTitle.textContent = t.contact.message;
    }
  
    // Label form
    const nameLabel = document.querySelector('label[for="name"]');
    if (nameLabel) nameLabel.textContent = t.contact.formLabels.name;
  
    const emailLabel = document.querySelector('label[for="email"]');
    if (emailLabel) emailLabel.textContent = t.contact.formLabels.email;
  
    const subjectLabel = document.querySelector('label[for="subject"]');
    if (subjectLabel) subjectLabel.textContent = t.contact.formLabels.subject;
  
    const messageLabel = document.querySelector('label[for="message"]');
    if (messageLabel) messageLabel.textContent = t.contact.formLabels.message;
  
    const submitBtn = document.querySelector('.form-submit');
    if (submitBtn) submitBtn.textContent = t.contact.formLabels.send;
  
    // Titolo social
    const socialTitle = document.querySelector('.social-links h2');
    if (socialTitle) {
        socialTitle.textContent = t.contact.connect;
    }
  
    // Footer
    const copyright = document.querySelector('.footer-left p');
    if (copyright) {
        copyright.textContent = t.footer.copyright;
    }
  
    // Traduzioni per i nodi in about page
    const nodeTranslations = {
        'node-1': {
            'it': {
                title: 'Analitico & Creativo',
                text: 'Affronto le sfide con precisione e intuizione, trovando soluzioni all\'incrocio tra logica e creatività.'
            },
            'en': {
                title: 'Analytical & Creative',
                text: 'I approach challenges with precision and intuition, finding solutions at the intersection of logic and creativity.'
            },
            'es': {
                title: 'Analítico & Creativo',
                text: 'Abordo los desafíos con precisión e intuición, encontrando soluciones en la intersección entre lógica y creatividad.'
            }
        },
        'node-2': {
            'it': {
                title: 'Design Centrato sull\'Utente',
                text: 'Equilibrio tra eccellenza tecnica e comprensione autentica dei bisogni e delle aspettative dell\'utente.'
            },
            'en': {
                title: 'User-Centered Design',
                text: 'Balance between technical excellence and authentic understanding of user needs and expectations.'
            },
            'es': {
                title: 'Diseño Centrado en el Usuario',
                text: 'Equilibrio entre excelencia técnica y comprensión auténtica de las necesidades y expectativas del usuario.'
            }
        },
        'node-3': {
            'it': {
                title: 'Collegamento di Mondi',
                text: 'Unisco competenze di sviluppo con teoria della comunicazione per creare esperienze digitali più ricche.'
            },
            'en': {
                title: 'Connecting Worlds',
                text: 'I combine development skills with communication theory to create richer digital experiences.'
            },
            'es': {
                title: 'Conexión de Mundos',
                text: 'Combino habilidades de desarrollo con teoría de la comunicación para crear experiencias digitales más ricas.'
            }
        },
        'node-4': {
            'it': {
                title: 'Approccio Semiotico',
                text: 'Applico principi semiotici per creare interfacce e sistemi che comunicano in modo chiaro ed efficace.'
            },
            'en': {
                title: 'Semiotic Approach',
                text: 'I apply semiotic principles to create interfaces and systems that communicate clearly and effectively.'
            },
            'es': {
                title: 'Enfoque Semiótico',
                text: 'Aplico principios semióticos para crear interfaces y sistemas que comunican de manera clara y efectiva.'
            }
        }
    };
  
    // Traduci i contenuti dei nodi
    for (const nodeId in nodeTranslations) {
        const node = document.getElementById(nodeId);
        if (node) {
            const description = node.querySelector('.node-description');
            if (description && nodeTranslations[nodeId][lang]) {
                const h3 = description.querySelector('h3');
                const p = description.querySelector('p');
                if (h3 && p) {
                    h3.textContent = nodeTranslations[nodeId][lang].title;
                    p.textContent = nodeTranslations[nodeId][lang].text;
                }
            }
        }
    }
  
    // Traduzioni per le sezioni "passion"
    const passionTranslations = {
        'it': [
            {
                title: 'Codice Pulito e Significativo',
                text: 'Cerco l\'eleganza nella semplicità e nella chiarezza. Scrivo codice che altri sviluppatori possano comprendere e migliorare.'
            },
            {
                title: 'Comunicazione Digitale',
                text: 'Creo interfacce ed esperienze che parlano chiaramente agli utenti su più livelli cognitivi.'
            },
            {
                title: 'Evoluzione Continua',
                text: 'Abbraccio nuove tecnologie e metodologie, perfezionando costantemente le mie competenze e il mio approccio.'
            }
        ],
        'en': [
            {
                title: 'Clean and Meaningful Code',
                text: 'I seek elegance in simplicity and clarity. I write code that other developers can understand and improve.'
            },
            {
                title: 'Digital Communication',
                text: 'I create interfaces and experiences that speak clearly to users on multiple cognitive levels.'
            },
            {
                title: 'Continuous Evolution',
                text: 'I embrace new technologies and methodologies, constantly refining my skills and approach.'
            }
        ],
        'es': [
            {
                title: 'Código Limpio y Significativo',
                text: 'Busco la elegancia en la simplicidad y la claridad. Escribo código que otros desarrolladores puedan entender y mejorar.'
            },
            {
                title: 'Comunicación Digital',
                text: 'Creo interfaces y experiencias que hablan claramente a los usuarios en múltiples niveles cognitivos.'
            },
            {
                title: 'Evolución Continua',
                text: 'Adopto nuevas tecnologías y metodologías, perfeccionando constantemente mis habilidades y enfoque.'
            }
        ]
    };
  
    const passionItems = document.querySelectorAll('.passion-item');
    passionItems.forEach((item, index) => {
        if (passionTranslations[lang] && passionTranslations[lang][index]) {
            const h3 = item.querySelector('h3');
            const p = item.querySelector('p');
            if (h3 && p) {
                h3.textContent = passionTranslations[lang][index].title;
                p.textContent = passionTranslations[lang][index].text;
            }
        }
    });
  }