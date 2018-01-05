const API = require("./index");
const {
	Errors: {
		Error: GABError,
	},
} = require("../../index");
class Sandbox {
	constructor (rawBot, serverDocument, extensionDocument, rawParams, scopes) {
		const modules = {};

		// Import Basic Global Objects and Functions
		this.Array = Array;
		this.Date = Date;
		this.JSON = JSON;
		this.Math = Math;
		this.Number = Number;
		this.Object = Object;
		this.RegExp = RegExp;
		this.decodeURI = decodeURI;
		this.decodeURIComponent = decodeURIComponent;
		this.encodeURI = encodeURI;
		this.encodeURIComponent = encodeURIComponent;
		this.isFinite = isFinite;
		this.isNaN = isNaN;
		this.parseFloat = parseFloat;
		this.parseInt = parseInt;

		// Import Third-Party Modules
		modules.rss = { module: "feed-read", key: "get" };
		modules.moment = { module: "moment" };
		modules.fetch = { module: "snekfetch" };
		modules.xmlparser = { module: "xml-parser" };

		// Import global GAwesomeBot variables
		if (extensionDocument.type === "command") {
			modules.command = {
				module: {
					prefix: rawParams.guild.commandPrefix,
					suffix: rawParams.suffix.trim(),
					key: extensionDocument.key,
				},
				custom: true,
			};
		}
		if (extensionDocument.type === "keyword" && rawParams.keywordMatch) {
			modules.keyword = {
				module: rawParams.keywordMatch,
				custom: true,
			};
		}
		if (rawParams.msg) {
			modules.message = {
				module: new API.Message(rawParams.msg, scopes),
				custom: true,
			};
		}
		if (rawParams.ch) {
			modules.channel = {
				module: new API.Channel(rawParams.ch, scopes),
				custom: true,
				scope: scopes.channels.read,
			};
		}
		modules.guild = {
			module: new API.Guild(rawParams.guild, scopes),
			custom: true,
			scope: scopes.guild.read,
		};
		modules.config = {
			module: serverDocument.toObject().config,
			custom: true,
			scope: scopes.accessDocument,
		};
		modules.extension = {
			module: new API.Extension(extensionDocument, serverDocument),
			custom: true,
		};
		modules.bot = {
			module: new API.Client(rawBot, rawParams.guild, serverDocument, scopes),
			custom: true,
		};

		this.require = name => {
			const module = modules[name];
			if (!module) throw new GABError("UNKNOWN_MODULE");
			if (module.scope && !module.scope) throw new GABError("MISSING_SCOPES");
			if (module.key && !module.custom) {
				return require(module.module)[module.key];
			} else if (!module.key && !module.custom) {
				return require(module.module);
			} else {
				return module.module;
			}
		};
	}
}

module.exports = Sandbox;
