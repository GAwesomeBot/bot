const sizeof = require("object-sizeof");
const {
	Errors: {
		Error: GABError,
	},
} = require("../../../index");
let rawExtensionDocument;

/**	Library containing basic Extension metadata and methods */
module.exports = class Extension {
	/**
	 *	Create an Extension Module instance
	 *	@param {Object} extensionDocument - The extension's subdocument
	 *	@param {Document} serverDocument - The document of the guild in which the extension is being executed
	 */
	constructor (extensionDocument, serverDocument) {
		this.name = extensionDocument.name;
		this.type = extensionDocument.type;
		this.key = extensionDocument.key;
		this.keywords = extensionDocument.keywords;
		this.case_sensitive = extensionDocument.case_sensitive;
		this.admin_level = extensionDocument.admin_level;
		this.interval = extensionDocument.interval;
		this.enabled_channel_ids = extensionDocument.enabled_channel_ids;
		this.usage_help = extensionDocument.usage_help;
		this.extended_help = extensionDocument.extended_help;
		this.last_run = extensionDocument.last_run;
		this.updates_available = extensionDocument.updates_available;
		this.description = extensionDocument.description;
		this.points = extensionDocument.points;
		this.owner_id = extensionDocument.owner_id;
		this.featured = extensionDocument.featured;
		this.event = extensionDocument.event;
		this.fields = extensionDocument.fields;

		this.storage = {
			write: async (key, value) => {
				let Store;
				if (!rawExtensionDocument.store) Store = {};
				else Store = JSON.parse(JSON.stringify(rawExtensionDocument.store));
				Store[key] = value;
				if (sizeof(Store) > 25000) {
					throw new GABError("STORAGE_SIZE_MAX");
				} else {
					rawExtensionDocument.store = Store;
					serverDocument.markModified("extensions");
					return value;
				}
			},
			get: key => rawExtensionDocument.store[key],
			delete: async key => {
				if (!rawExtensionDocument.store) {
					throw new GABError("STORAGE_EMPTY");
				} else {
					const Store = JSON.parse(JSON.stringify(rawExtensionDocument.store));
					delete Store[key];
					rawExtensionDocument.store = Store;
					serverDocument.markModified("extensions");
					return key;
				}
			},
			clear: async () => {
				rawExtensionDocument.store = {};
				serverDocument.markModified("extensions");
			},
		};
	}
};
