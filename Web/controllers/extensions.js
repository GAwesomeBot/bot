const path = require("path");
const fs = require("fs-nextra");
const { ObjectID } = require("mongodb");

const parsers = require("../parsers");
const { GetGuild } = require("../../Modules").getGuild;
const { AllowedEvents, Colors, Scopes } = require("../../Internals/Constants");
const { renderError, dashboardUpdate, generateCodeID, getChannelData, validateExtensionData, writeExtensionData } = require("../helpers");

const controllers = module.exports;

controllers.gallery = async (req, { res }) => {
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
		const extensionLevel = extensionState === "gallery" ? ["gallery"] : req.isAuthenticated() && configJSON.maintainers.includes(req.user.id) ? ["gallery", "third"] : ["gallery"];
		try {
			let rawCount = await Gallery.count({
				state: { $in: ["version_queue", extensionState] },
				level: { $in: extensionLevel },
			});
			if (!rawCount) {
				rawCount = 0;
			}

			const matchCriteria = {
				state: { $in: ["version_queue", extensionState] },
				level: { $in: extensionLevel },
			};
			if (req.query.id) {
				matchCriteria._id = new ObjectID(req.query.id);
			} else if (req.query.q) {
				matchCriteria.$text = {
					$search: req.query.q,
				};
			}

			const galleryDocuments = await Gallery.find(matchCriteria).sort({ featured: -1, points: -1, last_updated: -1 }).skip(count * (page - 1))
				.limit(count)
				.exec();
			const pageTitle = `${extensionState.charAt(0).toUpperCase() + extensionState.slice(1)} - GAwesomeBot Extensions`;
			const extensionData = await Promise.all(galleryDocuments.filter(galleryDocument => (galleryDocument.published_version !== null && !isNaN(galleryDocument.published_version)) ||
				extensionState === "queue")
				.map(a => parsers.extensionData(req, a, extensionState === "queue" ? a.version : a.published_version)));

			res.setPageData({
				page: "extensions.ejs",
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

			res.render();
		} catch (err) {
			renderError(res, "An error occurred while fetching extension data.");
		}
	};

	if (req.isAuthenticated()) {
		const serverData = [];
		const usr = await req.app.client.users.fetch(req.user.id, true);
		const addServerData = async (i, callback) => {
			if (req.user.guilds && i < req.user.guilds.length) {
				if (!usr) return addServerData(++i, callback);
				const svr = new GetGuild(req.app.client, req.user.guilds[i].id);
				await svr.initialize(usr.id);
				if (svr.success) {
					try {
						const serverDocument = await Servers.findOne(svr.id);
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
					} catch (_) {
						// Meh
					}
					addServerData(++i, callback);
				} else {
					addServerData(++i, callback);
				}
			} else {
				try {
					return callback();
				} catch (err) {
					renderError(res, "An error occurred while fetching user data.");
				}
			}
		};
		addServerData(0, async () => {
			serverData.sort((a, b) => a.name.localeCompare(b.name));
			const userDocument = await Users.findOne(req.user.id);
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

controllers.installer = async (req, { res }) => {
	if (!req.isAuthenticated()) return res.redirect("/login");

	let id;
	try {
		id = new ObjectID(req.params.extid);
	} catch (err) {
		return renderError(res, "That extension doesn't exist!", undefined, 404);
	}
	const galleryDocument = await Gallery.findOne(id);
	if (!galleryDocument) return renderError(res, "That extension doesn't exist!", undefined, 404);
	const versionTag = parseInt(req.query.v) || galleryDocument.published_version;
	if (!galleryDocument.versions.id(versionTag)) return renderError(res, "That extension version doesn't exist!", undefined, 404);
	const extensionData = await parsers.extensionData(req, galleryDocument, versionTag);
	if ((!extensionData.accepted && !configJSON.maintainers.includes(req.user.id)) || galleryDocument.level === "third") {
		return renderError(res, "You do not have sufficient permission to install this extension.", undefined, 403);
	}

	if (!req.query.svrid) {
		const serverData = [];
		const addServerData = async (i, callback) => {
			if (req.user.guilds && i < req.user.guilds.length) {
				const svr = new GetGuild(req.app.client, req.user.guilds[i].id);
				await svr.initialize(req.user.id);
				if (svr.success) {
					const serverDocument = await Servers.findOne(svr.id).catch(() => null);
					if (serverDocument) {
						const member = svr.members[req.user.id];
						if (req.app.client.getUserBotAdmin(svr, serverDocument, member) >= 3) {
							serverData.push({
								name: req.user.guilds[i].name,
								id: req.user.guilds[i].id,
								icon: req.user.guilds[i].icon ? `https://cdn.discordapp.com/icons/${req.user.guilds[i].id}/${req.user.guilds[i].icon}.jpg` : "/static/img/discord-icon.png",
								prefix: serverDocument.config.command_prefix,
							});
						}
					}
					addServerData(++i, callback);
				} else {
					addServerData(++i, callback);
				}
			} else {
				try {
					return callback();
				} catch (err) {
					renderError(res, "An error occurred while fetching user data.");
				}
			}
		};
		addServerData(0, async () => {
			serverData.sort((a, b) => a.name.localeCompare(b.name));
			res.setServerData(serverData)
				.setPageData({
					page: "extension-installer.ejs",
					mode: "select",
					extensionData,
				})
				.render();
		});
	} else {
		const serverDocument = await Servers.findOne(req.query.svrid);
		if (!serverDocument) return renderError(res, "That server doesn't exist!", undefined, 404);
		const serverData = await parsers.serverData(req, serverDocument);
		const svr = new GetGuild(req.app.client, serverDocument._id);
		await svr.initialize();
		if (serverData) {
			res.setServerData(serverData)
				.setPageData({
					page: "extension-installer.ejs",
					mode: req.query.update ? "update" : "install",
					extensionData,
					channelData: getChannelData(svr),
				}).render();
		} else {
			return renderError(res, "That server doesn't exist!", undefined, 404);
		}
	}
};

controllers.my = async (req, { res }) => {
	if (req.isAuthenticated()) {
		try {
			const galleryDocuments = await Gallery.find({
				level: "gallery",
				owner_id: req.user.id,
			}).exec();

			res.setPageData({
				page: "extensions.ejs",
				pageTitle: "My GAwesomeBot Extensions",
				serverData: {
					id: req.user.id,
				},
				activeSearchQuery: req.query.q,
				mode: "my",
				rawCount: (galleryDocuments || []).length,
				extensions: galleryDocuments || [],
			});
			res.render();
		} catch (err) {
			renderError(res, "An error occurred while fetching extension data.");
		}
	} else {
		res.redirect("/login");
	}
};

controllers.builder = async (req, { res }) => {
	if (req.isAuthenticated()) {
		const renderPage = extensionData => {
			res.setServerData("id", req.user.id);

			res.setPageData({
				page: "extensions.ejs",
				pageTitle: `${extensionData.name ? `${extensionData.name} - ` : ""}GAwesomeBot Extension Builder`,
				activeSearchQuery: req.query.q,
				mode: "builder",
				extensionData,
				versionData: extensionData.versions ? extensionData.versions.id(extensionData.version) : {},
				events: AllowedEvents,
				scopes: Scopes,
			});

			res.render();
		};

		if (req.query.extid) {
			try {
				const galleryDocument = await Gallery.findOne({
					_id: new ObjectID(req.query.extid),
					owner_id: req.user.id,
				});
				if (galleryDocument) {
					try {
						galleryDocument.code = await fs.readFile(`${__dirname}/../../extensions/${galleryDocument.versions.id(galleryDocument.version).code_id}.gabext`);
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
					logger.warn(`Failed to update settings at ${req.path}`, { usrid: req.user.id }, err);
					sendResponse(true);
				} else {
					try {
						await fs.outputFileAtomic(`${__dirname}/../../extensions/${codeID}.gabext`, req.body.code);
						sendResponse();
					} catch (error) {
						logger.warn(`Failed to save extension at ${req.path}`, { usrid: req.user.id }, err);
						sendResponse(true);
					}
				}
			};
			const saveExtensionData = async (galleryDocument, isUpdate) => {
				const galleryQueryDocument = galleryDocument.query;

				galleryQueryDocument.set("level", "gallery")
					.set("description", req.body.description);
				const newVersion = writeExtensionData(galleryDocument, req.body);
				if (newVersion && isUpdate) galleryQueryDocument.set("state", galleryDocument.state === "saved" ? "saved" : "version_queue");
				else if (newVersion) galleryQueryDocument.set("state", "saved");

				if (!isUpdate) {
					galleryQueryDocument.set("owner_id", req.user.id);
					dashboardUpdate(req, "/extensions/my", req.user.id);
				}

				const validation = galleryDocument.validate();
				if (validation) {
					logger.warn("Failed to validate extension data", {}, validation);
					return sendResponse(true);
				}
				await galleryDocument.save().catch(err => {
					logger.warn(`Failed to save extension metadata.`, {}, err);
					sendResponse(true);
				});
				saveExtensionCode(false, generateCodeID(req.body.code));
			};

			if (req.query.extid) {
				const galleryDocument = await Gallery.findOne({
					_id: new ObjectID(req.query.extid),
					owner_id: req.user.id,
				});
				if (galleryDocument) {
					await saveExtensionData(galleryDocument, true);
				} else {
					await saveExtensionData(await Gallery.new(), false);
				}
			} else {
				await saveExtensionData(await Gallery.new(), false);
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
		extensionDocument = await Gallery.findOne(new ObjectID(req.params.extid));
	} catch (err) {
		return res.sendStatus(500);
	}
	if (extensionDocument && extensionDocument.state !== "saved") {
		const versionTag = parseInt(req.query.v) || extensionDocument.published_version;
		const versionDocument = extensionDocument.versions.id(versionTag);
		if (!versionDocument) return res.sendStatus(404);
		try {
			res.set({
				"Content-Disposition": `${"attachment; filename="}${extensionDocument.name}.gabext`,
				"Content-Type": "text/javascript",
			});
			res.sendFile(path.join(__dirname, `../../extensions/${versionDocument.code_id}.gabext`));
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
					doc = await Gallery.findOne(new ObjectID(req.params.extid));
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
				let userDocument = await Users.findOne(req.user.id);
				if (userDocument) {
					return userDocument;
				} else {
					try {
						userDocument = await Users.new({ _id: req.user.id });
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
			const galleryQueryDocument = galleryDocument.query;
			switch (req.params.action) {
				case "upvote": {
					const userDocument = await getUserDocument();
					if (!userDocument) return;

					const vote = !userDocument.upvoted_gallery_extensions.includes(galleryDocument._id.toString()) ? 1 : -1;
					if (vote === 1) {
						userDocument.query.push("upvoted_gallery_extensions", galleryDocument._id.toString());
					} else {
						userDocument.query.pull("upvoted_gallery_extensions", galleryDocument._id.toString());
					}
					galleryQueryDocument.inc("points", vote);

					await galleryDocument.save();
					await userDocument.save();

					let ownerUserDocument = await Users.findOne(galleryDocument.owner_id);
					if (!ownerUserDocument) ownerUserDocument = await Users.new({ _id: galleryDocument.owner_id });
					ownerUserDocument.query.inc("points", vote * 10);
					await ownerUserDocument.save();

					res.sendStatus(200);
					break;
				}
				case "accept": {
					galleryQueryDocument.set("state", "gallery");
					galleryQueryDocument.clone.id("versions", galleryDocument.version).set("accepted", true);
					galleryQueryDocument.set("published_version", galleryDocument.version);

					try {
						await galleryDocument.save();
					} catch (_) {
						return res.sendStatus(500);
					}
					res.sendStatus(200);

					messageOwner(galleryDocument.owner_id, {
						embed: {
							color: Colors.GREEN,
							title: `Your extension ${galleryDocument.name} has been accepted ${galleryDocument.level === "third" ? "by maintainers." : "to the GAwesomeBot extension gallery!"} 🎉`,
							description: `View your creation [here](${configJS.hostingURL}extensions/gallery?id=${galleryDocument._id.toString()})!`,
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
								description: `View your achievement [here](${configJS.hostingURL}extensions/gallery?id=${galleryDocument._id.toString()})`,
							},
						});
					}

					galleryQueryDocument.set("featured", galleryDocument.featured !== true);
					galleryDocument.save()
						.then(() => res.sendStatus(200))
						.catch(() => res.sendStatus(500));
					break;
				case "reject":
				case "remove": {
					const ownerUserDocument2 = await Users.findOne(galleryDocument.owner_id);
					if (ownerUserDocument2) {
						ownerUserDocument2.query.inc("points", -(galleryDocument.points * 10));
						await ownerUserDocument2.save();
					}

					galleryQueryDocument.clone.id("versions", req.params.action === "remove" ? galleryDocument.published_version : galleryDocument.version).set("accepted", false);
					galleryQueryDocument.set("state", "saved")
						.set("featured", false)
						.set("published_version", null);
					galleryDocument.save()
						.then(() => res.sendStatus(200))
						.catch(() => res.sendStatus(500));

					const actionString = `${req.params.action}${req.params.action === "reject" ? "e" : ""}d`;
					messageOwner(galleryDocument.owner_id, {
						embed: {
							color: Colors.LIGHT_RED,
							title: `Your extension ${galleryDocument.name} has been ${actionString} ${galleryDocument.level === "third" ? "by maintainers" : "from the GAwesomeBot extension gallery"}.`,
							description: `${req.body.reason.replace(/\\n/g, "\n")}`,
						},
					});
					break;
				}
				case "publish":
					if (galleryDocument.owner_id !== req.user.id) return res.sendStatus(404);

					galleryQueryDocument.set("state", "queue");
					await galleryDocument.save();

					res.sendStatus(200);
					break;
				case "delete":
					if (galleryDocument.owner_id !== req.user.id) return res.sendStatus(404);

					await Gallery.delete({ _id: galleryDocument._id });
					await Servers.update({ extensions: { $elemMatch: { _id: galleryDocument._id.toString() } } }, { $pull: { extensions: { _id: galleryDocument._id.toString() } } }, { multi: true });
					dashboardUpdate(req, req.path, req.user.id);

					try {
						await fs.unlink(`${__dirname}/../../extensions/${galleryDocument.code_id}.gabext`);
					} catch (_) {
						// No-op
					}

					res.sendStatus(200);
					break;
				case "unpublish":
					if (galleryDocument.owner_id !== req.user.id) return res.sendStatus(403);

					galleryQueryDocument.set("state", "saved")
						.set("featured", false)
						.set("published_version", null);
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
