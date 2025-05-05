/*
* Portfolio - Gianlivio Iemolo
* Architetto Digitale
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
    initAboutPage();
    initCVPage();
    initContactPage();
  
    // Aggiungi classe visible agli elementi con transizione
    applyPageTransitions();
  });
  
  // TRADUZIONI COMPLETE
  const translations = {
    'en': {
      'nav': {
        'progetti': 'PROJECTS',
        'about': 'ABOUT',
        'cv': 'CV',
        'contatti': 'CONTACT',
        'webDev': 'DIGITAL ARCHITECT'
      },
      'home': {
        'heroTitle': 'DIGITAL SPACE <span class="highlight">ARCHITECT</span>',
        'heroSubtitle': 'From the code of signs to the code of functions:<br>where semiotics meets web development to create meaning',
        'ctaProjects': 'Explore projects',
        'ctaContact': 'Contact me',
        'thinkBeforeCode': 'Think Before Code',
        'humanCentered': 'Human-Centered Design',
        'meaningfulInnovation': 'Meaningful Innovation',
        'featuredProjects': 'FEATURED PROJECTS',
        'viewAll': 'View all projects',
        'viewDetails': 'View details',
        'skills': 'SKILLS'
      },
      'projects': {
        'title': 'PORTFOLIO PROJECTS',
        'description': 'FRONTEND · UX/UI · ACCESSIBILITY · API INTEGRATION',
        'subtitle': 'Each project is a semiotic space where meaning takes form',
        'filters': {
          'all': 'All',
          'ecommerce': 'E-commerce',
          'landing': 'Landing Page',
          'app': 'Web App',
          'clone': 'UI Clone'
        },
        'viewProject': 'Visit site',
        'showingProjects': 'Showing: All projects',
        'quickView': 'Quick View',
        'details': 'Details'
      },
      'about': {
        'title': 'ABOUT',
        'subtitle': 'Web Developer with Semiotic Background',
        'intro1': 'Welcome to my digital world. I\'m Gianlivio, a developer who believes in the power of code as a tool for deep expression and communication.',
        'intro2': 'My training in <span class="highlight">Semiotics and Ethnosemiotics</span> is not just an academic background, but the foundation of my web development approach. Just as objects in physical space guide users\' actions - a staircase invites climbing, a handle demands grasping - digital elements must communicate their purpose through clear and meaningful visual and interactive language.',
        'intro3': 'I develop digital solutions that don\'t just work, but communicate. Every interface is a semiotic space where form and function dialogue, where digital ergonomics and virtual proxemics guide the user\'s experience toward the natural discovery of meaning.',
        'approachTitle': 'MY APPROACH',
        'approachHint': 'Interact with the nodes',
        'nodes': {
          'central': 'Digital Space Architect',
          'node1': 'Right Questions',
          'node1Desc': 'Ask the right questions before seeking solutions. Understand before acting.',
          'node2': 'Communicative Space',
          'node2Desc': 'Every digital element communicates meaning through form and position.',
          'node3': 'Applied Semiotics',
          'node3Desc': 'From Greimas\' theories of space to digital ergonomics.',
          'node4': 'Meaningful Innovation',
          'node4Desc': 'Innovate when needed, build to last, improve experience.'
        },
        'drivesTitle': 'WHAT DRIVES ME',
        'passion1': {
          'title': 'Search for Meaning',
          'desc': 'Every project is a semiotic analysis: I understand behaviors, decode patterns, create experiences that resonate with users on a deep level.'
        },
        'passion2': {
          'title': 'Readable, Human Code',
          'desc': 'I write code that communicates: clear, accessible, maintainable. Technical quality is professional ethics.'
        },
        'passion3': {
          'title': 'Impactful Projects',
          'desc': 'Real enthusiasm for projects that solve real problems. Technology serving people, not as an end in itself.'
        },
        'connectText': 'Interested in my professional journey and skills?',
        'exploreCV': 'Explore my CV'
      },
      'cv': {
        'title': 'CURRICULUM',
        'subtitle': 'Full Stack Developer with Semiotic Background',
        'quote': '"Honesty in communication and attention to detail guide every project. Just as a well-designed physical space naturally guides movements, a well-crafted digital interface intuitively guides experience."',
        'skills': 'TECHNICAL EXPERTISE',
        'skillLevels': {
          'advanced': 'Advanced',
          'intermediate': 'Intermediate',
          'basic': 'Basic'
        },
        'experience': 'PROFESSIONAL JOURNEY',
        'education': 'EDUCATION & APPROACH',
        'educationNote': 'Experimental thesis in ethnosemiotics and theories of space. Research on mechanisms through which spaces and objects guide user actions: from proxemics to kinesics, from physical to digital ergonomics.',
        'philosophy': 'Professional Philosophy',
        'philContent': 'My approach combines semiotic analysis and web development to create interfaces that naturally communicate their purpose. Just as physical affordance intuitively suggests interaction, every digital element must clearly express its function through form.',
        'philHighlight1': 'Ask the right questions before seeking solutions',
        'philHighlight2': 'Apply spatial theories to digital experience',
        'philHighlight3': 'Create solutions that put people first',
        'download': 'Download Full CV'
      },
      'contact': {
        'title': 'CONTACT',
        'lead': 'Let\'s create a digital space that communicates.<br>Where form and function dialogue to generate meaning.',
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
        'copyright': '© 2025 Gianlivio Iemolo - Digital Architect'
      }
    },
    'it': {
      'nav': {
        'progetti': 'PROGETTI',
        'about': 'CHI SONO',
        'cv': 'CV',
        'contatti': 'CONTATTI',
        'webDev': 'ARCHITETTO DIGITALE'
      },
      'home': {
        'heroTitle': 'ARCHITETTO DIGITALE <span class="highlight">DELLO SPAZIO</span>',
        'heroSubtitle': 'Dal codice dei segni al codice delle funzioni:<br>dove semiotica e sviluppo web si incontrano per creare significato',
        'ctaProjects': 'Esplora i progetti',
        'ctaContact': 'Contattami',
        'thinkBeforeCode': 'Pensare Prima di Codificare',
        'humanCentered': 'Design Centrato sull\'Umano',
        'meaningfulInnovation': 'Innovazione Significativa',
        'featuredProjects': 'PROGETTI IN EVIDENZA',
        'viewAll': 'Vedi tutti i progetti',
        'viewDetails': 'Vedi dettagli',
        'skills': 'COMPETENZE'
      },
      'projects': {
        'title': 'PORTFOLIO PROGETTI',
        'description': 'FRONTEND · UX/UI · ACCESSIBILITÀ · INTEGRAZIONE API',
        'subtitle': 'Ogni progetto è uno spazio semiotico dove il significato prende forma',
        'filters': {
          'all': 'Tutti',
          'ecommerce': 'E-commerce',
          'landing': 'Landing Page',
          'app': 'Web App',
          'clone': 'UI Clone'
        },
        'viewProject': 'Visita il sito',
        'showingProjects': 'Mostrando: Tutti i progetti',
        'quickView': 'Quick View',
        'details': 'Dettagli'
      },
      'about': {
        'title': 'CHI SONO',
        'subtitle': 'Sviluppatore Web con Background Semiotico',
        'intro1': 'Benvenuti nel mio mondo digitale. Sono Gianlivio, uno sviluppatore che crede nella potenza del codice come strumento di espressione e comunicazione profonda.',
        'intro2': 'La mia formazione in <span class="highlight">Semiotica e Etnosemiotica</span> non è solo un background accademico, ma il fondamento del mio approccio allo sviluppo web. Come gli oggetti nello spazio fisico guidano le azioni dei fruitori - una scala invita a salire, un manubrio a essere afferrato - così gli elementi digitali devono comunicare il loro scopo attraverso un linguaggio visivo e interattivo chiaro e significativo.',
        'intro3': 'Sviluppo soluzioni digitali che non si limitano a funzionare, ma comunicano. Ogni interfaccia è uno spazio semiotico dove forma e funzione dialogano, dove l\'ergonomia digitale e la prossemica virtuale guidano l\'esperienza dell\'utente verso la scoperta naturale del significato.',
        'approachTitle': 'IL MIO APPROCCIO',
        'approachHint': 'Interagisci con i nodi',
        'nodes': {
          'central': 'Architetto dello Spazio Digitale',
          'node1': 'Domande Giuste',
          'node1Desc': 'Porre le domande giuste prima di cercare soluzioni. Capire prima di agire.',
          'node2': 'Spazio Comunicativo',
          'node2Desc': 'Ogni elemento digitale comunica un significato attraverso forma e posizione.',
          'node3': 'Semiotica Applicata',
          'node3Desc': 'Dalle teorie dello spazio di Greimas all\'ergonomia digitale.',
          'node4': 'Innovazione Significativa',
          'node4Desc': 'Innovare quando serve, costruire per durare, migliorare l\'esperienza.'
        },
        'drivesTitle': 'COSA MI GUIDA',
        'passion1': {
          'title': 'Ricerca del Significato',
          'desc': 'Ogni progetto è un\'analisi semiotica: comprendo i comportamenti, decodifico i pattern, creo esperienze che risuonano con l\'utente a livello profondo.'
        },
        'passion2': {
          'title': 'Codice Leggibile, Umano',
          'desc': 'Scrivo codice che comunica: chiaro, accessibile, manutenibile. La qualità tecnica è etica professionale.'
        },
        'passion3': {
          'title': 'Progetti con Impatto',
          'desc': 'Vero entusiasmo per progetti che risolvono problemi reali. La tecnologia al servizio delle persone, non fine a sé stessa.'
        },
        'connectText': 'Interessato al mio percorso professionale e alle mie competenze?',
        'exploreCV': 'Esplora il mio CV'
      },
      'cv': {
        'title': 'CURRICULUM',
        'subtitle': 'Sviluppatore Full Stack con Background Semiotico',
        'quote': '"L\'onestà nella comunicazione e la cura del dettaglio guidano ogni mio progetto. Come uno spazio fisico ben progettato guida naturalmente i movimenti, così un\'interfaccia digitale ben realizzata guida intuitivamente l\'esperienza."',
        'skills': 'COMPETENZE TECNICHE',
        'skillLevels': {
          'advanced': 'Avanzato',
          'intermediate': 'Intermedio',
          'basic': 'Base'
        },
        'experience': 'PERCORSO PROFESSIONALE',
        'education': 'FORMAZIONE & APPROCCIO',
        'educationNote': 'Tesi sperimentale in etnosemiotica e teorie dello spazio. Ricerca sui meccanismi attraverso cui gli spazi e gli oggetti guidano le azioni degli utenti: dalla prossemica alla cinesica, dall\'ergonomia fisica all\'ergonomia digitale.',
        'philosophy': 'Filosofia Professionale',
        'philContent': 'Il mio approccio unisce analisi semiotica e sviluppo web per creare interfacce che comunicano naturalmente il loro scopo. Come un\'affordance fisica suggerisce intuitivamente l\'interazione, così ogni elemento digitale deve esprimere chiaramente la sua funzione attraverso la forma.',
        'philHighlight1': 'Porre domande giuste prima di cercare soluzioni',
        'philHighlight2': 'Applicare teorie spaziali all\'esperienza digitale',
        'philHighlight3': 'Creare soluzioni che mettono le persone al centro',
        'download': 'Scarica CV Completo'
      },
      'contact': {
        'title': 'CONTATTI',
        'lead': 'Creiamo uno spazio digitale che comunica.<br>Dove forma e funzione dialogano per generare significato.',
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
        'copyright': '© 2025 Gianlivio Iemolo - Architetto Digitale'
      }
    },
    'es': {
      'nav': {
        'progetti': 'PROYECTOS',
        'about': 'SOBRE MÍ',
        'cv': 'CV',
        'contatti': 'CONTACTO',
        'webDev': 'ARQUITECTO DIGITAL'
      },
      'home': {
        'heroTitle': 'ARQUITECTO DEL <span class="highlight">ESPACIO DIGITAL</span>',
        'heroSubtitle': 'Del código de los signos al código de las funciones:<br>donde la semiótica encuentra el desarrollo web para crear significado',
        'ctaProjects': 'Explorar proyectos',
        'ctaContact': 'Contáctame',
        'thinkBeforeCode': 'Pensar Antes de Codificar',
        'humanCentered': 'Diseño Centrado en el Usuario',
        'meaningfulInnovation': 'Innovación Significativa',
        'featuredProjects': 'PROYECTOS DESTACADOS',
        'viewAll': 'Ver todos los proyectos',
        'viewDetails': 'Ver detalles',
        'skills': 'HABILIDADES'
      },
      'projects': {
        'title': 'PORTFOLIO DE PROYECTOS',
        'description': 'FRONTEND · UX/UI · ACCESIBILIDAD · INTEGRACIÓN API',
        'subtitle': 'Cada proyecto es un espacio semiótico donde el significado toma forma',
        'filters': {
          'all': 'Todos',
          'ecommerce': 'E-commerce',
          'landing': 'Landing Page',
          'app': 'Web App',
          'clone': 'UI Clone'
        },
        'viewProject': 'Visitar sitio',
        'showingProjects': 'Mostrando: Todos los proyectos',
        'quickView': 'Vista Rápida',
        'details': 'Detalles'
      },
      'about': {
        'title': 'SOBRE MÍ',
        'subtitle': 'Desarrollador Web con Base Semiótica',
        'intro1': 'Bienvenidos a mi mundo digital. Soy Gianlivio, un desarrollador que cree en el poder del código como herramienta de expresión y comunicación profunda.',
        'intro2': 'Mi formación en <span class="highlight">Semiótica y Etnosemiótica</span> no es solo un trasfondo académico, sino la base de mi enfoque en el desarrollo web. Así como los objetos en el espacio físico guían las acciones de los usuarios - una escalera invita a subir, una manija demanda ser agarrada - los elementos digitales deben comunicar su propósito a través de un lenguaje visual e interactivo claro y significativo.',
        'intro3': 'Desarrollo soluciones digitales que no solo funcionan, sino que comunican. Cada interfaz es un espacio semiótico donde forma y función dialogan, donde la ergonomía digital y la proxémica virtual guían la experiencia del usuario hacia el descubrimiento natural del significado.',
        'approachTitle': 'MI ENFOQUE',
        'approachHint': 'Interactúa con los nodos',
        'nodes': {
          'central': 'Arquitecto del Espacio Digital',
          'node1': 'Preguntas Correctas',
          'node1Desc': 'Hacer las preguntas correctas antes de buscar soluciones. Entender antes de actuar.',
          'node2': 'Espacio Comunicativo',
          'node2Desc': 'Cada elemento digital comunica significado a través de forma y posición.',
          'node3': 'Semiótica Aplicada',
          'node3Desc': 'De las teorías del espacio de Greimas a la ergonomía digital.',
          'node4': 'Innovación Significativa',
          'node4Desc': 'Innovar cuando se necesita, construir para durar, mejorar la experiencia.'
        },
        'drivesTitle': 'QUÉ ME IMPULSA',
        'passion1': {
          'title': 'Búsqueda de Significado',
          'desc': 'Cada proyecto es un análisis semiótico: comprendo comportamientos, decodifico patrones, creo experiencias que resuenan con el usuario a nivel profundo.'
        },
        'passion2': {
          'title': 'Código Legible, Humano',
          'desc': 'Escribo código que comunica: claro, accesible, mantenible. La calidad técnica es ética profesional.'
        },
        'passion3': {
          'title': 'Proyectos con Impacto',
          'desc': 'Verdadero entusiasmo por proyectos que resuelven problemas reales. La tecnología al servicio de las personas, no como fin en sí misma.'
        },
        'connectText': '¿Interesado en mi trayectoria profesional y habilidades?',
        'exploreCV': 'Explorar mi CV'
      },
      'cv': {
        'title': 'CURRÍCULUM',
        'subtitle': 'Desarrollador Full Stack con Base Semiótica',
        'quote': '"La honestidad en la comunicación y la atención al detalle guían cada proyecto. Así como un espacio físico bien diseñado guía naturalmente los movimientos, una interfaz digital bien hecha guía intuitivamente la experiencia."',
        'skills': 'EXPERTICIA TÉCNICA',
        'skillLevels': {
          'advanced': 'Avanzado',
          'intermediate': 'Intermedio',
          'basic': 'Básico'
        },
        'experience': 'TRAYECTORIA PROFESIONAL',
        'education': 'EDUCACIÓN & ENFOQUE',
        'educationNote': 'Tesis experimental en etnosemiótica y teorías del espacio. Investigación sobre mecanismos a través de los cuales los espacios y objetos guían las acciones de los usuarios: de la proxémica a la kinésica, de la ergonomía física a la digital.',
        'philosophy': 'Filosofía Profesional',
        'philContent': 'Mi enfoque combina análisis semiótico y desarrollo web para crear interfaces que comunican naturalmente su propósito. Así como una affordance física sugiere intuitivamente la interacción, cada elemento digital debe expresar claramente su función a través de la forma.',
        'philHighlight1': 'Hacer las preguntas correctas antes de buscar soluciones',
        'philHighlight2': 'Aplicar teorías espaciales a la experiencia digital',
        'philHighlight3': 'Crear soluciones que ponen a las personas primero',
        'download': 'Descargar CV Completo'
      },
      'contact': {
        'title': 'CONTACTO',
        'lead': 'Creemos un espacio digital que comunica.<br>Donde forma y función dialogan para generar significado.',
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
        'copyright': '© 2025 Gianlivio Iemolo - Arquitecto Digital'
      }
    }
  };
  
  // FUNZIONI PRINCIPALI
  
  // Funzione per inizializzare il cursore personalizzato
  function initCustomCursor() {
    const cursor = document.querySelector('.custom-cursor');
    if (!cursor) return;
    
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
        document.body.style.cursor = 'auto';
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
  
  
  // Funzione per aggiornare i contatori dei filtri
function updateFilterCounts() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card');
    
    filterButtons.forEach(button => {
        const filter = button.getAttribute('data-filter');
        let count = 0;
        
        if (filter === 'all') {
            count = projectCards.length;
        } else {
            count = document.querySelectorAll(`.project-card[data-category="${filter}"]`).length;
        }
        
        const countSpan = button.querySelector('.filter-count');
        if (countSpan) {
            countSpan.textContent = count;
        }
    });
  }
  
  // Funzione per inizializzare il modal dei progetti
  function initProjectModal() {
    const viewProjectLinks = document.querySelectorAll('.view-project, .quick-view');
    const projectModal = document.getElementById('project-modal');
    const modalBody = projectModal ? projectModal.querySelector('.modal-body') : null;
    const closeModal = projectModal ? projectModal.querySelector('.close-modal') : null;
  
    if (viewProjectLinks.length && projectModal && modalBody && closeModal) {
        // Dati progetto
        const projectDetails = {
            'puntoluce': {
                title: 'PuntoLuce E-commerce',
                description: 'Sviluppo di un nuovo sito e-commerce per PuntoLuce utilizzando Open2b. Il progetto ha incluso la progettazione dell\'interfaccia utente, l\'implementazione del backend e l\'ottimizzazione SEO.',
                image: 'puntoluce.png',
                technologies: ['HTML', 'CSS', 'JavaScript', 'Open2b', 'Responsive Design', 'SEO'],
                features: [
                    'Interfaccia utente moderna e intuitiva',
                    'Carrello acquisti ottimizzato',
                    'Sistema di filtri prodotti avanzato',
                    'Integrazione con sistemi di pagamento',
                    'Ottimizzazione per dispositivi mobili'
                ],
                liveSite: 'https://shop.puntoluce.net/open2b/design/Slide-definitiva/~/'
            },
            // Aggiungi altri progetti qui...
        };
  
        // Apri modal con dettagli progetto
        viewProjectLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const projectId = link.getAttribute('data-project');
                const project = projectDetails[projectId];
                
                if (project) {
                    modalBody.innerHTML = createProjectModalContent(project);
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
  
  // Funzione per creare il contenuto del modal
  function createProjectModalContent(project) {
    return `
        <div class="modal-project-details">
            <h2>${project.title}</h2>
            <div class="modal-project-image" style="background-image: url('${project.image}')"></div>
            <div class="modal-project-description">
                <p>${project.description}</p>
                
                <h3>Tecnologie</h3>
                <div class="tech-stack">
                    ${project.technologies.map(tech => `<span>${tech}</span>`).join('')}
                </div>
                
                <h3>Caratteristiche</h3>
                <ul class="feature-list">
                    ${project.features.map(feature => `<li>${feature}</li>`).join('')}
                </ul>
                
                <a href="${project.liveSite}" target="_blank" class="live-site-link">
                    Visita il sito
                    <svg class="arrow-icon" viewBox="0 0 24 24">
                        <path d="M5,12H19M19,12L12,5M19,12L12,19"></path>
                    </svg>
                </a>
            </div>
        </div>
    `;
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
            
            // Simulazione invio form
            const submitBtn = contactForm.querySelector('.form-submit');
            const originalText = submitBtn.textContent;
            
            // Cambio testo pulsante
            submitBtn.textContent = 'Invio in corso...';
            submitBtn.disabled = true;
            
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
  
    // Animazione dei nodi orbitanti - Increased speed
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
  
  // Funzione per animare i nodi orbitanti - Velocità aumentata
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
  
    // Aggiungi attributi per l'animazione con velocità aumentata
    orbitingNodes.forEach((node, index) => {
        const orbit = index + 1;
        const angle = index * Math.PI / 2;
        const radius = 20 + (orbit * 5);
        const speed = 0.0003 + (Math.random() * 0.0002); // Velocità aumentata
  
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
            const speed = parseFloat(node.getAttribute('data-speed') || 0.0003);
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
  
  // TRADUZIONE
  function translatePage(lang) {
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
        heroSubtitle.innerHTML = t.home.heroSubtitle;
    }
  
    // Descriptor items
    const descriptors = document.querySelectorAll('.descriptor-item span:not(.descriptor-icon)');
    if (descriptors.length >= 3) {
        descriptors[0].textContent = t.home.thinkBeforeCode;
        descriptors[1].textContent = t.home.humanCentered;
        descriptors[2].textContent = t.home.meaningfulInnovation;
    }
  
    // Projects page
    const projectTitle = document.querySelector('#progetti h1');
    if (projectTitle) {
        projectTitle.textContent = t.projects.title;
    }
  
    const projectDesc = document.querySelector('#progetti .description .typing-text');
    if (projectDesc) {
        projectDesc.textContent = t.projects.description;
    }
  
    const projectSubtitle = document.querySelector('#progetti .description .subtitle');
    if (projectSubtitle) {
        projectSubtitle.textContent = t.projects.subtitle;
    }
  
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
  
    // CV page
    const cvTitle = document.querySelector('#cv .cv-title');
    if (cvTitle) {
        cvTitle.textContent = t.cv.title;
        cvTitle.setAttribute('data-text', t.cv.title);
    }
  
    const cvQuote = document.querySelector('.philosophy-quote');
    if (cvQuote) {
        cvQuote.textContent = t.cv.quote;
    }
  
    // Contact page
    const contactTitle = document.querySelector('#contact h1');
    if (contactTitle) {
        contactTitle.textContent = t.contact.title;
    }
  
    const contactLead = document.querySelector('.contact-lead');
    if (contactLead) {
        contactLead.innerHTML = t.contact.lead;
    }
  
    // Footer
    const copyright = document.querySelector('.footer-left p');
    if (copyright) {
        copyright.textContent = t.footer.copyright;
    }
  
    // CTA buttons
    const ctaButtons = document.querySelectorAll('.cta-button');
    if (ctaButtons.length >= 2) {
        const primaryCta = ctaButtons[0].querySelector('span');
        const secondaryCta = ctaButtons[1].querySelector('span');
  
        if (primaryCta) primaryCta.textContent = t.home.ctaProjects;
        if (secondaryCta) secondaryCta.textContent = t.home.ctaContact;
    }
  
    // Project links
    document.querySelectorAll('.project-link').forEach(link => {
        if (link.getAttribute('target') === '_blank') {
            link.querySelector('span').textContent = t.projects.viewProject;
        }
    });
  
    // View details links
    document.querySelectorAll('.view-project').forEach(link => {
        link.textContent = t.home.viewDetails;
    });
  
    // Quick view links
    document.querySelectorAll('.quick-view span').forEach(span => {
        span.textContent = t.projects.quickView;
    });
  
    // Philosophy nodes
    const centralNode = document.querySelector('#central-node .node-label');
    if (centralNode) {
        centralNode.textContent = t.about.nodes.central;
    }
  
    const nodeLabels = document.querySelectorAll('.orbiting-node .node-label');
    if (nodeLabels.length === 4) {
        nodeLabels[0].textContent = t.about.nodes.node1;
        nodeLabels[1].textContent = t.about.nodes.node2;
        nodeLabels[2].textContent = t.about.nodes.node3;
        nodeLabels[3].textContent = t.about.nodes.node4;
    }
  
    // Node descriptions
    const nodeDescs = document.querySelectorAll('.orbiting-node .node-description p');
    if (nodeDescs.length === 4) {
        nodeDescs[0].textContent = t.about.nodes.node1Desc;
        nodeDescs[1].textContent = t.about.nodes.node2Desc;
        nodeDescs[2].textContent = t.about.nodes.node3Desc;
        nodeDescs[3].textContent = t.about.nodes.node4Desc;
    }
  
    // Filter buttons
    const filterBtns = document.querySelectorAll('.filter-btn span:first-child');
    if (filterBtns.length === 5) {
        filterBtns[0].textContent = t.projects.filters.all;
        filterBtns[1].textContent = t.projects.filters.ecommerce;
        filterBtns[2].textContent = t.projects.filters.landing;
        filterBtns[3].textContent = t.projects.filters.app;
        filterBtns[4].textContent = t.projects.filters.clone;
    }
  
    // Skill levels
    const skillLevels = document.querySelectorAll('.skill-level');
    if (skillLevels.length === 3) {
        skillLevels[0].textContent = t.cv.skillLevels.advanced;
        skillLevels[1].textContent = t.cv.skillLevels.intermediate;
        skillLevels[2].textContent = t.cv.skillLevels.basic;
    }
  
    // Section titles
    const sectionTitles = document.querySelectorAll('.section-title');
    const titleMappings = [
        t.home.featuredProjects,
        t.home.skills,
        t.about.approachTitle,
        t.about.drivesTitle,
        t.cv.skills,
        t.cv.experience,
        t.cv.education
    ];
  
    sectionTitles.forEach((title, index) => {
        if (titleMappings[index]) {
            title.textContent = titleMappings[index];
            title.setAttribute('data-text', titleMappings[index]);
        }
    });
  
    // Download CV button
    const downloadBtn = document.querySelector('.cv-download-button .download-text');
    if (downloadBtn) {
        downloadBtn.textContent = t.cv.download;
    }
  }