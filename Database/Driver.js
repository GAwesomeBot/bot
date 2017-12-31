const mongoose = require("mongoose");
mongoose.Promise = global.Promise;
const serverSchema = require("./Schemas/serverSchema");
const userSchema = require("./Schemas/userSchema");
userSchema.plugin(require("mongoose-findorcreate"));
const modulesSchema = require("./Schemas/modulesSchema.js");
modulesSchema.index({
	name: "text",
	description: "text",
});
const blogSchema = require("./Schemas/blogSchema.js");
const wikiSchema = require("./Schemas/wikiSchema");
const trafficSchema = require("./Schemas/trafficSchema");

const { addToGlobal } = require("../Modules/Utils/GlobalDefines.js");

exports.initialize = (url, client = null) => new Promise((resolve, reject) => {
	if (client) {
		/* eslint-disable prefer-arrow-callback, no-invalid-this */
		serverSchema.plugin(function hookIntoSchema (schema) {
			winston.debug(`Hooking into the server schema...`);
			schema.post("save", async function _ () {
				if (global.ThatClientThatDoesCaching.cache) {
					let cachedDocument = global.ThatClientThatDoesCaching.cache.getSync(this._id);
					if (this.__v && cachedDocument && cachedDocument.__v && this.__v !== cachedDocument.__v) {
						winston.info(`The document for ${this._id} has a new version! ${process.env.SHARD_ID} Updating...`, { old: cachedDocument.__v, new: this.__v, guild: this._id });
						global.ThatClientThatDoesCaching.cache.update(this._id);
					}
				}
			});
		});
	}
	mongoose.connect(url, {
		keepAlive: 120,
		useMongoClient: true,
		promiseLibrary: global.Promise,
	});
	const [
		Servers,
		Users,
		Gallery,
		Blog,
		Wiki,
		Traffic,
	] = [
		mongoose.model("servers", serverSchema),
		mongoose.model("users", userSchema),
		mongoose.model("gallery", modulesSchema),
		mongoose.model("blog", blogSchema),
		mongoose.model("wiki", wikiSchema),
		mongoose.model("traffic", trafficSchema, "traffic"),
	];
	mongoose.connection
		.on("error", err => reject(err))
		.once("open", () => {
			addToGlobal("Servers", Servers);
			addToGlobal("Users", Users);
			addToGlobal("Gallery", Gallery);
			addToGlobal("Blob", Blog);
			addToGlobal("Wiki", Wiki);
			addToGlobal("Raw", mongoose.connection);
			addToGlobal("Database", {
				Servers, servers: Servers,
				Users, users: Users,
				Gallery, gallery: Gallery,
				Blog, blog: Blog,
				Wiki, wiki: Wiki,
				Traffic, traffic: Traffic,
				Raw: mongoose.connection,
			});
			resolve(global.Database);
		});
});

exports.get = exports.getConnection = () => global.Database;
