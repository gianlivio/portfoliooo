document.addEventListener('DOMContentLoaded', () => {
  // Funzione per gestire la terminazione automatica degli hover
  function setupAutoHoverEnd() {
      // Elementi che possono avere effetti hover persistenti
      const hoverElements = document.querySelectorAll('.project-card, .social-item, .big-link, .book-section h2, .nav-link, .timeline-item, .skill-item');
      
      // Timer per tenere traccia di ogni elemento con hover attivo
      const hoverTimers = new Map();
      
      // Durata dell'hover prima della terminazione automatica (3 secondi)
      const hoverDuration = 3000;
      
      hoverElements.forEach(element => {
          // Quando il mouse entra nell'elemento
          element.addEventListener('mouseenter', () => {
              // Aggiungi una classe di hover
              element.classList.add('hover-active');
              
              // Imposta un timer per rimuovere l'hover dopo 3 secondi
              const timerId = setTimeout(() => {
                  element.classList.remove('hover-active');
                  // Rimuovi anche eventuali stili inline aggiunti da script
                  element.style.transform = '';
                  
                  // Gestisci anche le immagini hover associate
                  const hoverImages = document.querySelectorAll('.project-hover-image, .book-cover, .text-cover');
                  hoverImages.forEach(img => {
                      img.style.opacity = '0';
                      if (img.classList.contains('flicker')) {
                          img.classList.remove('flicker');
                      }
                  });
                  
                  // Rimuovi il timer dalla mappa
                  hoverTimers.delete(element);
              }, hoverDuration);
              
              // Salva il riferimento al timer
              hoverTimers.set(element, timerId);
          });
          
          // Quando il mouse esce dall'elemento, cancella il timer
          element.addEventListener('mouseleave', () => {
              element.classList.remove('hover-active');
              
              // Cancella il timer se esiste
              if (hoverTimers.has(element)) {
                  clearTimeout(hoverTimers.get(element));
                  hoverTimers.delete(element);
              }
          });
      });
      
      // Gestisci il caso di immagini hover che potrebbero rimanere visualizzate
      const hoverImages = document.querySelectorAll('.project-hover-image, .book-cover, .text-cover');
      hoverImages.forEach(img => {
          // Timer per ogni immagine hover
          let imgTimer = null;
          
          // Quando l'immagine viene mostrata
          const observer = new MutationObserver((mutations) => {
              mutations.forEach(mutation => {
                  if (mutation.attributeName === 'style' && 
                      img.style.opacity !== '0' && 
                      img.style.opacity !== '') {
                      
                      // Cancella eventuali timer precedenti
                      if (imgTimer) clearTimeout(imgTimer);
                      
                      // Imposta un nuovo timer
                      imgTimer = setTimeout(() => {
                          img.style.opacity = '0';
                          if (img.classList.contains('flicker')) {
                              img.classList.remove('flicker');
                          }
                      }, hoverDuration);
                  }
              });
          });
          
          // Inizia a osservare le modifiche all'attributo style
          observer.observe(img, { attributes: true });
      });
      
      // Rimuovi tutti gli effetti hover quando cambi pagina
      const pageLinks = document.querySelectorAll('[data-page]');
      pageLinks.forEach(link => {
          link.addEventListener('click', () => {
              // Rimuovi tutti gli hover attivi
              document.querySelectorAll('.hover-active').forEach(el => {
                  el.classList.remove('hover-active');
                  el.style.transform = '';
              });
              
              // Nascondi tutte le immagini hover
              document.querySelectorAll('.project-hover-image, .book-cover, .text-cover').forEach(img => {
                  img.style.opacity = '0';
                  if (img.classList.contains('flicker')) {
                      img.classList.remove('flicker');
                  }
              });
              
              // Cancella tutti i timer
              hoverTimers.forEach((timerId, element) => {
                  clearTimeout(timerId);
              });
              hoverTimers.clear();
          });
      });
  }
  
  // Avvia la gestione degli hover
  setupAutoHoverEnd();
});

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
            'home': '#f5f7fa',
            'developer': 'linear-gradient(140deg, #fb923c 0%, #ea580c 100%)',
            'writer': 'linear-gradient(140deg, #f9a8d4 0%, #ec4899 100%)',
            'music': 'linear-gradient(140deg, #2563eb 0%, #60a5fa 100%)',
            'about': 'linear-gradient(140deg, #e0f2fe 0%, #7dd3fc 100%)',
            'cv': 'linear-gradient(140deg, #7c3aed 0%, #a855f7 100%)',
            'contact': 'linear-gradient(140deg, #1a202c 0%, #2d3748 100%)'
        };
        document.body.style.background = colors[pageId] || 'white';
        document.body.style.backgroundAttachment = 'fixed';
        document.body.style.backgroundSize = 'cover';
          
          
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
      'PuntoLuce': 'puntoluce',
      'Studio Dentistico': 'dentista',
      'Studio Psicologi': 'psicologi',
      'Gestione via Noce': 'casacampagna',  
      'Agenzia Immobiliare Bologna': 'bologna' 
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
          // Manteniamo il link predefinito funzionante (non serve preventDefault)
          
          // Crea un effetto di clic
          this.style.transform = 'translateY(3px)';
          setTimeout(() => {
              this.style.transform = 'translateY(-5px)';
          }, 200);
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




// Aggiungi questo al tuo file script.js

// Funzione per inizializzare la sezione About interattiva
function initializeInteractiveAbout() {
  // Verifica che siamo nella pagina About
  const aboutPage = document.getElementById('about');
  if (!aboutPage) return;
  
  // Aggiungi attributi data-text ai titoli per l'effetto glitch
  const titles = aboutPage.querySelectorAll('h1, h2');
  titles.forEach(title => {
      if (!title.getAttribute('data-text')) {
          title.setAttribute('data-text', title.textContent);
      }
  });
  
  // Inizializza la visualizzazione della filosofia
  initPhilosophyVisualizer();
  
  // Inizializza l'effetto matrix
  initMatrixEffect();
  
  // Gestisci l'interazione con i nodi della filosofia
  setupNodeInteractions();
}

// Funzione per inizializzare il visualizzatore di filosofia
function initPhilosophyVisualizer() {
  const centralNode = document.getElementById('central-node');
  if (!centralNode) return;
  
  // Crea connessioni tra i nodi
  updateConnections();
  
  // Aggiungi animazione al nodo centrale
  centralNode.addEventListener('mouseover', function() {
      // Effetto pulse sul nodo centrale
      this.style.transform = 'translate(-50%, -50%) scale(1.1)';
      this.style.boxShadow = '0 0 30px rgba(255, 68, 0, 0.3)';
      
      // Attiva tutti i nodi orbitanti
      const orbitingNodes = document.querySelectorAll('.orbiting-node');
      orbitingNodes.forEach(node => {
          node.style.boxShadow = '0 10px 25px rgba(255, 68, 0, 0.2)';
      });
      
      // Intensifica le connessioni
      const connections = document.querySelectorAll('.connection');
      connections.forEach(conn => {
          conn.style.stroke = 'rgba(255, 68, 0, 0.4)';
          conn.style.strokeWidth = '3';
      });
  });
  
  centralNode.addEventListener('mouseout', function() {
      this.style.transform = 'translate(-50%, -50%)';
      this.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.08)';
      
      // Ripristina i nodi orbitanti
      const orbitingNodes = document.querySelectorAll('.orbiting-node');
      orbitingNodes.forEach(node => {
          node.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.08)';
      });
      
      // Ripristina le connessioni
      const connections = document.querySelectorAll('.connection');
      connections.forEach(conn => {
          conn.style.stroke = 'rgba(255, 68, 0, 0.2)';
          conn.style.strokeWidth = '2';
      });
  });
  
  // Aggiungi movimento orbitale ai nodi
  animateOrbitingNodes();
}

