const getGuild = require("../../Modules").GetGuild;
const { parseAuthUser, canDo } = require("../helpers");

const controllers = module.exports;

controllers.home = async (req, res) => {
	if (!req.isAuthenticated()) {
		res.redirect("/login");
	} else {
		const serverData = [];
		const usr = await req.client.users.fetch(req.user.id, true);
		const addServerData = async (i, callback) => {
			if (req.user.guilds && i < req.user.guilds.length) {
				const svr = await getGuild.get(req.client, req.user.guilds[i].id, { members: ["id", "roles"], convert: { id_only: true } });
				if (!svr && !((parseInt(req.user.guilds[i].permissions) >> 5) & 1)) {
					addServerData(++i, callback);
					return;
				}
				const data = {
					name: req.user.guilds[i].name,
					id: req.user.guilds[i].id,
					icon: req.user.guilds[i].icon ? `https://cdn.discordapp.com/icons/${req.user.guilds[i].id}/${req.user.guilds[i].icon}.jpg` : "/static/img/discord-icon.png",
					botJoined: svr !== null,
					isAdmin: false,
				};
				if (svr && usr) {
					const serverDocument = await Servers.findOne({ _id: req.user.guilds[i].id }).exec();
					if (serverDocument) {
						const member = svr.members[usr.id];
						if (req.client.getUserBotAdmin(svr, serverDocument, member) >= 3 || canDo("sudo")) {
							data.isAdmin = true;
						}
					}
					serverData.push(data);
					addServerData(++i, callback);
				} else {
					serverData.push(data);
					addServerData(++i, callback);
				}
			} else {
				return callback();
			}
		};
		addServerData(0, () => {
			serverData.sort((a, b) => a.name.localeCompare(b.name));
			if (configJSON.maintainers.includes(req.user.id)) {
				serverData.push({
					name: "Maintainer Console",
					id: "maintainer",
					icon: "/static/img/transparent.png",
					botJoined: true,
					isAdmin: true,
				});
			}
			res.render("pages/dashboard.ejs", {
				authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
				serverData,
				rawJoinLink: `https://discordapp.com/oauth2/authorize?&client_id=${req.app.auth.discord.clientID}&scope=bot&permissions=470019135`,
			});
		});
	}
};
