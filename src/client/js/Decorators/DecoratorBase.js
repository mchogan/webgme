/*globals define, _, requirejs, WebGMEGlobal, Raphael*/

define(['logManager'], function (logManager) {

    "use strict";

    var DecoratorBase,
        DECORATOR_ID = "DecoratorBase";

    DecoratorBase = function (params) {

        this.logger = logManager.create(params.loggerName || this.DECORATORID);

        this.supportedWidgetMap = {};

        this.initializeSupportedWidgetMap();

        this.logger.debug("Created");
    };

    DecoratorBase.prototype.DECORATORID = DECORATOR_ID;

    /*
     * Initializes this.supportedWidgetMap to declare what widgets are supported by this decorator
     * #1: If this decorator supports a widget then this.supportedWidgetMap[widget] = decoratorClass
     *
     * #2: If this decorator does not want to support a widget but wants to define a fallback decorator list
     * this.supportedWidgetMap[widget] = ['decorator1', 'decorator2', ...]
     *
     * #3: If this decorator does not support a widget neither wants to specify fallback decorators
     * then do not create an entry for this.supportedWidgetMap[widget]
     */
    DecoratorBase.prototype.initializeSupportedWidgetMap = function () {
    };


    DecoratorBase.prototype.getDecoratorForWidget = function (widget) {
        return this.supportedWidgetMap[widget];
    };


    return DecoratorBase;
});
