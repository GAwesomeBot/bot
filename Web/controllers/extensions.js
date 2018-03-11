const path = require("path");
const fs = require("fs-nextra");

const parsers = require("../parsers");
const getGuild = require("../../Modules").GetGuild;
const { AllowedEvents, Colors } = require("../../Internals/Constants");
const { renderError, parseAuthUser, dashboardUpdate, generateCodeID } = require("../helpers");

const validateExtensionData = data => ((data.type === "command" && data.key) || (data.type === "keyword" && data.keywords) || (data.type === "timer" && data.interval) || (data.type === "event" && data.event)) && data.code;
const writeExtensionData = (extensionDocument, data) => {
	extensionDocument.name = data.name;
	extensionDocument.type = data.type;
	extensionDocument.key = data.type === "command" ? data.key : null;
	extensionDocument.keywords = data.type === "keyword" ? data.keywords.split(",") : null;
	extensionDocument.case_sensitive = data.type === "keyword" ? data.case_sensitive === "on" : null;
	extensionDocument.interval = data.type === "timer" ? data.interval : null;
	extensionDocument.usage_help = data.type === "command" ? data.usage_help : null;
	extensionDocument.extended_help = data.type === "command" ? data.extended_help : null;
	extensionDocument.event = data.type === "event" ? data.event : undefined;
	extensionDocument.last_updated = Date.now();
	extensionDocument.timeout = data.timeout;
	extensionDocument.code_id = generateCodeID(data.code);
	extensionDocument.scopes = [];
	Object.keys(data).forEach(val => {
		if (val.startsWith("scope_")) {
			extensionDocument.scopes.push(val.split("scope_")[1]);
		}
	});

	return extensionDocument;
};

const controllers = module.exports;

controllers.gallery = async (req, res) => {
	let count;
	if (!req.query.count) {
		count = 18;
	} else {
		count = parseInt(req.query.count);
	}
	let page;
	if (!req.query.page) {
		page = 1;
	} else {
		page = parseInt(req.query.page);
	}

	const renderPage = async (upvotedData, serverData) => {
		const extensionState = req.path.substring(req.path.lastIndexOf("/") + 1);
		try {
			let rawCount = await Gallery.count({
				state: extensionState,
			}).exec();
			if (!rawCount) {
				rawCount = 0;
			}

			const matchCriteria = {
				state: extensionState,
			};
			if (req.query.id) {
				matchCriteria._id = req.query.id;
			} else if (req.query.q) {
				matchCriteria.$text = {
					$search: req.query.q,
				};
			}

			const galleryDocuments = await Gallery.find(matchCriteria).sort("-featured -points -last_updated").skip(count * (page - 1))
				.limit(count)
				.exec();
			const pageTitle = `${extensionState.charAt(0).toUpperCase() + extensionState.slice(1)} - GAwesomeBot Extensions`;
			const extensionData = await Promise.all(galleryDocuments.map(a => parsers.extensionData(req, a)));

			res.render("pages/extensions.ejs", {
				authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
				isMaintainer: req.isAuthenticated() ? configJSON.maintainers.includes(req.user.id) : false,
				pageTitle,
				serverData,
				activeSearchQuery: req.query.id || req.query.q,
				mode: extensionState,
				rawCount,
				itemsPerPage: req.query.count,
				currentPage: page,
				numPages: Math.ceil(rawCount / (count === 0 ? rawCount : count)),
				extensions: extensionData,
				upvotedData,
			});
		} catch (err) {
			renderError(res, "An error occurred while fetching extension data.");
		}
	};

	if (req.isAuthenticated()) {
		const serverData = [];
		const usr = await req.app.client.users.fetch(req.user.id, true);
		const addServerData = async (i, callback) => {
			if (req.user.guilds && i < req.user.guilds.length) {
				const svr = await getGuild.get(req.app.client, req.user.guilds[i].id, { resolve: ["id"], members: ["id", "roles"], convert: { id_only: true } });
				if (svr && usr) {
					try {
						const serverDocument = await Servers.findOne({ _id: svr.id }).exec();
						if (serverDocument) {
							const member = svr.members[usr.id];
							if (req.app.client.getUserBotAdmin(svr, serverDocument, member) >= 3) {
								serverData.push({
									name: req.user.guilds[i].name,
									id: req.user.guilds[i].id,
									icon: req.user.guilds[i].icon ? `https://cdn.discordapp.com/icons/${req.user.guilds[i].id}/${req.user.guilds[i].icon}.jpg` : "/static/img/discord-icon.png",
									prefix: serverDocument.config.command_prefix,
								});
							}
						}
					} catch (_) {}
					addServerData(++i, callback);
				} else {
					addServerData(++i, callback);
				}
			} else {
				try {
					callback();
				} catch (err) {
					renderError(res, "An error occurred while fetching user data.");
				}
			}
		};
		addServerData(0, async () => {
			serverData.sort((a, b) => a.name.localeCompare(b.name));
			const userDocument = await Users.findOne({ _id: req.user.id }).exec();
			if (userDocument) {
				renderPage(userDocument.upvoted_gallery_extensions, serverData);
			} else {
				renderPage([], serverData);
			}
		});
	} else {
		renderPage();
	}
};

