const BaseEvent = require("../BaseEvent");
const { Colors } = require("../../Constants");

class VoteHandler extends BaseEvent {
	requirements (msg) {
		if (!msg.guild) return false;
		if (msg.editedAt || msg.type !== "DEFAULT") return false;
		if (msg.author.id === this.client.user.id || msg.author.bot || this.configJSON.userBlocklist.includes(msg.author.id)) {
			if (msg.author.id === this.client.user.id) {
				return false;
			} else {
				logger.silly(`Ignored ${msg.author.tag} for vote handler.`, { usrid: msg.author.id, globallyBlocked: this.configJSON.userBlocklist.includes(msg.author.id) });
				return false;
			}
		}
		return true;
	}
	async prerequisite (msg) {
		this.serverDocument = await Servers.findOne(msg.guild.id);
	}

	async handle (msg) {
		// Vote based on mention
		if (this.serverDocument && this.serverDocument.config.commands.points.isEnabled && msg.guild.members.size > 2 &&
			!this.serverDocument.config.commands.points.disabled_channel_ids.includes(msg.channel.id) &&
			msg.content.startsWith("<@") && msg.content.indexOf(">") < msg.content.indexOf(" ") && msg.content.includes(" ") &&
			msg.content.indexOf(" ") < msg.content.length - 1) {
			let member;
			try {
				member = await this.client.memberSearch(msg.content.split(/\s+/)[0].trim(), msg.guild);
			} catch (_) {
				member = null;
			}
			const voteString = msg.content.split(/\s+/).slice(1).join(" ");
			if (member && ![this.client.user.id, msg.author.id].includes(member.id) && !member.user.bot) {
				const targetUserDocument = await Users.findOne(member.id);
				// Get author data
				const authorDocument = await Users.findOne(msg.author.id);
				if (targetUserDocument && authorDocument) {
					let voteAction = null;

					// Check for +1 triggers
					for (const voteTrigger of this.configJS.voteTriggers) {
						if (voteString.startsWith(voteTrigger)) {
							voteAction = "upvoted";
							// Increment points and exit loop
							targetUserDocument.query.inc("points");
							authorDocument.query.inc("points", -1);
							break;
						}
					}

					// Check for gild trigger
					if (voteString.startsWith("gild") || voteString.startsWith("guild")) {
						voteAction = "gilded";
					}

					// Log and save changes, if necessary
					if (voteAction) {
						const saveTargetUserDocument = async () => {
							try {
								await targetUserDocument.save();
								await authorDocument.save().catch(err => {
									logger.debug("Failed to save user data for points.", { usrid: msg.author.id }, err);
								});
							} catch (err) {
								logger.debug("Failed to save user data for points.", { usrid: member.id }, err);
							}
							logger.verbose(`User "${member.user.tag}" ${voteAction} by user "${msg.author.tag}" on server "${msg.guild}"`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id });
						};

						if (voteAction === "gilded") {
							if (authorDocument) {
								if (authorDocument.points > 10) {
									authorDocument.query.inc("points", -10);
									targetUserDocument.query.inc("points", 10);
									await saveTargetUserDocument();
								} else {
									logger.verbose(`User "${msg.author.tag}" does not have enough points to gild "${member.user.tag}"`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id });
									msg.channel.send({
										embed: {
											color: Colors.SOFT_ERR,
											description: `Hey ${msg.author}, you don't have enough GAwesomePoints to gild ${member}!`,
										},
									}).catch(err => {
										logger.debug(`Failed to send insufficient GAwesomePoints message.`, { svrid: msg.guild.id, chid: msg.channel.id }, err);
									});
								}
							}
						} else {
							await saveTargetUserDocument();
						}
					}
				}
			}
		}

		// Vote based on previous message
		for (const voteTrigger of this.configJS.voteTriggers) {
			if (msg.content.trim().startsWith(voteTrigger)) {
				// Get previous message
				let fetchedMessages = await msg.channel.messages.fetch({ limit: 1, before: msg.id }).catch(err => {
					logger.debug(`Failed to fetch message for voting...`, { svrid: msg.guild.id, chid: msg.channel.id }, err);
					fetchedMessages = null;
				});
				const message = fetchedMessages && fetchedMessages.first();
				if (message && ![this.client.user.id, msg.author.id].includes(message.author.id) && !message.author.bot) {
					// Get target user data
					const targetUserDocument = await Users.findOne(message.author.id);
					if (targetUserDocument) {
						logger.verbose(`User "${message.author.tag}" upvoted by user "${msg.author.tag}" on server "${msg.guild}"`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id });

						// Increment points
						targetUserDocument.query.inc("points");

						// Save changes to targetUserDocument2
						await targetUserDocument.save().catch(err => {
							logger.debug(`Failed to save user data for points`, { usrid: msg.author.id }, err);
						});
					}
				}
				break;
			}
		}
	}
}

module.exports = VoteHandler;
