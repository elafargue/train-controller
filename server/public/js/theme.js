window.ThemeManager = {
    init: function(settings) {
        this.settings = settings;
        
        // Wait for DOM to be ready before initializing
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this._initialize());
        } else {
            this._initialize();
        }
    },

    _initialize: function() {
        this.settings.on('change:theme', this.updateTheme, this);
        this.settings.on('change:navbarColor', this.updateColors, this);
        this.settings.on('change:accentColor', this.updateColors, this);
        // Also update theme when new views are rendered
        this.setupViewObserver();
        this.injectCustomCss();
        this.updateTheme();
        this.updateColors();
    },

    // Inject a style tag for our custom CSS variables
    injectCustomCss: function() {
        let style = document.getElementById('custom-theme-styles');
        if (!style) {
            style = document.createElement('style');
            style.id = 'custom-theme-styles';
            document.head.appendChild(style);
        }
        // Store the style element reference
        this.customStyleElement = style;
    },

    // Update custom color CSS variables
    updateColors: function() {
        if (!this.settings || !this.customStyleElement) return;
        
        const navbarColor = this.settings.get('navbarColor') || '#343a40'; // Default Bootstrap dark navbar color
        const accentColor = this.settings.get('accentColor') || '#007bff'; // Default Bootstrap primary color
        
        // Function to determine if a color is light or dark
        const isLight = (color) => {
            const hex = color.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            return ((r * 299 + g * 587 + b * 114) / 1000) > 128;
        };

        // Use our stored reference to the style element
        const style = this.customStyleElement;
        
        // Update the CSS
        style.textContent = `
            .navbar {
                background-color: ${navbarColor} !important;
                color: ${isLight(navbarColor) ? '#000' : '#fff'} !important;
            }
            .navbar.navbar-dark .navbar-nav .nav-link {
                color: ${isLight(navbarColor) ? 'rgba(0,0,0,.7)' : 'rgba(255,255,255,.7)'} !important;
            }
            .navbar.navbar-dark .navbar-nav .nav-link:hover {
                color: ${isLight(navbarColor) ? '#000' : '#fff'} !important;
            }
            .navbar.navbar-dark .navbar-brand {
                color: ${isLight(navbarColor) ? '#000' : '#fff'} !important;
            }
            .btn-primary {
                background-color: ${accentColor} !important;
                border-color: ${accentColor} !important;
                color: ${isLight(accentColor) ? '#000' : '#fff'} !important;
            }
            .btn-primary:hover {
                background-color: ${this.adjustColor(accentColor, -20)} !important;
                border-color: ${this.adjustColor(accentColor, -20)} !important;
            }
            .btn-outline-primary {
                color: ${accentColor} !important;
                border-color: ${accentColor} !important;
            }
            .btn-outline-primary:hover {
                background-color: ${accentColor} !important;
                color: ${isLight(accentColor) ? '#000' : '#fff'} !important;
            }
            .navbar-toggler-icon {
                background-image: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'><path stroke='${isLight(navbarColor) ? '%23000000' : '%23ffffff'}' stroke-linecap='round' stroke-miterlimit='10' stroke-width='2' d='M4 7h22M4 15h22M4 23h22'/></svg>") !important;
            }
        `;
    },

    // Helper function to darken/lighten colors
    adjustColor: function(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const B = ((num >> 8) & 0x00FF) + amt;
        const G = (num & 0x0000FF) + amt;
        return '#' + (0x1000000 + (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
            (B < 255 ? (B < 1 ? 0 : B) : 255) * 0x100 +
            (G < 255 ? (G < 1 ? 0 : G) : 255)).toString(16).slice(1);
    },

    setupViewObserver: function() {
        // Create a mutation observer to watch for new content
        var observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length) {
                    this.updateTheme();
                }
            });
        });

        // Start observing the content area for DOM changes
        observer.observe(document.getElementById('content'), {
            childList: true,
            subtree: true
        });
    },

    updateTheme: function() {
        var theme = this.settings ? this.settings.get('theme') : 'light';
        var isDark = theme === 'dark';
        
        // Update root theme
        document.documentElement.setAttribute('data-bs-theme', theme);
        
        // Update body and main container
        $('body').toggleClass('bg-dark text-light', isDark);
        $('.container-fluid').toggleClass('bg-dark text-light', isDark);
        
        // Update tables
        $('.table').toggleClass('table-dark', isDark);
        
        // Update list groups
        $('.list-group-item').each(function() {
            $(this).toggleClass('bg-dark text-light border-secondary', isDark);
        });
        
        // Update modals
        $('.modal-content').each(function() {
            $(this).toggleClass('bg-dark text-light border-secondary', isDark);
        });
        
        // Update inputs, selects, and textareas that don't have specific styling
        $('input:not([type="radio"]):not([type="checkbox"]), select, textarea').each(function() {
            if (!$(this).hasClass('form-control-plaintext')) {
                $(this).toggleClass('bg-dark text-light border-secondary', isDark);
            }
        });
        
        // Update standard buttons that don't have specific colors
        $('.btn:not(.btn-primary):not(.btn-secondary):not(.btn-success):not(.btn-danger):not(.btn-warning):not(.btn-info)').each(function() {
            $(this).toggleClass('btn-outline-light', isDark);
            $(this).toggleClass('btn-outline-dark', !isDark);
        });
        
        // Update cards
        $('.card').each(function() {
            $(this).toggleClass('bg-dark text-light border-secondary', isDark);
            // Also update card headers specifically
            $('.card-header', this).toggleClass('border-secondary', isDark);
        });
        
        // Update dropdowns
        $('.dropdown-menu').toggleClass('bg-dark text-light border-secondary', isDark);
        $('.dropdown-item').toggleClass('text-light', isDark);
        
        // Update pagination
        $('.page-link').each(function() {
            if (!$(this).hasClass('active')) {
                $(this).toggleClass('bg-dark text-light border-secondary', isDark);
            }
        });
    },

    cleanup: function() {
        if (this.settings) {
            this.settings.off('change:theme', this.updateTheme, this);
        }
    }
};
