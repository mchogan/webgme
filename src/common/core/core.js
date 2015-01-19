/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define(["core/corerel",'core/setcore','core/guidcore','core/nullpointercore','core/coreunwrap', 'core/descriptorcore', 'core/coretype', 'core/constraintcore', 'core/coretree', 'core/metacore', 'core/coretreeloader', 'core/corerootloader'],
			function (CoreRel, Set, Guid, NullPtr, UnWrap, Descriptor, Type, Constraint, CoreTree, MetaCore, TreeLoader, RootLoader)
{
    "use strict";

    function core(storage,options){
        options = options || {};
        options.usetype = options.usertype || 'nodejs';

        var coreCon = new RootLoader(new TreeLoader(new MetaCore(new Constraint(new Descriptor(new Guid(new Set(new NullPtr(new Type(new NullPtr(new CoreRel(new CoreTree(storage, options))))))))))));

        if(options.usertype === 'tasync'){
            return coreCon;
        } else {
            return new UnWrap(coreCon);
        }
    }

    return core;
});
