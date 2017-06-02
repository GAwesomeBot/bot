const ModLog = require("./../../Modules/ModerationLogging.js");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if(suffix) {
		const createRole = name => {
			msg.channel.createMessage(`There's no role called \`${name}\` on this server. Would you like to create it?`).then(() => {
				bot.awaitMessage(msg.channel.id, msg.author.id, message => {
					if(config.yes_strings.indexOf(message.content.toLowerCase().trim())>-1) {
						msg.channel.guild.createRole().then(role => {
							role.edit({
								name
							}).then(role => {
								msg.channel.createMessage(`The role **${role.name}** now exists on this server. ✨ Use \`${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} ${role.name}|<user>\` to add members to it.`);
							}).catch(err => {
								msg.channel.createMessage(`I was able to create a new role, but Discord wouldn't let me rename it to \`${name}\` 😵`);
								winston.error(`Failed to rename new role to '${name}' on server '${msg.channel.guild.name}'`, {svrid: msg.channel.guild.id}, err);
							});
						}).catch(err => {
							msg.channel.createMessage("Discord wouldn't even let me create the role! 😿");
							winston.error(`Failed to create role on server '${msg.channel.guild.name}'`, {svrid: msg.channel.guild.id}, err);
						});
					}
				});
			});
		};

		if(suffix.indexOf("|")>-1) {
			const args = [
				suffix.substring(0, suffix.lastIndexOf("|")).trim(),
				suffix.substring(suffix.lastIndexOf("|")+1).trim()
			];
			if(args[0]) {
				const role = bot.roleSearch(args[0], msg.channel.guild);
				if(role && role.id!=msg.channel.guild.id) {
					if(msg.member.permission.has("manageRoles")) {
						if(!args[1] || args[1]==".") {
							msg.channel.createMessage(`Are you sure you want to delete the role **${role.name}**? ✌️`).then(() => {
								bot.awaitMessage(msg.channel.id, msg.author.id, message => {
									if(config.yes_strings.indexOf(message.content.toLowerCase().trim())>-1) {
										role.delete().then(() => {
											msg.channel.createMessage("Done, role deleted. 🚮");
										}).catch(err => {
											msg.channel.createMessage("Uh-oh, something went wrong. 👎");
											winston.error(`Failed to delete role '${role.name}' on server '${msg.channel.guild.name}'`, {svrid: msg.channel.guild.id}, err);
										});
									}
								});
							});
						} else if(args[1].startsWith("#") && args[1].length==7) {
							role.edit({
								color: parseInt(`0x${args[1].slice(1)}`)
							}).then(() => {
								msg.channel.createMessage(`🎨 ${role.name} now has the color ${args[1]}`);
							}).catch(err => {
								msg.channel.createMessage("Uh-oh, something went wrong. 🖍");
								winston.error(`Failed to change color of role '${role.name}' to '${args[1]}' on server '${msg.channel.guild.name}'`, {svrid: msg.channel.guild.id}, err);
							});
						} else if(args[1].toLowerCase()=="hoist") {
							role.edit({
								hoist: !role.hoist
							}).then(role => {
								msg.channel.createMessage(`${role.name} is now ${role.hoist ? "displayed separately in the member list" : "__not__ displayed separately in the member list"} ☄️`);
							}).catch(err => {
								msg.channel.createMessage("Uh-oh, something went wrong. ☹️");
								winston.error(`Failed to change hoist of role '${role.name}' on server '${msg.channel.guild.name}'`, {svrid: msg.channel.guild.id}, err);
							});
						} else if(args[1].startsWith("<@") && args[1].length>3) {
							const member = bot.memberSearch(args[1], msg.channel.guild);
							if(member) {
								if(member.roles.includes(role.id)) {
									member.roles.splice(member.roles.indexOf(role.id), 1);
									member.edit({
										roles: member.roles
									}).then(() => {
										msg.channel.createMessage(`@${bot.getName(msg.channel.guild, serverDocument, member)} no longer has the role ${role.name} 🐙`);
										ModLog.create(msg.channel.guild, serverDocument, "Remove Role", member, msg.member);
									}).catch(err => {
										msg.channel.createMessage(`Uh-oh, I couldn't remove @${bot.getName(msg.channel.guild, serverDocument, member)} from ${role.name}`);
										winston.error(`Failed to remove member '${member.user.username}' from role '${role.name}' on server '${msg.channel.guild.name}'`, {svrid: msg.channel.guild.id, usrid: member.id}, err);
									});
								} else {
									member.roles.push(role.id);
									member.edit({
										roles: member.roles
									}).then(() => {
										msg.channel.createMessage(`@${bot.getName(msg.channel.guild, serverDocument, member)} now has the role ${role.name} 🎓`);
										ModLog.create(msg.channel.guild, serverDocument, "Add Role", member, msg.member);
									}).catch(err => {
										msg.channel.createMessage(`Uh-oh, I couldn't add @${bot.getName(msg.channel.guild, serverDocument, member)} to ${role.name}`);
										winston.error(`Failed to add member '${member.user.username}' to role '${role.name}' on server '${msg.channel.guild.name}'`, {svrid: msg.channel.guild.id, usrid: member.id}, err);
									});
								}
							} else {
								msg.channel.createMessage(`I can't find someone named \`${args[1]}\` to add to the role **${role.name}**. Please try again.`);
							}
						} else {
							role.edit({
								name: args[1]
							}).then(newrole => {
								msg.channel.createMessage(`${role.name} is now called \`${newrole.name}\` 🦄`);
							}).catch(err => {
								msg.channel.createMessage("Uh-oh, something went wrong. 🤒");
								winston.error(`Failed to change name of role '${role.name}' to '${args[1]}' on server '${msg.channel.guild.name}'`, {svrid: msg.channel.guild.id}, err);
							});
						}
					} else {
						msg.channel.createMessage(`${msg.author.mention} You don't have permission to manage roles on this server. 🚧`);
					}
				} else {
					if(msg.member.permission.has("manageRoles")) {
						createRole(args[0]);
					} else {
						msg.channel.createMessage(`I couldn't find a role called \`${args[0]}\` on this server. 🙈`);
					}
				}
			} else {
				winston.warn(`Invalid parameters '${suffix}' provided for ${commandData.name} command`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
				msg.channel.createMessage(`${msg.author.mention} I didn't get that. Use the syntax \`${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} ${commandData.usage}\` for this command.`);
			}
		} else if(suffix.toLowerCase()=="list") {
			const memberArray = Array.from(msg.channel.guild.members);
			const info = msg.channel.guild.roles.filter(role => {
				return role.id!=msg.channel.guild.id && serverDocument.config.custom_roles.includes(role.id);
			}).sort((a, b) => {
				return b.position - a.position;
			}).map(role => {
				const count = memberArray.reduce((n, member) => {
					return n + member[1].roles.includes(role.id);
				}, 0);
				return `${role.name} (${count} member${count==1 ? "" : "s"})`;
			});
			if(info.length>0) {
				msg.channel.createMessage(`🎩 **${info.length} joinable role${info.length==1 ? "" : "s"}:**\n\t${info.join("\n\t")}`);
			} else {
				msg.channel.createMessage(`There aren't any roles you can join with \`${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name}\` on this server.`);
			}
		} else {
			const role = bot.roleSearch(suffix, msg.channel.guild);
			if(role) {
				if(msg.member.roles.includes(role.id)) {
					msg.member.roles.splice(msg.member.roles.indexOf(role.id), 1);
					msg.member.edit({
						roles: msg.member.roles
					}).then(() => {
						msg.channel.createMessage(`You no longer have the role **${role.name}** on this server. 👋`);
					}).catch(err => {
						msg.channel.createMessage(`I tried my very best but I couldn't remove you from the role ${role.name}. 🤕`);
						winston.error(`Failed to remove member '${msg.member.user.username}' from role '${role.name}' on server '${msg.channel.guild.name}'`, {svrid: msg.channel.guild.id, usrid: msg.author.id}, err);
					});
				} else {
					if(serverDocument.config.custom_roles.includes(role.id)) {
						msg.member.roles.push(role.id);
						msg.member.edit({
							roles: msg.member.roles
						}).then(() => {
							msg.channel.createMessage(`You now have the role **${role.name}** on this server. 👑`);
						}).catch(err => {
							msg.channel.createMessage(`The Discord Gods just don't want you to join \`${role.name}\`, I guess 🤷`);
							winston.error(`Failed to add member '${msg.member.user.username}' to role '${role.name}' on server '${msg.channel.guild.name}'`, {svrid: msg.channel.guild.id, usrid: msg.author.id}, err);
						});
					} else {
						msg.channel.createMessage(`My superiors have instructed me not to let anyone join the role ${role.name}. Go bother them about this. 😝`);
					}
				}
			} else if(msg.member.permission.has("manageRoles")) {
				createRole(suffix);
			} else {
				msg.channel.createMessage(`I couldn't find a role called \`${suffix}\` on this server. 🙈`);
			}
		}
	} else {
		const info = msg.member.roles.map(roleid => {
			return msg.channel.guild.roles.get(roleid).name;
		});
		msg.channel.createMessage({
			content: `🎩 You have the following ${info.length || 1} role${(info.length || 1)==1 ? "" : "s"} on this server:\n\t${info.join("\n\t") || "@everyone"}`,
			disableEveryone: true
		});
	}
};
