document.addEventListener('DOMContentLoaded', () => {
    const cursor = document.querySelector('.custom-cursor');
    const interactiveElements = document.querySelectorAll('a, .nav-link');
    const bookTitle = document.querySelector('.book-section h2');
    
    const bookCover = document.createElement('div');
    bookCover.className = 'book-cover';
    document.body.appendChild(bookCover);


    const homeLinks = document.querySelectorAll('.big-link');
    const sectionImages = {
        'developer': ['fizzbuzz', 'discord', 'train', 'dropbox', 'pizza', 'flappy', 'puntoluce'],
        'music': ['malacarne', 'semeiosis'],
        'writer': ['a', 'Licitra', 'c', 'd'] 
    };

    homeLinks.forEach(link => {
        const section = link.getAttribute('data-page');
        if (sectionImages[section]) {
            let currentImageIndex = 0;
            let intervalId = null;
            let isTouching = false; 
            
            const hoverImage = document.createElement('div');
            hoverImage.className = 'project-hover-image';
            document.body.appendChild(hoverImage);
    
            // Gestore touch start
            link.addEventListener('touchstart', (e) => {
                isTouching = true;
                const touch = e.touches[0];
                hoverImage.style.opacity = '1';
                hoverImage.style.left = `${touch.clientX}px`;
                hoverImage.style.top = `${touch.clientY}px`;
                
                intervalId = setInterval(() => {
                    currentImageIndex = (currentImageIndex + 1) % sectionImages[section].length;
                    hoverImage.className = `project-hover-image ${sectionImages[section][currentImageIndex]}`;
                    hoverImage.classList.add('flicker');
                }, 400);
            });
    
            // Gestore touch end
            link.addEventListener('touchend', () => {
                isTouching = false;
                hoverImage.style.opacity = '0';
                hoverImage.classList.remove('flicker');
                if (intervalId) {
                    clearInterval(intervalId);
                    intervalId = null;
                }
                currentImageIndex = 0;
            });
    
            // Gestore touch cancel
            link.addEventListener('touchcancel', () => {
                isTouching = false;
                hoverImage.style.opacity = '0';
                hoverImage.classList.remove('flicker');
                if (intervalId) {
                    clearInterval(intervalId);
                    intervalId = null;
                }
                currentImageIndex = 0;
            });
    
            // Gestore touch move
            link.addEventListener('touchmove', (e) => {
                if (isTouching) {
                    const touch = e.touches[0];
                    hoverImage.style.left = `${touch.clientX}px`;
                    hoverImage.style.top = `${touch.clientY}px`;
                }
            });
    
            // Manteniamo gli eventi mouse solo per desktop
            if (!('ontouchstart' in window)) {
                link.addEventListener('mouseenter', (e) => {
                    hoverImage.style.opacity = '1';
                    intervalId = setInterval(() => {
                        currentImageIndex = (currentImageIndex + 1) % sectionImages[section].length;
                        hoverImage.className = `project-hover-image ${sectionImages[section][currentImageIndex]}`;
                        hoverImage.classList.add('flicker');
                    }, 400);
                });
    
                link.addEventListener('mousemove', (e) => {
                    hoverImage.style.left = e.clientX + 'px';
                    hoverImage.style.top = e.clientY + 'px';
                });
    
                link.addEventListener('mouseleave', () => {
                    hoverImage.style.opacity = '0';
                    hoverImage.classList.remove('flicker');
                    if (intervalId) {
                        clearInterval(intervalId);
                        intervalId = null;
                    }
                    currentImageIndex = 0;
                });
            }
        }
    });

    const styleSheet = document.styleSheets[0];
    styleSheet.insertRule(`
        .project-hover-image.a {
            background-image: url('a.png');
        }
    `, styleSheet.cssRules.length);
    styleSheet.insertRule(`
        .project-hover-image.Licitra {
            background-image: url('Licitra.png');
        }
    `, styleSheet.cssRules.length);
    styleSheet.insertRule(`
        .project-hover-image.c {
            background-image: url('c.png');
        }
    `, styleSheet.cssRules.length);
    styleSheet.insertRule(`
        .project-hover-image.d {
            background-image: url('d.png');
        }
    `, styleSheet.cssRules.length);
    styleSheet.insertRule(`
        .project-hover-image.puntoluce {
            background-image: url('puntoluce.png');
        }
    `, styleSheet.cssRules.length);

    homeLinks.forEach(link => {
        const section = link.getAttribute('data-page');
        if (sectionImages[section]) {
            let currentImageIndex = 0;
            let intervalId = null;
            
            const hoverImage = document.createElement('div');
            hoverImage.className = 'project-hover-image';
            document.body.appendChild(hoverImage);

            link.addEventListener('mouseenter', (e) => {
                hoverImage.style.opacity = '1';
                intervalId = setInterval(() => {
                    currentImageIndex = (currentImageIndex + 1) % sectionImages[section].length;
                    hoverImage.className = `project-hover-image ${sectionImages[section][currentImageIndex]}`;
                    hoverImage.classList.add('flicker');
                }, 400);
            });

            link.addEventListener('mousemove', (e) => {
                hoverImage.style.left = e.clientX + 'px';
                hoverImage.style.top = e.clientY + 'px';
            });

            link.addEventListener('mouseleave', () => {
                hoverImage.style.opacity = '0';
                hoverImage.classList.remove('flicker');
                if (intervalId) {
                    clearInterval(intervalId);
                    intervalId = null;
                }
                currentImageIndex = 0;
            });
        }
    });


    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';


    });
    
    if (bookTitle) {
        bookTitle.addEventListener('mousemove', (e) => {
            bookCover.style.left = e.clientX + 'px';
            bookCover.style.top = e.clientY + 'px';
            bookCover.style.opacity = '1';
            bookCover.classList.add('flicker');
            cursor.classList.add('flicker');
        });
        
        bookTitle.addEventListener('mouseleave', () => {
            bookCover.style.opacity = '0';
            bookCover.classList.remove('flicker');
            cursor.classList.remove('flicker');
        });
    }
    
    interactiveElements.forEach(element => {
        element.addEventListener('mouseenter', () => cursor.classList.add('hover'));
        element.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
    });
 
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.add('page-transition'));
 
    function navigateTo(pageId) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active', 'visible');
        });
        
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
            setTimeout(() => targetPage.classList.add('visible'), 100);
            
          
            const colors = {
                'home': 'white',
                'developer': '#FF4400',  
                'writer': '#FF007F',     
                'music': '#7CB518',      
                'about': '#00A6FB',    
                'cv': '#FFD23F',
                'contact': '#000000'          
            };
            
            document.body.style.backgroundColor = colors[pageId] || 'white';
            
            
            if (pageId === 'contact') {
                document.body.classList.add('light-text');
            } else {
                document.body.classList.remove('light-text');
            }
        }
    }
    
    document.addEventListener('click', (e) => {
        const target = e.target.closest('[data-page]');
        if (target) {
            e.preventDefault();
            navigateTo(target.dataset.page);
        }
    });
    
    document.addEventListener('mouseleave', () => cursor.style.opacity = '0');
    document.addEventListener('mouseenter', () => cursor.style.opacity = '1');
 
    const projectCards = document.querySelectorAll('.project-card h3, .music-project h2');
    const projectImages = {
        'Neon Snake': 'fizzbuzz',
        'Discord Clone': 'discord',
        'Train Ticket Form': 'train',
        'Dropbox Clone': 'dropbox',
        'Antico Stradello': 'pizza',
        'Flappy Bird': 'flappy',
        'MALACARNE(TMC Crew)': 'malacarne',  
        'JUAN LEE': 'semeiosis',
          'PuntoLuce': 'puntoluce'
    };
 
    projectCards.forEach(card => {
        const hoverImage = document.createElement('div');
        hoverImage.className = `project-hover-image ${projectImages[card.textContent]}`;
        document.body.appendChild(hoverImage);
    
        // Modifichiamo questa parte per gestire entrambi i tipi di container
        const projectArea = card.closest('.project-card') || card.closest('.music-project');
        
        projectArea.addEventListener('mousemove', (e) => {
            hoverImage.style.left = e.clientX + 'px';
            hoverImage.style.top = e.clientY + 'px';
            hoverImage.style.opacity = '1';
            hoverImage.classList.add('flicker');
            cursor.style.opacity = '0';
        });
    
        projectArea.addEventListener('mouseleave', () => {
            hoverImage.style.opacity = '0';
            hoverImage.classList.remove('flicker');
            cursor.style.opacity = '1';
        });
    });


    const criticalText = document.querySelector('.text-item h3');
    const textCover = document.createElement('div');
    textCover.className = 'text-cover';
    textCover.style.backgroundImage = "url('Licitra.png')";
    document.body.appendChild(textCover);

    criticalText.addEventListener('mousemove', (e) => {
    textCover.style.left = e.clientX + 'px';
    textCover.style.top = e.clientY + 'px';
    textCover.style.opacity = '1';
    textCover.classList.add('flicker');
    cursor.style.opacity = '0';
    });

    criticalText.addEventListener('mouseleave', () => {
    textCover.style.opacity = '0';
    textCover.classList.remove('flicker');
    cursor.style.opacity = '1';
    });


});


