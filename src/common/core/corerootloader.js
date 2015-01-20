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
      return TASYNC.call(function(root){
        var OVR = core.getChild(root,OVERLAYS),
          keys = core.getKeys(OVR),
          i,done,toHashed=[];
        for(i=0;i<keys.length;i++){
          if(!isValidHash(core.getChild(OVR,keys[i]).data)){
            toHashed.push(keys[i]);
          }
        }
        for(i=0;i<keys.length;i++){
          done = TASYNC.call(function(ovrChild){
            if(toHashed.indexOf(core.getRelid(ovrChild)) !== -1){
              core.setHashed(ovrChild,true);
            }
            //core.setHashed(ovrChild,true);
          },core.loadChild(OVR,keys[i]),done);
        }
        return TASYNC.call(function(){
          return root;
        },done);
      },innerCore.loadRoot(rootHash));
    };

    //core.loadRoot = innerCore.loadRoot;

    return core;
  };
  return RootLoader;
});