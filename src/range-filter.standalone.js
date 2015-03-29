/*!
 * MicroEvent - to make any js object an event emitter
 * Copyright 2011 Jerome Etienne (http://jetienne.com)
 * Copyright 2015 Damien "Mistic" Sorel (http://www.strangeplanet.fr)
 * Licensed under MIT (http://opensource.org/licenses/MIT)
 */

(function(root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
    }
    else if (typeof define === 'function' && define.amd) {
        define('microevent', [], factory);
    }
    else {
        root.MicroEvent = factory();
    }
}(this, function() {
    "use strict";

    var returnTrue = function() { return true; },
        returnFalse = function() { return false; };

    var MicroEvent = function(){};

    /**
     * Event object used to stop propagations and prevent default
     */
    MicroEvent.Event = function(){};

    MicroEvent.Event.prototype = {
        constructor: MicroEvent.Event,

        isDefaultPrevented: returnFalse,
        isPropagationStopped: returnFalse,

        preventDefault: function() { this.isDefaultPrevented = returnTrue; },
        stopPropagation: function() { this.isPropagationStopped = returnTrue; }
    };

    MicroEvent.prototype = {
        constructor: MicroEvent,

        /**
         * Add one or many event handlers
         *
         * @param {String,Object} events
         * @param {Function,optional} callback
         * @return {Object} main object
         *
         * obj.on('event', callback)
         * obj.on('event1 event2', callback)
         * obj.on({ event1: callback1, event2: callback2 })
         */
        on: function (events, fct) {
            if (typeof events === 'object') {
                for (var event in events) {
                    if (events.hasOwnProperty(event)) {
                        this._events[event] = this._events[event] || [];
                        this._events[event].push(events[event]);
                    }
                }
            }
            else {
                events.split(' ').forEach(function(event) {
                    this._events[event] = this._events[event] || [];
                    this._events[event].push(fct);
                }, this);
            }

            return this;
        },

        /**
         * Remove one or many or all event handlers
         *
         * @param {String|Object,optional} events
         * @param {Function,optional} callback
         * @return {Object} main object
         *
         * obj.off('event')
         * obj.off('event', callback)
         * obj.off('event1 event2')
         * obj.off({ event1: callback1, event2: callback2 })
         * obj.off()
         */
        off: function (events, fct) {
            if (typeof events === 'object') {
                for (var event in events) {
                    if (events.hasOwnProperty(event) && (event in this._events)) {
                        var index = this._events[event].indexOf(events[event]);
                        if (index !== -1) this._events[event].splice(index, 1);
                    }
                }
            }
            else if (!!events) {
                events.split(' ').forEach(function(event) {
                    if (event in this._events) {
                        if (fct) {
                            var index = this._events[event].indexOf(fct);
                            if (index !== -1) this._events[event].splice(index, 1);
                        }
                        else {
                            this._events[event] = [];
                        }
                    }
                }, this);
            }
            else {
                this._events = {};
            }

            return this;
        },

        /**
         * Add one or many event handlers that will be called only once
         * This handlers are only applicable to "trigger", not "change"
         *
         * @param {String|Object} events
         * @param {Function,optional} callback
         * @return {Object} main object
         *
         * obj.once('event', callback)
         * obj.once('event1 event2', callback)
         * obj.once({ event1: callback1, event2: callback2 })
         */
        once: function (events, fct) {
            if (typeof events === 'object') {
                for (var event in events) {
                    if (events.hasOwnProperty(event)) {
                        this._once[event] = this._once[event] || [];
                        this._once[event].push(events[event]);
                    }
                }
            }
            else {
                events.split(' ').forEach(function(event) {
                    this._once[event] = this._once[event] || [];
                    this._once[event].push(fct);
                }, this);
            }

            return this;
        },

        /**
         * Trigger all handlers for an event
         *
         * @param {String} event name
         * @param {mixed...} optional, arguments
         * @return {MicroEvent.Event}
         */
        trigger: function (event /* , args... */) {
            var args = Array.prototype.slice.call(arguments, 1),
                e = new MicroEvent.Event(),
                i, l;

            args.push(e);

            if (event in this._events) {
                for (i=0, l=this._events[event].length; i<l; i++) {
                    this._events[event][i].apply(this, args);
                    if (e.isPropagationStopped()) {
                        return e;
                    }
                }
            }

            if (event in this._once) {
                for (i=0, l=this._once[event].length; i<l; i++) {
                    this._once[event][i].apply(this, args);
                    if (e.isPropagationStopped()) {
                        delete this._once[event];
                        return e;
                    }
                }
                delete this._once[event];
            }

            return e;
        },

        /**
         * Trigger all modificators for an event, each handler must return a value
         *
         * @param {String} event name
         * @param {mixed} event value
         * @param {mixed...} optional, arguments
         * @return {Mixed} modified value
         */
        change: function(event, value /* , args... */) {
            var args = Array.prototype.slice.call(arguments, 1),
                e = new MicroEvent.Event(),
                i, l;

            args.push(e);

            if (event in this._events) {
                for (i=0, l=this._events[event].length; i<l; i++) {
                    args[0] = value;
                    value = this._events[event][i].apply(this, args);
                    if (e.isPropagationStopped()) {
                        return value;
                    }
                }
            }

            return value;
        }
    };

    /**
     * Copy all MicroEvent.js functions in the destination object
     *
     * @param {Object} the object which will support MicroEvent
     * @param {Object} optional, strings map to rename methods
     */
    MicroEvent.mixin = function (obj, names) {
        names = names || {};
        var props = ['on', 'off', 'once', 'trigger', 'change'];

        for (var i=0, l=props.length; i<l; i++) {
            var method = names[props[i]] || props[i];

            if (typeof obj === 'function') {
                obj.prototype[method] = MicroEvent.prototype[props[i]];
            }
            else {
                obj[method] = MicroEvent.prototype[props[i]];
            }
        }

        Object.defineProperties(typeof obj === 'function' ? obj.prototype : obj, {
            '_events': {
                value: {},
                writable: true
            },
            '_once': {
                value: {},
                writable: true
            }
        });
    };

    return MicroEvent;
}));

