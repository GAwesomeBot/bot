const PermissionConstants = {
	createInstantInvite: 1,
	kickMembers: 2,
	banMembers: 4,
	administrator: 8,
	manageChannels: 16,
	manageGuild: 32,
	readMessages: 1024,
	sendMessages: 2048,
	sendTTSMessages: 4096,
	manageMessages: 8192,
	embedLinks: 16384,
	attachFiles: 32768,
	readMessageHistory: 65536,
	mentionEveryone: 131072,
	externalEmojis: 262144,
	voiceConnect: 1048576,
	voiceSpeak: 2097152,
	voiceMuteMembers: 4194304,
	voiceDeafenMembers: 8388608,
	voiceMoveMembers: 16777216,
	voiceUseVAD: 33554432,
	changeNickname: 67108864,
	manageNicknames: 134217728,
	manageRoles: 268435456,
	manageWebhooks: 536870912,
	manageEmojis: 1073741824,
	all: 2146958399,
	allGuild: 2080374847,
	allText: 805829649,
	allVoice: 871366673
};

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if(suffix) {
		const findRoleOrMember = (str, callback) => {
			const role = msg.channel.guild.roles.find(a => {
				return a.name == str;
			});
			if(role) {
				callback(role, "role");
			} else {
				const member = bot.memberSearch(str, msg.channel.guild);
				if(member) {
					callback(member, "member");
				} else {
					callback();
				}
			}
		};
		if(suffix.indexOf("|") > -1) {
			const args = suffix.split("|");
			if(args.length == 2 && args[0].trim() && args[1].trim()) {
				findRoleOrMember(args[0].trim(), (target, type) => {
					if(target && type) {
						const perm = args[1].trim();
						if(PermissionConstants.hasOwnProperty(perm)) {
							const doOverwrite = (allow, deny) => {
								msg.channel.editPermission(target.id, allow, deny, type).then(() => {
									msg.channel.createMessage({
										embed: {
                                            author: {
                                                name: bot.user.username,
                                                icon_url: bot.user.avatarURL,
                                                url: "https://github.com/GilbertGobbels/GAwesomeBot"
                                            },
                                            color: 0x00FF00,
											description: `Done. **${type == "role" ? target.name : (`@${bot.getName(msg.channel.guild, serverDocument, target)}`)}** now ${allow == null ? "doesn't have" : "has"} the \`${perm}\` permission in #${msg.channel.name}`
										}
									});
								}).catch(err => {
									winston.error(`Failed to edit permissions for ${type} in channel '${msg.channel.name}'`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id}, err);
									msg.channel.createMessage({
										embed: {
                                            author: {
                                                name: bot.user.username,
                                                icon_url: bot.user.avatarURL,
                                                url: "https://github.com/GilbertGobbels/GAwesomeBot"
                                            },
                                            color: 0xFF0000,
											description: "Discord isn't letting me change perms atm. Here's a koala to make up for it: 🐨"
										}
									});
								});
							};
							if(type == "role") {
								if(target.permissions.has(perm)) {
									doOverwrite(null, PermissionConstants[perm]);
								} else {
									doOverwrite(PermissionConstants[perm], null);
								}
							} else if(type == "member") {
								if(msg.channel.permissionsOf(target.id).has(perm) && (!msg.channel.permissionOverwrites.has(target.id) || msg.channel.permissionOverwrites.get(target.id).has(perm))) {
									doOverwrite(null, PermissionConstants[perm]);
								} else {
									doOverwrite(PermissionConstants[perm], null);
								}
							}
						} else {
							winston.warn(`Invalid parameters '${suffix}' provided for ${commandData.name} command`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
							msg.channel.createMessage({
								embed: {
                                    author: {
                                        name: bot.user.username,
                                        icon_url: bot.user.avatarURL,
                                        url: "https://github.com/GilbertGobbels/GAwesomeBot"
                                    },
                                    color: 0xFF0000,
									description: `That's not an accepted permission name. Here's the list:\`\`\`${Object.keys(PermissionConstants).sort().join(", ")}\`\`\``
								}
							});
						}
					} else {
						winston.warn(`Requested role/member does not exist so ${commandData.name} cannot be set`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
						msg.channel.createMessage({
							embed: {
                                author: {
                                    name: bot.user.username,
                                    icon_url: bot.user.avatarURL,
                                    url: "https://github.com/GilbertGobbels/GAwesomeBot"
                                },
                                color: 0xFF0000,
								description: `I couldn't find a role or member called \`${args[0].trim()}\`. Please try again 🙏`
							}
						});
					}
				});
			} else {
				winston.warn(`Invalid parameters '${suffix}' provided for ${commandData.name} command`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
				msg.channel.createMessage({
					embed: {
                        author: {
                            name: bot.user.username,
                            icon_url: bot.user.avatarURL,
                            url: "https://github.com/GilbertGobbels/GAwesomeBot"
                        },
                        color: 0xFF0000,
						description: `Invalid syntax - use \`${bot.getCommandPrefix(msg.channel.guild, serverDocument)}${commandData.name} <user or role>|<permission name>\``
					}
				});
			}
		} else {
			findRoleOrMember(suffix, (target, type) => {
				if(target && type) {
					const overwrite = msg.channel.permissionOverwrites.find(a => {
						return a.id == target.id && a.type == type;
					});
					const perms = type == "role" ? target.permissions.json : msg.channel.permissionsOf(target.id).json;
					if(overwrite) {
						for(const perm in overwrite.json) {
							if(overwrite.json[perm] == false) {
								delete perms[perm];
							}
						}
					}
					msg.channel.createMessage({
						embed: {
                            author: {
                                name: bot.user.username,
                                icon_url: bot.user.avatarURL,
                                url: "https://github.com/GilbertGobbels/GAwesomeBot"
                            },
                            color: 0x00FF00,
							description: `\`\`\`${Object.keys(perms).sort().join(", ")}\`\`\``
						}
					});
				} else {
					winston.warn(`Requested role/member does not exist so ${commandData.name} cannot be shown`, {svrid: msg.channel.guild.id, chid: msg.channel.id, usrid: msg.author.id});
					msg.channel.createMessage({
						embed: {
                            author: {
                                name: bot.user.username,
                                icon_url: bot.user.avatarURL,
                                url: "https://github.com/GilbertGobbels/GAwesomeBot"
                            },
                            color: 0xFF0000,
							description: `I couldn't find a role or member called \`${suffix}\`. Please try again 🙏`
						}
					});
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
                color: 0xFF0000,
				description: `Valid permission names:\`\`\`${Object.keys(PermissionConstants).sort().join(", ")}\`\`\``
			}
		});
	}
};
