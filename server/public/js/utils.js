window.utils = {

    // Asynchronously load templates located in separate .html files
    loadTemplate: function(views, callback) {

        var deferreds = [];

        $.each(views, function(index, view) {
            if (window[view]) {
                deferreds.push($.get('tpl/' + view + '.html', function(data) {
                    window[view].prototype.template = _.template(data);
                }));
            } else {
                alert(view + " not found");
            }
        });

        $.when.apply(null, deferreds).done(callback);
    },

    displayValidationErrors: function (messages) {
        for (var key in messages) {
            if (messages.hasOwnProperty(key)) {
                this.addValidationError(key, messages[key]);
            }
        }
        this.showAlert('Warning!', 'Fix validation errors and try again', 'alert-warning');
    },

    addValidationError: function (field, message) {
        var controlGroup = $('#' + field).parent().parent();
        controlGroup.addClass('error');
        $('.help-inline', controlGroup).html(message);
    },

    removeValidationError: function (field) {
        var controlGroup = $('#' + field).parent().parent();
        controlGroup.removeClass('error');
        $('.help-inline', controlGroup).html('');
    },

    showAlert: function(title, text, klass) {
        // Map old alert classes to Bootstrap 5 classes
        var classMap = {
            'alert-error': 'alert-danger',
            'alert-warning': 'alert-warning', 
            'alert-success': 'alert-success',
            'alert-info': 'alert-info'
        };
        
        var bootstrapClass = classMap[klass] || klass;
        
        $('.alert').removeClass("alert-danger alert-warning alert-success alert-info d-none");
        $('.alert').addClass(bootstrapClass);
        $('.alert').html('<strong>' + title + '</strong> ' + text.replace(/\n/g, '<br>'));
        $('.alert').removeClass('d-none').show();
    },

    showLoadingAlert: function(message) {
        $('.alert').removeClass("alert-danger alert-warning alert-success alert-info d-none");
        $('.alert').addClass('alert-info');
        $('.alert').html(`
            <div class="d-flex align-items-center">
                <div class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
                <strong>Saving...</strong> ${message}
            </div>
        `);
        $('.alert').removeClass('d-none').show();
    },

    hideAlert: function() {
        $('.alert').addClass('d-none').hide();
    },
    
    uploadFile: function(path, file, callbackSuccess) {
        var self = this;
        var data = new FormData();
        data.append('file', file);
        $.ajax({
            url: path,
            type: 'POST',
            data: data,
            processData: false,
            cache: false,
            contentType: false
        })
        .done(function (val) {
            console.log(file.name + " uploaded successfully");
            callbackSuccess(val);
        })
        .fail(function () {
            self.showAlert('Error!', 'An error occurred while uploading ' + file.name, 'alert-error');
        });
    },
    
    hms: function(seconds) {
        var   h = parseInt(seconds/3600,10)
            , m = parseInt(seconds/60,10)- h*60
            , s = Math.floor(seconds%60);
        return [h,m,s]
            .join(':')
            .replace(/\b\d\b/g,
                     function(a){ 
                        return Number(a)===0 ? '00' : a<10? '0'+a : a; 
                     }
                    );
    },
};