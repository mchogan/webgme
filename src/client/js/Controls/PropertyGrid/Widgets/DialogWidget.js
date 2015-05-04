/*globals define, _, $*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/Controls/PropertyGrid/Widgets/WidgetBase'], function (WidgetBase) {

    'use strict';

    var DialogWidget,
        LABEL_BASE = $('<span/>', {}),
        BTN_DIALOG_OPEN_BASE = $('<a class="btn btn-mini btn-dialog-open">...</a>');

    DialogWidget = function (propertyDesc) {
        var self = this;

        DialogWidget.superclass.call(this, propertyDesc);

        this.__label = LABEL_BASE.clone();
        this.el.append(this.__label);

        if (propertyDesc.dialog) {
            this.__btnDialogOpen = BTN_DIALOG_OPEN_BASE.clone();
            this.el.append(this.__btnDialogOpen);

            this.__btnDialogOpen.on('click', function (e) {
                var D = propertyDesc.dialog,
                    dialog = new D();

                e.stopPropagation();
                e.preventDefault();

                dialog.show(function (newValue) {
                        self.setValue(newValue);
                        self.fireFinishChange();
                    },
                    self.getValue());
            });
        }

        this.updateDisplay();
    };

    DialogWidget.superclass = WidgetBase;

    _.extend(
        DialogWidget.prototype,
        WidgetBase.prototype
    );

    DialogWidget.prototype.updateDisplay = function () {
        this.__label.text(this.propertyValue);
        this.__label.attr('title', this.propertyValue);
        return DialogWidget.superclass.prototype.updateDisplay.call(this);
    };

    DialogWidget.prototype.setReadOnly = function (isReadOnly) {
        DialogWidget.superclass.prototype.setReadOnly.call(this, isReadOnly);

        if (this.__btnDialogOpen) {
            if (isReadOnly === true) {
                this.__btnDialogOpen.disable(true);
            } else {
                this.__btnDialogOpen.disable(false);
            }
        }
    };

    return DialogWidget;

});