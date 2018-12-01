const { Error } = require("../Internals/Errors/");
const { Colors } = require("../Internals/Constants");
const { GuildMember } = require("discord.js");

module.exports = class ModLog {
	constructor () {
		throw new Error("STATIC_CLASS", this.constructor.name);
	}

	static getUserText (user) {
		return `${user.tag} <${user.id}>`;
	}

	static getEntryText (modlogID, type, affectedUserString = null, creatorString = null, reason = null) {
		const info = [
			`🔨 **Case ${modlogID}:** ${type}`,
		];
		affectedUserString && info.push(`👤 **User:** ${affectedUserString}`);
		creatorString && info.push(`🐬 **${affectedUserString ? "Moderator" : "Creator"}:** ${creatorString}`);
		reason && info.push(`❓ **Reason:** ${reason}`);

		return info.join("\n");
	}

	static async create (guild, type, member, creator, reason = null) {
		const serverDocument = await Servers.findOne(guild.id);
		const serverQueryDocument = serverDocument.query;
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
				const description = ModLog.getEntryText(++serverDocument.modlog.current_id, type, affectedUser, creatorStr, reason);
				const m = await ch.send({
					embed: {
						description,
						color: Colors.INFO,
						footer: {
							text: `${member ? `Use "${guild.commandPrefix}reason ${serverDocument.modlog.current_id} <reason>" to change the reason. | ` : ""}Entry created`,
						},
						timestamp: new Date,
					},
				}).catch(() => null);
				if (m) {
					serverQueryDocument.push("modlog.entries", {
						_id: serverDocument.modlog.current_id,
						type,
						affected_user: affectedUser,
						creator: creatorStr,
						message_id: m.id,
						reason,
						canEdit: !!member,
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