// Aggiungi questo codice in fondo al tuo script.js esistente, prima della chiusura

// Gestione transizione al mondo croissant
document.addEventListener('DOMContentLoaded', function() {
    const exploreButton = document.getElementById('explore-croissant');
    const exitButton = document.getElementById('exit-croissant');
    const writerPage = document.getElementById('writer');
    const croissantWorld = document.getElementById('croissant-world');
    
    if (exploreButton && exitButton && writerPage && croissantWorld) {
        // Entra nel mondo croissant
        exploreButton.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Nascondi la pagina writer
            writerPage.classList.remove('active', 'visible');
            
            // Mostra il mondo croissant
            croissantWorld.classList.add('active', 'visible');
            document.body.style.backgroundColor = '#000'; // Sfondo nero per il video
        });
        
        // Esci dal mondo croissant
        exitButton.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Nascondi il mondo croissant
            croissantWorld.classList.remove('active', 'visible');
            
            // Torna alla pagina writer
            writerPage.classList.add('active', 'visible');
            document.body.style.backgroundColor = '#FF007F'; // Ripristina il colore della pagina writer
        });
    }
});


// Add this code at the end of your existing script.js

// Particle effect for the Explore button
document.addEventListener('DOMContentLoaded', function() {
    const exploreButton = document.getElementById('explore-croissant');
    
    if (exploreButton) {
        // Create particles when mouse moves over the button
        exploreButton.addEventListener('mousemove', function(e) {
            createParticle(e, exploreButton);
        });
        
        // Create particles on touch for mobile devices
        exploreButton.addEventListener('touchmove', function(e) {
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            exploreButton.dispatchEvent(mouseEvent);
        });
        
        // Add pulse effect when page loads
        addPulseEffect(exploreButton);
    }
    
    // Glitch effect for Amazon Link
    const amazonLink = document.querySelector('.amazon-link');
    if (amazonLink) {
        amazonLink.addEventListener('mouseenter', function() {
            addGlitchEffect(amazonLink);
        });
        
        // Glitch effect on touch for mobile
        amazonLink.addEventListener('touchstart', function() {
            addGlitchEffect(amazonLink);
        });
    }
    
    // Enhance the overall writer section
    enhanceWriterSection();
});

