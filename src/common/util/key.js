/**
 * Created by tkecskes on 1/6/2015.
 */
/* globals define, WebGMEGlobal, GME */
define([
    './sha1',
    './zssha1',
    './assert',
    './canon'
], function (SHA1, ZS, ASSERT, CANON) {
    'use strict';
    var keyType = null,
        ZSSHA = new ZS();

    function rand160Bits() {
        var result = '', i, code;
        for (i = 0; i < 40; i++) {
            code = Math.floor(Math.random() * 16);
            code = code > 9 ? code + 87 : code + 48;
            result += String.fromCharCode(code);
        }
        return result;
    }

    return function KeyGenerator(object) {
        if (keyType === null) {
            if (typeof WebGMEGlobal !== 'undefined' && WebGMEGlobal.config && typeof WebGMEGlobal.config.keyType === 'string') {
                keyType = WebGMEGlobal.config.keyType;
            } else if (typeof WebGMEGlobal !== 'undefined' && typeof WebGMEGlobal.getConfig === 'function') {
                keyType = WebGMEGlobal.getConfig().storageKeyType || 'plainSHA1';
            } else if (typeof GME !== 'undefined' && GME.config && typeof GME.config.keyType === 'string') {
                keyType = GME.config.keyType;
            } else {
                keyType = 'plainSHA1';
            }
        }

        ASSERT(typeof keyType === 'string');

        switch (keyType) {
            case 'rand160Bits':
                return rand160Bits();
            case 'ZSSHA':
                return ZSSHA.getHash(CANON.stringify(object));
            default: //plainSHA1
                return SHA1(CANON.stringify(object));
        }
    };
});