/*!
 * jQuery.extendext 0.1.1
 *
 * Copyright 2014 Damien "Mistic" Sorel (http://www.strangeplanet.fr)
 * Licensed under MIT (http://opensource.org/licenses/MIT)
 *
 * Based on jQuery.extend by jQuery Foundation, Inc. and other contributors
 */


(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        define('jQuery.extendext', ['jquery'], factory);
    }
    else {
        factory(root.jQuery);
    }
}(this, function($) {
    "use strict";

    $.extendext = function() {
        var options, name, src, copy, copyIsArray, clone,
            target = arguments[0] || {},
            i = 1,
            length = arguments.length,
            deep = false,
            arrayMode = 'default';

        // Handle a deep copy situation
        if ( typeof target === "boolean" ) {
            deep = target;

            // Skip the boolean and the target
            target = arguments[ i++ ] || {};
        }

        // Handle array mode parameter
        if ( typeof target === "string" ) {
            arrayMode = $([target.toLowerCase(), 'default']).filter(['default','concat','replace','extend'])[0];

            // Skip the string param
            target = arguments[ i++ ] || {};
        }

        // Handle case when target is a string or something (possible in deep copy)
        if ( typeof target !== "object" && !$.isFunction(target) ) {
            target = {};
        }

        // Extend jQuery itself if only one argument is passed
        if ( i === length ) {
            target = this;
            i--;
        }

        for ( ; i < length; i++ ) {
            // Only deal with non-null/undefined values
            if ( (options = arguments[ i ]) !== null ) {
                // Special operations for arrays
                if ($.isArray(options) && arrayMode !== 'default') {
                    clone = target && $.isArray(target) ? target : [];

                    switch (arrayMode) {
                        case 'concat':
                            target = clone.concat( $.extend( deep, [], options ) );
                            break;

                        case 'replace':
                            target = $.extend( deep, [], options );
                            break;

                        case 'extend':
                            options.forEach(function(e, i) {
                                if (typeof e === 'object') {
                                    var type = $.isArray(e) ? [] : {};
                                    clone[i] = $.extendext( deep, arrayMode, clone[i] || type, e );

                                } else if (clone.indexOf(e) === -1) {
                                    clone.push(e);
                                }
                            });

                            target = clone;
                            break;
                    }

                } else {
                    // Extend the base object
                    for ( name in options ) {
                        src = target[ name ];
                        copy = options[ name ];

                        // Prevent never-ending loop
                        if ( target === copy ) {
                            continue;
                        }

                        // Recurse if we're merging plain objects or arrays
                        if ( deep && copy && ( $.isPlainObject(copy) ||
                            (copyIsArray = $.isArray(copy)) ) ) {

                            if ( copyIsArray ) {
                                copyIsArray = false;
                                clone = src && $.isArray(src) ? src : [];

                            } else {
                                clone = src && $.isPlainObject(src) ? src : {};
                            }

                            // Never move original objects, clone them
                            target[ name ] = $.extendext( deep, arrayMode, clone, copy );

                            // Don't bring in undefined values
                        } else if ( copy !== undefined ) {
                            target[ name ] = copy;
                        }
                    }
                }
            }
        }

        // Return the modified object
        return target;
    };
}));