// Function to create particles
function createParticle(e, parent) {
    const particle = document.createElement('span');
    particle.className = 'particle';
    
    const size = Math.floor(Math.random() * 10 + 5);
    const x = e.offsetX;
    const y = e.offsetY;
    
    // Position the particle at mouse/touch position
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    
    // Random colors for particles
    const colors = ['#FF4400', '#FF9500', '#FFBE0B', '#FFFFFF'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    particle.style.background = randomColor;
    
    // Add the particle to the button
    parent.appendChild(particle);
    
    // Animate the particle
    const destinationX = x + (Math.random() - 0.5) * 2 * 75;
    const destinationY = y + (Math.random() - 0.5) * 2 * 75;
    
    const animation = particle.animate([
        {
            transform: `translate(0, 0)`,
            opacity: 1
        },
        {
            transform: `translate(${destinationX - x}px, ${destinationY - y}px)`,
            opacity: 0
        }
    ], {
        duration: 1000 + Math.random() * 1000,
        easing: 'cubic-bezier(0, .9, .57, 1)',
        delay: Math.random() * 200
    });
    
    // Remove the particle when animation is complete
    animation.onfinish = function() {
        particle.remove();
    };
}

// Function to add a pulse effect to the button
function addPulseEffect(button) {
    let pulsing = false;
    
    // Add pulsing effect when the page is loaded
    setTimeout(() => {
        if (!pulsing) {
            pulsing = true;
            
            const pulse = button.animate([
                { transform: 'scale(1)', boxShadow: '0 5px 15px rgba(255, 68, 0, 0.2)' },
                { transform: 'scale(1.05)', boxShadow: '0 10px 25px rgba(255, 68, 0, 0.4)' },
                { transform: 'scale(1)', boxShadow: '0 5px 15px rgba(255, 68, 0, 0.2)' }
            ], {
                duration: 2000,
                iterations: 3,
                easing: 'ease-in-out'
            });
            
            pulse.onfinish = () => {
                pulsing = false;
                // Repeat the effect after a delay
                setTimeout(() => addPulseEffect(button), 5000);
            };
        }
    }, 1500);
}

// Function to add a glitch effect
function addGlitchEffect(element) {
    // Create a container for the effect
    const originalText = element.textContent;
    const originalColor = window.getComputedStyle(element).color;
    
    // Glitch sequence
    const glitchSequence = async () => {
        // First distortion
        element.style.transform = 'skew(2deg, 1deg)';
        element.style.color = '#00fffc';
        element.style.textShadow = '2px 0 #ff00c1, -2px 0 #ffff00';
        
        await delay(100);
        
        // Return to normal
        element.style.transform = 'skew(0)';
        element.style.color = originalColor;
        element.style.textShadow = 'none';
        
        await delay(50);
        
        // Second distortion
        element.style.transform = 'skew(-3deg, 2deg)';
        element.style.color = '#ff00c1';
        element.style.textShadow = '2px 0 #00fffc, -2px 0 #ffff00';
        
        await delay(80);
        
        // Final return to normal
        element.style.transform = 'skew(0)';
        element.style.color = originalColor;
        element.style.textShadow = 'none';
    };
    
    // Execute the effect
    glitchSequence();
}

// Utility function to create a delay
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to enhance the overall writer section
function enhanceWriterSection() {
    const writerSection = document.getElementById('writer');
    if (!writerSection) return;
    
    // Add a subtle movement to the section title when the page loads
    const title = writerSection.querySelector('h1');
    if (title) {
        title.style.opacity = '0';
        title.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            title.style.transition = 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
            title.style.opacity = '1';
            title.style.transform = 'translateY(0)';
        }, 300);
    }
    
    // Animation for the book section
    const bookSection = writerSection.querySelector('.book-section');
    if (bookSection) {
        bookSection.style.opacity = '0';
        bookSection.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            bookSection.style.transition = 'all 1s cubic-bezier(0.16, 1, 0.3, 1)';
            bookSection.style.opacity = '1';
            bookSection.style.transform = 'translateY(0)';
        }, 500);
    }
    
    // Animation for the critical texts section
    const criticalTexts = writerSection.querySelector('.critical-texts');
    if (criticalTexts) {
        criticalTexts.style.opacity = '0';
        criticalTexts.style.transform = 'translateY(40px)';
        
        setTimeout(() => {
            criticalTexts.style.transition = 'all 1.2s cubic-bezier(0.16, 1, 0.3, 1)';
            criticalTexts.style.opacity = '1';
            criticalTexts.style.transform = 'translateY(0)';
        }, 800);
    }
}



