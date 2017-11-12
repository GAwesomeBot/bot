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

const { addToGlobal } = require("../Modules/Utils/GlobalDefines.js");

exports.initialize = url => new Promise((resolve, reject) => {
	mongoose.connect(url, {
		useMongoClient: true,
		promiseLibrary: global.Promise,
	});
	const [
		Servers,
		Users,
		Gallery,
		Blog,
		Wiki,
	] = [
		mongoose.model("servers", serverSchema),
		mongoose.model("users", userSchema),
		mongoose.model("gallery", modulesSchema),
		mongoose.model("blog", blogSchema),
		mongoose.model("wiki", wikiSchema),
	];
	mongoose.connection
		.on("error", err => reject(err))
		.once("open", () => {
			addToGlobal("Servers", Servers);
			addToGlobal("Users", Users);
			addToGlobal("Gallery", Gallery);
			addToGlobal("Blob", Blog);
			addToGlobal("Wiki", Wiki);
			addToGlobal("Database", {
				Servers, servers: Servers,
				Users, users: Users,
				Gallery, gallery: Gallery,
				Blog, blog: Blog,
				Wiki, wiki: Wiki,
				Raw: mongoose.connection,
			});
			resolve(global.Database);
		});
});

exports.get = exports.getConnection = () => global.Database;
