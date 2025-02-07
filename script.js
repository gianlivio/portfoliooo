document.addEventListener('DOMContentLoaded', () => {
    const cursor = document.querySelector('.custom-cursor');
    const interactiveElements = document.querySelectorAll('a, .nav-link');
    const bookTitle = document.querySelector('.book-section h2');
    
    const bookCover = document.createElement('div');
    bookCover.className = 'book-cover';
    document.body.appendChild(bookCover);


    const homeLinks = document.querySelectorAll('.big-link');
    const sectionImages = {
        'developer': ['fizzbuzz', 'discord', 'train', 'dropbox', 'pizza'],
        'music': ['malacarne', 'semeiosis'],
        'writer': ['a', 'Licitra'] 
    };

    homeLinks.forEach(link => {
        const section = link.getAttribute('data-page');
        if (sectionImages[section]) {
            let currentImageIndex = 0;
            let intervalId = null;
            
            // Creiamo un div per l'immagine hover
            const hoverImage = document.createElement('div');
            hoverImage.className = 'project-hover-image';
            document.body.appendChild(hoverImage);

            link.addEventListener('mouseenter', (e) => {
                hoverImage.style.opacity = '1';
                intervalId = setInterval(() => {
                    currentImageIndex = (currentImageIndex + 1) % sectionImages[section].length;
                    hoverImage.className = `project-hover-image ${sectionImages[section][currentImageIndex]}`;
                    hoverImage.classList.add('flicker');
                }, 400); // Cambia immagine ogni 400ms
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
                'writer': '#000000',     
                'music': '#7CB518',      
                'about': '#00A6FB',    
                'cv': '#FFD23F'         
            };
            
            document.body.style.backgroundColor = colors[pageId] || 'white';
            
            
            if (pageId === 'writer') {
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
        'FizzBuzz Game': 'fizzbuzz',
        'Discord Clone': 'discord',
        'Train Ticket Form': 'train',
        'Dropbox Clone': 'dropbox',
        'Antico Stradello': 'pizza',
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