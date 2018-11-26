/* eslint node/exports-style: ["error", "exports"] */

const mongoose = require("mongoose");
mongoose.pluralize(null);
mongoose.Promise = global.Promise;

const serverSchema = require("./Schemas/serverSchema");
const userSchema = require("./Schemas/userSchema");
const modulesSchema = require("./Schemas/modulesSchema.js");
const blogSchema = require("./Schemas/blogSchema.js");
const wikiSchema = require("./Schemas/wikiSchema");
const trafficSchema = require("./Schemas/trafficSchema");


exports.initialize = (url, client = null) => new Promise((resolve, reject) => {
	if (client) {
		serverSchema.plugin(function hookIntoSchema (schema) {
			winston.debug(`Hooking into the server schema...`);
			schema.post("save", async function _ () {
				if (global.ThatClientThatDoesCaching.cache) {
					const cachedDocument = global.ThatClientThatDoesCaching.cache.getSync(this._id);
					if (this.__v && cachedDocument && cachedDocument.__v && this.__v !== cachedDocument.__v) {
						winston.verbose(`The document for ${this._id} has a new version! Updating...`, { old: cachedDocument.__v, new: this.__v, guild: this._id });
						global.ThatClientThatDoesCaching.cache.update(this._id);
					} else {
						// Clear atomics in cached document
						cachedDocument.$__reset();
					}
				}
			});
		});
	}
	mongoose.connect(url, {
		keepAlive: 120,
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
			addToGlobal("Blog", Blog);
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

const { MongoClient } = require("mongodb");

const Model = require("./Model");
const { addToGlobal } = require("../Modules/Utils/GlobalDefines.js");

/**
 * Prepares models, creates and connects a client to MongoDB
 * @param {object} config A set of MongoDB config options
 * @returns {Promise<Object>}
 */
exports.einitialize = async config => {
	const mongoClient = new MongoClient(config.URL, config.options);
	await mongoClient.connect();
	const db = mongoClient.db(config.db);
	const [
		Servers,
		Users,
		Gallery,
		Blog,
		Wiki,
		Traffic,
	] = [
		new Model(db, "servers", require("./Schemas/E/serverSchema")),
		new Model(db, "users", require("./Schemas/E/userSchema")),
		new Model(db, "gallery", require("./Schemas/E/modulesSchema")),
		new Model(db, "blog", require("./Schemas/E/blogSchema")),
		new Model(db, "wiki", require("./Schemas/E/wikiSchema")),
		new Model(db, "traffic", require("./Schemas/E/trafficSchema")),
	];
	addToGlobal("EServers", Servers);
	addToGlobal("EUsers", Users);
	addToGlobal("EGallery", Gallery);
	addToGlobal("EBlog", Blog);
	addToGlobal("EWiki", Wiki);
	addToGlobal("EClient", db);
	addToGlobal("EDatabase", {
		Servers, servers: Servers,
		Users, users: Users,
		Gallery, gallery: Gallery,
		Blog, blog: Blog,
		Wiki, wiki: Wiki,
		Traffic, traffic: Traffic,
		client: db,
	});
	return global.EDatabase.client;
};