controllers.my = async (req, res) => {
	if (req.isAuthenticated()) {
		try {
			const galleryDocuments = await Gallery.find({
				owner_id: req.user.id,
			}).exec();
			res.render("pages/extensions.ejs", {
				authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
				currentPage: `${req.baseUrl}${req.path}`,
				pageTitle: "My GAwesomeBot Extensions",
				serverData: {
					id: req.user.id,
				},
				activeSearchQuery: req.query.q,
				mode: "my",
				rawCount: (galleryDocuments || []).length,
				extensions: galleryDocuments || [],
			});
		} catch (err) {
			renderError(res, "An error occurred while fetching extension data.");
		}
	} else {
		res.redirect("/login");
	}
};

controllers.builder = async (req, res) => {
	if (req.isAuthenticated()) {
		const renderPage = extensionData => {
			res.render("pages/extensions.ejs", {
				authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
				currentPage: `${req.baseUrl}${req.path}`,
				pageTitle: `${extensionData.name ? `${extensionData.name} - ` : ""}GAwesomeBot Extension Builder`,
				serverData: {
					id: req.user.id,
				},
				activeSearchQuery: req.query.q,
				mode: "builder",
				extensionData,
				events: AllowedEvents,
			});
		};

		if (req.query.extid) {
			try {
				const galleryDocument = await Gallery.findOne({
					_id: req.query.extid,
					owner_id: req.user.id,
				}).exec();
				if (galleryDocument) {
					try {
						galleryDocument.code = await fs.readFile(`${__dirname}/../../../Extensions/${galleryDocument.code_id}.gabext`);
					} catch (err) {
						galleryDocument.code = "";
					}
					renderPage(galleryDocument);
				} else {
					renderPage({});
				}
			} catch (err) {
				renderError(res, "An error occurred while fetching extension data.");
			}
		} else {
			renderPage({});
		}
	} else {
		res.redirect("/login");
	}
};