// Funzione per aggiornare le connessioni SVG tra i nodi
function updateConnections() {
  const centralNode = document.getElementById('central-node');
  const node1 = document.getElementById('node-1');
  const node2 = document.getElementById('node-2');
  const node3 = document.getElementById('node-3');
  const node4 = document.getElementById('node-4');
  
  if (!centralNode || !node1 || !node2 || !node3 || !node4) return;
  
  // Ottieni le posizioni dei nodi
  const centralRect = centralNode.getBoundingClientRect();
  const centralX = centralRect.left + centralRect.width / 2;
  const centralY = centralRect.top + centralRect.height / 2;
  
  // Ottieni le posizioni relative al contenitore
  const container = document.querySelector('.node-container');
  const containerRect = container.getBoundingClientRect();
  
  // Calcola le coordinate relative
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

// Funzione per aggiornare un singolo percorso SVG
function updatePath(id, x1, y1, x2, y2) {
  const path = document.getElementById(id);
  if (!path) return;
  
  // Crea un percorso curvo
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
  
  const centralRect = centralNode.getBoundingClientRect();
  const centralX = centralRect.left + centralRect.width / 2;
  const centralY = centralRect.top + centralRect.height / 2;
  
  const orbitingNodes = document.querySelectorAll('.orbiting-node');
  
  // Assegna una posizione orbitale casuale a ciascun nodo
  orbitingNodes.forEach((node, index) => {
      const orbit = parseInt(node.getAttribute('data-orbit')) || 1;
      const angle = (index * Math.PI / 2) + (Math.random() * 0.2);
      const radius = 150 + (orbit * 20);
      const speed = 0.0001 + (Math.random() * 0.0001);
      
      // Assegna attributi personalizzati per l'animazione
      node.setAttribute('data-angle', angle);
      node.setAttribute('data-radius', radius);
      node.setAttribute('data-speed', speed);
  });
  
  // Avvia l'animazione
  let lastTime = 0;
  function animateNodes(timestamp) {
      if (!lastTime) lastTime = timestamp;
      const deltaTime = timestamp - lastTime;
      lastTime = timestamp;
      
      orbitingNodes.forEach(node => {
          let angle = parseFloat(node.getAttribute('data-angle'));
          const radius = parseFloat(node.getAttribute('data-radius'));
          const speed = parseFloat(node.getAttribute('data-speed'));
          
          // Aggiorna l'angolo in base al tempo trascorso
          angle += speed * deltaTime;
          node.setAttribute('data-angle', angle);
          
          // Calcola la nuova posizione
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          
          // Applica la nuova posizione
          const nodeRect = node.getBoundingClientRect();
          const containerRect = document.querySelector('.philosophy-canvas').getBoundingClientRect();
          
          const centerX = containerRect.width / 2;
          const centerY = containerRect.height / 2;
          
          node.style.left = `${centerX + x - nodeRect.width / 2}px`;
          node.style.top = `${centerY + y - nodeRect.height / 2}px`;
      });
      
      // Aggiorna le connessioni SVG
      updateConnections();
      
      // Continua l'animazione
      if (document.querySelector('.philosophy-canvas')) {
          requestAnimationFrame(animateNodes);
      }
  }
  
  requestAnimationFrame(animateNodes);
}

// Funzione per gestire l'interazione con i nodi
function setupNodeInteractions() {
  const nodes = document.querySelectorAll('.philosophy-node');
  
  nodes.forEach(node => {
      // Aggiungi effetto hover avanzato
      node.addEventListener('mouseenter', function() {
          // Evidenzia questo nodo
          this.style.zIndex = 20;
          
          // Crea effetto ripple
          const ripple = document.createElement('div');
          ripple.className = 'node-ripple';
          ripple.style.position = 'absolute';
          ripple.style.top = '50%';
          ripple.style.left = '50%';
          ripple.style.transform = 'translate(-50%, -50%)';
          ripple.style.width = '10px';
          ripple.style.height = '10px';
          ripple.style.borderRadius = '50%';
          ripple.style.background = 'rgba(255, 68, 0, 0.2)';
          ripple.style.pointerEvents = 'none';
          
          this.appendChild(ripple);
          
          // Anima il ripple
          ripple.animate([
              { width: '10px', height: '10px', opacity: 1 },
              { width: '100px', height: '100px', opacity: 0 }
          ], {
              duration: 1000,
              easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
          }).onfinish = () => ripple.remove();
      });
      
      node.addEventListener('mouseleave', function() {
          // Ripristina z-index
          setTimeout(() => {
              this.style.zIndex = this.classList.contains('central-node') ? 10 : 1;
          }, 300);
      });
  });
}

// Funzione per inizializzare l'effetto Matrix
function initMatrixEffect() {
  const canvas = document.getElementById('matrix-canvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // Imposta le dimensioni del canvas
  const resizeCanvas = () => {
      const container = canvas.parentElement;
      canvas.width = container.offsetWidth;
      canvas.height = container.offsetHeight;
  };
  
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  // Caratteri per l'effetto matrix
  const chars = '01';
  const fontSize = 14;
  const columns = Math.ceil(canvas.width / fontSize);
  
  // Array per tenere traccia della posizione Y di ciascuna colonna
  const drops = Array(columns).fill(1);
  
  // Codice per disegnare l'effetto matrix
  function drawMatrix() {
      // Trasparenza dello sfondo per creare l'effetto trail
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Colore e font dei caratteri
      ctx.fillStyle = 'rgba(255, 68, 0, 0.3)';
      ctx.font = `${fontSize}px monospace`;
      
      // Loop per ogni goccia
      for (let i = 0; i < drops.length; i++) {
          // Carattere casuale
          const char = chars.charAt(Math.floor(Math.random() * chars.length));
          
          // Disegna il carattere
          ctx.fillText(char, i * fontSize, drops[i] * fontSize);
          
          // Incrementa Y, e resetta casualmente
          if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
              drops[i] = 0;
          }
          
          // Incrementa con probabilità casuale
          if (Math.random() > 0.5) {
              drops[i]++;
          }
      }
  }
  
  // Avvia l'animazione
  let matrixInterval = setInterval(drawMatrix, 80);
  
  // Fermati quando la pagina non è più visibile
  document.addEventListener('visibilitychange', function() {
      if (document.hidden) {
          clearInterval(matrixInterval);
      } else {
          matrixInterval = setInterval(drawMatrix, 80);
      }
  });
}

// Esegui l'inizializzazione quando il documento è pronto
document.addEventListener('DOMContentLoaded', function() {
  initializeInteractiveAbout();
  
  // Gestisci anche il cambiamento di pagina
  const navLinks = document.querySelectorAll('[data-page]');
  navLinks.forEach(link => {
      link.addEventListener('click', function() {
          // Verifica dopo un breve ritardo se siamo nella pagina About
          setTimeout(initializeInteractiveAbout, 100);
      });
  });
  
  // Assicurati che la finestra di ridimensionamento aggiorni le connessioni
  window.addEventListener('resize', function() {
      if (document.getElementById('about').classList.contains('active')) {
          updateConnections();
      }
  });
});



document.addEventListener('DOMContentLoaded', () => {
  // 1. Definizione completa delle traduzioni
  const translations = {
    en: {
      navigation: {
        about: 'ABOUT',
        contact: 'CONTACT',
        webDev: 'WEB DEVELOPER /',
        writer: 'WRITER /',
        soundMaster: 'SOUND MASTER /',
        cv: 'CV',
      
      },
      home: {
        links: [
          'WEB DEVELOPER /',
          'WRITER /',
          'SOUND MASTER /',
          'CV'
        ]
      },
      about: {
        title: 'ABOUT',
        subtitle: 'Creative Developer with Semiotic Insight',
        intro: [
          'I bridge the gap between technical solutions and human understanding, creating digital experiences that communicate on multiple levels.',
          "My background in Umberto Eco's Semiotics shapes how I approach every development challenge – decoding the layers of meaning that shape user interactions."
        ],
        approachTitle: 'MY APPROACH',
        approachHint: 'Interact with the nodes',
        nodes: {
          central: 'Creative Development',
          node1: {
            label: 'Problem Solving',
            title: 'Analytical & Creative',
            text: 'Approaching challenges with precision and insight, finding solutions at the intersection of logic and creativity.'
          },
          node2: {
            label: 'Human-Centric',
            title: 'User-Focused Design',
            text: 'Balancing technical excellence with genuine understanding of user needs and expectations.'
          },
          node3: {
            label: 'Cross-Disciplinary',
            title: 'Bridging Worlds',
            text: 'Merging development expertise with communication theory to create richer digital experiences.'
          },
          node4: {
            label: 'Meaning-Oriented',
            title: 'Semiotic Approach',
            text: 'Applying semiotic principles to create interfaces and systems that communicate clearly and effectively.'
          }
        },
        whatDrivesMe: 'WHAT DRIVES ME',
        passions: {
          codeTitle: 'Clean, Meaningful Code',
          codeDesc: 'Finding elegance in simplicity and clarity. Writing code that other developers can understand and build upon.',
          commTitle: 'Digital Communication',
          commDesc: 'Creating interfaces and experiences that speak clearly to users on multiple cognitive levels.',
          evolveTitle: 'Continuous Evolution',
          evolveDesc: 'Embracing new technologies and methodologies, constantly refining my skills and approach.'
        },
        connectLead: 'Interested in my professional journey and skills?',
        connectBtn: 'Explore my CV'
      },
      contact: {
        title: 'CONTACT',
        lead: "Let's create something meaningful together.",
        locationLabel: 'Location',
        locationValue: '40128, Bologna, Italy',
        emailLabel: 'Email',
        phoneLabel: 'Phone',
        connect: 'CONNECT',
        social: {
          github: 'GitHub',
          linkedin: 'LinkedIn',
          soundcloud: 'SoundCloud'
        }
      },
      developer: {
        title: 'WEB DEVELOPMENT',
        descriptionLine1: 'FRONTEND / BACKEND / UI-UX / API DEVELOPMENT',
        descriptionLine2: 'MODERN FRAMEWORKS / CUSTOM SOLUTIONS',
        projects: [
          {
            name: 'PuntoLuce',
            desc: 'New e-commerce website built with Open2b',
            linkText: 'View Project'
          },
          {
            name: 'Neon Snake',
            desc: 'Interactive game implementation',
            linkText: 'View Project'
          },
          {
            name: 'Flappy Bird',
            desc: 'Recreation of the classic mobile game',
            linkText: 'View Project'
          },
          {
            name: 'Discord Clone',
            desc: 'Recreation of the Discord interface',
            linkText: 'View Project'
          },
          {
            name: 'Train Ticket Form',
            desc: 'Interactive ticket booking form',
            linkText: 'View Project'
          },
          {
            name: 'Dropbox Clone',
            desc: 'Clone of the Dropbox interface',
            linkText: 'View Project'
          },
          {
            name: 'Antico Stradello',
            desc: 'Website for a historic pizzeria',
            linkText: 'View Project'
          }
        ]
      },
      writer: {
        title: 'PUBLICATIONS',
        croissantTitle: 'Sottilissimi Strati di un Enorme Croissant',
        croissantDesc:
          'To those who seek to see beyond the immediate. To the dreamers who inhabit the spaces between words.',
        exploreBtn: 'EXPLORE COLLECTION',
        buyAmazon: 'BUY ON AMAZON',
        criticalTexts: 'CRITICAL TEXTS',
        licitraTitle: 'Hell ends in Hell - Nanni Licitra',
        licitraDesc: 'Ragusa Foto Festival Award 2021',
        backBtn: 'BACK TO PUBLICATIONS'
      },
      cv: {
        title: 'CURRICULUM',
        subtitle: 'Full Stack Developer with Semiotic Background',
        quote:
          '"Problem solver with a humanistic soul. Bringing together technical expertise and human understanding to create meaningful digital solutions."',
        techExpertise: 'TECHNICAL EXPERTISE',
        skillLevels: {
          advanced: 'Advanced',
          intermediate: 'Intermediate',
          basic: 'Basic'
        },
        profJourney: 'PROFESSIONAL JOURNEY',
        educationApproach: 'EDUCATION & APPROACH',
        mastersDegree: "Master's in Semiotics",
        mastersInstitution: "University of Bologna - Umberto Eco's School",
        mastersGrade: 'Grade: 108/110',
        mastersNote: 'Unique perspective on meaning-making and communication, enriching every aspect of digital development and user interaction',
        fullstack: 'Full Stack Development',
        fullstackWhere: 'Boolean',
        fullstackYear: '2023',
        profPhilosophy: 'Professional Philosophy',
        profPhilosophyText:
          'Combining technical excellence with human understanding. Leading teams with empathy and precision, ensuring both technical quality and team wellbeing.',
        approachBullets: [
          'Bringing semiotic analysis to digital problems',
          'Bridging technical and humanistic perspectives',
          'Continuous learning and adaptation'
        ],
        downloadBtn: 'Download Full CV'
      },
      music: {
        title: 'MUSIC',
        malacarneTitle: 'MALACARNE(TMC Crew)',
        malacarneDesc: 'Tekno/Acid/HeavyMental',
        malacarneSoundcloud: 'SoundCloud',
        juanleeTitle: 'JUAN LEE',
        juanleeAlbum: 'SEMEIOSIS',
        juanleeAlbumDesc: 'Conceptual Album exploring sound and meaning',
        signification: 'SIGNIFIATION - Music Video',
        listenOn: 'LISTEN ON',
        platforms: {
          soundcloud: 'SoundCloud',
          spotify: 'Spotify',
          apple: 'Apple Music',
          deezer: 'Deezer',
          qobuz: 'Qobuz'
        }
      },
      footer: {
        github: 'GITHUB',
        linkedin: 'LINKEDIN',
        email: 'EMAIL'
      }
    },

    /* -----------------------------------------------------------
       ITALIANO
    ----------------------------------------------------------- */
    it: {
      navigation: {
        about: 'CHI SONO',
        contact: 'CONTATTI',
        webDev: 'SVILUPPATORE WEB /',
        writer: 'SCRITTORE /',
        soundMaster: 'MAESTRO DEL SUONO /',
        cv: 'CV',
       
      },
      home: {
        links: [
          'SVILUPPATORE WEB /',
          'SCRITTORE /',
          'MAESTRO DEL SUONO /',
          'CV'
        ]
      },
      about: {
        title: 'CHI SONO',
        subtitle: 'Sviluppatore Creativo con Competenze Semiotiche',
        intro: [
          'Colmo il divario tra soluzioni tecniche e comprensione umana, creando esperienze digitali che comunicano a più livelli.',
          'La mia formazione nella Semiotica di Umberto Eco plasma il mio approccio a ogni sfida di sviluppo – decodificando gli strati di significato che determinano le interazioni degli utenti.'
        ],
        approachTitle: 'IL MIO APPROCCIO',
        approachHint: 'Interagisci con i nodi',
        nodes: {
          central: 'Sviluppo Creativo',
          node1: {
            label: 'Problem Solving',
            title: 'Analitico & Creativo',
            text: 'Affronto le sfide con precisione e intuizione, trovando soluzioni all’incrocio tra logica e creatività.'
          },
          node2: {
            label: 'Centrato sull’Umano',
            title: 'Design Focalizzato sull’Utente',
            text: 'Equilibrare l’eccellenza tecnica con la comprensione autentica di bisogni ed aspettative dell’utente.'
          },
          node3: {
            label: 'Cross-Disciplinare',
            title: 'Connessione di Mondi',
            text: 'Fondere competenze di sviluppo con la teoria della comunicazione per creare esperienze digitali più ricche.'
          },
          node4: {
            label: 'Orientato al Significato',
            title: 'Approccio Semiotico',
            text: 'Applicare principi semiotici per realizzare interfacce e sistemi che comunicano in modo chiaro ed efficace.'
          }
        },
        whatDrivesMe: 'COSA MI GUIDA',
        passions: {
          codeTitle: 'Codice Pulito e Significativo',
          codeDesc: 'Ricercare l’eleganza nella semplicità e nella chiarezza. Scrivere codice che altri sviluppatori possano comprendere e migliorare.',
          commTitle: 'Comunicazione Digitale',
          commDesc: 'Creare interfacce ed esperienze che parlino chiaramente agli utenti su più livelli cognitivi.',
          evolveTitle: 'Evoluzione Continua',
          evolveDesc: 'Abbracciare nuove tecnologie e metodologie, perfezionando costantemente competenze e approccio.'
        },
        connectLead: 'Interessato al mio percorso professionale e alle mie competenze?',
        connectBtn: 'Scopri il mio CV'
      },
      contact: {
        title: 'CONTATTI',
        lead: 'Creiamo qualcosa di significativo insieme.',
        locationLabel: 'Posizione',
        locationValue: '40128, Bologna, Italia',
        emailLabel: 'Email',
        phoneLabel: 'Telefono',
        connect: 'CONNETTI',
        social: {
          github: 'GitHub',
          linkedin: 'LinkedIn',
          soundcloud: 'SoundCloud'
        }
      },
      developer: {
        title: 'SVILUPPO WEB',
        descriptionLine1: 'FRONTEND / BACKEND / UI-UX / SVILUPPO API',
        descriptionLine2: 'FRAMEWORK MODERNI / SOLUZIONI PERSONALIZZATE',
        projects: [
          {
            name: 'PuntoLuce',
            desc: 'Nuovo sito e-commerce realizzato con Open2b',
            linkText: 'Vedi Progetto'
          },
          {
            name: 'Neon Snake',
            desc: 'Implementazione di un gioco interattivo',
            linkText: 'Vedi Progetto'
          },
          {
            name: 'Flappy Bird',
            desc: 'Ricreazione del classico gioco mobile',
            linkText: 'Vedi Progetto'
          },
          {
            name: 'Discord Clone',
            desc: "Ricostruzione dell'interfaccia di Discord",
            linkText: 'Vedi Progetto'
          },
          {
            name: 'Train Ticket Form',
            desc: 'Form interattivo per la prenotazione di biglietti',
            linkText: 'Vedi Progetto'
          },
          {
            name: 'Dropbox Clone',
            desc: "Clone dell'interfaccia di Dropbox",
            linkText: 'Vedi Progetto'
          },
          {
            name: 'Antico Stradello',
            desc: 'Sito web per una pizzeria storica',
            linkText: 'Vedi Progetto'
          }
        ]
      },
      writer: {
        title: 'PUBBLICAZIONI',
        croissantTitle: 'Sottilissimi Strati di un Enorme Croissant',
        croissantDesc:
          "A chi cerca di vedere oltre l’immediato. Ai sognatori che abitano gli spazi tra le parole.",
        exploreBtn: 'ESPLORA LA COLLEZIONE',
        buyAmazon: 'ACQUISTA SU AMAZON',
        criticalTexts: 'TESTI CRITICI',
        licitraTitle: 'Hell ends in Hell - Nanni Licitra',
        licitraDesc: 'Ragusa Foto Festival Award 2021',
        backBtn: 'TORNA ALLE PUBBLICAZIONI'
      },
      cv: {
        title: 'CURRICULUM',
        subtitle: 'Full Stack Developer con Background Semiotico',
        quote:
          '"Problem solver con un’anima umanistica. Unisco competenze tecniche e comprensione umana per creare soluzioni digitali significative."',
        techExpertise: 'COMPETENZE TECNICHE',
        skillLevels: {
          advanced: 'Avanzato',
          intermediate: 'Intermedio',
          basic: 'Base'
        },
        profJourney: 'PERCORSO PROFESSIONALE',
        educationApproach: 'FORMAZIONE & APPROCCIO',
        mastersDegree: 'Laurea Magistrale in Semiotica',
        mastersInstitution: "Università di Bologna - Scuola di Umberto Eco",
        mastersGrade: 'Voto: 108/110',
        mastersNote:
          'Prospettiva unica sulla costruzione del significato e della comunicazione, arricchendo ogni aspetto dello sviluppo digitale e dell’interazione utente',
        fullstack: 'Sviluppo Full Stack',
        fullstackWhere: 'Boolean',
        fullstackYear: '2023',
        profPhilosophy: 'Filosofia Professionale',
        profPhilosophyText:
          'Unire l’eccellenza tecnica alla comprensione umana. Guidare i team con empatia e precisione, garantendo qualità tecnica e benessere del gruppo.',
        approachBullets: [
          'Applicare l’analisi semiotica ai problemi digitali',
          'Colmare il divario tra prospettive tecniche e umanistiche',
          'Apprendimento continuo e adattamento costante'
        ],
        downloadBtn: 'Scarica il CV Completo'
      },
      music: {
        title: 'MUSICA',
        malacarneTitle: 'MALACARNE(TMC Crew)',
        malacarneDesc: 'Tekno/Acid/HeavyMental',
        malacarneSoundcloud: 'SoundCloud',
        juanleeTitle: 'JUAN LEE',
        juanleeAlbum: 'SEMEIOSIS',
        juanleeAlbumDesc: 'Album Concettuale che esplora suono e significato',
        signification: 'SIGNIFIATION - Videoclip',
        listenOn: 'ASCOLTA SU',
        platforms: {
          soundcloud: 'SoundCloud',
          spotify: 'Spotify',
          apple: 'Apple Music',
          deezer: 'Deezer',
          qobuz: 'Qobuz'
        }
      },
      footer: {
        github: 'GITHUB',
        linkedin: 'LINKEDIN',
        email: 'EMAIL'
      }
    },

    /* -----------------------------------------------------------
       ESPAÑOL
    ----------------------------------------------------------- */
    es: {
      navigation: {
        about: 'SOBRE MÍ',
        contact: 'CONTACTO',
        webDev: 'DESARROLLADOR WEB /',
        writer: 'ESCRITOR /',
        soundMaster: 'MAESTRO DEL SONIDO /',
        cv: 'CV',
       
      },
      home: {
        links: [
          'DESARROLLADOR WEB /',
          'ESCRITOR /',
          'MAESTRO DEL SONIDO /',
          'CV'
        ]
      },
      about: {
        title: 'SOBRE MÍ',
        subtitle: 'Desarrollador Creativo con Perspectiva Semiótica',
        intro: [
          'Construyo puentes entre soluciones técnicas y comprensión humana, creando experiencias digitales que se comunican en múltiples niveles.',
          'Mi formación en la Semiótica de Umberto Eco define mi enfoque en cada desafío de desarrollo – decodificando las capas de significado que dan forma a las interacciones de los usuarios.'
        ],
        approachTitle: 'MI ENFOQUE',
        approachHint: 'Interactúa con los nodos',
        nodes: {
          central: 'Desarrollo Creativo',
          node1: {
            label: 'Resolución de Problemas',
            title: 'Analítico & Creativo',
            text: 'Abordo los desafíos con precisión e intuición, encontrando soluciones donde convergen la lógica y la creatividad.'
          },
          node2: {
            label: 'Centrado en el Usuario',
            title: 'Diseño Enfocado en el Usuario',
            text: 'Equilibrar la excelencia técnica con la comprensión genuina de las necesidades y expectativas de los usuarios.'
          },
          node3: {
            label: 'Multidisciplinario',
            title: 'Uniendo Mundos',
            text: 'Combinar la experiencia en desarrollo con la teoría de la comunicación para crear experiencias digitales más ricas.'
          },
          node4: {
            label: 'Orientado al Significado',
            title: 'Enfoque Semiótico',
            text: 'Aplicar principios semióticos para crear interfaces y sistemas que comuniquen de forma clara y efectiva.'
          }
        },
        whatDrivesMe: 'QUÉ ME IMPULSA',
        passions: {
          codeTitle: 'Código Limpio y Significativo',
          codeDesc: 'Encontrar la elegancia en la simplicidad y claridad. Escribir código que otros desarrolladores puedan comprender y mejorar.',
          commTitle: 'Comunicación Digital',
          commDesc: 'Creando interfaces y experiencias que se comuniquen claramente con los usuarios en múltiples niveles cognitivos.',
          evolveTitle: 'Evolución Constante',
          evolveDesc: 'Adoptar nuevas tecnologías y metodologías, refinando continuamente mis habilidades y mi enfoque.'
        },
        connectLead: '¿Interesado en mi trayectoria profesional y habilidades?',
        connectBtn: 'Explora mi CV'
      },
      contact: {
        title: 'CONTACTO',
        lead: 'Creemos algo significativo juntos.',
        locationLabel: 'Ubicación',
        locationValue: '40128, Bolonia, Italia',
        emailLabel: 'Correo Electrónico',
        phoneLabel: 'Teléfono',
        connect: 'CONECTAR',
        social: {
          github: 'GitHub',
          linkedin: 'LinkedIn',
          soundcloud: 'SoundCloud'
        }
      },
      developer: {
        title: 'DESARROLLO WEB',
        descriptionLine1: 'FRONTEND / BACKEND / UI-UX / DESARROLLO DE APIS',
        descriptionLine2: 'FRAMEWORKS MODERNOS / SOLUCIONES PERSONALIZADAS',
        projects: [
          {
            name: 'PuntoLuce',
            desc: 'Nuevo sitio de comercio electrónico construido con Open2b',
            linkText: 'Ver Proyecto'
          },
          {
            name: 'Neon Snake',
            desc: 'Implementación de un juego interactivo',
            linkText: 'Ver Proyecto'
          },
          {
            name: 'Flappy Bird',
            desc: 'Recreación del clásico juego móvil',
            linkText: 'Ver Proyecto'
          },
          {
            name: 'Discord Clone',
            desc: 'Recreación de la interfaz de Discord',
            linkText: 'Ver Proyecto'
          },
          {
            name: 'Train Ticket Form',
            desc: 'Formulario interactivo para reservar boletos',
            linkText: 'Ver Proyecto'
          },
          {
            name: 'Dropbox Clone',
            desc: 'Clon de la interfaz de Dropbox',
            linkText: 'Ver Proyecto'
          },
          {
            name: 'Antico Stradello',
            desc: 'Sitio web para una pizzería histórica',
            linkText: 'Ver Proyecto'
          }
        ]
      },
      writer: {
        title: 'PUBLICACIONES',
        croissantTitle: 'Sottilissimi Strati di un Enorme Croissant',
        croissantDesc:
          'Para quienes buscan ver más allá de lo inmediato. Para los soñadores que habitan los espacios entre palabras.',
        exploreBtn: 'EXPLORAR COLECCIÓN',
        buyAmazon: 'COMPRAR EN AMAZON',
        criticalTexts: 'TEXTOS CRÍTICOS',
        licitraTitle: 'Hell ends in Hell - Nanni Licitra',
        licitraDesc: 'Ragusa Foto Festival Award 2021',
        backBtn: 'VOLVER A PUBLICACIONES'
      },
      cv: {
        title: 'CURRÍCULUM',
        subtitle: 'Desarrollador Full Stack con Base Semiótica',
        quote:
          '"Resolutor de problemas con un alma humanista. Fusionando conocimientos técnicos y comprensión humana para crear soluciones digitales significativas."',
        techExpertise: 'EXPERTICIA TÉCNICA',
        skillLevels: {
          advanced: 'Avanzado',
          intermediate: 'Intermedio',
          basic: 'Básico'
        },
        profJourney: 'TRAYECTORIA PROFESIONAL',
        educationApproach: 'EDUCACIÓN & ENFOQUE',
        mastersDegree: 'Máster en Semiótica',
        mastersInstitution: 'Universidad de Bolonia - Escuela de Umberto Eco',
        mastersGrade: 'Nota: 108/110',
        mastersNote:
          'Perspectiva única sobre la creación de significado y la comunicación, enriqueciendo cada aspecto del desarrollo digital y la interacción con el usuario',
        fullstack: 'Desarrollo Full Stack',
        fullstackWhere: 'Boolean',
        fullstackYear: '2023',
        profPhilosophy: 'Filosofía Profesional',
        profPhilosophyText:
          'Combinando la excelencia técnica con la comprensión humana. Liderando equipos con empatía y precisión, asegurando calidad técnica y bienestar del equipo.',
        approachBullets: [
          'Aplicar el análisis semiótico a problemas digitales',
          'Conectar perspectivas técnicas y humanísticas',
          'Aprendizaje continuo y adaptación constante'
        ],
        downloadBtn: 'Descargar CV Completo'
      },
      music: {
        title: 'MÚSICA',
        malacarneTitle: 'MALACARNE(TMC Crew)',
        malacarneDesc: 'Tekno/Acid/HeavyMental',
        malacarneSoundcloud: 'SoundCloud',
        juanleeTitle: 'JUAN LEE',
        juanleeAlbum: 'SEMEIOSIS',
        juanleeAlbumDesc: 'Álbum conceptual que explora el sonido y el significado',
        signification: 'SIGNIFIATION - Videoclip',
        listenOn: 'ESCUCHAR EN',
        platforms: {
          soundcloud: 'SoundCloud',
          spotify: 'Spotify',
          apple: 'Apple Music',
          deezer: 'Deezer',
          qobuz: 'Qobuz'
        }
      },
      footer: {
        github: 'GITHUB',
        linkedin: 'LINKEDIN',
        email: 'EMAIL'
      }
    }
  };

  // 2. Funzione per tradurre la pagina
  function translatePage(lang) {
    /*
      --------------- NAVBAR ---------------
    */
    // nav-center: about, contact
    const navLinks = document.querySelectorAll('.nav-link');
    if (navLinks.length >= 2) {
      navLinks[0].textContent = translations[lang].navigation.about;
      navLinks[1].textContent = translations[lang].navigation.contact;
    }

    // nav-right: "CREATIVE WEB DEVELOPER"
    const navRightSpan = document.querySelector('.nav-right > span');
    if (navRightSpan) {
      navRightSpan.textContent = translations[lang].navigation.creativeWebDeveloper;
    }

    /*
      --------------- HOME PAGE ---------------
    */
    // .big-link => 4 link
    const homeLinks = document.querySelectorAll('.big-link');
    homeLinks.forEach((link, index) => {
      link.textContent = translations[lang].home.links[index];
    });

    /*
      --------------- ABOUT PAGE ---------------
    */
    // Title
    const aboutTitle = document.querySelector('.about-title');
    if (aboutTitle) {
      aboutTitle.textContent = translations[lang].about.title;
      aboutTitle.setAttribute('data-text', translations[lang].about.title); // Effetto glitch
    }

    // Subtitle
    const aboutSubtitle = document.querySelector('.about-subtitle');
    if (aboutSubtitle) {
      aboutSubtitle.textContent = translations[lang].about.subtitle;
    }

    // Intro paragraphs
    const aboutIntros = document.querySelectorAll('.about-intro p');
    if (aboutIntros.length >= 2) {
      aboutIntros[0].textContent = translations[lang].about.intro[0];
      aboutIntros[1].textContent = translations[lang].about.intro[1];
    }

    // "MY APPROACH" (h2.section-title in .philosophy-visualizer)
    const approachTitle = document.querySelector('.philosophy-visualizer .section-title');
    if (approachTitle) {
      approachTitle.textContent = translations[lang].about.approachTitle;
      approachTitle.setAttribute('data-text', translations[lang].about.approachTitle);
    }

    // "Interact with the nodes"
    const approachHint = document.querySelector('.interaction-hint .hint-text');
    if (approachHint) {
      approachHint.textContent = translations[lang].about.approachHint;
    }

    // Nodi
    const centralNode = document.getElementById('central-node');
    if (centralNode) {
      centralNode.querySelector('.node-label').textContent = translations[lang].about.nodes.central;
    }
    const node1 = document.getElementById('node-1');
    if (node1) {
      node1.querySelector('.node-label').textContent = translations[lang].about.nodes.node1.label;
      node1.querySelector('h3').textContent = translations[lang].about.nodes.node1.title;
      node1.querySelector('p').textContent = translations[lang].about.nodes.node1.text;
    }
    const node2 = document.getElementById('node-2');
    if (node2) {
      node2.querySelector('.node-label').textContent = translations[lang].about.nodes.node2.label;
      node2.querySelector('h3').textContent = translations[lang].about.nodes.node2.title;
      node2.querySelector('p').textContent = translations[lang].about.nodes.node2.text;
    }
    const node3 = document.getElementById('node-3');
    if (node3) {
      node3.querySelector('.node-label').textContent = translations[lang].about.nodes.node3.label;
      node3.querySelector('h3').textContent = translations[lang].about.nodes.node3.title;
      node3.querySelector('p').textContent = translations[lang].about.nodes.node3.text;
    }
    const node4 = document.getElementById('node-4');
    if (node4) {
      node4.querySelector('.node-label').textContent = translations[lang].about.nodes.node4.label;
      node4.querySelector('h3').textContent = translations[lang].about.nodes.node4.title;
      node4.querySelector('p').textContent = translations[lang].about.nodes.node4.text;
    }

    // "WHAT DRIVES ME"
    const whatDrivesMe = document.querySelector('.passion-section .section-title');
    if (whatDrivesMe) {
      whatDrivesMe.textContent = translations[lang].about.whatDrivesMe;
      whatDrivesMe.setAttribute('data-text', translations[lang].about.whatDrivesMe);
    }

    // Passion items
    const passionItems = document.querySelectorAll('.passion-item');
    if (passionItems.length >= 3) {
      // 1) Code
      passionItems[0].querySelector('h3').textContent = translations[lang].about.passions.codeTitle;
      passionItems[0].querySelector('p').textContent = translations[lang].about.passions.codeDesc;
      // 2) Communication
      passionItems[1].querySelector('h3').textContent = translations[lang].about.passions.commTitle;
      passionItems[1].querySelector('p').textContent = translations[lang].about.passions.commDesc;
      // 3) Evolution
      passionItems[2].querySelector('h3').textContent = translations[lang].about.passions.evolveTitle;
      passionItems[2].querySelector('p').textContent = translations[lang].about.passions.evolveDesc;
    }

    // "Interested in my professional journey..."
    const connectText = document.querySelector('.connect-text');
    if (connectText) {
      connectText.textContent = translations[lang].about.connectLead;
    }

    // "Explore my CV"
    const connectBtn = document.querySelector('.connect-button .button-text');
    if (connectBtn) {
      connectBtn.textContent = translations[lang].about.connectBtn;
    }

    /*
      --------------- CONTACT PAGE ---------------
    */
    // Title
    const contactTitle = document.querySelector('#contact h1');
    if (contactTitle) {
      contactTitle.textContent = translations[lang].contact.title;
    }

    // Lead
    const contactLead = document.querySelector('.contact-lead');
    if (contactLead) {
      contactLead.textContent = translations[lang].contact.lead;
    }

    // Location label
    const infoItems = document.querySelectorAll('.info-item');
    // .info-item => 0: location, 1: email, 2: phone
    if (infoItems.length >= 3) {
      const locationLabel = infoItems[0].querySelector('h3');
      if (locationLabel) locationLabel.textContent = translations[lang].contact.locationLabel;
      const locationP = infoItems[0].querySelector('p');
      if (locationP) locationP.textContent = translations[lang].contact.locationValue;

      const emailLabel = infoItems[1].querySelector('h3');
      if (emailLabel) emailLabel.textContent = translations[lang].contact.emailLabel;

      const phoneLabel = infoItems[2].querySelector('h3');
      if (phoneLabel) phoneLabel.textContent = translations[lang].contact.phoneLabel;
    }

    // CONNECT
    const connectTitle = document.querySelector('.social-links h2');
    if (connectTitle) {
      connectTitle.textContent = translations[lang].contact.connect;
    }

    // Social items
    // GitHub, LinkedIn, SoundCloud
    const socialItems = document.querySelectorAll('.social-item');
    if (socialItems.length >= 3) {
      socialItems[0].querySelector('.social-title').textContent = translations[lang].contact.social.github;
      socialItems[1].querySelector('.social-title').textContent = translations[lang].contact.social.linkedin;
      socialItems[2].querySelector('.social-title').textContent = translations[lang].contact.social.soundcloud;
    }

    /*
      --------------- DEVELOPER PAGE ---------------
    */
    // Title
    const devTitle = document.querySelector('#developer h1');
    if (devTitle) {
      devTitle.textContent = translations[lang].developer.title;
    }

    // Description (due righe)
    const devDesc = document.querySelector('#developer .description');
    if (devDesc) {
      devDesc.innerHTML =
        translations[lang].developer.descriptionLine1 + '<br>' +
        translations[lang].developer.descriptionLine2;
    }

    // Projects
    const projectCards = document.querySelectorAll('#developer .project-card');
    // Abbiamo 7 progetti
    translations[lang].developer.projects.forEach((proj, i) => {
      if (projectCards[i]) {
        const h3 = projectCards[i].querySelector('h3');
        const p = projectCards[i].querySelector('p');
        const link = projectCards[i].querySelector('.project-link');
        if (h3) h3.textContent = proj.name;
        if (p) p.textContent = proj.desc;
        if (link) link.textContent = proj.linkText;
      }
    });

    /*
      --------------- WRITER PAGE ---------------
    */
    const writerTitle = document.querySelector('#writer h1');
    if (writerTitle) {
      writerTitle.textContent = translations[lang].writer.title;
    }

    // Book section: Croissant Title, Desc, Explore BTN, Amazon
    const bookSection = document.querySelector('.book-section');
    if (bookSection) {
      const h2 = bookSection.querySelector('h2');
      const desc = bookSection.querySelector('.book-description');
      const explore = bookSection.querySelector('#explore-croissant');
      const amazon = bookSection.querySelector('.amazon-link');

      if (h2) h2.textContent = translations[lang].writer.croissantTitle;
      if (desc) desc.textContent = translations[lang].writer.croissantDesc;
      if (explore) explore.textContent = translations[lang].writer.exploreBtn;
      if (amazon) amazon.textContent = translations[lang].writer.buyAmazon;
    }

    // Critical Texts
    const criticalTextsTitle = document.querySelector('.critical-texts h2');
    if (criticalTextsTitle) {
      criticalTextsTitle.textContent = translations[lang].writer.criticalTexts;
    }

    // Nanni Licitra
    const textItem = document.querySelector('.text-item h3');
    if (textItem) {
      textItem.textContent = translations[lang].writer.licitraTitle;
    }
    const textItemP = document.querySelector('.text-item p');
    if (textItemP) {
      textItemP.textContent = translations[lang].writer.licitraDesc;
    }

    /*
      --------------- CROISSANT WORLD PAGE ---------------
    */
    const exitBtn = document.getElementById('exit-croissant');
    if (exitBtn) {
      exitBtn.textContent = translations[lang].writer.backBtn;
    }

    /*
      --------------- CV PAGE ---------------
    */
    const cvTitle = document.querySelector('#cv .cv-title');
    if (cvTitle) {
      cvTitle.textContent = translations[lang].cv.title;
      cvTitle.setAttribute('data-text', translations[lang].cv.title);
    }

    const cvSubtitle = document.querySelector('.cv-subtitle');
    if (cvSubtitle) {
      cvSubtitle.textContent = translations[lang].cv.subtitle;
    }

    const cvQuote = document.querySelector('.philosophy-quote');
    if (cvQuote) {
      cvQuote.textContent = translations[lang].cv.quote;
    }

    // TECHNICAL EXPERTISE
    const techExpTitle = document.querySelector('.skill-graph-container .section-title');
    if (techExpTitle) {
      techExpTitle.textContent = translations[lang].cv.techExpertise;
      techExpTitle.setAttribute('data-text', translations[lang].cv.techExpertise);
    }

    // Livelli skill
    const skillLegend = document.querySelectorAll('.skill-level');
    // 0: advanced, 1: intermediate, 2: basic
    if (skillLegend.length >= 3) {
      skillLegend[0].textContent = translations[lang].cv.skillLevels.advanced;
      skillLegend[1].textContent = translations[lang].cv.skillLevels.intermediate;
      skillLegend[2].textContent = translations[lang].cv.skillLevels.basic;
    }

    // PROFESSIONAL JOURNEY
    const profJourney = document.querySelector('.experience-timeline-container .section-title');
    if (profJourney) {
      profJourney.textContent = translations[lang].cv.profJourney;
      profJourney.setAttribute('data-text', translations[lang].cv.profJourney);
    }

    // EDUCATION & APPROACH
    const eduApproach = document.querySelector('.education-approach-container .section-title');
    if (eduApproach) {
      eduApproach.textContent = translations[lang].cv.educationApproach;
      eduApproach.setAttribute('data-text', translations[lang].cv.educationApproach);
    }

    // Master's
    const mastersDegree = document.querySelector('.education-item .education-degree');
    const mastersInstitution = document.querySelector('.education-item .education-institution');
    const mastersGrade = document.querySelector('.education-item .education-grade');
    const mastersNote = document.querySelector('.education-item .education-note');

    if (mastersDegree) mastersDegree.textContent = translations[lang].cv.mastersDegree;
    if (mastersInstitution) mastersInstitution.textContent = translations[lang].cv.mastersInstitution;
    if (mastersGrade) mastersGrade.textContent = translations[lang].cv.mastersGrade;
    if (mastersNote) mastersNote.textContent = translations[lang].cv.mastersNote;

    // Fullstack
    const secondEduItem = document.querySelectorAll('.education-item')[1];
    if (secondEduItem) {
      const deg = secondEduItem.querySelector('.education-degree');
      const inst = secondEduItem.querySelector('.education-institution');
      const period = secondEduItem.querySelector('.education-period');
      if (deg) deg.textContent = translations[lang].cv.fullstack;
      if (inst) inst.textContent = translations[lang].cv.fullstackWhere;
      if (period) period.textContent = translations[lang].cv.fullstackYear;
    }

    // Professional Philosophy
    const profPhilosTitle = document.querySelector('.approach-block h3');
    const profPhilosText = document.querySelector('.approach-block .approach-content p');
    if (profPhilosTitle) {
      profPhilosTitle.textContent = translations[lang].cv.profPhilosophy;
    }
    if (profPhilosText) {
      profPhilosText.textContent = translations[lang].cv.profPhilosophyText;
    }

    // Approaches (bullet points)
    const approachHighlights = document.querySelectorAll('.approach-highlight .highlight-text');
    translations[lang].cv.approachBullets.forEach((bullet, idx) => {
      if (approachHighlights[idx]) {
        approachHighlights[idx].textContent = bullet;
      }
    });

    // Download CV
    const downloadCvBtn = document.querySelector('.cv-download-button .download-text');
    if (downloadCvBtn) {
      downloadCvBtn.textContent = translations[lang].cv.downloadBtn;
    }

    /*
      --------------- MUSIC PAGE ---------------
    */
    const musicTitle = document.querySelector('#music h1');
    if (musicTitle) {
      musicTitle.textContent = translations[lang].music.title;
    }

    // MALACARNE
    const musicProjects = document.querySelectorAll('.music-project');
    // 1) Malacarne  2) Juan Lee
    if (musicProjects.length >= 1) {
      const malacarneH2 = musicProjects[0].querySelector('h2');
      if (malacarneH2) {
        malacarneH2.textContent = translations[lang].music.malacarneTitle;
      }
      const malacarneP = musicProjects[0].querySelector('.music-description p');
      if (malacarneP) {
        malacarneP.textContent = translations[lang].music.malacarneDesc;
      }
      const malacarneLink = musicProjects[0].querySelector('.platform-link span:last-child');
      if (malacarneLink) {
        malacarneLink.textContent = translations[lang].music.malacarneSoundcloud;
      }
    }

    if (musicProjects.length >= 2) {
      const juanLeeH2 = musicProjects[1].querySelector('h2');
      if (juanLeeH2) {
        juanLeeH2.textContent = translations[lang].music.juanleeTitle;
      }
      const juanLeeH3 = musicProjects[1].querySelector('h3');
      if (juanLeeH3) {
        juanLeeH3.textContent = translations[lang].music.juanleeAlbum;
      }
      const juanLeeP = musicProjects[1].querySelectorAll('.music-description p')[1];
      // p: [0] = "SEMEIOSIS" (nell'h3), [1] = "Conceptual Album exploring..."
      if (juanLeeP) {
        juanLeeP.textContent = translations[lang].music.juanleeAlbumDesc;
      }

      // SIGNIFIATION
      const significationH4 = musicProjects[1].querySelector('.video-section h4');
      if (significationH4) {
        significationH4.textContent = translations[lang].music.signification;
      }

      // "LISTEN ON"
      const listenOnH4 = musicProjects[1].querySelector('.streaming-platforms h4');
      if (listenOnH4) {
        listenOnH4.textContent = translations[lang].music.listenOn;
      }

      // Platform links: SoundCloud, Spotify, Apple, Deezer, Qobuz
      const platformGrid = musicProjects[1].querySelectorAll('.platform-grid .platform-link');
      if (platformGrid.length >= 5) {
        platformGrid[0].querySelector('span:last-child').textContent = translations[lang].music.platforms.soundcloud;
        platformGrid[1].querySelector('span:last-child').textContent = translations[lang].music.platforms.spotify;
        platformGrid[2].querySelector('span:last-child').textContent = translations[lang].music.platforms.apple;
        platformGrid[3].querySelector('span:last-child').textContent = translations[lang].music.platforms.deezer;
        platformGrid[4].querySelector('span:last-child').textContent = translations[lang].music.platforms.qobuz;
      }
    }

    /*
      --------------- FOOTER ---------------
    */
    const footerLinks = document.querySelectorAll('footer a');
    if (footerLinks.length >= 3) {
      footerLinks[0].textContent = translations[lang].footer.github;   // GITHUB
      footerLinks[1].textContent = translations[lang].footer.linkedin; // LINKEDIN
      footerLinks[2].textContent = translations[lang].footer.email;    // EMAIL
    }
  }

  // 3. Gestore del selettore lingua (uguale al tuo)
  function setupLanguageSelector() {
    const languageToggle = document.getElementById('language-toggle');
    const languageDropdown = document.querySelector('.language-dropdown');
    const languageOptions = document.querySelectorAll('.language-option');

    // Imposta lingua iniziale da localStorage o default
    const currentLang = localStorage.getItem('site-language') || 'en';
    // Aggiorna bottone
    languageToggle.innerHTML = `
      <span class="flag-icon flag-icon-${currentLang === 'en' ? 'us' : currentLang}"></span>
      ${currentLang.toUpperCase()}
    `;
    // Traduci all’avvio
    translatePage(currentLang);

    // Toggle dropdown
    languageToggle.addEventListener('click', () => {
      languageDropdown.classList.toggle('show');
    });

    // Clic su opzione lingua
    languageOptions.forEach(option => {
      option.addEventListener('click', () => {
        const selectedLang = option.getAttribute('data-lang');
        localStorage.setItem('site-language', selectedLang);

        // Aggiorna pulsante
        languageToggle.innerHTML = `
          <span class="flag-icon flag-icon-${selectedLang === 'en' ? 'us' : selectedLang}"></span>
          ${selectedLang.toUpperCase()}
        `;
        languageDropdown.classList.remove('show');

        // Traduci
        translatePage(selectedLang);
      });
    });

    // Chiudi dropdown cliccando fuori
    window.addEventListener('click', (e) => {
      if (!languageToggle.contains(e.target) && !languageDropdown.contains(e.target)) {
        languageDropdown.classList.remove('show');
      }
    });
  }

  // 4. Inizializza
  setupLanguageSelector();
});


