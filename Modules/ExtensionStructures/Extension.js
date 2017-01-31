"use strict";
const sizeof = require("object-sizeof");

// Object for extension metadata
module.exports = class Extension {
	constructor(winston, extensionDocument, svr, serverDocument) {
		const extension = extensionDocument.toObject();
		for(const prop in extension) {
			this[prop] = extension[prop];
		}

		this.writeStore = (key, value, callback) => {
			var Store = null;
            if(extensionDocument.store === undefined){
                Store = {};
            } else {
                Store = JSON.parse(JSON.stringify(extensionDocument.store));
            }
            Store[key] = value;
            if(sizeof(Store)>25000) {
				callback(new Error("Extension store exceeds 25 KB limit"), extensionDocument.store);
			} else {
				extensionDocument.store = Store;
				this.store = extensionDocument.store;
				serverDocument.markModified("extensions");
				serverDocument.save(err => {
					if(err) {
						winston.error(`Failed to save server data for extension '${extensionDocument._id}'`, {svrid: svr.id}, err);
					}
					callback(err, extensionDocument.store);
				});
			}
		};

		this.deleteStore = (key, callback) => {
			if(extensionDocument.store === undefined){
                callback(new Error("Store is empty."), extensionDocument.store);
            } else {
                var Store = JSON.parse(JSON.stringify(extensionDocument.store));
                delete Store[key];
                extensionDocument.store = Store;
                this.store = extensionDocument.store;
                serverDocument.markModified("extensions");
                serverDocument.save(err => {
                    if(err) {
                        winston.error(`Failed to save server data for extension '${extensionDocument._id}'`, {svrid: svr.id}, err);
                    }
                    callback(err, extensionDocument.store);
                });
            }
        };
    }
};
