document.addEventListener('DOMContentLoaded', () => {
    const cursor = document.querySelector('.custom-cursor');
    const interactiveElements = document.querySelectorAll('a, .nav-link');
    const bookTitle = document.querySelector('.book-section h2');
    
    const bookCover = document.createElement('div');
    bookCover.className = 'book-cover';
    document.body.appendChild(bookCover);
    
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
            
            if (pageId !== 'home') {
                document.body.classList.add('colored-bg');
            } else {
                document.body.classList.remove('colored-bg');
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
 
    const projectCards = document.querySelectorAll('.project-card h3');
    const projectImages = {
        'FizzBuzz Game': 'fizzbuzz',
        'Discord Clone': 'discord',
        'Train Ticket Form': 'train',
        'Dropbox Clone': 'dropbox',
        'Antico Stradello': 'pizza'
    };
 
    projectCards.forEach(card => {
        const hoverImage = document.createElement('div');
        hoverImage.className = `project-hover-image ${projectImages[card.textContent]}`;
        document.body.appendChild(hoverImage);
    
        const projectArea = card.closest('.project-card');
        
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