/*!
 * jQuery RangeFilter
 * Copyright 2014-2015 Diogo Biolo D'Agostini
 * Licensed under MIT (http://opensource.org/licenses/MIT)
 */

var leftButtonDown = false;

(function($){
    "use strict";

    // CLASS DEFINITION
    // ===============================
    var RangeFilter = function($el, options) {
        this.$el = $el;
        this.init(options);
    };

    MicroEvent.mixin(RangeFilter);
	
    // DEFAULT CONFIG
    // ===============================
    RangeFilter.DEFAULTS = {
        filters: []
    };

    /**
     * Add new methods
     * @param {object}
     */
    RangeFilter.extend = function(methods) {
        $.extend(QueryBuilder.prototype, methods);
    };

    // PUBLIC METHODS
    // ===============================
    /**
     * Init the builder
     */
    RangeFilter.prototype.init = function(options) {
        // PROPERTIES
        this.settings = $.extendext(true, 'replace', {}, RangeFilter.DEFAULTS, options);

        this.filters = this.settings.filters;
        this.icons = this.settings.icons;
        this.year = new Array();
        this.month = new Array();
        this.day = new Array();

        // CHECK FILTERS
        if (!this.filters || this.filters.length < 1) {
            $.error('Missing filters list');
        }
        this.checkFilters();

        // ensure we have a container id
        if (!this.$el.attr('id')) {
            this.$el.attr('id', 'rf_'+Math.floor(Math.random()*99999));
            this.status.generatedId = true;
        }
        this.$el_id = this.$el.attr('id');
        this.$el.addClass('row');
        this.$el.addClass('range-filter');
        // INIT
        this.draw();
        this.bindEvents();
        this.prepareValues();
        this.trigger('afterInit');
    };

    /**
     * Destroy the plugin
     */
    RangeFilter.prototype.destroy = function() {
        this.trigger('beforeDestroy');

        if (this.status.generatedId) {
            this.$el.removeAttr('id');
        }

        this.$el.empty()
            .off('click.rangeFilter change.rangeFilter')
            .removeClass('reange-filter')
            .removeData('rangeFilter');
    };
	
    RangeFilter.prototype.getFilter = function() {
        return {
            year: this.year,
            month: this.month,
            day: this.day
        };
    };
	
    RangeFilter.prototype.draw = function() {
        this.$el.empty();
        this.$el.append(this.getYearInput());
        this.$el.append(this.getMonthInput());
        this.$el.append(this.getDayInput());
    };
	
    // MAIN METHODS
    // ===============================
    /**
     * Checks the configuration of each filter
     */
    RangeFilter.prototype.checkFilters = function() {
        var definedFilters = [],
            that = this;
        if (!that.filters.year){
            $.error('Missing filter year configuration');
        }
        if (!that.filters.year.start){
            $.error('Missing filter year start configuration');
        }
        if (!that.filters.year.finish){
            $.error('Missing filter year finish configuration');
        }
        if (!that.filters.month){
            $.error('Missing filter month configuration');
        }
        if (!that.filters.day){
            $.error('Missing filter day configuration');
        }
        this.trigger('afterCheckFilters');
    };

    /**
     * Add all events listeners
     */
    RangeFilter.prototype.prepareValues = function() {
        var that = this;
        that.year.clear();
        this.$el.find('.btn-year').each(function(item){
            var $element = $(this);
            if ($element.hasClass('btn-primary')){
                that.year.push($element.data('value'));
            }
        });
        that.month.clear();
        this.$el.find('.btn-month').each(function(item){
            var $element = $(this);
            if ($element.hasClass('btn-primary')){
                that.month.push($element.data('value'));
            }
        });
        that.day.clear();
        this.$el.find('.btn-day').each(function(item){
            var $element = $(this);
            if ($element.hasClass('btn-primary')){
                that.day.push($element.data('value'));
            }
        });
    },
	
    /**
     * Add all events listeners
     */
    RangeFilter.prototype.bindEvents = function() {
        var that = this;
		
        leftButtonDown = false;
        $(document).mousedown(function(e){
            // Left mouse button was pressed, set flag
            if(e.which === 1) leftButtonDown = true;
        });
        $(document).mouseup(function(e){
            // Left mouse button was released, clear flag
            if(e.which === 1) leftButtonDown = false;
        });
		
        this.$el.on('mouseenter', '.btn-year, .btn-month, .btn-day', function() {
            var $this = $(this);
            if (leftButtonDown){
                if ($this.hasClass('btn-primary')){
                    $this.removeClass('btn-primary');
                    $this.addClass('btn-default');
                } else {
                    $this.removeClass('btn-default');
                    $this.addClass('btn-primary');
                }
            }
        });

        this.$el.on('mousedown', '.btn-year, .btn-month, .btn-day', function() {
            var $this = $(this);
            if ($this.hasClass('btn-primary')){
                $this.removeClass('btn-primary');
                $this.addClass('btn-default');
            } else {
                $this.removeClass('btn-default');
                $this.addClass('btn-primary');
            }
        });
		
        this.$el.on('mouseup', '.btn-year, .btn-month, .btn-day', function() {
            var $this = $(this);
            that.prepareValues();
        });
		
        this.$el.on('click', '.btn-day-all', function() {
            var $this = $(this);
			
            var $list = that.$el.find('.btn-day');
            if ($this.hasClass('btn-primary')){
                $list.removeClass('btn-primary');
                $list.addClass('btn-default');
                $this.removeClass('btn-primary');
                $this.addClass('btn-default');
            } else {
                $list.removeClass('btn-default');
                $list.addClass('btn-primary');
                $this.removeClass('btn-default');
                $this.addClass('btn-primary');
            }
            that.prepareValues();
        });
    };

    // TEMPLATES
    // ===============================
    /**
     * Returns years input
     * @return {string}
     */
	RangeFilter.prototype.getYearInput = function() {
        var year = this.settings.filters.year;
        var btnclass = 'btn-default';
        var template = '<div class="col-md-3 col-year"><div class="row">';
        var checkSelected = false;
        if (year.visible){
            if (year.selected == '*'){
                btnclass = 'btn-primary';
            } else if ($.isArray(year.selected)){
                checkSelected = true;
            }
            var j=0;
            for(var i = year.start; i <= year.finish; i++){
                if (j >= 5){
                    template += '</div>';
                    template += '<div class="row">';
                    j = 0;
                }
				
                if (checkSelected){
                    if ($.inArray(i, year.selected) != -1){
                        btnclass = 'btn-primary';
                    }
                }
				
                template += '<button class="btn ' + btnclass + ' btn-xs btn-year" data-value="'+i+'">' + i + '</button>';
				
                if (checkSelected){
                    btnclass = 'btn-default';
                }
                j++;
            }
        }
        template += '</div></div>';
        return template;
    }
	
    /**
     * Returns months input
     * @return {string}
     */
	RangeFilter.prototype.getMonthInput = function() {
        var month = this.settings.filters.month;
        var btnclass = 'btn-default';
        var template = '<div class="col-md-3 col-month"><div class="row">';
        var checkSelected = false;
        if (month.visible){
            if (month.selected == '*'){
                btnclass = 'btn-primary';
            } else if ($.isArray(month.selected)){
                checkSelected = true;
            }
			
            var months = new Array();
            months[0] = "Jan";
            months[1] = "Fev";
            months[2] = "Mar";
            months[3] = "Abr";
            months[4] = "Mai";
            months[5] = "Jun";
            months[6] = "Jul";
            months[7] = "Ago";
            months[8] = "Set";
            months[9] = "Out";
            months[10] = "Nov";
            months[11] = "Dez";
			
            var j=0;
            for(var i = 0; i <= 11; i++){
                if (j >= 6){
                    template += '</div>';
                    template += '<div class="row">';
                    j = 0;
                }

                if (checkSelected){
                    if ($.inArray(i+1, month.selected) != -1){
                        btnclass = 'btn-primary';
                    }
                }
				
                template += '<button class="btn '  + btnclass + ' btn-xs btn-month" data-value="'+(i+1)+'">' + months[i] + '</button>';
				
                if (checkSelected){
                    btnclass = 'btn-default';
                }
                j++;
            }
        }
        template += '</div></div>';
        return template;
    }

    /**
     * Returns days input
     * @return {string}
     */
	RangeFilter.prototype.getDayInput = function() {
        var day = this.settings.filters.day;
        var btnclass = 'btn-default';
        var template = '<div class="col-md-5 col-day"><div class="row">';
        var checkSelected = false;
        if (day.visible){
            if (day.selected == '*'){
                btnclass = 'btn-primary';
            } else if ($.isArray(day.selected)){
                checkSelected = true;
            }

            var j=0;
            for(var i = 1; i <= 31; i++){
                if (j >= 16){
                    template += '</div>';
                    template += '<div class="row">';
                    j = 0;
                }
                if (checkSelected){
                    if ($.inArray(i, day.selected) != -1){
                        btnclass = 'btn-primary';
                    }
                }
				
                template += '<button class="btn ' + btnclass + ' btn-xs btn-day" data-value="'+i+'">' + i + '</button>';
				
                if (checkSelected){
                    btnclass = 'btn-default';
                }
                j++;
            }
            template += '<button class="btn ' + btnclass + ' btn-xs btn-day-all">T</button>';
        }
        template += '</div></div>';
        return template;
    }
	
    // JQUERY PLUGIN DEFINITION
    // ===============================
    $.fn.rangeFilter = function(option) {
        if (this.length > 1) {
            $.error('Unable to initialize on multiple target');
        }

        var data = this.data('rangeFilter'),
            options = (typeof option == 'object' && option) || {};

        if (!data && option == 'destroy') {
            return this;
        }
        if (!data) {
            this.data('rangeFilter', new RangeFilter(this, options));
        }
        if (typeof option == 'string') {
            return data[option].apply(data, Array.prototype.slice.call(arguments, 1));
        }

        return this;
    };

    $.fn.rangeFilter.defaults = {
        set: function(options) {
            $.extendext(true, 'replace', RangeFilter.DEFAULTS, options);
        },
        get: function(key) {
            var options = RangeFilter.DEFAULTS;
            if (key) {
                options = options[key];
            }
            return $.extend(true, {}, options);
        }
    };

    $.fn.rangeFilter.constructor = RangeFilter;
    $.fn.rangeFilter.extend = RangeFilter.extend;
    $.fn.rangeFilter.define = RangeFilter.define;

    // UTILITIES
    // ===============================
    /**
     * Utility to iterate over radio/checkbox/selection options.
     * it accept three formats: array of values, map, array of 1-element maps
     *
     * @param options {object|array}
     * @param tpl {callable} (takes key and text)
     */
    function iterateOptions(options, tpl) {
        if (options) {
            if ($.isArray(options)) {
                $.each(options, function(index, entry) {
                    // array of one-element maps
                    if ($.isPlainObject(entry)) {
                        $.each(entry, function(key, val) {
                            tpl(key, val);
                            return false; // break after first entry
                        });
                    }
                    // array of values
                    else {
                        tpl(index, entry);
                    }
                });
            }
            // unordered map
            else {
                $.each(options, function(key, val) {
                    tpl(key, val);
                });
            }
        }
    }

    /**
     * Replaces {0}, {1}, ... in a string
     * @param str {string}
     * @param args,... {string|int|float}
     * @return {string}
     */
    function fmt(str, args) {
        args = Array.prototype.slice.call(arguments);

        return str.replace(/{([0-9]+)}/g, function(m, i) {
            return args[parseInt(i)+1];
        });
    }
	
	Array.prototype.clear = function() {
	  while (this.length > 0) {
		this.pop();
	  }
	};	

}(jQuery));