controllers.builder.post = async (req, res) => {
	if (req.isAuthenticated()) {
		if (validateExtensionData(req.body)) {
			const sendResponse = isErr => {
				dashboardUpdate(req, req.path, req.user.id);
				if (isErr) return res.sendStatus(500);
				res.sendStatus(200);
			};
			const saveExtensionCode = async (err, codeID) => {
				if (err) {
					winston.warn(`Failed to update settings at ${req.path}`, { usrid: req.user.id }, err);
					sendResponse(true);
				} else {
					try {
						await fs.outputFileAtomic(`${__dirname}/../../../Extensions/${codeID}.gabext`, req.body.code);
						sendResponse();
					} catch (error) {
						winston.warn(`Failed to save extension at ${req.path}`, { usrid: req.user.id }, err);
						sendResponse(true);
					}
				}
			};
			const saveExtensionData = (galleryDocument, isUpdate) => {
				galleryDocument.level = "gallery";
				galleryDocument.state = "saved";
				galleryDocument.description = req.body.description;
				const oldName = galleryDocument.name;
				const oldID = galleryDocument.code_id;
				writeExtensionData(galleryDocument, req.body);

				if (!isUpdate) {
					galleryDocument.owner_id = req.user.id;
					dashboardUpdate(req, "/extensions/my", req.user.id);
				} else {
					galleryDocument.versions.push({
						_id: oldName,
						code_id: oldID,
					});
					if (oldName === req.body.name) galleryDocument.name = `${galleryDocument.name} (2)`;
				}
				const validation = galleryDocument.validateSync();
				if (validation) {
					winston.warn("Failed to validate extension data", { err: validation });
					return sendResponse(true);
				}
				galleryDocument.save().catch(err => {
					winston.warn(`Failed to save extension metadata: ${err}`);
					sendResponse(true);
				});
				saveExtensionCode(false, generateCodeID(req.body.code));
			};

			if (req.query.extid) {
				const galleryDocument = await Gallery.findOne({
					_id: req.query.extid,
					owner_id: req.user.id,
				}).exec();
				if (galleryDocument) {
					saveExtensionData(galleryDocument, true);
				} else {
					saveExtensionData(new Gallery(), false);
				}
			} else {
				saveExtensionData(new Gallery(), false);
			}
		} else {
			renderError(res, "Failed to verify extension data!", undefined, 400);
		}
	} else {
		res.redirect("/login");
	}
};

controllers.download = async (req, res) => {
	let extensionDocument;
	try {
		extensionDocument = await Gallery.findOne({ _id: req.params.extid }).exec();
	} catch (err) {
		return res.sendStatus(500);
	}
	if (extensionDocument && extensionDocument.state !== "saved") {
		try {
			res.set({
				"Content-Disposition": `${"attachment; filename='"}${extensionDocument.name}.gabext` + "'",
				"Content-Type": "text/javascript",
			});
			res.sendFile(path.resolve(`${__dirname}/../../../Extensions/${extensionDocument.code_id}.gabext`));
		} catch (err) {
			res.sendStatus(500);
		}
	} else {
		res.sendStatus(404);
	}
};

