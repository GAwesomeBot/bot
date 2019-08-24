const { Giveaways } = require("../../Modules/");
const parseDuration = require("parse-duration");

module.exports = {
	find: async (main, filter) => {
		let server;
		const checkServer = svr => svr && svr.members.has(filter.usrid);

		server = main.client.guilds.find(svr => svr.name === filter.str || svr.name.toLowerCase() === filter.str.toLowerCase());
		if (checkServer(server)) return server.id;

		server = main.client.guilds.get(filter.str);
		if (checkServer(server)) return server.id;

		const userDocument = await Users.findOne(filter.usrid);
		if (userDocument) {
			const svrnick = userDocument.server_nicks.id(filter.str.toLowerCase());
			if (svrnick) {
				server = main.client.guilds.get(svrnick.server_id);
				if (checkServer(server)) return server.id;
			}
		}
		return false;
	},
	// Params: { initMsg: initMsg.id, usrid: msg.author.id, svrname, chname }
	run: async (main, { initMsg: initMsgID, usrid, chname, guildid }) => {
		const { Colors, Text } = main.Constants;
		const usr = await main.client.users.fetch(usrid, true);
		try {
			const usrch = await usr.createDM();
			const initMsg = await usrch.messages.fetch(initMsgID);

			const svr = main.client.guilds.get(guildid);
			const member = svr.members.get(usr.id);
			await svr.populateDocument();
			const { serverDocument } = svr;

			if (serverDocument.config.blocked.includes(usr.id)) return;

			let ch;
			try {
				ch = await main.client.channelSearch(chname, svr);
			} catch (err) {
				initMsg.edit({
					embed: {
						description: "Something went wrong while fetching channel data!",
						color: Colors.SOFT_ERR,
						footer: {
							text: `The requested channel was not found on server ${svr.name}`,
						},
					},
				});
			}

			if (ch && ch.type === "text") {
				if (main.client.getUserBotAdmin(svr, serverDocument, member) > 0 || configJSON.maintainers.includes(usr.id)) {
					if (!ch.permissionsFor(usr).has(["VIEW_CHANNEL", "SEND_MESSAGES"])) {
						await initMsg.delete();
						usr && usr.send && usr.send({
							embed: {
								color: Colors.MISSING_PERMS,
								title: `Not today!`,
								description: `You cannot see or talk in that channel, so I am unable to let you say something in there!`,
								footer: {
									text: `How did you even find that channel?!`,
								},
							},
						});
						return;
					}
					await initMsg.edit({
						embed: {
							color: Colors.PROMPT,
							description: `What do you want me to say in #${ch.name} on ${svr.name}?`,
						},
					});
					let result;
					try {
						result = await main.client.awaitPMMessage(usrch, usr, 300000);
					} catch (err) {
						return;
					}
					if (result.content) result = result.content;
					ch.send({
						embed: {
							color: Colors.INFO,
							author: {
								name: `${usr.tag} wanted to tell you this!`,
								iconURL: `${usr.displayAvatarURL()}`,
							},
							description: result,
						},
					});
					usrch.send({
						embed: {
							color: Colors.SUCCESS,
							description: `Cool, check #${ch.name} 📢`,
						},
					});
				} else {
					initMsg.edit({
						embed: {
							color: Colors.MISSING_PERMS,
							description: Text.MISSING_PERMS(svr.name),
						},
					});
				}
			} else if (ch) {
				await initMsg.delete();
				usrch.send({
					embed: {
						description: "Something went wrong while fetching channel data!",
						color: Colors.SOFT_ERR,
						footer: {
							text: `The requested channel isn't a valid text channel.`,
						},
					},
				});
			}
		} catch (err) {
			logger.warn(`Something went wrong while saying something! ()=()`, { usrid, msgid: initMsgID }, err);
			if (usr && usr.send) {
				usr.send({
					embed: {
						color: Colors.ERROR,
						title: `Something went wrong! 😱`,
						description: `**Error Message**: \`\`\`js\n${err.stack}\`\`\``,
						footer: {
							text: `Contact your Server Admin for support!`,
						},
					},
				});
			}
		}
	},
};
