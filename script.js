document.addEventListener('DOMContentLoaded', () => {
    const cursor = document.querySelector('.custom-cursor');
    const interactiveElements = document.querySelectorAll('a, .nav-link');
    const bookTitle = document.querySelector('.book-section h2');
    
    const bookCover = document.createElement('div');
    bookCover.className = 'book-cover';
    document.body.appendChild(bookCover);


    const homeLinks = document.querySelectorAll('.big-link');
    const sectionImages = {
        'developer': ['fizzbuzz', 'discord', 'train', 'dropbox', 'pizza', 'flappy'],
        'music': ['malacarne', 'semeiosis'],
        'writer': ['a', 'Licitra'] 
    };

    homeLinks.forEach(link => {
        const section = link.getAttribute('data-page');
        if (sectionImages[section]) {
            let currentImageIndex = 0;
            let intervalId = null;
            let isTouching = false; // Aggiungiamo questa variabile per tracciare lo stato del touch
            
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
        'JUAN LEE': 'semeiosis'
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