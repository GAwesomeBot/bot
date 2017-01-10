const getUserProfile = require("./../../Modules/UserProfile.js");
const moment = require("moment");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	let member;
	if(suffix && suffix.toLowerCase()!="me") {
		member = bot.memberSearch(suffix, msg.guild);
	} else {
		member = msg.member;
	}

	const showProfile = targetUserDocument => {
		msg.channel.createMessage({
			content: getUserProfile(bot, config, member.user, targetUserDocument, bot.getName(msg.guild, serverDocument, member)),
			disableEveryone: true
		}).then(() => {
			const info = [
				`**On ${msg.guild.name}:**`,
				`⌛️ Joined server ${moment(member.joinedAt).fromNow()}`,
			];
			if(member.nick) {
				info.push(`🏷 Nickname: ${member.nick}`);
			}
			info.push(`🗣 Roles: ${member.roles.map(roleid => {
				return msg.guild.roles.get(roleid).name;
			}).join(", ") || "@everyone"}`);
			if(!member.user.bot) {
				let targetMemberDocument = serverDocument.members.id(member.id);
				if(!targetMemberDocument) {
					serverDocument.members.push({_id: member.id});
					targetMemberDocument = serverDocument.members.id(member.id);
				}
				info.push(`💬 ${targetMemberDocument.messages} text message${targetMemberDocument.messages==1 ? "" : "s"} this week`);
				if(targetMemberDocument.voice>0) {
					const voiceActivityDuration = moment.duration(targetMemberDocument.voice*6000).humanize();
					info.push(`🎙 ${voiceActivityDuration.charAt(0).toUpperCase()}${voiceActivityDuration.slice(1)} active on voice chat this week`);
				}
				info.push(
					`🏆 Rank: ${targetMemberDocument.rank || (serverDocument.configs.ranks_list[0] || {_id: "None"})._id}`,
					`❎ Strikes: ${targetMemberDocument.strikes.length} so far`
				);
				if(targetMemberDocument.profile_fields) {
					for(const key in targetMemberDocument.profile_fields) {
						info.push(`ℹ️ ${key}: ${targetMemberDocument.profile_fields[key]}`);
					}
				}
			}
			msg.channel.createMessage({
				content: info.join("\n"),
				disableEveryone: true
			});
		});
	};

	if(member) {
		if(member.id==msg.author.id) {
			showProfile(userDocument);
		} else if(!member.user.bot) {
			db.users.findOrCreate({_id: member.id}, (err, targetUserDocument) => {
				showProfile(targetUserDocument);
			});
		} else {
			showProfile();
		}
	} else {
		winston.warn(`Requested member does not exist so ${commandData.name} cannot be shown`, {svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id});
		msg.channel.createMessage("I don't know who that is, so I can't tell you anything about them 💤");
	}
};
