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
			const storeClone = JSON.parse(JSON.stringify(extensionDocument.store));
			storeClone[key] = value;
			if(sizeof(storeClone)>25000) {
				callback(new Error("Extension store exceeds 25 KB limit"), extensionDocument.store);
			} else {
				extensionDocument.store[key] = value;
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
			delete extensionDocument.store[key];
			this.store = extensionDocument.store;
			serverDocument.markModified("extensions");
			serverDocument.save(err => {
				if(err) {
					winston.error(`Failed to save server data for extension '${extensionDocument._id}'`, {svrid: svr.id}, err);
				}
				callback(err, extensionDocument.store);
			});
		};
	}
};
