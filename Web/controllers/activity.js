const { parseAuthUser } = require("../helpers");
const { getGuild, Utils } = require("../../Modules");
const { GetGuild } = getGuild;
const parsers = require("../parsers");

module.exports = (req, res) => {
	Servers.aggregate([{
		$group: {
			_id: null,
			total: {
				$sum: {
					$add: ["$messages_today"],
				},
			},
			active: {
				$sum: {
					$cond: [
						{ $gt: ["$messages_today", 0] },
						1,
						0,
					],
				},
			},
		},
	}], async (err, result) => {
		const guildAmount = await req.app.client.guilds.totalCount;
		const userAmount = await req.app.client.users.totalCount;
		let messageCount = 0;
		let activeServers = guildAmount;
		if (!err && result) {
			messageCount = result[0].total;
			activeServers = result[0].active;
		}

		const renderPage = data => {
			res.render("pages/activity.ejs", {
				authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
				isMaintainer: req.isAuthenticated() ? configJSON.maintainers.includes(parseAuthUser(req.user).id) : false,
				rawServerCount: guildAmount,
				rawUserCount: userAmount,
				totalMessageCount: messageCount,
				numActiveServers: activeServers,
				activeSearchQuery: req.query.q,
				mode: req.path.substring(req.path.lastIndexOf("/") + 1),
				data,
			});
		};

		if (req.path === "/activity/servers") {
			if (!req.query.q) {
				req.query.q = "";
			}
			let count;
			if (!req.query.count || isNaN(req.query.count) || req.query.count > 64) {
				count = 16;
			} else {
				count = parseInt(req.query.count) || guildAmount;
			}
			let page;
			if (!req.query.page || isNaN(req.query.page)) {
				page = 1;
			} else {
				page = parseInt(req.query.page);
			}
			if (!req.query.sort) {
				req.query.sort = "messages-des";
			}
			if (!req.query.category) {
				req.query.category = "All";
			}
			if (!req.query.publiconly) {
				req.query.publiconly = false;
			}

			const matchCriteria = {
				"config.public_data.isShown": true,
			};
			if (req.query.q) {
				const query = req.query.q.toLowerCase();
				const servers = (await GetGuild.getAll(req.app.client, { strict: true, resolve: "id", parse: "noKeys", findFilter: query })).filter(svrid => !configJSON.activityBlocklist.includes(svrid));
				matchCriteria._id = {
					$in: servers,
				};
			} else {
				matchCriteria._id = {
					$in: (await Utils.GetValue(req.app.client, "guilds.keys()", "arr", "Array.from")).filter(svrid => !configJSON.activityBlocklist.includes(svrid)),
				};
			}
			if (req.query.category !== "All") {
				matchCriteria["config.public_data.server_listing.category"] = req.query.category;
			}
			if (req.query.publiconly === "true") {
				matchCriteria["config.public_data.server_listing.isEnabled"] = true;
			}

			let sortParams;
			switch (req.query.sort) {
				case "members-asc":
					sortParams = {
						member_count: 1,
						added_timestamp: 1,
					};
					break;
				case "members-des":
					sortParams = {
						member_count: -1,
						added_timestamp: -1,
					};
					break;
				case "messages-asc":
					sortParams = {
						messages_today: 1,
						added_timestamp: 1,
					};
					break;
				case "messages-des":
				default:
					sortParams = {
						messages_today: -1,
						added_timestamp: -1,
					};
					break;
			}
			Servers.count(matchCriteria, (err2, rawCount) => {
				if (err2 || rawCount === null) {
					rawCount = guildAmount;
				}
				Servers.aggregate([
					{
						$match: matchCriteria,
					},
					{
						$project: {
							messages_today: 1,
							"config.public_data": 1,
							"config.command_prefix": 1,
							member_count: {
								$size: "$members",
							},
							added_timestamp: 1,
						},
					},
					{
						$sort: sortParams,
					},
					{
						$skip: count * (page - 1),
					},
					{
						$limit: count,
					},
				], async (err3, serverDocuments) => {
					let serverData = [];
					if (!err3 && serverDocuments) {
						let webp = req.accepts("image/webp") === "image/webp";
						serverData = serverDocuments.map(serverDocument => parsers.serverData(req, serverDocument, webp));
					}
					serverData = await Promise.all(serverData);
					let pageTitle = "Servers";
					if (req.query.q) {
						pageTitle = `Search for server "${req.query.q}"`;
					}
					renderPage({
						pageTitle,
						itemsPerPage: req.query.count === 0 ? "0" : count.toString(),
						currentPage: page,
						numPages: Math.ceil(rawCount / (count === 0 ? rawCount : count)),
						serverData,
						selectedCategory: req.query.category,
						isPublicOnly: req.query.publiconly,
						sortOrder: req.query.sort,
					});
				});
			});
		} else if (req.path === "/activity/users") {
			if (!req.query.q) {
				req.query.q = "";
			}
			if (req.query.q) {
				Users.findOne({ $or: [{ _id: req.query.q }, { username: req.query.q }] }, async (err2, userDocument) => {
					if (!err2 && userDocument) {
						const usr = await req.app.client.users.fetch(userDocument._id, true);
						const userProfile = await parsers.userData(req, usr, userDocument);
						renderPage({
							pageTitle: `${userProfile.username}'s Profile`,
							userProfile,
						});
					} else {
						renderPage({ pageTitle: `Lookup for user "${req.query.q}"` });
					}
				});
			} else {
				Users.aggregate([{
					$group: {
						_id: null,
						totalPoints: {
							$sum: {
								$add: "$points",
							},
						},
						publicProfilesCount: {
							$sum: {
								$cond: [
									{ $ne: ["$isProfilePublic", false] },
									1,
									0,
								],
							},
						},
						reminderCount: {
							$sum: {
								$size: "$reminders",
							},
						},
					},
				}], (err4, userResult) => {
					let totalPoints = 0;
					let publicProfilesCount = 0;
					let reminderCount = 0;
					if (!err4 && userResult) {
						totalPoints = userResult[0].totalPoints;
						publicProfilesCount = userResult[0].publicProfilesCount;
						reminderCount = userResult[0].reminderCount;
					}

					renderPage({
						pageTitle: "Users",
						totalPoints,
						publicProfilesCount,
						reminderCount,
					});
				});
			}
		}
	});
};
