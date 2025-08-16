window.Paginator = Backbone.View.extend({

    className: "d-flex justify-content-center mt-4",

    initialize:function (options) {
        this.options = options || {};
        this.baseUrl = this.options.baseUrl || 'locos'; // Allow passing baseUrl as option
        this.model.on("reset", this.render, this);
        
    },

    render:function () {

        var items = this.model.models;
        var len = items.length;
        var pageCount = Math.ceil(len / this.options.items);
        var currentPage = this.options.page || 1;

        // Only show pagination if there's more than one page
        if (pageCount <= 1) {
            $(this.el).empty();
            return this;
        }

        // Create Bootstrap 5 pagination
        var paginationHtml = '<nav aria-label="Page navigation"><ul class="pagination">';
        
        // Previous button
        if (currentPage > 1) {
            paginationHtml += '<li class="page-item"><a class="page-link" href="#' + this.getBaseUrl() + '/page/' + (currentPage - 1) + '" aria-label="Previous"><span aria-hidden="true">&laquo;</span></a></li>';
        } else {
            paginationHtml += '<li class="page-item disabled"><span class="page-link" aria-label="Previous"><span aria-hidden="true">&laquo;</span></span></li>';
        }

        // Page numbers
        var startPage = Math.max(1, currentPage - 2);
        var endPage = Math.min(pageCount, currentPage + 2);

        // Show first page if we're not starting from it
        if (startPage > 1) {
            paginationHtml += '<li class="page-item"><a class="page-link" href="#' + this.getBaseUrl() + '/page/1">1</a></li>';
            if (startPage > 2) {
                paginationHtml += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
        }

        // Show page numbers in range
        for (var i = startPage; i <= endPage; i++) {
            if (i === currentPage) {
                paginationHtml += '<li class="page-item active" aria-current="page"><span class="page-link">' + i + '</span></li>';
            } else {
                paginationHtml += '<li class="page-item"><a class="page-link" href="#' + this.getBaseUrl() + '/page/' + i + '">' + i + '</a></li>';
            }
        }

        // Show last page if we're not ending with it
        if (endPage < pageCount) {
            if (endPage < pageCount - 1) {
                paginationHtml += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
            paginationHtml += '<li class="page-item"><a class="page-link" href="#' + this.getBaseUrl() + '/page/' + pageCount + '">' + pageCount + '</a></li>';
        }

        // Next button
        if (currentPage < pageCount) {
            paginationHtml += '<li class="page-item"><a class="page-link" href="#' + this.getBaseUrl() + '/page/' + (currentPage + 1) + '" aria-label="Next"><span aria-hidden="true">&raquo;</span></a></li>';
        } else {
            paginationHtml += '<li class="page-item disabled"><span class="page-link" aria-label="Next"><span aria-hidden="true">&raquo;</span></span></li>';
        }

        paginationHtml += '</ul></nav>';

        $(this.el).html(paginationHtml);

        return this;
    },

    getBaseUrl: function() {
        // Use explicitly passed baseUrl or determine from current route
        if (this.baseUrl) {
            return this.baseUrl;
        }
        
        var currentHash = window.location.hash;
        if (currentHash.indexOf('#locos') === 0) {
            return 'locos';
        } else if (currentHash.indexOf('#cars') === 0) {
            return 'cars';
        } else if (currentHash.indexOf('#layouts') === 0) {
            return 'layouts';
        }
        // Default fallback
        return 'locos';
    }
});