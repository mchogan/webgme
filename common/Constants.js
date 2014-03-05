"use strict";
/*
 * STRING CONSTANT DEFINITIONS USED IN BOTH CLIENT AND SERVER JAVASCRIPT
 */

define([], function () {

    //return string constants
    return {
        /*
         * TERRITORY EVENTS
         */
        TERRITORY_EVENT_LOAD : 'load',
        TERRITORY_EVENT_UPDATE : 'update',
        TERRITORY_EVENT_UNLOAD : 'unload',

        /*
         * GME_ID: wherever a GME object ID needs to be present
         */
        GME_ID: 'GME_ID',

        /*
         * DEDICATED GME OBJECT IDs
         */
        PROJECT_ROOT_ID: '',
        PROJECT_FCO_ID: 'FCO_ID',

        /*
         * Dedicated POINTER names
         */
         POINTER_SOURCE : 'src',     //dedicated connection source pointer name
         POINTER_TARGET : 'dst',     //dedicated connection target pointer name
         POINTER_BASE: 'base'  //dedicated inheritance pointer name
    };
});