// Aggiungi questo codice alla fine del tuo file script.js

// Sistema di particelle interattivo per la homepage
function createInteractiveParticles() {
    // Assicurati di essere nella home page
    const homePage = document.getElementById('home');
    if (!homePage) return;
    
    // Crea il canvas per le particelle
    const particleCanvas = document.createElement('canvas');
    particleCanvas.id = 'particle-canvas';
    particleCanvas.style.position = 'fixed';
    particleCanvas.style.top = '0';
    particleCanvas.style.left = '0';
    particleCanvas.style.width = '100%';
    particleCanvas.style.height = '100%';
    particleCanvas.style.pointerEvents = 'none';
    particleCanvas.style.zIndex = '1';
    
    // Inserisci il canvas all'inizio del body
    document.body.insertBefore(particleCanvas, document.body.firstChild);
    
    // Configura il canvas
    const ctx = particleCanvas.getContext('2d');
    let width = window.innerWidth;
    let height = window.innerHeight;
    
    // Ridimensiona il canvas per il retina display
    particleCanvas.width = width * window.devicePixelRatio;
    particleCanvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    // Array delle particelle
    let particles = [];
    
    // Posizione del mouse
    let mouseX = width / 2;
    let mouseY = height / 2;
    
    // Classe per le particelle
    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.size = Math.random() * 2 + 1;
            this.baseX = this.x;
            this.baseY = this.y;
            this.density = Math.random() * 30 + 1;
            this.color = this.getRandomColor();
            this.distance = 100;
        }
        
        getRandomColor() {
            const colors = [
                'rgba(255, 68, 0, 0.7)',   // Il tuo arancione principale
                'rgba(255, 149, 0, 0.7)',  // Arancione chiaro
                'rgba(255, 210, 63, 0.7)', // Giallo
                'rgba(0, 166, 251, 0.7)',  // Blu
                'rgba(124, 181, 24, 0.7)'  // Verde
            ];
            return colors[Math.floor(Math.random() * colors.length)];
        }
        
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        }
        
        update() {
            // Calcola la distanza dal mouse
            const dx = mouseX - this.x;
            const dy = mouseY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Forza di respulsione in base alla distanza
            const forceDirectionX = dx / distance;
            const forceDirectionY = dy / distance;
            
            // Distanza massima per l'effetto
            const maxDistance = 200;
            const force = (maxDistance - distance) / maxDistance;
            
            // Applica la forza solo se entro la distanza massima
            if (distance < maxDistance) {
                this.x -= forceDirectionX * force * this.density;
                this.y -= forceDirectionY * force * this.density;
            } else {
                // Ritorna lentamente alla posizione originale
                if (this.x !== this.baseX) {
                    const dx = this.x - this.baseX;
                    this.x -= dx / 20;
                }
                if (this.y !== this.baseY) {
                    const dy = this.y - this.baseY;
                    this.y -= dy / 20;
                }
            }
            
            // Disegna la particella
            this.draw();
        }
    }
    
    // Inizializza le particelle
    function init() {
        particles = [];
        for (let i = 0; i < 150; i++) {
            particles.push(new Particle());
        }
    }
    
    // Anima le particelle
    function animate() {
        ctx.clearRect(0, 0, width, height);
        
        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
        }
        
        // Connetti le particelle vicine con linee
        connectParticles();
        
        requestAnimationFrame(animate);
    }
    
    // Connette le particelle vicine con linee
    function connectParticles() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 100) {
                    // Opacità in base alla distanza
                    const opacity = 1 - (distance / 100);
                    
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(255, 68, 0, ${opacity * 0.2})`;
                    ctx.lineWidth = 0.5;
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }
    }
    
    // Aggiorna la posizione del mouse
    window.addEventListener('mousemove', function(e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    
    // Gestisci il ridimensionamento della finestra
    window.addEventListener('resize', function() {
        width = window.innerWidth;
        height = window.innerHeight;
        particleCanvas.width = width * window.devicePixelRatio;
        particleCanvas.height = height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        init();
    });
    
    // Inizializza e avvia l'animazione
    init();
    animate();
}

// Crea l'effetto parallasse 3D per il portfolio
function create3DPortfolioEffect() {
    const projectCards = document.querySelectorAll('.project-card');
    if (!projectCards.length) return;
    
    projectCards.forEach(card => {
        // Aggiungi classe per l'effetto 3D
        card.classList.add('card-3d');
        
        // Crea un overlay per l'effetto glare
        const glareEffect = document.createElement('div');
        glareEffect.className = 'card-glare';
        card.appendChild(glareEffect);
        
        // Aggiungi l'effetto di inclinazione 3D al passaggio del mouse
        card.addEventListener('mousemove', function(e) {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Calcola la rotazione in base alla posizione del mouse
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateY = ((x - centerX) / centerX) * 10;
            const rotateX = ((centerY - y) / centerY) * 10;
            
            // Applica la trasformazione 3D
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
            
            // Posiziona l'effetto glare in base alla posizione del mouse
            const glareX = (x / rect.width) * 100;
            const glareY = (y / rect.height) * 100;
            glareEffect.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0) 80%)`;
        });
        
        // Resetta l'effetto quando il mouse esce
        card.addEventListener('mouseleave', function() {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
            glareEffect.style.background = 'none';
        });
        
        // Aggiungi comportamento touch per dispositivi mobili
        card.addEventListener('touchmove', function(e) {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = card.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateY = ((x - centerX) / centerX) * 10;
            const rotateX = ((centerY - y) / centerY) * 10;
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
        });
        
        card.addEventListener('touchend', function() {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
        });
    });
}

