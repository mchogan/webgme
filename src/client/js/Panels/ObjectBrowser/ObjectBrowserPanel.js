/*globals define, Raphael, window, WebGMEGlobal, _, angular*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */


define(
    ['js/PanelBase/PanelBase',
        'js/Constants',
        './TreeBrowserControl',
        './InheritanceBrowserControl',
        './CrosscutBrowserControl',
        'js/Widgets/TreeBrowser/TreeBrowserWidget',


        'ui-components/TreeNavigator/TreeNavigator',
        './TreeNavigatorController',

        'css!./styles/ObjectBrowserPanel.css'], function (
        PanelBase,
        CONSTANTS,
        TreeBrowserControl,
        InheritanceBrowserControl,
        CrosscutBrowserControl,
        TreeBrowserWidget,

        TreeNavigator,
        TreeNavigatorController

        ) {

        "use strict";


        angular.module(
                'objectBrowserPanel', ['isis.ui.treeNavigator']
            ).run(
            function (
                ) {

            }
        );

        var ObjectBrowserPanel,
            __parent__ = PanelBase,
            OBJECT_BROWSER_CLASS = 'object-browser';

        ObjectBrowserPanel = function (
            layoutManager,
            params
            ) {
            var options = {};
            //set properties from options
            options[PanelBase.OPTIONS.LOGGER_INSTANCE_NAME] = "ObjectBrowserPanel";
            options[PanelBase.OPTIONS.HEADER_TITLE] = true;

            //call parent's constructor
            __parent__.apply(
                this, [options, layoutManager]
            );

            this._client = params.client;

            //initialize UI
            this._initialize(
            );

            this.logger.debug(
                "ObjectBrowserPanel ctor finished"
            );
        };

        //inherit from PanelBase
        _.extend(
            ObjectBrowserPanel.prototype, __parent__.prototype
        );

        ObjectBrowserPanel.prototype._initialize = function (
            ) {
            var compositionTreeBrowserWidget,
                compositionTreeBrowserControl,
                inheritanceTreeBrowserWidget,
                inheritanceTreeBrowserControl,
                crosscutTreeBrowserWidget,
                crosscutTreeBrowserControl,

                treeNavigatorHtml;


            this.$el.addClass(
                OBJECT_BROWSER_CLASS
            );

            // TODO: would be nice to get the app as a parameter
            var app = angular.module('gmeApp');
            app.controller('TreeNavigatorController', TreeNavigatorController);


            treeNavigatorHtml = '<div data-ng-controller="TreeNavigatorController">' +
                '<tree-navigator ' +
                'tree-data="treeData" ' +
                'config="config" ' +
                'context-menu-data="contextMenuData" ' +
                'state="state" ' +
                '></tree-navigator></div>';

//            this.$el.html(
//                '<ul class="nav nav-tabs">' +
//                    '<li class="active"><a href="#composition" data-toggle="tab">Composition</a></li>' +
//                    '<li class=""><a href="#inheritance" data-toggle="tab">Inheritance</a></li>' +
//                    '<li class=""><a href="#crosscut" data-toggle="tab">Crosscut</a></li>' +
//                    '</ul>' + '<div class="tab-content">' +
//                    '<div class="tab-pane active" id="composition">' + treeNavigatorHtml + '</div>' +
//                    '<div class="tab-pane" id="inheritance">inheritance</div>' +
//                    '<div class="tab-pane" id="crosscut">crosscut</div>' +
//                    '</div>'
//            );


            this.$el.html(treeNavigatorHtml);

//            compositionTreeBrowserWidget = new TreeBrowserWidget(
//                this.$el.find(
//                        'div#composition'
//                    ).first(
//                    )
//            );
//
//            compositionTreeBrowserControl = new TreeBrowserControl(
//                this._client, compositionTreeBrowserWidget
//            );

            inheritanceTreeBrowserWidget = new TreeBrowserWidget(
                this.$el.find(
                        'div#inheritance'
                    ).first(
                    )
            );
            inheritanceTreeBrowserControl = new InheritanceBrowserControl(
                this._client, inheritanceTreeBrowserWidget
            );

            crosscutTreeBrowserWidget = new TreeBrowserWidget(
                this.$el.find(
                        'div#crosscut'
                    ).first(
                    )
            );
            crosscutTreeBrowserControl = new CrosscutBrowserControl(
                this._client, crosscutTreeBrowserWidget
            );
        };

        return ObjectBrowserPanel;
    }
);
