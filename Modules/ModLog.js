const { Error } = require("../Internals/Errors/");
const { Colors } = require("../Internals/Constants");
const { GuildMember } = require("discord.js");

module.exports = class ModLog {
	constructor () {
		throw new Error("STATIC_CLASS", this.constructor.name);
	}

	static getUserText (user) {
		return `${user.tag} (${user}) <${user.id}>`;
	}

	static getEntryText (modlogID, type, affectedUserString = null, creatorString = null, reason = null) {
		const info = [
			`🔨 **Case ${modlogID}:** ${type}`,
		];
		affectedUserString && info.push(`👤 **User:** ${affectedUserString}`);
		creatorString && info.push(`🐬 **Moderator:** ${creatorString}`);
		reason && info.push(`❓ **Reason:** ${reason}`);

		return info.join("\n");
	}

	static async create (guild, type, member, creator, reason = null) {
		let serverDocument = guild.serverDocument;
		if (serverDocument && serverDocument.modlog.isEnabled && serverDocument.modlog.channel_id) {
			const ch = guild.channels.get(serverDocument.modlog.channel_id);
			if (ch && ch.type === "text") {
				let affectedUser;
				if (member) {
					affectedUser = ModLog.getUserText(member instanceof GuildMember ? member.user : member);
				}
				let creatorStr;
				if (creator) {
					creatorStr = ModLog.getUserText(creator instanceof GuildMember ? creator.user : creator);
				}
				let description = ModLog.getEntryText(++serverDocument.modlog.current_id, type, affectedUser, creatorStr, reason);
				let m;
				try {
					m = await ch.send({
						embed: {
							description,
							color: Colors.YELLOW,
							footer: {
								text: `Use "${guild.commandPrefix}reason ${serverDocument.modlog.current_id} <new reason>" to change the reason.`,
							},
						},
					});
				} catch (err) {
					return;
				}
				if (m) {
					serverDocument.modlog.entries.push({
						_id: serverDocument.modlog.current_id,
						type,
						affected_user: affectedUser,
						creator: creatorStr,
						message_id: m.id,
						reason,
					});
					return serverDocument.save().then(() => serverDocument.modlog.current_id);
				}
			} else {
				return new Error("INVALID_MODLOG_CHANNEL", ch);
			}
		} else {
			return new Error("MISSING_MODLOG_CHANNEL");
		}
	}
};
