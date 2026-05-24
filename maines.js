// Fallback play function
function playVideo(url) {
    const player = document.getElementById('player');
    const videoOverlay = document.querySelector('.video-overlay');
    
    player.src = url;
    player.load();
    player.play();
    
    if (videoOverlay) {
        videoOverlay.classList.add('hidden');
    }
}

// Favorite functionality
function setupFavoriteButtons() {
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const icon = btn.querySelector('i');
            const movieCard = btn.closest('.movie-card');
            const movieId = movieCard.dataset.id;
            
            if (icon.classList.contains('far')) {
                icon.classList.remove('far');
                icon.classList.add('fas');
                btn.style.color = 'var(--danger)';
                addToFavorites(movieId);
            } else {
                icon.classList.remove('fas');
                icon.classList.add('far');
                btn.style.color = '';
                removeFromFavorites(movieId);
            }
        });
    });
    
    document.querySelectorAll('.share-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            shareMovie();
        });
    });
}

function addToFavorites(movieId) {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    if (!favorites.includes(movieId)) {
        favorites.push(movieId);
        localStorage.setItem('favorites', JSON.stringify(favorites));
        showToast('به علاقه‌مندی‌ها اضافه شد', 'success');
    }
}

function removeFromFavorites(movieId) {
    let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    favorites = favorites.filter(id => id !== movieId);
    localStorage.setItem('favorites', JSON.stringify(favorites));
    showToast('از علاقه‌مندی‌ها حذف شد', 'info');
}

function shareMovie() {
    if (navigator.share) {
        navigator.share({
            title: 'سینمای آنلاین',
            text: 'این فیلم رو ببین!',
            url: window.location.href
        }).catch(() => {});
    } else {
        navigator.clipboard.writeText(window.location.href);
        showToast('لینک کپی شد!', 'success');
    }
}

// Toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle'
    };
    
    toast.innerHTML = `
        <i class="fas ${icons[type]}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Enhanced video player controls
const player = document.getElementById('player');
const videoContainer = document.querySelector('.video-container');

// Picture-in-Picture
player.addEventListener('dblclick', () => {
    if (document.pictureInPictureElement) {
        document.exitPictureInPicture();
    } else if (document.pictureInPictureEnabled) {
        player.requestPictureInPicture().catch(() => {});
    }
});

// Fullscreen toggle
videoContainer.addEventListener('click', (e) => {
    if (e.target === videoContainer || e.target === player) {
        if (!document.fullscreenElement) {
            videoContainer.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen();
        }
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    
    switch(e.key) {
        case ' ':
            e.preventDefault();
            if (player.paused) {
                player.play();
            } else {
                player.pause();
            }
            break;
        case 'f':
        case 'F':
            if (!document.fullscreenElement) {
                videoContainer.requestFullscreen().catch(() => {});
            } else {
                document.exitFullscreen();
            }
            break;
        case 'm':
        case 'M':
            player.muted = !player.muted;
            break;
        case 'ArrowRight':
            player.currentTime += 10;
            break;
        case 'ArrowLeft':
            player.currentTime -= 10;
            break;
        case 'ArrowUp':
            e.preventDefault();
            player.volume = Math.min(1, player.volume + 0.1);
            break;
        case 'ArrowDown':
            e.preventDefault();
            player.volume = Math.max(0, player.volume - 0.1);
            break;
    }
});

// Speed control menu
player.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    
    const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    
    const menu = document.createElement('div');
    menu.className = 'speed-menu';
    menu.style.cssText = `
        position: fixed;
        top: ${e.clientY}px;
        left: ${e.clientX}px;
        background: var(--glass-bg);
        backdrop-filter: blur(20px);
        border: 1px solid var(--glass-border);
        border-radius: 10px;
        padding: 0.5rem;
        z-index: 10000;
        box-shadow: var(--shadow-lg);
    `;
    
    speeds.forEach(speed => {
        const btn = document.createElement('button');
        btn.textContent = `${speed}x`;
        btn.className = 'speed-option';
        btn.style.cssText = `
            display: block;
            width: 100%;
            padding: 0.5rem 1rem;
            background: ${player.playbackRate === speed ? 'var(--primary)' : 'transparent'};
            border: none;
            color: var(--text-color);
            cursor: pointer;
            border-radius: 5px;
            text-align: right;
            transition: var(--transition);
        `;
        
        btn.onmouseover = () => {
            if (player.playbackRate !== speed) {
                btn.style.background = 'var(--bg-tertiary)';
            }
        };
        
        btn.onmouseout = () => {
            if (player.playbackRate !== speed) {
                btn.style.background = 'transparent';
            }
        };
        
        btn.onclick = () => {
            player.playbackRate = speed;
            document.body.removeChild(menu);
            showToast(`سرعت پخش: ${speed}x`, 'info');
        };
        
        menu.appendChild(btn);
    });
    
    document.body.appendChild(menu);
    
    setTimeout(() => {
        document.addEventListener('click', () => {
            if (menu.parentNode) {
                document.body.removeChild(menu);
            }
        }, { once: true });
    }, 100);
});

// Watch history
player.addEventListener('timeupdate', () => {
    if (window.current && player.currentTime > 0 && player.duration > 0) {
        const history = JSON.parse(localStorage.getItem('watchHistory') || '[]');
        const existingIndex = history.findIndex(item => item.id === window.current.id);
        
        const historyItem = {
            id: window.current.id,
            title: window.current.title,
            currentTime: player.currentTime,
            duration: player.duration,
            timestamp: Date.now()
        };
        
        if (existingIndex >= 0) {
            history[existingIndex] = historyItem;
        } else {
            history.unshift(historyItem);
        }
        
        localStorage.setItem('watchHistory', JSON.stringify(history.slice(0, 50)));
    }
});

// Lazy loading for images
const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
                img.src = img.dataset.src;
            }
            img.classList.add('fade-in');
            observer.unobserve(img);
        }
    });
});

// Observe all movie posters
function observeImages() {
    document.querySelectorAll('.movie-poster').forEach(img => {
        imageObserver.observe(img);
    });
}

// Filter functionality
const genreFilter = document.getElementById('genreFilter');
const yearFilter = document.getElementById('yearFilter');
const sortFilter = document.getElementById('sortFilter');

[genreFilter, yearFilter, sortFilter].forEach(filter => {
    filter.addEventListener('change', () => {
        console.log('Filter changed:', {
            genre: genreFilter.value,
            year: yearFilter.value,
            sort: sortFilter.value
        });
        
        if (typeof applyFilters === 'function') {
            applyFilters({
                genre: genreFilter.value,
                year: yearFilter.value,
                sort: sortFilter.value
            });
        }
    });
});

// Skeleton loading
function showSkeletonLoading(count = 8) {
    moviesGrid.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'movie-card skeleton';
        skeleton.style.height = '450px';
        moviesGrid.appendChild(skeleton);
    }
}

// Initialize
updateResultsCount(0);

// Load favorites on page load
function loadFavorites() {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    favorites.forEach(movieId => {
        const card = document.querySelector(`.movie-card[data-id="${movieId}"]`);
        if (card) {
            const btn = card.querySelector('.favorite-btn i');
            if (btn) {
                btn.classList.remove('far');
                btn.classList.add('fas');
                card.querySelector('.favorite-btn').style.color = 'var(--danger)';
            }
        }
    });
}

// Call after rendering movies
setTimeout(loadFavorites, 100);
