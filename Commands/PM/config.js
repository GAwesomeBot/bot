// Links to online dashboard
module.exports = (bot, db, config, winston, userDocument, msg, suffix) => {
	// Maintainer console for overall bot things
	if(config.maintainers.indexOf(msg.author.id)>-1 && !suffix) {
		if(config.hosting_url) {
			msg.channel.createMessage({
				embed: {
					author: {
						name: bot.user.username,
						icon_url: bot.user.avatarURL,
						url: "https://github.com/GilbertGobbels/GAwesomeBot"
					},
					title: "Here's the link for the Maintainer Console:",
					description: `${config.hosting_url}dashboard/overview?svrid=maintainer`,
					color: 0x9ECDF2
				}
			});
		} else {
			msg.channel.createMessage({
				embed: {
					author: {
						name: bot.user.username,
						icon_url: bot.user.avatarURL,
						url: "https://github.com/GilbertGobbels/GAwesomeBot"
					},
					title: "Warning! Bot is running in __Limited Mode__",
					description: "You have not provided a hosting URL in the bot config, so the maintainer console is not available.",
					color: 0xFF0000
				}
			});
		}
	}

	// Admin console, check to make sure the config command was valid
	if(suffix) {
		const svr = bot.serverSearch(suffix, msg.author, userDocument);
		// Check if specified server exists
		if(!svr) {
			msg.channel.createMessage({
				embed: {
					author: {
						name: bot.user.username,
						icon_url: bot.user.avatarURL,
						url: "https://github.com/GilbertGobbels/GAwesomeBot"
					},
					color: 0xFF0000,
					title: "Error",
					description: "Sorry, but the server name you entered is invalid. 🙁 Try again?"
				}
			});
		// Check if sender is an admin of the specified server
		} else {
			const member = svr.members.get(msg.author.id);
			// Get server data
			db.servers.findOne({_id: svr.id}, (err, serverDocument) => {
				if(!err && member && serverDocument && serverDocument.config.blocked.indexOf(msg.author.id)==-1) {
					if(bot.getUserBotAdmin(svr, serverDocument, member)>=3) {
						msg.channel.createMessage({
							embed: {
								author: {
									name: bot.user.username,
									icon_url: bot.user.avatarURL,
									url: "https://github.com/GilbertGobbels/GAwesomeBot"
								},
								color: 0x00FF00,
								title: "Here's the link to the requested Admin Panel",
								description: `${config.hosting_url}dashboard/overview?svrid=${svr.id}`
							}
						});
					} else {
						msg.channel.createMessage({
							embed: {
								author: {
									name: bot.user.username,
									icon_url: bot.user.avatarURL,
									url: "https://github.com/GilbertGobbels/GAwesomeBot"
								},
								color: 0xFF0000,
								title: "Error",
								description: "You are not an admin for that server\nIf you think this was a mistake, please contact the server owner!"
							}
						});
					}
				} else {
					msg.channel.createMessage({
						embed: {
							author: {
									name: bot.user.username,
									icon_url: bot.user.avatarURL,
									url: "https://github.com/GilbertGobbels/GAwesomeBot"
							},
							color: 0x9ECDF2,
							title: "Error",
							description: "Sorry, but the server name you entered is invalid. 🙁 Try again?"
						}
					});
				}
			});
		}
	}
};
