/*
 * Copyright (C) 2014 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */
define(['util/canon', 'core/tasync', 'util/assert'], function (CANON, TASYNC, ASSERT) {
  "use strict";


  function diffCore(_innerCore) {
    var _core = {},
      _yetToCompute = {},
      _DIFF = {},
      _needChecking = true,
      _rounds = 0,
      TODELETESTRING = "*to*delete*",
    /*EMPTYGUID = "00000000-0000-0000-0000-000000000000",
     EMPTYNODE = _innerCore.createNode({base: null, parent: null, guid: EMPTYGUID}),*/
      toFrom = {}, //TODO should not be global
      fromTo = {}, //TODO should not be global
      _concat_dictionary,
      _concat_result,
      _diff_moves = {},
      _conflict_items = [],
      _conflict_parents = {},
      _conflict_mine,
      _conflict_theirs,
      _concat_base,
      _concat_extension,
      _concat_base_removals,
      _concat_moves,
      _resolve_moves;

    for (var i in _innerCore) {
      _core[i] = _innerCore[i];
    }

    function normalize(obj) {
      if (!obj) {
        return obj;
      }
      var keys = Object.keys(obj),
        i;
      for (i = 0; i < keys.length; i++) {
        /*if (Array.isArray(obj[keys[i]])) {
          if (obj[keys[i]].length === 0) {
            delete obj[keys[i]];
          }*/
        if(Array.isArray(obj[keys[i]])) {
          //do nothing, leave the array as is
        } else if(obj[keys[i]] === undefined) {
          delete obj[keys[i]]; //there cannot be undefined in the object
        } else if (typeof obj[keys[i]] === 'object'){
          normalize(obj[keys[i]]);
          if (obj[keys[i]] && Object.keys(obj[keys[i]]).length === 0) {
            delete obj[keys[i]];
          }
        }
      }
      keys = Object.keys(obj);
      if(keys.length === 1){
        //it only has the GUID, so the node doesn't changed at all
        delete obj.guid;
      }
    }

    function attr_diff(source, target) {
      var sNames = _core.getOwnAttributeNames(source),
        tNames = _core.getOwnAttributeNames(target),
        i,
        diff = {};

      for (i = 0; i < sNames.length; i++) {
        if (tNames.indexOf(sNames[i]) === -1) {
          diff[sNames[i]] = TODELETESTRING;
        }
      }

      for (i = 0; i < tNames.length; i++) {
        if (_core.getAttribute(source, tNames[i]) === undefined) {
          diff[tNames[i]] = _core.getAttribute(target, tNames[i]);
        } else {
          if (CANON.stringify(_core.getAttribute(source, tNames[i])) !== CANON.stringify(_core.getAttribute(target, tNames[i]))) {
            diff[tNames[i]] = _core.getAttribute(target, tNames[i]);
          }
        }
      }

      return diff;
    }

    function reg_diff(source, target) {
      var sNames = _core.getOwnRegistryNames(source),
        tNames = _core.getOwnRegistryNames(target),
        i,
        diff = {};

      for (i = 0; i < sNames.length; i++) {
        if (tNames.indexOf(sNames[i]) === -1) {
          diff[sNames[i]] = TODELETESTRING;
        }
      }

      for (i = 0; i < tNames.length; i++) {
        if (_core.getRegistry(source, tNames[i]) === undefined) {
          diff[tNames[i]] = _core.getRegistry(target, tNames[i]);
        } else {
          if (CANON.stringify(_core.getRegistry(source, tNames[i])) !== CANON.stringify(_core.getRegistry(target, tNames[i]))) {
            diff[tNames[i]] = _core.getRegistry(target, tNames[i]);
          }
        }
      }

      return diff;
    }

    function children_diff(source, target) {
      var sRelids = _core.getChildrenRelids(source),
        tRelids = _core.getChildrenRelids(target),
        tHashes = _core.getChildrenHashes(target),
        sHashes = _core.getChildrenHashes(source),
        i,
        diff = {added: [], removed: []};

      for (i = 0; i < sRelids.length; i++) {
        if (tRelids.indexOf(sRelids[i]) === -1) {
          diff.removed.push({relid: sRelids[i], hash: sHashes[sRelids[i]]});
        }
      }

      for (i = 0; i < tRelids.length; i++) {
        if (sRelids.indexOf(tRelids[i]) === -1) {
          diff.added.push({relid: tRelids[i], hash: tHashes[tRelids[i]]});
        }
      }

      return diff;

    }

    function pointer_diff(source, target) {
      var getPointerData = function(node){
        var data = {},
        names = _core.getPointerNames(node),
        i;
        for(i=0;i<names.length;i++){
          data[names[i]] = _core.getPointerPath(node,names[i]);
        }
        return data;
      }, 
      sPointer = getPointerData(source), 
      tPointer = getPointerData(target);

      if(CANON.stringify(sPointer) !== CANON.stringify(tPointer)){
        return {source: sPointer,target:tPointer};
      }
      return {};
    }

    function set_diff(source,target){
      var getSetData = function(node){
        var data = {},
        names,targets,keys,i,j,k;

        names = _core.getSetNames(node);
        for(i=0;i<names.length;i++){
          data[names[i]] = {};
          targets = _core.getMemberPaths(node,names[i]);
          for(j=0;j<targets.length;j++){
            data[names[i]][targets[j]] = {attr:{},reg:{}};
            keys = _core.getMemberOwnAttributeNames(node,names[i],targets[j]);
            for(k=0;k<keys.length;k++){
              data[names[i]][targets[j]].attr[keys[i]] = _core.getMemberAttribute(node,names[i],targets[j],keys[i]);
            }
            keys = _core.getMemberRegistryNames(node,names[i],targets[j]);
            for(k=0;k<keys.length;k++){
              data[names[i]][targets[j]].reg[keys[k]] = _core.getMemberRegistry(node,names[i],targets[j],keys[k]);
            }
          }
        }

        return data;

      },
      sSet = getSetData(source),
      tSet = getSetData(target);

      if(CANON.stringify(sSet) !== CANON.stringify(tSet)){
        return {source:sSet,target:tSet};
      }
      return {};
    }
    function _set_diff(source, target) {
      var sNames = _core.getSetNames(source),
        tNames = _core.getSetNames(target),
        sMembers, tMembers, i, j, memberDiff, sData, tData,
        diff = {},
        getMemberData = function (node, setName, memberPath) {
          var keys,
            data = {attr: {}, reg: {}},
            i;

          keys = _core.getMemberOwnAttributeNames(node, setName, memberPath);
          for (i = 0; i < keys.length; i++) {
            data.attr[keys[i]] = _core.getMemberAttribute(node, setName, memberPath, keys[i]);
          }

          keys = _core.getMemberOwnRegistryNames(node, setName, memberPath);
          for (i = 0; i < keys.length; i++) {
            data.attr[keys[i]] = _core.getMemberRegistry(node, setName, memberPath, keys[i]);
          }

          return data;
        };

      for (i = 0; i < sNames.length; i++) {
        if (tNames.indexOf(sNames[i]) === -1) {
          diff[sNames[i]] = TODELETESTRING;
        }
      }

      for (i = 0; i < tNames.length; i++) {
        if (sNames.indexOf(tNames[i]) === -1) {
          sMembers = [];
        } else {
          sMembers = _core.getMemberPaths(source, tNames[i]);
        }
        tMembers = _core.getMemberPaths(target, tNames[i]);
        memberDiff = {};
        for (j = 0; j < sMembers.length; j++) {
          if (tMembers.indexOf(sMembers[j]) === -1) {
            memberDiff[sMembers[j]] = TODELETESTRING;
          }
        }

        for (j = 0; j < tMembers.length; j++) {
          sData = sMembers.indexOf(tMembers[j]) === -1 ? {} : getMemberData(source, tNames[i], tMembers[j]);
          tData = getMemberData(target, tNames[i], tMembers[j]);
          if (CANON.stringify(sData) !== CANON.stringify(tData)) {
            memberDiff[tMembers[j]] = getMemberData(target, tNames[i], tMembers[j]);
          }
        }
        diff[tNames[i]] = memberDiff;
      }

      return diff;
    }
    function ovr_diff(source,target){
      var getOvrData = function(node){
        var paths,names,i,j,
        ovr = _core.getProperty(node, 'ovr') || {},
        data = {},
        base = _core.getPath(node);

        paths = Object.keys(ovr);
        for(i=0;i<paths.length;i++){
          if(paths[i].indexOf('_') === -1){
            data[paths[i]] = {};
            names = Object.keys(ovr[paths[i]]);
            for(j=0;j<names.length;j++){
              if(ovr[paths[i]][names[j]] === "/_nullptr"){
                data[paths[i]][names[j]] = null;
              }else if(names[j].slice(-4) !== '-inv' && ovr[paths[i]][names[j]].indexOf('_') === -1){
                data[paths[i]][names[j]] = _core.joinPaths(base,ovr[paths[i]][names[j]]);
              }
            }
          }
        }
        return data;
      },
      sOvr = getOvrData(source),
      tOvr = getOvrData(target);

      if(CANON.stringify(sOvr) !== CANON.stringify(tOvr)){
        return {source:sOvr,target:tOvr};
      }
      return {};
    }

    function _ovr_diff(source, target) {
      // structure: path:{pointername:"targetpath"}
      // diff structure: path:{pointername:{target:path,type:updated/removed/added}}
      var i, j, paths, pNames,
        diff = {},
        basePath = _core.getPath(source),
        sOvr = _core.getProperty(source, 'ovr') || {},
        tOvr = _core.getProperty(target, 'ovr') || {};

      //removals
      paths = Object.keys(sOvr);
      for (i = 0; i < paths.length; i++) {
        if (paths[i].indexOf("_") === -1) {
          //we do not care about technical relations - sets are handled elsewhere
          pNames = Object.keys(sOvr[paths[i]]);
          for (j = 0; j < pNames.length; j++) {
            if (pNames[j].slice(-4) !== "-inv") {
              //we only care about direct pointer changes and to real nodes
              if (sOvr[paths[i]][pNames[j]].indexOf("_") === -1) {
                if (!(tOvr[paths[i]] && tOvr[paths[i]][pNames[j]])) {
                  diff[paths[i]] = diff[paths[i]] || {};
                  diff[paths[i]][pNames[j]] = {target: null, type: "removed"};
                }
              }

            }
          }
        }

      }

      //updates and additions
      paths = Object.keys(tOvr);
      for (i = 0; i < paths.length; i++) {
        if (paths[i].indexOf("_") === -1) {
          //we do not care about technical relations - sets are handled elsewhere
          pNames = Object.keys(tOvr[paths[i]]);
          for (j = 0; j < pNames.length; j++) {
            if (pNames[j].slice(-4) !== "-inv") {
              //we only care about direct pointer changes and to real nodes
              if (tOvr[paths[i]][pNames[j]].indexOf("_") === -1) {
                if (!(sOvr[paths[i]] && sOvr[paths[i]][pNames[j]])) {
                  diff[paths[i]] = diff[paths[i]] || {};
                  diff[paths[i]][pNames[j]] = {target: _core.joinPaths(basePath, tOvr[paths[i]][pNames[j]]), type: "added"};
                } else if (sOvr[paths[i]][pNames[j]] !== tOvr[paths[i]][pNames[j]]) {
                  diff[paths[i]] = diff[paths[i]] || {};
                  diff[paths[i]][pNames[j]] = {target: _core.joinPaths(basePath, tOvr[paths[i]][pNames[j]]), type: "updated"};
                }
              }
            }
          }
        }

      }

      return diff;
    }

    function meta_diff(source, target) {
      var sMeta = _core.getOwnMetaInJson(source),
      tMeta = _core.getOwnMetaInJson(target);
      if (CANON.stringify(sMeta) !== CANON.stringify(tMeta)) {
        return {source: sMeta, target: tMeta};
      }
      return {};
    }

    function combineMoveIntoMetaDiff(diff){
      var keys = Object.keys(diff),
      i;
      for(i=0;i<keys.length;i++){
        if(_diff_moves[keys[i]]){
          diff[_diff_moves[keys[i]]] = diff[keys[i]];
          delete diff[keys[i]];
        } else if(typeof diff[keys[i]] === 'object'){
          combineMoveIntoMetaDiff(diff[keys[i]]);
        }
      }
    }
    function combineMoveIntoPointerDiff(diff){
      var keys = Object.keys(diff),
      i;
      for(i=0;i<keys.length;i++){
        if(_diff_moves[diff[keys[i]]]){
         diff[keys[i]] = _diff_moves[diff[keys[i]]];
        }
      }
    }

    function finalizeDiff(){
      finalizeMetaDiff(_DIFF);
      finalizePointerDiff(_DIFF);
      finalizeSetDiff(_DIFF);
      normalize(_DIFF);
    } 
    function finalizeMetaDiff(diff){
      //at this point _DIFF is ready and the _diff_moves is complete...
      var relids = getDiffChildrenRelids(diff),
      i,sMeta,tMeta;
      if(diff.meta){
        sMeta = diff.meta.source || {};
        tMeta = diff.meta.target || {};
        combineMoveIntoMetaDiff(sMeta);
        diff.meta = diffObjects(sMeta,tMeta);  
      }
      for(i=0;i<relids.length;i++){
        finalizeMetaDiff(diff[relids[i]]);
      }
    }
    function finalizePointerDiff(diff){
      var relids = getDiffChildrenRelids(diff),
      i,sPointer,tPointer;
      if(diff.pointer){
        sPointer = diff.pointer.source || {};
        tPointer = diff.pointer.target || {};
        /*if(diff.movedFrom && !sPointer.base && tPointer.base){
          delete tPointer.base;
        }*/
        combineMoveIntoPointerDiff(sPointer);
        diff.pointer = diffObjects(sPointer,tPointer);
      }
      for(i=0;i<relids.length;i++){
        finalizePointerDiff(diff[relids[i]]);
      } 
    }
    function finalizeSetDiff(diff){
      var relids = getDiffChildrenRelids(diff),
      i,sSet,tSet;
      if(diff.set){
        sSet = diff.set.source || {};
        tSet = diff.set.target || {};
        combineMoveIntoMetaDiff(sSet);
        diff.set = diffObjects(sSet,tSet);
      }
      for(i=0;i<relids.length;i++){
        finalizeSetDiff(diff[relids[i]]);
      }
    }

    function isEmptyDiff(diff) {
      if (diff.removed && diff.removed.length > 0) {
        return false;
      }
      if (diff.added && (diff.added.length > 0 || Object.keys(diff.added).length > 0)) {
        return false;
      }
      if (diff.updated && Object.keys(diff.updated).length > 0) {
        return false;
      }
      return true;
    }

    function isEmptyNodeDiff(diff) {
      if (
        Object.keys(diff.children || {}).length > 0 ||
        Object.keys(diff.attr || {}).length > 0 ||
        Object.keys(diff.reg || {}).length > 0 ||
        Object.keys(diff.pointer || {}).length > 0 ||
        Object.keys(diff.set || {}).length > 0 ||
        diff.meta
        ) {
        return false;
      }
      return true;
    }

    function getPathOfDiff(diff, path) {
      var pathArray = (path || "").split('/'),
        i;
      pathArray.shift();
      for (i = 0; i < pathArray.length; i++) {
        diff[pathArray[i]] = diff[pathArray[i]] || {};
        diff = diff[pathArray[i]];
      }

      return diff;
    }

    function extendDiffWithOvr(diff,oDiff){
      var i,paths,names, j, tDiff;
      //first extend sources
      paths = Object.keys(oDiff.source || {});
      for(i=0;i<paths.length;i++){
        tDiff = getPathOfDiff(diff, paths[i]);
        if(!tDiff.removed === true){
          tDiff.pointer = tDiff.pointer || {source:{},target:{}};
          names = Object.keys(oDiff.source[paths[i]]);
          for(j=0;j<names.length;j++){
            tDiff.pointer.source[names[j]] = oDiff.source[paths[i]][names[j]];
          }
        }
      }
      //then targets
      paths = Object.keys(oDiff.target || {});
      for(i=0;i<paths.length;i++){
        tDiff = getPathOfDiff(diff, paths[i]);
        if(!tDiff.removed === true){
          tDiff.pointer = tDiff.pointer || {source:{},target:{}};
          names = Object.keys(oDiff.target[paths[i]]);
          for(j=0;j<names.length;j++){
            tDiff.pointer.target[names[j]] = oDiff.target[paths[i]][names[j]];
          }
        }
      }
    }
    function _extendDiffWithOvr(diff, oDiff) {
      var i, j, keys = Object.keys(oDiff || {}),
        names, tDiff, oDiffObj;
      for (i = 0; i < keys.length; i++) {
        tDiff = getPathOfDiff(diff, keys[i]);
        if (tDiff.removed !== true) {
          names = Object.keys(oDiff[keys[i]]);
          for (j = 0; j < names.length; j++) {
            oDiffObj = oDiff[keys[i]][names[j]];
            if (oDiffObj.type === 'added' || oDiffObj.type === 'updated') {
              tDiff.pointer = tDiff.pointer || {};
              tDiff.pointer[names[j]] = oDiffObj.target;
            } else if (!tDiff.pointer || !tDiff.pointer[names[j]]) {
              tDiff.pointer = tDiff.pointer || {};
              tDiff.pointer[names[j]] = TODELETESTRING;
            }
          }
        }
      }
    }

    function updateDiff(sourceRoot, targetRoot) {
      var sChildrenHashes = _core.getChildrenHashes(sourceRoot),
        tChildrenHAshes = _core.getChildrenHashes(targetRoot),
        sRelids = Object.keys(sChildrenHashes),
        tRelids = Object.keys(tChildrenHAshes),
        diff = _core.nodeDiff(sourceRoot, targetRoot) || {},
        oDiff = ovr_diff(sourceRoot, targetRoot),
        getChild = function (childArray, relid) {
          for (var i = 0; i < childArray.length; i++) {
            if (_core.getRelid(childArray[i]) === relid) {
              return childArray[i];
            }
          }
          return null;
        };
      return TASYNC.call(function (sChildren, tChildren) {
        ASSERT(sChildren.length >= 0 && tChildren.length >= 0);

        var i, child, done, tDiff, guid, base;

        tDiff = diff.children ? diff.children.removed || [] : [];
        for (i = 0; i < tDiff.length; i++) {
          diff.childrenListChanged = true;
          child = getChild(sChildren, tDiff[i].relid);
          if(child){
            guid = _core.getGuid(child);
            diff[tDiff[i].relid] = {guid: guid, removed: true, hash: _core.getHash(child)};
            _yetToCompute[guid] = _yetToCompute[guid] || {};
            _yetToCompute[guid].from = child;
            _yetToCompute[guid].fromExpanded = false;
          }
        }

        tDiff = diff.children ? diff.children.added || [] : [];
        for (i = 0; i < tDiff.length; i++) {
          diff.childrenListChanged = true;
          child = getChild(tChildren, tDiff[i].relid);
          if(child){
            guid = _core.getGuid(child);
            base =_core.getBase(child);
            if(base){
              base = _core.getPath(base);
            }
            diff[tDiff[i].relid] = {guid: guid, removed: false, hash: _core.getHash(child), pointer:{source:{},target:{base:base}}};
            _yetToCompute[guid] = _yetToCompute[guid] || {};
            _yetToCompute[guid].to = child;
            _yetToCompute[guid].toExpanded = false;
          }
        }

        for (i = 0; i < tChildren.length; i++) {
          child = getChild(sChildren, _core.getRelid(tChildren[i]));
          if (child && _core.getHash(tChildren[i]) !== _core.getHash(child)) {
            done = TASYNC.call(function (cDiff, relid, d) {
              diff[relid] = cDiff;
              return null;
            }, updateDiff(child, tChildren[i]), _core.getRelid(child), done);
          }
        }
        return TASYNC.call(function () {
          delete diff.children;
          extendDiffWithOvr(diff, oDiff);
          normalize(diff);
          if (Object.keys(diff).length > 0) {
            diff.guid = _core.getGuid(targetRoot);
            diff.hash = _core.getHash(targetRoot);
            diff.oGuids = gatherObstructiveGuids(targetRoot);
            return TASYNC.call(function (finalDiff) {
              return finalDiff;
            }, fillMissingGuid(targetRoot, '', diff));
          } else {
            return diff;
          }

        }, done);
      }, _core.loadChildren(sourceRoot), _core.loadChildren(targetRoot));
    }

    function gatherObstructiveGuids(node){
      var result = {},
        putParents = function(n){
          while(n){
            result[_core.getGuid(n)] = true;
            n = _core.getParent(n);
          }
        };
      while(node){
        putParents(node);
        node = _core.getBase(node);
      }
      return result;
    }
    function fillMissingGuid(root, path, diff) {
      var relids = getDiffChildrenRelids(diff),
        i,
        done;

      for (i = 0; i < relids.length; i++) {
        done = TASYNC.call(function (cDiff, relid) {
          diff[relid] = cDiff;
          return null;
        }, fillMissingGuid(root, path + '/' + relids[i], diff[relids[i]]), relids[i]);
      }
      return TASYNC.call(function () {
        if (diff.guid) {
          return diff;
        } else {
          return TASYNC.call(function (child) {
            diff.guid = _core.getGuid(child);
            diff.hash = _core.getHash(child);
            diff.oGuids = gatherObstructiveGuids(child);
            return diff;
          }, _core.loadByPath(root, path));
        }
      }, done);
    }

    function expandDiff(root, isDeleted) {
      var diff = {
        guid: _core.getGuid(root),
        hash: _core.getHash(root),
        removed: isDeleted === true
      };
      return TASYNC.call(function (children) {
        var guid;
        for (var i = 0; i < children.length; i++) {
          guid = _core.getGuid(children[i]);
          diff[_core.getRelid(children[i])] = {
            guid: guid,
            hash: _core.getHash(children[i]),
            removed: isDeleted === true
          };

          if (isDeleted) {
            _yetToCompute[guid] = _yetToCompute[guid] || {};
            _yetToCompute[guid].from = children[i];
            _yetToCompute[guid].fromExpanded = false;
          } else {
            _yetToCompute[guid] = _yetToCompute[guid] || {};
            _yetToCompute[guid].to = children[i];
            _yetToCompute[guid].toExpanded = false;
          }
        }
        return diff;
      }, _core.loadChildren(root));
    }

    function insertIntoDiff(path, diff) {
      var pathArray = path.split('/'),
        relid = pathArray.pop(),
        sDiff = _DIFF,
        i;
      pathArray.shift();
      for (i = 0; i < pathArray.length; i++) {
        sDiff = sDiff[pathArray[i]];
      }
      //sDiff[relid] = diff;
      sDiff[relid] = mergeObjects(sDiff[relid], diff);
    }

    function diffObjects(source,target) {
      var diff = {},
        sKeys = Object.keys(source),
        tKeys = Object.keys(target),
        tDiff,i;
      for (i = 0; i < sKeys.length; i++) {
        if(tKeys.indexOf(sKeys[i]) === -1){
          diff[sKeys[i]] = TODELETESTRING;
        }
      }
      for (i = 0; i < tKeys.length; i++) {
        if (sKeys.indexOf(tKeys[i]) === -1) {
          diff[tKeys[i]] = target[tKeys[i]];
        } else {
          if (typeof target[tKeys[i]] === typeof source[tKeys[i]] &&
            typeof target[tKeys[i]] === 'object' &&
            (target[tKeys[i]] !== null && source[tKeys[i]] !== null)) {
            tDiff = diffObjects(source[tKeys[i]], target[tKeys[i]]);
            if(Object.keys(tDiff).length > 0){
              diff[tKeys[i]] = tDiff;
            }
          } else if(source[tKeys[i]] !== target[tKeys[i]]) {
            diff[tKeys[i]] = target[tKeys[i]];
          }
        }
      }
      return diff;
    }

    function mergeObjects(source, target) {
      var merged = {},
        sKeys = Object.keys(source),
        tKeys = Object.keys(target),
        i;
      for (i = 0; i < sKeys.length; i++) {
        merged[sKeys[i]] = source[sKeys[i]];
      }
      for (i = 0; i < tKeys.length; i++) {
        if (sKeys.indexOf(tKeys[i]) === -1) {
          merged[tKeys[i]] = target[tKeys[i]];
        } else {
          if (typeof target[tKeys[i]] === typeof source[tKeys[i]] && typeof target[tKeys[i]] === 'object' && !(target instanceof Array)) {
            merged[tKeys[i]] = mergeObjects(source[tKeys[i]], target[tKeys[i]]);
          } else {
            merged[tKeys[i]] = target[tKeys[i]];
          }
        }
      }

      return merged;
    }

    function removePathFromDiff(diff,path){
      var relId,i;
      if(path === ''){
        diff = null;
      } else {
        path = path.split('/');
        path.shift();
        relId = path.pop();
        for(i=0;i<path.length;i++){
          diff = diff[path[i]];
        }
        delete diff[relId];
      }
    }
    function shrinkDiff(rootDiff){
      var _shrink = function(diff){
        if(diff){
          var keys = getDiffChildrenRelids(diff),
            i;
          if(typeof diff.movedFrom === 'string'){
            removePathFromDiff(rootDiff,diff.movedFrom);
          }

          if(diff.removed !== false || typeof diff.movedFrom === 'string'){
            delete diff.hash;
          }

          if(diff.removed === true){
            for(i=0;i<keys.length;i++){
              delete diff[keys[i]];
            }
          } else {

            for(i=0;i<keys.length;i++){
              _shrink(diff[keys[i]]);
            }
          }
        }
      };
      _shrink(rootDiff,false);
    }
    function checkRound() {
      var guids = Object.keys(_yetToCompute),
        done, ytc,
        i;
      if (_needChecking !== true || guids.length < 1) {
        shrinkDiff(_DIFF);
        finalizeDiff();
        return _DIFF;
      }
      _needChecking = false;
      for (i = 0; i < guids.length; i++) {
        ytc = _yetToCompute[guids[i]];
        if (ytc.from && ytc.to) {
          //move
          _needChecking = true;
          delete _yetToCompute[guids[i]];
          done = TASYNC.call(function (mDiff, info) {
            mDiff.guid = _core.getGuid(info.from);
            mDiff.movedFrom = _core.getPath(info.from);
            mDiff.ooGuids = gatherObstructiveGuids(info.from);
            _diff_moves[_core.getPath(info.from)] = _core.getPath(info.to);
            insertAtPath(_DIFF,_core.getPath(info.to),mDiff);
            return null;
          }, updateDiff(ytc.from, ytc.to), ytc);
        } else {
          if (ytc.from && ytc.fromExpanded === false) {
            //expand from
            ytc.fromExpanded = true;
            _needChecking = true;
            done = TASYNC.call(function (mDiff, info) {
              mDiff.hash = _core.getHash(info.from);
              mDiff.removed = true;
              insertIntoDiff(_core.getPath(info.from), mDiff);
              return null;
            }, expandDiff(ytc.from, true), ytc);
          } else if (ytc.to && ytc.toExpanded === false) {
            //expand to
            ytc.toExpanded = true;
            _needChecking = true;
            done = TASYNC.call(function (mDiff, info) {
              if(!mDiff.hash){
                mDiff.hash = _core.getHash(info.to);
              }
              mDiff.removed = false;
              insertIntoDiff(_core.getPath(info.to), mDiff);
              return null;
            }, expandDiff(ytc.to, false), ytc);
          }
        }
      }
      return TASYNC.call(function () {
        return checkRound();
      }, done);
    }

    _core.nodeDiff = function (source, target) {
      var diff = {
        children: children_diff(source, target),
        attr: attr_diff(source, target),
        reg: reg_diff(source, target),
        pointer: pointer_diff(source, target),
        set: set_diff(source, target),
        meta: meta_diff(source, target)
      };

      normalize(diff);
      return isEmptyNodeDiff(diff) ? null : diff;
    };

    _core.generateTreeDiff = function (sRoot, tRoot) {
      _yetToCompute = {};
      _DIFF = {};
      _diff_moves = {};
      _needChecking = true;
      _rounds = 0;
      return TASYNC.call(function (d) {
        _DIFF = d;
        return checkRound();
      }, updateDiff(sRoot, tRoot));
    };

    _core.generateLightTreeDiff = function (sRoot, tRoot) {
      return updateDiff(sRoot, tRoot);
    };

    function getDiffChildrenRelids(diff) {
      var keys = Object.keys(diff),
        i,
        filteredKeys = [],
        forbiddenWords = {
          guid: true,
          hash: true,
          attr: true,
          reg: true,
          pointer: true,
          set: true,
          meta: true,
          removed: true,
          movedFrom: true,
          childrenListChanged: true,
          oGuids: true,
          ooGuids: true,
          min: true,
          max: true
        };
      for (i = 0; i < keys.length; i++) {
        if (!forbiddenWords[keys[i]]) {
          filteredKeys.push(keys[i]);
        }
      }
      return filteredKeys;
    }

    function getMoveSources(diff, path, toFrom, fromTo) {
      var relids = getDiffChildrenRelids(diff),
        i, paths = [];

      for (i = 0; i < relids.length; i++) {
        getMoveSources(diff[relids[i]], path + '/' + relids[i], toFrom, fromTo);
      }

      if (typeof diff.movedFrom === 'string') {
        toFrom[path] = diff.movedFrom;
        fromTo[diff.movedFrom] = path;
      }
    }

    function getAncestor(node,path){
      var ownPath = _core.getPath(node),
        ancestorPath='',
        i;
      path=path.split('/');
      ownPath=ownPath.split('/');
      ownPath.shift();
      path.shift();
      for(i=0;i<ownPath.length;i++){
        if(ownPath[i] === path[i]){
          ancestorPath= ancestorPath+'/'+ownPath[i];
        } else {
          break;
        }
      }
      ownPath = _core.getPath(node);
      while(ownPath !== ancestorPath){
        node = _core.getParent(node);
        ownPath = _core.getPath(node);
      }
      return node;
    }
    function setBaseOfNewNode(node,relid,basePath){
      //TODO this is a kind of low level hack so maybe there should be another way to do this
      var ancestor = getAncestor(node,basePath),
        sourcePath = _core.getPath(node).substr(_core.getPath(ancestor).length),
        targetPath = basePath.substr(_core.getPath(ancestor).length);
      sourcePath = sourcePath+'/'+relid;
      _innerCore.overlayInsert(_core.getChild(ancestor,'ovr'),sourcePath,'base',targetPath);
    }
    function makeInitialContainmentChanges(node,diff){
      var relids = getDiffChildrenRelids(diff),
        i,done,child,moved;

      for(i=0;i<relids.length;i++){
        moved = false;
        if(diff[relids[i]].movedFrom){
          //moved node
          moved = true;
          child = _core.loadByPath(_core.getRoot(node),diff[relids[i]].movedFrom);
        } else if(diff[relids[i]].removed === false){
          //added node
          //first we hack the pointer, then we create the node
          if(diff[relids[i]].pointer && diff[relids[i]].pointer.base){
            //we can set base if the node has one, otherwise it is 'inheritance internal' node
            setBaseOfNewNode(node,relids[i],diff[relids[i]].pointer.base);
          }
          if(diff[relids[i]].hash){
            _core.setProperty(node,relids[i],diff[relids[i]].hash);
            child = _core.loadChild(node,relids[i]);
          } else {
            child = _core.getChild(node,relids[i]);
            _core.setHashed(child,true);
          }
        } else {
          //simple node
          child = _core.loadChild(node,relids[i]);
        }

        done = TASYNC.call(function(n,di,p,m,d){
          if(m === true){
            n = _core.moveNode(n,p);
          }
          return makeInitialContainmentChanges(n,di);
        },child,diff[relids[i]],node,moved,done);
      }

      TASYNC.call(function(d){
        return null;
      },done);
    }
    function createNewNodes(node, diff) {
      var relids = getDiffChildrenRelids(diff),
        i,
        done;

      for (i = 0; i < relids.length; i++) {
        if (diff[relids[i]].removed === false && !diff[relids[i]].movedFrom) {
          //we have to create the child with the exact hash and then recursively call the function for it
          /*if(!(node.data[relids[i]] && node.data[relids[i]] === diff[relids[i]].hash)){
            //if it is a child of a new node we probably do not have to create it again...
            if(diff[relids[i]].hash){
              _core.setProperty(node,relids[i],diff[relids[i]].hash);
            } else {
              //create an empty child
              var child = _core.getChild(node,relids[i]);
              _core.setHashed(child,true);
            }
          }*/
          if(diff[relids[i]].hash){
            _core.setProperty(node,relids[i],diff[relids[i]].hash);
          } else {
            var child = _core.getChild(node,relids[i]);
            _core.setHashed(child,true);
          }
          if(diff[relids[i]].pointer && diff[relids[i]].pointer.base){
            //we can set base if the node has one, otherwise it is 'inheritance internal' node
            setBaseOfNewNode(node,relids[i],diff[relids[i]].pointer.base);
          }
        }

        done = TASYNC.call(function (a, b, c) {
          return createNewNodes(a, b);
        }, _core.loadChild(node, relids[i]), diff[relids[i]], done);

      }

      return TASYNC.call(function (d) {
        return null;
      },done);
    }

    function getMovedNode(root, from, to) {
      ASSERT(typeof from === 'string' && typeof to === 'string' && to !== '');
      var parentPath = to.substring(0, to.lastIndexOf('/')),
        parent = _core.loadByPath(root, fromTo[parentPath] || parentPath),
        old = _core.loadByPath(root, from);

      //clear the directories
      delete fromTo[from];
      delete toFrom[to];

      return TASYNC.call(function (p, o) {
        return _core.moveNode(o, p);
      }, parent, old);

    }

    function applyNodeChange(root, path, nodeDiff) {
      //check for move
      var node;
      node = _core.loadByPath(root, path);

      TASYNC.call(function (n) {
        var done,
          relids = getDiffChildrenRelids(nodeDiff),
          i;
        if (nodeDiff.removed === true) {
          _core.deleteNode(n);
          return;
        }
        applyAttributeChanges(n, nodeDiff.attr || {});
        applyRegistryChanges(n, nodeDiff.reg || {});
        done = applyPointerChanges(n, nodeDiff.pointer || {});
        done = TASYNC.call(applySetChanges,n, nodeDiff.set || {},done);
        if(nodeDiff.meta){
          delete nodeDiff.meta.empty;
          done = TASYNC.call(applyMetaChanges,n, nodeDiff.meta,done);
        }
        for (i = 0; i < relids.length; i++) {
          done = TASYNC.call(function (d, d2) {
            return null;
          }, applyNodeChange(root, path + '/' + relids[i], nodeDiff[relids[i]]), done);
        }
        TASYNC.call(function (d) {
          return done;
        }, done);
      }, node);
    }

    function applyAttributeChanges(node, attrDiff) {
      var i, keys;
      keys = Object.keys(attrDiff);
      for (i = 0; i < keys.length; i++) {
        if (attrDiff[keys[i]] === TODELETESTRING) {
          _core.delAttribute(node, keys[i]);
        } else {
          _core.setAttribute(node, keys[i], attrDiff[keys[i]]);
        }
      }
    }

    function applyRegistryChanges(node, regDiff) {
      var i, keys;
      keys = Object.keys(regDiff);
      for (i = 0; i < keys.length; i++) {
        if (regDiff[keys[i]] === TODELETESTRING) {
          _core.delRegistry(node, keys[i]);
        } else {
          _core.setRegistry(node, keys[i], regDiff[keys[i]]);
        }
      }
    }

    function setPointer(node, name, target) {
      var targetNode;
      if(target === null){
        targetNode = null;
      } else {
        if(fromTo[target]){
          target = fromTo[target];
        }
        targetNode = _core.loadByPath(_core.getRoot(node),target);
      }
      return TASYNC.call(function (t) {
        //TODO watch if handling of base changes!!!
        _core.setPointer(node, name, t);
        return;
      }, targetNode);
    }

    function applyPointerChanges(node, pointerDiff) {
      var done,
        keys = Object.keys(pointerDiff),
        i;
      for (i = 0; i < keys.length; i++) {
        if (pointerDiff[keys[i]] === TODELETESTRING) {
          _core.deletePointer(node, keys[i]);
        } else {
          done = setPointer(node, keys[i], pointerDiff[keys[i]]);
        }
      }

      return TASYNC.call(function (d) {
        return null;
      }, done);

    }

    function addMember(node, name, target, data) {
      var memberAttrSetting = function (diff) {
          var keys = _core.getMemberOwnAttributeNames(node, name, target),
            i;
          for (i = 0; i < keys.length; i++) {
            _core.delMemberAttribute(node, name, target, keys[i]);
          }

          keys = Object.keys(diff);
          for (i = 0; i < keys.length; i++) {
            _core.setMemberAttribute(node, name, target, keys[i], diff[keys[i]]);
          }
        },
        memberRegSetting = function (diff) {
          var keys = _core.getMemberOwnRegistryNames(node, name, target),
            i;
          for (i = 0; i < keys.length; i++) {
            _core.delMemberRegistry(node, name, target, keys[i]);
          }

          keys = Object.keys(diff);
          for (i = 0; i < keys.length; i++) {
            _core.setMemberRegistry(node, name, target, keys[i], diff[keys[i]]);
          }
        };
      return TASYNC.call(function (t) {
        _core.addMember(node, name, t);
        memberAttrSetting(data.attr || {});
        memberRegSetting(data.reg || {});
        return;
      }, _core.loadByPath(_core.getRoot(node), target));
    }

    function applySetChanges(node, setDiff) {
      var done,
        setNames = Object.keys(setDiff),
        elements, i, j;
      for (i = 0; i < setNames.length; i++) {
        if (setDiff[setNames[i]] === TODELETESTRING) {
          _core.deleteSet(node, setNames[i]);
        } else {
          elements = Object.keys(setDiff[setNames[i]]);
          for (j = 0; j < elements.length; j++) {
            if (setDiff[setNames[i]][elements[j]] === TODELETESTRING) {
              _core.delMember(node, setNames[i], elements[j]);
            } else {
              done = addMember(node, setNames[i], elements[j], setDiff[setNames[i]][elements[j]]);
            }
          }
        }
      }

      return TASYNC.call(function (d) {
        return null;
      }, done);

    }

    function applyMetaAttributes(node,metaAttrDiff){
      var i,keys,newValue;
      if(metaAttrDiff === TODELETESTRING){
        //we should delete all MetaAttributes
        keys = _core.getValidAttributeNames(node);
        for(i=0;i<keys.length;i++){
          _core.delAttributeMeta(node,keys[i]);
        }
      } else {
        keys = Object.keys(metaAttrDiff);
        for(i=0;i<keys.length;i++){
          if(metaAttrDiff[keys[i]] === TODELETESTRING){
            _core.delAttributeMeta(node,keys[i]);
          } else {
            newValue = jsonConcat(_core.getAttributeMeta(node,keys[i]) || {},metaAttrDiff[keys[i]]);
            _core.setAttributeMeta(node,keys[i],newValue);
          }
        }
      }
    }

    function applyMetaConstraints(node,metaConDiff){
      var keys,i;
      if(metaConDiff === TODELETESTRING){
        //remove all constraints
        keys = _core.getConstraintNames(node);
        for(i=0;i<keys.length;i++){
          _core.delConstraint(node,keys[i]);
        }
      } else {
        keys = Object.keys(metaConDiff);
        for(i=0;i<keys.length;i++){
          if(metaConDiff[keys[i]] === TODELETESTRING){
            _core.delConstraint(node,keys[i]);
          } else {
            _core.setConstraint(node,keys[i],jsonConcat(_core.getConstraint(node,keys[i]) || {},metaConDiff[keys[i]]));
          }
        }
      }
    }

    function applyMetaChildren(node,metaChildrenDiff){
      var keys, i,done,
        setChild = function(target,data,d){
          _core.setChildMeta(node,target,data.min,data.max);
        };
      if(metaChildrenDiff === TODELETESTRING){
        //remove all valid child
        keys = _core.getValidChildrenPaths(node);
        for(i=0;i<keys.length;i++){
          _core.delChildMeta(node,keys[i]);
        }
      } else {
        _core.setChildrenMetaLimits(node, metaChildrenDiff.min, metaChildrenDiff.max);
        delete metaChildrenDiff.max; //TODO we do not need it anymore, but maybe there is a better way
        delete metaChildrenDiff.min;
        keys = Object.keys(metaChildrenDiff);
        for(i=0;i<keys.length;i++){
          if(metaChildrenDiff[keys[i]] === TODELETESTRING){
            _core.delChildMeta(node,keys[i]);
          } else {
            done = TASYNC.call(setChild,_core.loadByPath(_core.getRoot(node),keys[i]),metaChildrenDiff[keys[i]],done);
          }
        }
      }

      TASYNC.call(function(d){
        return null;
      },done);
    }

    function applyMetaPointers(node,metaPointerDiff){
      var names,targets, i, j,done,
        setPointer = function(name,target,data,d){
          _core.setPointerMetaTarget(node,name,target,data.min,data.max);
        };
      if(metaPointerDiff === TODELETESTRING){
        //remove all pointers,sets and their targets
        names = _core.getValidPointerNames(node);
        for(i=0;i<names.length;i++){
          _core.delPointerMeta(node,names[i]);
        }

        names = _core.getValidSetNames(node);
        for(i=0;i<names.length;i++){
          _core.delPointerMeta(node,names[i]);
        }
        return;
      }

      names = Object.keys(metaPointerDiff);
      for(i=0;i<names.length;i++){
        if(metaPointerDiff[names[i]] === TODELETESTRING){
          _core.delPointerMeta(node,names[i]);
        } else {
          _core.setPointerMetaLimits(node,names[i],metaPointerDiff[names[i]].min,metaPointerDiff[names[i]].max);
          delete metaPointerDiff[names[i]].max; //TODO we do not need it anymore, but maybe there is a better way
          delete metaPointerDiff[names[i]].min;
          targets = Object.keys(metaPointerDiff[names[i]]);
          for(j=0;j<targets.length;j++){
            if(metaPointerDiff[names[i]][targets[j]] === TODELETESTRING){
              _core.delPointerMetaTarget(node,names[i],targets[j]);
            } else {
              done = TASYNC.call(setPointer,names[i],_core.loadByPath(_core.getRoot(node),targets[j]),metaPointerDiff[names[i]][targets[j]],done);
            }
          }
        }
      }

      TASYNC.call(function(d){
        return null;
      },done);
    }

    function applyMetaAspects(node,metaAspectsDiff){
      var names,targets, i, j,done,
        setAspect = function(name,target,d){
          _core.setAspectMetaTarget(node,name,target);
        };
      if(metaAspectsDiff === TODELETESTRING){
        //remove all aspects
        names = _core.getValidAspectNames(node);
        for(i=0;i<names.length;i++){
          _core.delAspectMeta(node,names[i]);
        }
        return;
      }

      names = Object.keys(metaAspectsDiff);
      for(i=0;i<names.length;i++){
        if(metaAspectsDiff[names[i]] === TODELETESTRING){
          _core.delAspectMeta(node,names[i]);
        } else {
          targets = Object.keys(metaAspectsDiff[names[i]]);
          for(j=0;j<targets.length;j++){
            if(metaAspectsDiff[names[i]][targets[j]] === TODELETESTRING){
              _core.delAspectMetaTarget(node,names[i],targets[j]);
            } else {
              done = TASYNC.call(setAspect,names[i],_core.loadByPath(_core.getRoot(node),targets[j]),done);
            }
          }
        }
      }

      TASYNC.call(function(d){
        return null;
      },done);
    }

    function applyMetaChanges(node, metaDiff) {
      var done;
      applyMetaAttributes(node,metaDiff.attributes || TODELETESTRING);
      applyMetaConstraints(node,metaDiff.constraints || TODELETESTRING);
      done = applyMetaChildren(node,metaDiff.children || TODELETESTRING);
      done = TASYNC.call(applyMetaPointers,node,metaDiff.pointers || TODELETESTRING,done);
      done = TASYNC.call(applyMetaAspects,node,metaDiff.aspects || TODELETESTRING,done);

      TASYNC.call(function(d){
        return null;
      },done);
    }

    _core.applyTreeDiff = function (root, diff) {
      var done;

      toFrom = {};
      fromTo = {};
      getMoveSources(diff, '', toFrom, fromTo);

      done = makeInitialContainmentChanges(root,diff);
      return TASYNC.call(function (d) {
        return applyNodeChange(root, '', diff);
      }, done);
    };


    //concat diffs is needed to make 3-way merge
    function getDiffTreeDictionray(treeDiff){
      var dictionary = {pathToGuid:{},guidToPath:{}},
        addElement = function(path,diff){
          var keys = getDiffChildrenRelids(diff),
            i;
          for(i=0;i<keys.length;i++){
            addElement(path+'/'+keys[i],diff[keys[i]]);
          }
          if(diff.guid){
            dictionary.pathToGuid[path] = diff.guid;
            if(!dictionary.guidToPath[diff.guid] || diff.movedFrom){
              dictionary.guidToPath[diff.guid] = path;
            }
          }
        };

      addElement('',treeDiff);
      return dictionary;
    }

    function _getNodeByGuid(diff,guid){
      var path = _concat_dictionary.guidToPath[guid],
        object = diff,
        i;
      if(typeof path === 'string'){
        if(path === ''){
          return diff;
        }

        path = path.split('/');
        path.shift();
        for(i=0;i<path.length;i++){
          object = object[path[i]];
        }
        return object;
      } else {
        return null;
      }
    }
    function getNodeByGuid(diff,guid){
      var relids, i,temp;
      if(diff.guid === guid){
        return diff;
      }

      relids = getDiffChildrenRelids(diff);
      for(i=0;i<relids.length;i++){
        temp = getNodeByGuid(diff[relids[i]],guid);
        if(temp){
          return temp;
        }
      }
      return null;
    }
    function insertAtPath(diff,path,object){
      ASSERT(typeof path === 'string');
      var i,base,relid,nodepath;
      if(path === ''){
        _concat_result = JSON.parse(JSON.stringify(object));
        return;
      }
      nodepath = path.match(/\/\/.*\/\//) || [];
      nodepath = nodepath[0] || "there is no nodepath in the path";
      path = path.replace(nodepath,"/*nodepath*/");
      nodepath = nodepath.replace(/\/\//g,"/");
      nodepath = nodepath.slice(0,-1);
      path = path.split('/');
      path.shift();
      if(path.indexOf("*nodepath*") !== -1){
        path[path.indexOf("*nodepath*")] = nodepath;
      }
      relid = path.pop();
      base = diff;
      for(i=0;i<path.length;i++){
        base[path[i]] = base[path[i]] || {};
        base = base[path[i]];
      }
      base[relid] = JSON.parse(JSON.stringify(object));
      return;
    }
    function changeMovedPaths(singleNode){
      var keys,i;
      keys = Object.keys(singleNode);
      for(i=0;i<keys.length;i++){
        if(_concat_moves.fromTo[keys[i]]){
          singleNode[_concat_moves.fromTo[keys[i]]] = singleNode[keys[i]];
          delete singleNode[keys[i]];
          if(typeof singleNode[_concat_moves.fromTo[keys[i]]] === 'object' && singleNode[_concat_moves.fromTo[keys[i]]] !== null){
            changeMovedPaths(singleNode[_concat_moves.fromTo[keys[i]]]);
          }
        } else {
          if(typeof singleNode[keys[i]] === 'string' && keys[i] !== 'movedFrom' && _concat_moves.fromTo[singleNode[keys[i]]]){
            singleNode[keys[i]] = _concat_moves.fromTo[keys[i]];
          }

          if(typeof singleNode[keys[i]] === 'object' && singleNode[keys[i]] !== null){
            changeMovedPaths(singleNode[keys[i]]);
          }
        }

      }
      if(typeof singleNode === 'object' && singleNode !== null){
        keys = Object.keys(singleNode);
        for(i=0;i<keys.length;i++){
          if(_concat_moves.fromTo[keys[i]]){
            singleNode[_concat_moves.fromTo[keys[i]]] = singleNode[keys[i]];
            delete singleNode[keys[i]];
          }
        }
      } else if(typeof singleNode === 'string') {

      }

    }
    function getSingleNode(node){
      //removes the children from the node
      var result = JSON.parse(JSON.stringify(node)),
        keys = getDiffChildrenRelids(result),
        i;
      for(i=0;i<keys.length;i++){
        delete result[keys[i]];
      }
      //changeMovedPaths(result);
      return result;
    }
    function jsonConcat(base,extension){
      var baseKeys = Object.keys(base),
        extKeys = Object.keys(extension),
        concat = JSON.parse(JSON.stringify(base)),
        i;
      for(i=0;i<extKeys.length;i++){
        if(baseKeys.indexOf(extKeys[i]) === -1){
          concat[extKeys[i]] = JSON.parse(JSON.stringify(extension[extKeys[i]]));
        } else {
          if(typeof base[extKeys[i]] === 'object' && typeof extension[extKeys[i]] === 'object'){
            concat[extKeys[i]] = jsonConcat(base[extKeys[i]],extension[extKeys[i]]);
          } else { //either from value to object or object from value we go with the extension
            concat[extKeys[i]] = JSON.parse(JSON.stringify(extension[extKeys[i]]));
          }
        }
      }
      return concat;
    }



    function getConflictByGuid(conflict,guid){
      var relids,i,result;
      if(conflict.guid === guid){
        return conflict;
      }
      relids = getDiffChildrenRelids(conflict);
      for(i=0;i<relids.length;i++){
        result = getConflictByGuid(conflict[relids[i]],guid);
        if(result){
          return result;
        }
      }
      return null;
    }
    function getPathByGuid(conflict,guid,path){
      var relids,i,result;
      if(conflict.guid === guid){
        return path;
      }
      relids = getDiffChildrenRelids(conflict);
      for(i=0;i<relids.length;i++){
        result = getPathByGuid(conflict[relids[i]],guid,path+'/'+relids[i]);
        if(result){
          return result;
        }
      }
      return null;
    }
    function removedParentGuid(diff,path){
      var i;
      path = (path || "").split('/');
      path.shift();
      for (i = 0; i < path.length; i++) {
        if(diff.removed === true){
          return diff.guid;
        }
        if(diff[path[i]]){
          diff = diff[path[i]]
        } else {
          return null;
        }
      }
      return diff.removed === true ? diff.guid : null;
    }

    function getGuidsOfDiff(diff){
      var relids = getDiffChildrenRelids(diff),
        i,
        result = [diff.guid];
      for(i=0;i<relids.length;i++){
        result = result.concat(getGuidsOfDiff(diff[relids[i]]));
      }
      return result;
    }

    function applyToPath(diff,path,value){
      var i,finalPath,keys;
      path = (path || "").split('/');
      path.shift();
      finalPath = path.pop();
      for(i=0;i<path.length;i++){
        if(!diff[path[i]]){
          diff[path[i]] = {};
        }
        diff = diff[path[i]];
      }

      if(typeof value === 'object'){
        keys = Object.keys(value);
        for(i=0;i<keys.length;i++){
          diff[finalPath][keys[i]] = value[keys[i]];
        }
      } else {
        diff[finalPath] = value;
      }
    }
    /*function applyResolutionItem(diff,item){

      //let's start with the easy ones
      if(item.mine.path === item.theirs.path){
        //we just simply apply it over our own diff
        applyToPath(diff,item.theirs.path,item.theirs.value);
      } else {
        var currentPath = getPathByGuid(diff,item.guid,'');
        if(item.mine.path.indexOf(currentPath) === 0){
          //not yet moved so we move right now
          insertAtPath(diff,item.theirs.path,getNodeByGuid(diff,item.guid));
          //and remove from its original path
          insertAtPath(diff,currentPath,{});
          //with the move there is no data to apply...
        } else {
          //the move have already been made, so it is enough if we apply
          applyToPath(diff,item.theirs.path,item.theirs.value);
        }
      }

    }
    _core.applyResolution = function(mine,conflicts){
      var i;
      for(i=0;i<conflicts.length;i++){
        if(conflicts[i].selected === 'theirs'){
          applyResolutionItem(mine,conflicts[i]);
        }
      }
      return mine;
    };*/

    //now we try a different approach, which maybe more simple
    function getCommonPathForConcat(path){
      if(_concat_moves.getExtensionSourceFromDestination[path]){
        path = _concat_moves.getExtensionSourceFromDestination[path];
      }
      if(_concat_moves.getBaseDestinationFromSource[path]){
        path = _concat_moves.getBaseDestinationFromSource[path];
      }
      return path;
    }
    function getConcatBaseRemovals(diff){
      var relids = getDiffChildrenRelids(diff),
        i;
      if(diff.removed !== true){
        if(diff.movedFrom){
          if(_concat_base_removals[diff.guid] !== undefined){
            delete _concat_base_removals[diff.guid];
          } else {
            _concat_base_removals[diff.guid] = false;
          }
        }
        for(i=0;i<relids.length;i++){
          getConcatBaseRemovals(diff[relids[i]]);
        }
      } else {
        if(_concat_base_removals[diff.guid] === false){
          delete _concat_base_removals[diff.guid];
        } else {
          _concat_base_removals[diff.guid] = true;
        }
      }
    }
    function getObstructiveGuids(diffNode){
      var result = [],
        keys,i;
      keys = Object.keys(diffNode.oGuids || {});
      for(i=0;i<keys.length;i++){
        if(_concat_base_removals[keys[i]]){
          result.push(keys[i]);
        }
      }
      keys = Object.keys(diffNode.ooGuids || {});
      for(i=0;i<keys.length;i++){
        if(_concat_base_removals[keys[i]]){
          result.push(keys[i]);
        }
      }
      return result;
    }
    function getWhomIObstructGuids(guid){
      //this function is needed when the extension contains a deletion where the base did not delete the node
      var guids = [],
        checkNode = function(diffNode){
          var relids,i;
          if((diffNode.oGuids && diffNode.oGuids[guid]) || (diffNode.ooGuids && diffNode.ooGuids[guid])){
            guids.push(diffNode.guid);
          }

          relids = getDiffChildrenRelids(diffNode);
          for(i=0;i<relids.length;i++){
            checkNode(diffNode[relids[i]]);
          }
        };
      checkNode(_concat_base);
      return guids;
    }
    function gatherFullNodeConflicts(diffNode,mine,path,opposingPath){
      var conflict,
        opposingConflict,
        keys, i,
        createSingleKeyValuePairConflicts = function(pathBase,data){
        var keys, i;
        keys = Object.keys(data);
        for(i=0;i<keys.length;i++){
          conflict[pathBase+'/'+keys[i]] = conflict[pathBase+'/'+keys[i]] || {value:data[keys[i]],conflictingPaths:{}};
          conflict[pathBase+'/'+keys[i]].conflictingPaths[opposingPath] = true;
          opposingConflict.conflictingPaths[pathBase+'/'+keys[i]] = true;
        }
      };

      //setting the conflicts
      if(mine === true){
        conflict = _conflict_mine;
        opposingConflict = _conflict_theirs[opposingPath];
      } else {
        conflict = _conflict_theirs;
        opposingConflict = _conflict_mine[opposingPath];
      }
      ASSERT(opposingConflict);
      //if the node was moved we should make a conflict for the whole node as well
      if(diffNode.movedFrom){
        conflict[path] = conflict[path] || {value:path,conflictingPaths:{}};
        conflict[path].conflictingPaths[opposingPath] = true;
        opposingConflict.conflictingPaths[path] = true;
      }
      createSingleKeyValuePairConflicts(path+'/attr',diffNode.attr || {});
      createSingleKeyValuePairConflicts(path+'/reg',diffNode.reg || {});
      createSingleKeyValuePairConflicts(path+'/pointer',diffNode.pointer || {});

      if(diffNode.set){
        if(diffNode.set === TODELETESTRING){
          conflict[path+'/set'] = conflict[path+'/set'] || {value:TODELETESTRING,conflictingPaths:{}};
          conflict[path+'/set'].conflictingPaths[opposingPath] = true;
          opposingConflict.conflictingPaths[path+'/set'] = true;
        } else {
          keys = Object.keys(diffNode.set);
          for(i=0;i<keys.length;i++){
            if(diffNode.set[keys[i]] === TODELETESTRING){
              conflict[path+'/set/'+keys[i]] = conflict[path+'/set/'+keys[i]] || {value:TODELETESTRING,conflictingPaths:{}};
              conflict[path+'/set/'+keys[i]].conflictingPaths[opposingPath] = true;
              opposingConflict.conflictingPaths[path+'/set/'+keys[i]] = true;
            } else {
              gatherFullSetConflicts(diffNode.set[keys[i]],mine,path+'/set/'+keys[i],opposingPath);
            }
          }
        }
      }

      if(diffNode.meta){
        gatherFullMetaConflicts(diffNode.meta,mine,path+'/meta',opposingPath);
      }

      //if the opposing item is theirs, we have to recursively go down in our changes
      if(mine){
        keys = getDiffChildrenRelids(diffNode);
        for(i=0;i<keys.length;i++){
          gatherFullNodeConflicts(diffNode[keys[i]],true,path+'/'+keys[i],opposingPath);
        }
      }

    }
    function gatherFullSetConflicts(diffSet,mine,path,opposingPath){
      var relids = getDiffChildrenRelids(diffSet),
        i,keys, j,conflict,opposingConflict;

      //setting the conflicts
      if(mine === true){
        conflict = _conflict_mine;
        opposingConflict = _conflict_theirs[opposingPath];
      } else {
        conflict = _conflict_theirs;
        opposingConflict = _conflict_mine[opposingPath];
      }
      for(i=0;i<relids.length;i++){
        if(diffSet[relids[i]] === TODELETESTRING){
          //single conflict as the element was removed
          conflict[path+'/'+relids[i]+'/'] = conflict[path+'/'+relids[i]+'/'] || {value:TODELETESTRING,conflictingPaths:{}};
          conflict[path+'/'+relids[i]+'/'].conflictingPaths[opposingPath] = true;
          opposingConflict.conflictingPaths[path+'/'+relids[i]+'/'] = true;
        } else {
          keys = Object.keys(diffSet[relids[i]].attr || {});
          for(j=0;j<keys.length;j++){
            conflict[path+'/'+relids[i]+'//attr/'+keys[j]] = conflict[path+'/'+relids[i]+'//attr/'+keys[j]] || {value:diffSet[relids[i]].attr[keys[j]],conflictingPaths:{}};
            conflict[path+'/'+relids[i]+'//attr/'+keys[j]].conflictingPaths[opposingPath] = true;
            opposingConflict.conflictingPaths[path+'/'+relids[i]+'//attr/'+keys[j]] = true;
          }
          keys = Object.keys(diffSet[relids[i]].reg || {});
          for(j=0;j<keys.length;j++){
            conflict[path+'/'+relids[i]+'//reg/'+keys[j]] = conflict[path+'/'+relids[i]+'//reg/'+keys[j]] || {value:diffSet[relids[i]].reg[keys[j]],conflictingPaths:{}};
            conflict[path+'/'+relids[i]+'//reg/'+keys[j]].conflictingPaths[opposingPath] = true;
            opposingConflict.conflictingPaths[path+'/'+relids[i]+'//reg/'+keys[j]] = true;
          }
        }
      }
    }
    function concatSingleKeyValuePairs(path,base,extension){
      var keys, i,temp;
      keys = Object.keys(extension);
      for(i=0;i<keys.length;i++){
        temp = extension[keys[i]];
        if(typeof temp === 'string' && temp !== TODELETESTRING){
          temp = getCommonPathForConcat(temp);
        }
        if(base[keys[i]] && CANON.stringify(base[keys[i]]) !== CANON.stringify(temp)){
          //conflict
          _conflict_mine[path+'/'+keys[i]] = {value:base[keys[i]],conflictingPaths:{}};
          _conflict_theirs[path+'/'+keys[i]] = {value:extension[keys[i]],conflictingPaths:{}};
          _conflict_mine[path+'/'+keys[i]].conflictingPaths[path+'/'+keys[i]] = true;
          _conflict_theirs[path+'/'+keys[i]].conflictingPaths[path+'/'+keys[i]] = true;
        } else {
          base[keys[i]] = extension[keys[i]];
        }
      }
    }
    function concatSet(path,base,extension){
      var names = Object.keys(extension),
        members, i, j,memberPath;

      for(i=0;i<names.length;i++){
        if(base[names[i]]){
          if(base[names[i]] === TODELETESTRING){
            if(extension[names[i]] !== TODELETESTRING){
              //whole set conflict
              _conflict_mine[path+'/'+names[i]]={value:TODELETESTRING,conflictingPaths:{}};
              gatherFullSetConflicts(extension[names[i]],false,path+'/'+names[i],path+'/'+names[i]);
            }
          } else {
            if(extension[names[i]] === TODELETESTRING){
              //whole set conflict
              _conflict_theirs[path+'/'+names[i]]={value:TODELETESTRING,conflictingPaths:{}};
              gatherFullSetConflicts(base[names[i]],true,path+'/'+names[i],path+'/'+names[i]);
            } else {
              //now we can only have member or sub-member conflicts...
              members = getDiffChildrenRelids(extension[names[i]]);
              for(j=0;j<members.length;j++){
                memberPath = getCommonPathForConcat(members[j]);
                if(base[names[i]][memberPath]){
                  if(base[names[i]][memberPath] === TODELETESTRING){
                    if(extension[names[i]][members[j]] !== TODELETESTRING){
                      //whole member conflict
                      _conflict_mine[path+'/'+names[i]+'/'+memberPath+'//'] = {value:TODELETESTRING,conflictingPaths:{}};
                      gatherFullNodeConflicts(extension[names[i]][members[j]],false,path+'/'+names[i]+'/'+memberPath+'//',path+'/'+names[i]+'/'+memberPath+'//');
                    }
                  } else {
                    if(extension[names[i]][members[j]] === TODELETESTRING){
                      //whole member conflict
                      _conflict_theirs[path+'/'+names[i]+'/'+memberPath+'//'] = {value:TODELETESTRING,conflictingPaths:{}};
                      gatherFullNodeConflicts(base[names[i]][memberPath],true,path+'/'+names[i]+'/'+memberPath+'//',path+'/'+names[i]+'/'+memberPath+'//');
                    } else {
                      if(extension[names[i]][members[j]].attr){
                        if(base[names[i]][memberPath].attr){
                          concatSingleKeyValuePairs(path+'/'+names[i]+'/'+memberPath+'/'+'/attr',base[names[i]][memberPath].attr,extension[names[i]][members[j]].attr);
                        } else {
                          base[names[i]][memberPath].attr = extension[names[i]][members[j]].attr;
                        }
                      }
                      if(extension[names[i]][members[j]].reg){
                        if(base[names[i]][memberPath].reg){
                          concatSingleKeyValuePairs(path+'/'+names[i]+'/'+memberPath+'/'+'/reg',base[names[i]][memberPath].reg,extension[names[i]][members[j]].reg);
                        } else {
                          base[names[i]][memberPath].reg = extension[names[i]][members[j]].reg;
                        }
                      }

                    }
                  }
                } else {
                  //concat
                  base[names[i]][memberPath] = extension[names[i]][members[j]];
                }
              }
            }
          }
        } else {
          //simple concatenation
          //TODO the path for members should be replaced here as well...
          base[names[i]] = extension[names[i]];
        }
      }
    }
    function gatherFullMetaConflicts(diffMeta,mine,path,opposingPath){
      var conflict,opposingConflict,
        relids, i, j, keys, tPath;

      if(mine){
        conflict = _conflict_mine;
        opposingConflict = _conflict_theirs[opposingPath];
      } else {
        conflict = _conflict_theirs;
        opposingConflict = _conflict_mine[opposingPath];
      }

      if(diffMeta === TODELETESTRING){
        conflict[path] = conflict[path] || {value:TODELETESTRING,conflictingPaths:{}};
        conflict[path].conflictingPaths[opposingPath] = true;
        opposingConflict.conflictingPaths[path] = true;
        return; //there is no other conflict
      }

      //children
      if(diffMeta.children){
        if(diffMeta.children === TODELETESTRING){
          conflict[path+'/children'] = conflict[path+'/children'] || {value:TODELETESTRING,conflictingPaths:{}};
          conflict[path+'/children'].conflictingPaths[opposingPath] = true;
          opposingConflict.conflictingPaths[path+'/children'] = true;
        } else {
          if(diffMeta.children.max){
            conflict[path+'/children/max'] = conflict[path+'/children/max'] || {value:diffMeta.children.max,conflictingPaths:{}};
            conflict[path+'/children/max'].conflictingPaths[opposingPath] = true;
            opposingConflict.conflictingPaths[path+'/children/max'] = true;
          }
          if(diffMeta.children.min){
            conflict[path+'/children/min'] = conflict[path+'/children/min'] || {value:diffMeta.children.min,conflictingPaths:{}};
            conflict[path+'/children/min'].conflictingPaths[opposingPath] = true;
            opposingConflict.conflictingPaths[path+'/children/min'] = true;
          }
          relids = getDiffChildrenRelids(diffMeta.children);
          for(i=0;i<relids.length;i++){
            conflict[path+'/children/'+relids[i]] = conflict[path+'/children/'+relids[i]] || {value:diffMeta.children[relids[i]],conflictingPaths:{}};
            conflict[path+'/children/'+relids[i]].conflictingPaths[opposingPath] = true;
            opposingConflict.conflictingPaths[path+'/children/'+relids[i]] = true;
          }
        }
      }
      //attributes
      if(diffMeta.attributes){
        if(diffMeta.attributes === TODELETESTRING){
          conflict[path+'/attributes'] = conflict[path+'/attributes'] || {value:TODELETESTRING,conflictingPaths:{}};
          conflict[path+'/attributes'].conflictingPaths[opposingPath] = true;
          opposingConflict.conflictingPaths[path+'/attributes'] = true;
        } else {
          keys = Object.keys(diffMeta.attributes);
          for(i=0;i<keys.length;i++){
            conflict[path+'/attributes/'+keys[i]] = conflict[path+'/attributes/'+keys[i]] || {value:diffMeta.attributes[keys[i]],conflictingPaths:{}};
            conflict[path+'/attributes'].conflictingPaths[opposingPath] = true;
            opposingConflict.conflictingPaths[path+'/attributes'] = true;
          }
        }
      }
      //pointers
      if(diffMeta.pointers){
        if(diffMeta.pointers === TODELETESTRING){
          conflict[path+'/pointers'] = conflict[path+'/pointers'] || {value:TODELETESTRING,conflictingPaths:{}};
          conflict[path+'/pointers'].conflictingPaths[opposingPath] = true;
          opposingConflict.conflictingPaths[path+'/pointers'] = true;
        } else {
          keys = Object.keys(diffMeta.pointers);
          for(i=0;i<keys.length;i++){
            if(diffMeta.pointers[keys[i]] === TODELETESTRING){
              conflict[path+'/pointers/'+keys[i]] = conflict[path+'/pointers/'+keys[i]] || {value:TODELETESTRING,conflictingPaths:{}};
              conflict[path+'/pointers/'+keys[i]].conflictingPaths[opposingPath] = true;
              opposingConflict.conflictingPaths[path+'/pointers/'+keys[i]] = true;
            } else {
              if(diffMeta.pointers[keys[i]].max){
                conflict[path+'/pointers/'+keys[i]+'/max'] = conflict[path+'/pointers/'+keys[i]+'/max'] || {value:diffMeta.pointers[keys[i]].max,conflictingPaths:{}};
                conflict[path+'/pointers/'+keys[i]+'/max'].conflictingPaths[opposingPath] = true;
                opposingConflict.conflictingPaths[path+'/pointers/'+keys[i]+'/max'] = true;
              }
              if(diffMeta.pointers[keys[i]].min){
                conflict[path+'/pointers/'+keys[i]+'/min'] = conflict[path+'/pointers/'+keys[i]+'/min'] || {value:diffMeta.pointers[keys[i]].min,conflictingPaths:{}};
                conflict[path+'/pointers/'+keys[i]+'/min'].conflictingPaths[opposingPath] = true;
                opposingConflict.conflictingPaths[path+'/pointers/'+keys[i]+'/min'] = true;
              }
              relids = getDiffChildrenRelids(diffMeta.pointers[keys[i]]);
              for(j=0;j<relids.length;j++){
                tPath = getCommonPathForConcat(relids[j]);
                conflict[path+'/pointers/'+keys[i]+'/'+tPath+'//'] = conflict[path+'/pointers/'+keys[i]+'/'+tPath+'//'] || {value:diffMeta.pointers[keys[i]][relids[j]],conflictingPaths:{}};
                conflict[path+'/pointers/'+keys[i]+'/'+tPath+'//'].conflictingPaths[opposingPath] = true;
                opposingConflict.conflictingPaths[path+'/pointers/'+keys[i]+'/'+tPath+'//'] = true;
              }
            }
          }
        }
      }
      //aspects
      //TODO
    }
    function concatMeta(path,base,extension){
      var keys, i,tPath, j,paths,t2Path,
          mergeMetaItems = function(bPath,bData,eData){
            var bKeys,tKeys, i,tPath,t2Path;
            //delete checks
            if(bData === TODELETESTRING || eData === TODELETESTRING){
              if(CANON.stringify(bData) !== CANON.stringify(eData)){
                _conflict_mine[bPath] = _conflict_mine[bPath] || {value:bData,conflictingPaths:{}};
                _conflict_mine[bPath].conflictingPaths[bPath] = true;
                _conflict_theirs[bPath] = _conflict_theirs[bPath] || {value:eData,conflictingPaths:{}};
                _conflict_theirs[bPath].conflictingPaths[bPath] = true;
              }
            } else {
              //max
              if(eData.max){
                if(bData.max && bData.max !== eData.max){
                  tPath = bPath+'/max';
                  _conflict_mine[tPath] = _conflict_mine[tPath] || {value:bData.max,conflictingPaths:{}};
                  _conflict_mine[tPath].conflictingPaths[tPath] = true;
                  _conflict_theirs[tPath] = _conflict_theirs[tPath] || {value:eData.max,conflictingPaths:{}};
                  _conflict_theirs[tPath].conflictingPaths[tPath] = true;
                } else {
                  bData.max = eData.max;
                }
              }
              //min
              if(eData.min) {
                if (bData.min && bData.min !== eData.min) {
                  tPath = bPath + '/min';
                  _conflict_mine[tPath] = _conflict_mine[tPath] || {value: bData.min, conflictingPaths: {}};
                  _conflict_mine[tPath].conflictingPaths[tPath] = true;
                  _conflict_theirs[tPath] = _conflict_theirs[tPath] || {value: eData.min, conflictingPaths: {}};
                  _conflict_theirs[tPath].conflictingPaths[tPath] = true;
                } else {
                  bData.max = eData.min;
                }
              }
              //targets
              bKeys = getDiffChildrenRelids(bData);
              tKeys = getDiffChildrenRelids(eData);
              for(i=0;i<tKeys.length;i++){
                tPath = getCommonPathForConcat(tKeys[i]);
                if(bKeys.indexOf(tPath) !== -1 && CANON.stringify(bData[tPath]) !== CANON.stringify(eData[tKeys[i]])){
                  t2Path = tPath;
                  tPath = bPath+'/'+tPath+'//';
                  _conflict_mine[tPath] = _conflict_mine[tPath] || {value:bData[t2Path],conflictingPaths:{}};
                  _conflict_mine[tPath].conflictingPaths[tPath] = true;
                  _conflict_theirs[tPath] = _conflict_theirs[tPath] || {value:eData[tKeys[i]],conflictingPaths:{}};
                  _conflict_theirs[tPath].conflictingPaths[tPath] = true;
                } else {
                  bData[tPath] = eData[tKeys[i]];
                }
              }
            }
          };
      if(CANON.stringify(base) !== CANON.stringify(extension)){
        if(base === TODELETESTRING){
          _conflict_mine[path] = _conflict_mine[path] || {value:TODELETESTRING,conflictingPaths:{}};
          gatherFullMetaConflicts(extension,false,path,path);
        } else {
          if(extension === TODELETESTRING){
            _conflict_theirs[path] = _conflict_theirs[path] || {value:TODELETESTRING,conflictingPaths:{}};
            gatherFullMetaConflicts(base,true,path,path);
          } else {
            //now check for sub-meta conflicts

            //children
            if(extension.children){
              if(base.children){
                mergeMetaItems(path+'/children',base.children,extension.children);
              } else {
                //we just simply merge the extension's
                base.children = extension.children;
              }
            }
            //pointers
            if(extension.pointers){
              if(base.pointers){
                //complete deletion
                if(base.pointers === TODELETESTRING || extension.pointers === TODELETESTRING){
                  if(CANON.stringify(base.pointers) !== CANON.stringify(extension.pointers)){
                    tPath = path+'/pointers';
                    _conflict_mine[tPath] = _conflict_mine[tPath] || {value:base.pointers,conflictingPaths:{}};
                    _conflict_mine[tPath].conflictingPaths[tPath] = true;
                    _conflict_theirs[tPath] = _conflict_theirs[tPath] || {value:extension.pointers,conflictingPaths:{}};
                    _conflict_theirs[tPath].conflictingPaths[tPath] = true;
                  }
                } else {
                  keys = Object.keys(extension.pointers);
                  for(i=0;i<keys.length;i++){
                    if(base.pointers[keys[i]]){
                      mergeMetaItems(path+'/pointers/'+keys[i],base.pointers[keys[i]],extension.pointers[keys[i]]);
                    } else {
                      base.pointers[keys[i]] = extension.pointers[keys[i]];
                    }
                  }
                }
              } else {
                base.pointers = extension.pointers;
              }
            }
            //attributes
            if(extension.attributes){
              if(base.attributes){
                if(extension.attributes === TODELETESTRING || base.attributes == TODELETESTRING){
                  if(CANON.stringify(base.attributes) !== CANON.stringify(extension.attributes)){
                    tPath = path+'/attributes';
                    _conflict_mine[tPath] = _conflict_mine[tPath] || {value:base.attributes,conflictingPaths:{}};
                    _conflict_mine[tPath].conflictingPaths[tPath] = true;
                    _conflict_theirs[tPath] = _conflict_theirs[tPath] || {value:extension.attributes,conflictingPaths:{}};
                    _conflict_theirs[tPath].conflictingPaths[tPath] = true;
                  }
                } else {
                  keys = Object.keys(extension.attributes);
                  for(i=0;i<keys.length;i++){
                    if(base.attributes[keys[i]]){
                      if(extension.attributes[keys[i]] === TODELETESTRING || base.attributes[keys[i]] == TODELETESTRING){
                        if(CANON.stringify(base.attributes[keys[i]]) !== CANON.stringify(extension.attributes[keys[i]])){
                          tPath = path+'/attributes/'+[keys[i]];
                          _conflict_mine[tPath] = _conflict_mine[tPath] || {value:base.attributes[keys[i]],conflictingPaths:{}};
                          _conflict_mine[tPath].conflictingPaths[tPath] = true;
                          _conflict_theirs[tPath] = _conflict_theirs[tPath] || {value:extension.attributes[keys[i]],conflictingPaths:{}};
                          _conflict_theirs[tPath].conflictingPaths[tPath] = true;
                        }
                      } else {
                        concatSingleKeyValuePairs(path+'/attributes/'+keys[i],base.attributes[keys[i]],extension.attributes[keys[i]]);
                      }
                    } else {
                      base.attributes[keys[i]] = extension.attributes[keys[i]];
                    }
                  }

                }
              } else {
                base.attributes = extension.attributes;
              }
            }

            //aspects
            if(extension.aspects){
              if(base.aspects){
                if(extension.aspects === TODELETESTRING || base.aspects == TODELETESTRING){
                  if(CANON.stringify(base.aspects) !== CANON.stringify(extension.aspects)){
                    tPath = path+'/aspects';
                    _conflict_mine[tPath] = _conflict_mine[tPath] || {value:base.aspects,conflictingPaths:{}};
                    _conflict_mine[tPath].conflictingPaths[tPath] = true;
                    _conflict_theirs[tPath] = _conflict_theirs[tPath] || {value:extension.aspects,conflictingPaths:{}};
                    _conflict_theirs[tPath].conflictingPaths[tPath] = true;
                  }
                } else {
                  keys = Object.keys(extension.aspects);
                  for(i=0;i<keys.length;i++){
                    if(base.aspects[keys[i]]){
                      if(extension.aspects[keys[i]] === TODELETESTRING || base.aspects[keys[i]] == TODELETESTRING){
                        if(CANON.stringify(base.aspects[keys[i]]) !== CANON.stringify(extension.aspects[keys[i]])){
                          tPath = path+'/aspects/'+keys[i];
                          _conflict_mine[tPath] = _conflict_mine[tPath] || {value:base.aspects[keys[i]],conflictingPaths:{}};
                          _conflict_mine[tPath].conflictingPaths[tPath] = true;
                          _conflict_theirs[tPath] = _conflict_theirs[tPath] || {value:extension.aspects[keys[i]],conflictingPaths:{}};
                          _conflict_theirs[tPath].conflictingPaths[tPath] = true;
                        }
                      } else {
                        paths = Object.keys(extension.aspects[keys[i]]);
                        for(j=0;j<paths.length;j++){
                          tPath = getCommonPathForConcat(paths[j]);
                          if(base.aspects[keys[i]][tPath]){
                            if(CANON.stringify(base.aspects[keys[i]][tPath]) !== CANON.stringify(extension.aspects[keys[i]][paths[j]])){
                              t2Path = tPath;
                              tPath = path+'/aspects/'+keys[i]+'/'+tPath+'//';
                              _conflict_mine[tPath] = _conflict_mine[tPath] || {value:base.aspects[keys[i]][t2Path],conflictingPaths:{}};
                              _conflict_mine[tPath].conflictingPaths[tPath] = true;
                              _conflict_theirs[tPath] = _conflict_theirs[tPath] || {value:extension.aspects[keys[i]][paths[j]],conflictingPaths:{}};
                              _conflict_theirs[tPath].conflictingPaths[tPath] = true;
                            }
                          } else {
                            base.aspects[keys[i]][tPath] = extension.aspects[keys[i]][paths[j]];
                          }
                        }
                      }
                    } else {
                      base.aspects[keys[i]] = extension.aspects[keys[i]];
                    }
                  }
                }
              } else {
                base.aspects = extension.aspects;
              }
            }
          }
        }
      }
    }

    function tryToConcatNodeChange(extNode,path){
      var guid = extNode.guid,
        oGuids =  getObstructiveGuids(extNode),
        baseNode = getNodeByGuid(_concat_base,guid),
        basePath = getPathByGuid(_concat_base,guid,''),
        i,tPath,
        relids = getDiffChildrenRelids(extNode);


      if(extNode.removed === true){
        if(baseNode && baseNode.removed !== true){
          tPath = basePath+'/removed';
          _conflict_theirs[tPath] = _conflict_theirs[tPath] || {value:true,conflictingPaths:{}};
          oGuids = getWhomIObstructGuids(guid);
          ASSERT(oGuids.length > 0);
          for(i=0;i<oGuids.length;i++){
            baseNode = getNodeByGuid(_concat_base,oGuids[i]);
            basePath = getPathByGuid(_concat_base,oGuids[i],'');
            gatherFullNodeConflicts(baseNode,true,basePath,tPath);
          }
        } else {
          //we simply concat the deletion
          insertAtPath(_concat_base,path,extNode);
        }
      } else {
        if(oGuids.length > 0){
            for(i=0;i<oGuids.length;i++){
              baseNode = getNodeByGuid(_concat_base,oGuids[i]);
              basePath = getPathByGuid(_concat_base,oGuids[i],'');
              _conflict_mine[basePath+'/removed'] = _conflict_mine[basePath+'/removed'] || {value:true,conflictingPaths:{}};
              gatherFullNodeConflicts(extNode,false,path,basePath+'/removed');
            }
        } else if(baseNode){
          //here we are able to check the sub-node conflicts
          //check double moves - we do not care if they moved under the same parent
          if(extNode.movedFrom){
            if(baseNode.movedFrom && path !== basePath){
              _conflict_mine[basePath] = _conflict_mine[basePath] || {value:"move",conflictingPaths:{}};
              _conflict_theirs[path] = _conflict_theirs[path] || {value:"move",conflictingPaths:{}};
              _conflict_mine[basePath].conflictingPaths[path]=true;
              _conflict_theirs[path].conflictingPaths[basePath] = true;
              //we keep the node where it is, but synchronize the paths
              path = basePath;
            } else if(path !== basePath){
              //first we move the base object to its new path
              //we copy the moved from information right here
              baseNode.movedFrom = extNode.movedFrom;
              insertAtPath(_concat_base,path,baseNode);
              removePathFromDiff(_concat_base,basePath);
              baseNode = getNodeByGuid(_concat_base,guid);
              basePath = getPathByGuid(_concat_base,guid,'');
              ASSERT(path === basePath);
            }
          }

          ASSERT(basePath === path || baseNode.movedFrom === path);
          path = basePath; //the base was moved


          //and now the sub-node conflicts
          if(extNode.attr){
            if(baseNode.attr){
              concatSingleKeyValuePairs(path+'/attr',baseNode.attr,extNode.attr);
            } else {
              insertAtPath(_concat_base,path+'/attr',extNode.attr);
            }
          }
          if(extNode.reg){
            if(baseNode.reg){
              concatSingleKeyValuePairs(path+'/reg',baseNode.reg,extNode.reg);
            } else {
              insertAtPath(_concat_base,path+'/reg',extNode.reg);
            }
          }
          if(extNode.pointer){
            if(baseNode.pointer){
              concatSingleKeyValuePairs(path+'/pointer',baseNode.pointer,extNode.pointer);
            } else {
              insertAtPath(_concat_base,path+'/pointer',extNode.pointer);
            }
          }
          if(extNode.set){
            if(baseNode.set){
              concatSet(path+'/set',baseNode.set,extNode.set);
            } else {
              insertAtPath(_concat_base,path+'/set',extNode.set);
            }
          }
          if(extNode.meta){
            if(baseNode.meta){
              concatMeta(path+'/meta',baseNode.meta,extNode.meta);
            } else {
              insertAtPath(_concat_base,path+'/meta',extNode.meta);
            }
          }
        } else {
          //there is no basenode so we can concat the whole node
          insertAtPath(_concat_base,path,getSingleNode(extNode));
        }
      }

      //here comes the recursion
      for(i=0;i<relids.length;i++){
        tryToConcatNodeChange(extNode[relids[i]],path+'/'+relids[i]);
      }

    }

    function generateConflictItems(){
      var items = [],
        keys, i, j,conflicts;
      keys = Object.keys(_conflict_mine);

      for(i=0;i<keys.length;i++){
        conflicts = Object.keys(_conflict_mine[keys[i]].conflictingPaths || {});
        ASSERT(conflicts.length > 0);
        for(j=0;j<conflicts.length;j++){
          items.push({
            selected:"mine",
            mine:{
              path: keys[i],
              info: keys[i].replace(/\//g," / "),
              value: _conflict_mine[keys[i]].value
            },
            theirs:{
              path:conflicts[j],
              info:conflicts[j].replace(/\//g," / "),
              value:_conflict_theirs[conflicts[j]].value
            }
          });
        }
      }
      return items;
    }
    function harmonizeConflictPaths(diff){
      var relids = getDiffChildrenRelids(diff),
        keys, i,members,j;

      keys = Object.keys(diff.pointer || {});
      for(i=0;i<keys.length;i++){
        diff.pointer[keys[i]] = getCommonPathForConcat(diff.pointer[keys[i]]);
      }
      keys = Object.keys(diff.set || {});
      for(i=0;i<keys.length;i++){
        members = Object.keys(diff.set[keys[i]] || {});
        for(j=0;j<members.length;j++){
          if(members[j] !== getCommonPathForConcat(members[j])){
            diff.set[keys[i]][getCommonPathForConcat(members[j])] = diff.set[keys[i]][members[j]];
            delete diff.set[keys[i]][members[j]];
          }
        }
      }

      //TODO we have to do the meta as well
      for(i=0;i<relids.length;i++){
        harmonizeConflictPaths(diff[relids[i]]);
      }
    }

    _core.tryToConcatChanges = function(base,extension){
      var result = {};
      _conflict_items = [];
      _conflict_mine = {};
      _conflict_theirs = {};
      _concat_base = base;
      _concat_extension = extension;
      _concat_base_removals = {};
      _concat_moves = {
        getBaseSourceFromDestination : {},
        getBaseDestinationFromSource : {},
        getExtensionSourceFromDestination : {},
        getExtensionDestinationFromSource : {}
      };
      getMoveSources(base,'',_concat_moves.getBaseSourceFromDestination,_concat_moves.getBaseDestinationFromSource);
      getMoveSources(extension,'',_concat_moves.getExtensionSourceFromDestination,_concat_moves.getExtensionDestinationFromSource);
      getConcatBaseRemovals(base);
      tryToConcatNodeChange(_concat_extension,'');

      result.items = generateConflictItems();
      result.mine = _conflict_mine;
      result.theirs = _conflict_theirs;
      result.merge = _concat_base;
      harmonizeConflictPaths(result.merge);
      return result;
    };

    function depthOfPath(path){
      ASSERT(typeof path === "string");
      return path.split('/').length;
    }
    function resolveMoves(resolveObject){
      var i,moves = {},filteredItems=[],path,
        moveBaseOfPath = function(path){
          var keys = Object.keys(moves),
            i,maxDepth = -1,base=null;
          for(i=0;i<keys.length;i++){
            if(path.indexOf(keys[i]) === 1 && depthOfPath(keys[i])>maxDepth){
              base = keys[i];
              maxDepth = depthOfPath(keys[i]);
            }
          }
          return base;
        };
      for(i=0;i<resolveObject.items.length;i++){
        if(resolveObject.items[i].selected === "theirs" && resolveObject.items[i].theirs.value === "move"){
          moves[resolveObject.items[i].mine.path] = resolveObject.items[i].theirs.path;
          //and we also make the move
          insertAtPath(resolveObject.merge,resolveObject.items[i].theirs.path,getPathOfDiff(resolveObject.merge,resolveObject.items[i].mine.path));
          removePathFromDiff(resolveObject.merge,resolveObject.items[i].mine.path);
        } else {
          filteredItems.push(resolveObject.items[i]);
        }
      }
      resolveObject.items = filteredItems;

      //in a second run we modify all sub-path of the moves paths
      for(i=0;i<resolveObject.items.length;i++){
        if(resolveObject.items[i].selected === "theirs"){
          path = moveBaseOfPath(resolveObject.items[i].theirs.path);
          if(path){
            resolveObject.items[i].theirs.path = resolveObject.items[i].theirs.path.replace(path,moves[path]);
          }
          path = moveBaseOfPath(resolveObject.items[i].mine.path);
          if(path){
            resolveObject.items[i].mine.path = resolveObject.items[i].mine.path.replace(path,moves[path]);
          }
        }
      }
    }

    /*function resolveConflictItem(diff,conflictItem){

      //let's start with the easy ones :)

      //if the two path is equal, the we can simply replace the base value
      if(conflictItem.mine.path === conflictItem.theirs.path){
        insertAtPath(diff,conflictItem.theirs.path,conflictItem.theirs.value);
      }
    }*/

    _core.applyResolution = function(conflictObject){
      //we apply conflict items to the merge and return it as a diff
      var i;
      resolveMoves(conflictObject);
      for(i=0;i<conflictObject.items.length;i++){
        if(conflictObject.items[i].selected !== "mine"){
          removePathFromDiff(conflictObject.merge,conflictObject.items[i].mine.path);
          insertAtPath(conflictObject.merge,conflictObject.items[i].theirs.path,conflictObject.items[i].theirs.value);
        }
      }

      return conflictObject.merge;
    };


    //we remove some low level functions as they should not be used on high level
    delete _core.overlayInsert;

    return _core;
  }

  return diffCore;
});