// Crea l'effetto futuristico per la timeline nella sezione About
function createFuturisticTimeline() {
    const timeline = document.querySelector('.timeline');
    if (!timeline) return;
    
    // Aggiungi classe per styling
    timeline.classList.add('timeline-futuristic');
    
    // Ottieni tutti gli elementi della timeline
    const timelineItems = timeline.querySelectorAll('.timeline-item');
    
    timelineItems.forEach((item, index) => {
        // Aggiungi classe per animazioni
        item.classList.add('timeline-item-futuristic');
        
        // Aggiungi delay crescente per effetto a cascata
        item.style.animationDelay = `${index * 0.2}s`;
        
        // Aggiungi elementi decorativi
        const connector = document.createElement('div');
        connector.className = 'timeline-connector';
        item.appendChild(connector);
        
        const pulse = document.createElement('div');
        pulse.className = 'timeline-pulse';
        item.querySelector('.time').appendChild(pulse);
        
        // Rendi interattivo ogni elemento
        item.addEventListener('mouseenter', function() {
            this.classList.add('active');
        });
        
        item.addEventListener('mouseleave', function() {
            this.classList.remove('active');
        });
    });
    
    // Aggiungi scroll animations
    window.addEventListener('scroll', function() {
        const timelineRect = timeline.getBoundingClientRect();
        if (timelineRect.top < window.innerHeight && timelineRect.bottom > 0) {
            timeline.classList.add('in-view');
            
            timelineItems.forEach((item, index) => {
                setTimeout(() => {
                    item.classList.add('animate-in');
                }, index * 200);
            });
        }
    });
}

