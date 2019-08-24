/* eslint node/exports-style: ["error", "exports"] */
const { MongoClient } = require("mongodb");

const Model = require("./Model");
const { addToGlobal } = require("../Modules/Utils/GlobalDefines.js");

/**
 * Prepares models, creates and connects a client to MongoDB
 * @param {object} config A set of MongoDB config options
 * @returns {Promise<Object>}
 */
exports.initialize = async config => {
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
		new Model(db, "servers", require("./Schemas/serverSchema")),
		new Model(db, "users", require("./Schemas/userSchema")),
		new Model(db, "gallery", require("./Schemas/gallerySchema")),
		new Model(db, "blog", require("./Schemas/blogSchema")),
		new Model(db, "wiki", require("./Schemas/wikiSchema")),
		new Model(db, "traffic", require("./Schemas/trafficSchema")),
	];
	addToGlobal("Servers", Servers);
	addToGlobal("Users", Users);
	addToGlobal("Gallery", Gallery);
	addToGlobal("Blog", Blog);
	addToGlobal("Wiki", Wiki);
	addToGlobal("Client", db);
	addToGlobal("Database", {
		Servers, servers: Servers,
		Users, users: Users,
		Gallery, gallery: Gallery,
		Blog, blog: Blog,
		Wiki, wiki: Wiki,
		Traffic, traffic: Traffic,
		client: db,
		mongoClient,
	});
	return global.Database.client;
};

exports.get = exports.getConnection = () => global.Database;
