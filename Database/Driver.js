/* eslint-disable require-await */
const mongoose = require("mongoose");
mongoose.Promise = global.Promise;
const findOrCreate = require("mongoose-findorcreate");
const serverSchema = require("./Schemas/serverSchema");
const userSchema = require("./Schemas/userSchema");
userSchema.plugin(findOrCreate);
const modulesSchema = require("./Schemas/modulesSchema.js");
modulesSchema.index({
	name: "text",
	description: "text",
});
const blogSchema = require("./Schemas/blogSchema.js");
const wikiSchema = require("./Schemas/wikiSchema");

// Connect and setup the database
module.exports = {
	initialize: url => new Promise((resolve, reject) => {
		mongoose.connect(url, {
			autoReconnect: true,
			connectTimeoutMS: 30000,
			socketTimeoutMS: 30000,
			keepAlive: 120,
			poolSize: 100,
		});

		mongoose.model("servers", serverSchema);
		mongoose.model("users", userSchema);
		mongoose.model("gallery", modulesSchema);
		mongoose.model("blog", blogSchema);
		mongoose.model("wiki", wikiSchema);

		mongoose.connection.on("error", err => {
			reject(err);
		});
		mongoose.connection.once("open", () => resolve());
	}),
	get: () => mongoose.models,
	getConnection: () => mongoose.connection,
};