// Avvia tutte le animazioni quando il documento è pronto
document.addEventListener('DOMContentLoaded', function() {
    createInteractiveParticles();
    create3DPortfolioEffect();
    createFuturisticTimeline();
});


// Aggiungi questo al tuo file script.js

// Funzione per attivare le funzionalità interattive del CV
function initializeInteractiveCV() {
    // Verifica che siamo nella pagina CV
    const cvPage = document.getElementById('cv');
    if (!cvPage) return;
    
    // Aggiungi gli attributi data-text ai titoli per l'effetto glitch
    const titles = cvPage.querySelectorAll('h1, h2');
    titles.forEach(title => {
        title.setAttribute('data-text', title.textContent);
    });
    
    // Animazione per le barre delle competenze
    const skillGraph = document.querySelector('.skill-graph');
    if (skillGraph) {
        // Quando la sezione diventa visibile, avvia l'animazione
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    skillGraph.classList.add('in-view');
                    
                    // Imposta la larghezza di ogni barra in base al valore specificato
                    const progressBars = skillGraph.querySelectorAll('.skill-progress');
                    progressBars.forEach(bar => {
                        const width = bar.style.width;
                        bar.style.setProperty('--progress-width', width);
                    });
                    
                    // Interrompi l'osservazione una volta attivata
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });
        
        observer.observe(skillGraph);
    }
    
    // Gestione dei controlli della timeline
    const timelineControls = document.querySelectorAll('.timeline-control');
    const timelinePanels = document.querySelectorAll('.timeline-panel');
    
    timelineControls.forEach(control => {
        control.addEventListener('click', function() {
            // Rimuovi la classe active da tutti i controlli
            timelineControls.forEach(btn => {
                btn.style.background = 'transparent';
                btn.style.color = 'black';
                btn.style.borderColor = 'rgba(0, 0, 0, 0.1)';
                btn.style.boxShadow = 'none';
            });
            
            // Aggiungi stile active al controllo cliccato
            this.style.background = '#FF4400';
            this.style.color = 'white';
            this.style.borderColor = '#FF4400';
            this.style.boxShadow = '0 5px 15px rgba(255, 68, 0, 0.2)';
            
            // Nascondi tutti i pannelli
            timelinePanels.forEach(panel => {
                panel.classList.remove('active');
            });
            
            // Mostra il pannello corrispondente
            const year = this.getAttribute('data-year');
            const targetPanel = document.querySelector(`.timeline-panel[data-year="${year}"]`);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    });
    
    // Effetto hover 3D sui blocchi di educazione e approccio
    const educationBlock = document.querySelector('.education-block');
    const approachBlock = document.querySelector('.approach-block');
    
    [educationBlock, approachBlock].forEach(block => {
        if (!block) return;
        
        block.addEventListener('mousemove', function(e) {
            const rect = block.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Calcola la rotazione in base alla posizione del mouse
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateY = ((x - centerX) / centerX) * 5;
            const rotateX = ((centerY - y) / centerY) * 5;
            
            // Applica la trasformazione 3D
            block.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
            
            // Effetto ombra dinamica
            block.style.boxShadow = `
                ${-rotateY / 2}px ${rotateX / 2}px 20px rgba(0, 0, 0, 0.1),
                0 10px 20px rgba(0, 0, 0, 0.03)
            `;
        });
        
        block.addEventListener('mouseleave', function() {
            block.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
            block.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.03)';
        });
    });
    
    // Animazione al click sul pulsante di download
    const downloadButton = document.querySelector('.cv-download-button');
    if (downloadButton) {
        downloadButton.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Crea un effetto di clic
            this.style.transform = 'translateY(3px)';
            setTimeout(() => {
                this.style.transform = 'translateY(-5px)';
            }, 200);
            
            // Qui puoi aggiungere la logica per il download effettivo del CV
            // Per esempio:
            // window.location.href = 'path/to/your/cv.pdf';
            
            // Oppure mostra un messaggio
            alert('CV download functionality will be implemented soon!');
        });
    }
    
    // Effetto di evidenziazione al passaggio del mouse sui job highlights
    const jobHighlights = document.querySelectorAll('.job-highlights li');
    jobHighlights.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.transform = 'translateX(5px)';
            this.style.color = '#FF4400';
            this.style.transition = 'all 0.3s ease';
        });
        
        item.addEventListener('mouseleave', function() {
            this.style.transform = 'translateX(0)';
            this.style.color = '';
        });
    });
    
    // Effetto particellare sui tech tag
    const techTags = document.querySelectorAll('.tech-tag');
    techTags.forEach(tag => {
        tag.addEventListener('mouseenter', function() {
            createParticles(this);
        });
    });
    
    function createParticles(element) {
        // Crea 5 particelle
        for (let i = 0; i < 5; i++) {
            const particle = document.createElement('span');
            particle.className = 'tag-particle';
            
            // Stile della particella
            particle.style.position = 'absolute';
            particle.style.width = '5px';
            particle.style.height = '5px';
            particle.style.background = '#FF4400';
            particle.style.borderRadius = '50%';
            particle.style.pointerEvents = 'none';
            
            // Posizione iniziale (centro dell'elemento)
            const rect = element.getBoundingClientRect();
            const x = rect.width / 2;
            const y = rect.height / 2;
            
            // Aggiungi al tag
            element.style.position = 'relative';
            element.style.overflow = 'visible';
            element.appendChild(particle);
            
            // Animazione
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 30 + 10;
            const moveX = Math.cos(angle) * speed;
            const moveY = Math.sin(angle) * speed;
            
            // GSAP animation o vanilla JS animation
            particle.animate([
                { 
                    transform: `translate(${x}px, ${y}px) scale(1)`,
                    opacity: 1
                },
                { 
                    transform: `translate(${x + moveX}px, ${y + moveY}px) scale(0)`,
                    opacity: 0
                }
            ], {
                duration: 1000,
                easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
            }).onfinish = function() {
                particle.remove();
            };
        }
    }
}

// Esegui l'inizializzazione quando il documento è pronto
document.addEventListener('DOMContentLoaded', function() {
    initializeInteractiveCV();
    
    // Gestisci anche il cambiamento di pagina se utilizzi una SPA
    const navLinks = document.querySelectorAll('[data-page]');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            // Verifica dopo un breve ritardo se siamo nella pagina CV
            setTimeout(initializeInteractiveCV, 100);
        });
    });
});