const API = require("./index");
const {
	Errors: {
		Error: GABError,
	},
	Constants: {
		Scopes,
	},
} = require("../../index");
class Sandbox {
	constructor (rawClient, { extensionDocument, versionDocument, msg, guild, serverDocument, extensionConfigDocument, eventData }, scopes) {
		const modules = {};

		// Import Third-Party Modules
		modules.rss = { module: "feed-read", key: "get" };
		modules.moment = { module: "moment" };
		modules.fetch = { module: "chainfetch" };
		modules.xmlparser = { module: "xml-parser" };

		// Import global GAwesomeBot variables
		if (versionDocument.type === "command") {
			modules.command = {
				module: () => ({
					prefix: serverDocument.config.command_prefix,
					suffix: msg.suffix.trim(),
					key: extensionConfigDocument.key,
				}),
				custom: true,
			};
		}
		if (versionDocument.type === "keyword" && extensionConfigDocument.keywords) {
			modules.keyword = {
				module: () => ({
					keywords: extensionConfigDocument.keywords,
				}),
				custom: true,
			};
		}
		if (msg) {
			modules.message = {
				module: () => new API.Message(API, rawClient, msg, scopes, true),
				custom: true,
			};
		}
		if (msg) {
			modules.channel = {
				module: () => new API.Channel(msg.channel, scopes),
				custom: true,
				scope: Scopes.channels_read.scope,
			};
		}
		if (eventData) {
			modules.event = {
				module: () => new API.Event(eventData, scopes),
				custom: true,
			};
		}
		modules.guild = {
			module: () => new API.Guild(guild, scopes),
			custom: true,
			scope: Scopes.guild_read.scope,
		};
		modules.config = {
			module: () => serverDocument.config,
			custom: true,
			scope: Scopes.config.scope,
		};
		modules.extension = {
			module: () => new API.Extension(extensionDocument, serverDocument),
			custom: true,
		};
		modules.bot = {
			module: () => new API.Client(rawClient, guild, serverDocument, scopes),
			custom: true,
		};

		this.require = name => {
			const module = modules[name];
			if (!module) throw new GABError("UNKNOWN_MODULE", name);
			if (module.scope && !scopes.includes(module.scope)) throw new GABError("MISSING_SCOPES");
			if (module.key && !module.custom) {
				return require(module.module)[module.key];
			} else if (!module.custom) {
				return require(module.module);
			} else {
				return module.module();
			}
		};
	}
}

module.exports = Sandbox;