controllers.gallery.modify = async (req, res) => {
	if (req.isAuthenticated()) {
		if (req.params.extid && req.params.action) {
			if (["accept", "feature", "reject", "remove"].includes(req.params.action) && !configJSON.maintainers.includes(req.user.id)) {
				res.sendStatus(403);
				return;
			}

			const getGalleryDocument = async () => {
				let doc;
				try {
					doc = await Gallery.findOne({ _id: req.params.extid }).exec();
				} catch (err) {
					res.sendStatus(500);
					return null;
				}
				if (!doc) {
					res.sendStatus(404);
					return null;
				}
				return doc;
			};
			const getUserDocument = async () => {
				let userDocument = await Users.findOne({ _id: req.user.id });
				if (userDocument) {
					return userDocument;
				} else {
					try {
						userDocument = await Users.create(new Users({ _id: req.user.id }));
					} catch (err) {
						res.sendStatus(500);
						return null;
					}
					return userDocument;
				}
			};
			const messageOwner = async (usrid, message) => {
				try {
					const usr = await req.app.client.users.fetch(usrid, true);
					usr.send(message);
				} catch (_) {
					// No-op
				}
			};

			const galleryDocument = await getGalleryDocument();
			if (!galleryDocument) return;
			switch (req.params.action) {
				case "upvote": {
					const userDocument = await getUserDocument();
					if (!userDocument) return;

					const vote = userDocument.upvoted_gallery_extensions.indexOf(galleryDocument._id) === -1 ? 1 : -1;
					if (vote === 1) {
						userDocument.upvoted_gallery_extensions.push(galleryDocument._id);
					} else {
						userDocument.upvoted_gallery_extensions.splice(userDocument.upvoted_gallery_extensions.indexOf(galleryDocument._id), 1);
					}
					galleryDocument.points += vote;

					await galleryDocument.save();
					await userDocument.save();

					let ownerUserDocument = await Users.findOne({ _id: galleryDocument.owner_id });
					if (!ownerUserDocument) ownerUserDocument = await Users.create(new Users({ _id: galleryDocument.owner_id }));
					ownerUserDocument.points += vote * 10;
					await ownerUserDocument.save();

					res.sendStatus(200);
					break;
				}
				case "accept": {
					galleryDocument.state = "gallery";

					try {
						await galleryDocument.save();
					} catch (_) {
						return res.sendStatus(500);
					}
					res.sendStatus(200);

					const serverDocuments = await Servers.find({
						extensions: {
							$elemMatch: {
								_id: galleryDocument._id,
							},
						},
					}).exec();
					if (serverDocuments) {
						serverDocuments.forEach(serverDocument => {
							serverDocument.extensions.id(galleryDocument._id).updates_available++;
							serverDocument.save(err => {
								if (err) {
									winston.error("Failed to save server data for extension update", { svrid: serverDocument._id }, err);
								}
							});
						});
					}

					messageOwner(galleryDocument.owner_id, {
						embed: {
							color: Colors.GREEN,
							title: `Your extension ${galleryDocument.name} has been accepted to the GAwesomeBot extension gallery! 🎉`,
							description: `View your creation [here](${configJS.hostingURL}extensions/gallery?id=${galleryDocument._id})!`,
						},
					});
					break;
				}
				case "feature":
					if (!galleryDocument.featured) {
						messageOwner(galleryDocument.owner_id, {
							embed: {
								color: Colors.GREEN,
								title: `Your extension ${galleryDocument.name} has been featured on the GAwesomeBot extension gallery! 🌟`,
								description: `View your achievement [here](${configJS.hostingURL}extensions/gallery?id=${galleryDocument._id})`,
							},
						});
					}

					galleryDocument.featured = galleryDocument.featured !== true;
					galleryDocument.save(err => {
						res.sendStatus(err ? 500 : 200);
					});
					break;
				case "reject":
				case "remove": {
					const ownerUserDocument2 = await Users.findOne({ _id: galleryDocument.owner_id });
					if (ownerUserDocument2) {
						ownerUserDocument2.points -= galleryDocument.points * 10;
						await ownerUserDocument2.save();
					}

					galleryDocument.state = "saved";
					galleryDocument.featured = false;
					galleryDocument.save(err => {
						res.sendStatus(err ? 500 : 200);
					});

					messageOwner(galleryDocument.owner_id, {
						embed: {
							color: Colors.LIGHT_RED,
							title: `Your extension ${galleryDocument.name} has been ${req.params.action}${req.params.action === "reject" ? "e" : ""}d from the GAwesomeBot extension gallery`,
							description: `${req.body.reason.replace(/\\n/g, "\n")}`,
						},
					});
					break;
				}
				case "publish":
					if (galleryDocument.owner_id !== req.user.id) return res.sendStatus(404);

					galleryDocument.state = "queue";
					await galleryDocument.save();

					res.sendStatus(200);
					break;
				case "delete":
					if (galleryDocument.owner_id !== req.user.id) return res.sendStatus(404);

					await Gallery.findByIdAndRemove(galleryDocument._id).exec();
					dashboardUpdate(req, req.path, req.user.id);

					try {
						await fs.unlink(`${__dirname}/../../../Extensions/${galleryDocument.code_id}.gabext`);
					} catch (_) {
						// No-op
					}

					res.sendStatus(200);
					break;
				case "unpublish":
					if (galleryDocument.owner_id !== req.user.id) return res.sendStatus(403);

					galleryDocument.state = "saved";
					galleryDocument.featured = false;
					await galleryDocument.save();

					res.sendStatus(200);
					break;
				default:
					res.sendStatus(400);
					break;
			}
		} else {
			res.sendStatus(400);
		}
	} else {
		res.sendStatus(403);
	}
};
