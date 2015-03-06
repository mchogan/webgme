/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "util/assert", "core/tasync" ], function(ASSERT, TASYNC) {
	"use strict";

	// ----------------- CoreUnwrap -----------------

	var CoreUnwrap = function(oldcore) {

		function checkNode(node) {
			if (node === null || oldcore.isValidNode(node)) {
				return node;
			} else {
				throw new Error("Invalid result node");
			}
		}

		function checkNodes(nodes) {
			ASSERT(nodes instanceof Array);

			var i;
			for (i = 0; i < nodes.length; ++i) {
				if (!oldcore.isValidNode(nodes[i])) {
					throw new Error("Invalid result node array");
				}
			}

			return nodes;
		}

		// copy all operations
		var core = {};
		for ( var key in oldcore) {
			core[key] = oldcore[key];
		}

		core.loadRoot = TASYNC.unwrap(oldcore.loadRoot);
		core.persist = TASYNC.unwrap(oldcore.persist);

		// core.loadChild = TASYNC.unwrap(oldcore.loadChild);
		core.loadChild = TASYNC.unwrap(function(node, relid) {
			return TASYNC.call(checkNode, oldcore.loadChild(node, relid));
		});

		// core.loadByPath = TASYNC.unwrap(oldcore.loadByPath);
		core.loadByPath = TASYNC.unwrap(function(node, path) {
			return TASYNC.call(checkNode, oldcore.loadByPath(node, path));
		});

		// core.loadChildren = TASYNC.unwrap(oldcore.loadChildren);
		core.loadChildren = TASYNC.unwrap(function(node) {
			return TASYNC.call(checkNodes, oldcore.loadChildren(node));
		});

		core.loadPointer = TASYNC.unwrap(oldcore.loadPointer);
		core.loadCollection = TASYNC.unwrap(oldcore.loadCollection);

		core.loadSubTree = TASYNC.unwrap(oldcore.loadSubTree);
		core.loadTree = TASYNC.unwrap(oldcore.loadTree);

		//core diff async functions
		if(typeof oldcore.generateTreeDiff === 'function'){
			core.generateTreeDiff = TASYNC.unwrap(oldcore.generateTreeDiff);
		}

		if(typeof  oldcore.generateLightTreeDiff === 'function'){
		  core.generateLightTreeDiff = TASYNC.unwrap(oldcore.generateLightTreeDiff);
		}

		if(typeof oldcore.applyTreeDiff === 'function'){
		  core.applyTreeDiff = TASYNC.unwrap(oldcore.applyTreeDiff);
		}

		return core;
	};

	return CoreUnwrap;
});
