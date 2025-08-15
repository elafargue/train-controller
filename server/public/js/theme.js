window.ThemeManager = {
    init: function(settings) {
        this.settings = settings;
        this.settings.on('change:theme', this.updateTheme, this);
        // Also update theme when new views are rendered
        this.setupViewObserver();
        this.updateTheme();
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
