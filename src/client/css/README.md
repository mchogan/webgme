# Z-index map

div.part .circle-decorator .circle-shadow,
div.designer-item .circle-decorator .circle-shadow {
    z-index: -1;
}

.context-menu-submenu:after,
.ui-slider .ui-slider-range {
    z-index: 1;
}

.btn-group-vertical > .btn.active,
.input-group .form-control,
.ui-slider .ui-slider-handle,

.input-group-btn > .btn:hover,
.input-group-btn > .btn:focus,
.input-group-btn > .btn:active,

.pagination > .active > a,
.pagination > .active > span,
.pagination > .active > a:hover,
.pagination > .active > span:hover,
.pagination > .active > a:focus,
.pagination > .active > span:focus

a.list-group-item.active,
a.list-group-item.active:hover,
a.list-group-item.active:focus

{
    z-index: 2;
}

.carousel-control .icon-prev,
.carousel-control .icon-next,
.carousel-control .glyphicon-chevron-left,
.carousel-control .glyphicon-chevron-right {
    z-index: 5;
}


.model-decorator .ports,
.model-decorator .connector,
.meta-decorator .connector,
.default-decorator .connector,
.designer-item .modelica-decorator .connector,
.designer-item .svg-decorator .connector,
.uml-state-machine .initial-state .connector,
.uml-state-machine .end-state .connector
.uml-state-machine .connector,
.uml-state-machine .initial-state .connector,
.uml-state-machine .end-state .connector,
.uml-state-machine .connector,

.carousel-caption
{
    z-index: 10;
}

.diagram-designer .items .connection-connector.connector,
.diagram-designer .items .c-d-end,
.context-menu-list,
.ui-layout-south,
.ui-layout-north{
    z-index: 10 !important;
}

.carousel-indicators {
    z-index: 15;
}

.diagram-designer .items .selection-outline,
.ui-selectable-helper,
.ui-front {
	z-index: 100;
}

.dropdown-backdrop {
    z-index: 990;
}

.navbar-static-top,
.dropdown-menu,
.tree-navigator .context-menu,
.split-panel .splitter,
#context-menu,
#context-menu-layer {
 z-index: 1000;

}

.popover,
.tooltip,
.navbar-fixed-top,
.navbar-fixed-bottom {
    z-index: 1030;
}

.modal-backdrop {
    z-index: 1040;
}

.modal {
    z-index: 1050;
}

.ui-tooltip {
    z-index: 9999;
}

.loader-bg {
    z-index: 12000;
}

.diagram-designer .items .rubberband {
    z-index: 100000;
}