/**
 * Created by tkecskes on 1/19/2015.
 */
define([ "util/assert", "core/tasync" ], function(ASSERT, TASYNC) {
  "use strict";
  var OVERLAYS = "ovr";
  var HASH_REGEXP = new RegExp("#[0-9a-f]{40}");
  var isValidHash = function (key) {
    return typeof key === "string" && key.length === 41 && HASH_REGEXP.test(key);
  };
  var RootLoader = function(innerCore){
    var core = {},
      key;
    for ( key in innerCore) {
      core[key] = innerCore[key];
    }

    core.loadRoot = function(rootHash){
      //This function loads the root and all hashed sub-objects
      // right now we HASH-es the direct children of the OVR of the root
      var root = innerCore.loadRoot(rootHash),
        loadOvrChildren = function(object){
          //here the object is the root
          var OVR = core.getChild(object,OVERLAYS), i,children,done,child;
          children = core.getKeys(OVR);
          for(i=0;i<children.length;i++){
            done = TASYNC.call(core.loadChild,OVR,children[i]);
          }
          return TASYNC.call(function(){
            //now all of OVR children have been loaded
            var i,children,child;
            children = core.getKeys(OVR);
            for(i=0;i<children.length;i++){
              core.setHashed(core.getChild(OVR,children[i]),true);
            }
            return root;
          });
        };

      return TASYNC.call(loadOvrChildren,root);
    };
    return core;
  };
  return RootLoader;
});