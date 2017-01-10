module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	if(suffix=="me") {
		msg.channel.createMessage(`⭐️ You have **${userDocument.points}** AwesomePoint${userDocument.points==1 ? "" : "s"}`);
	} else if(suffix) {
		const member = bot.memberSearch(suffix, msg.guild);
		if(member) {
			if(member.user.bot) {
				msg.channel.createMessage("Don't be silly, bots can't have points! 🤖");
			} else {
				db.users.findOrCreate({_id: member.id}, (err, targetUserDocument) => {
					let points = 0;
					if(!err && targetUserDocument) {
						points = targetUserDocument.points;
					}
					msg.channel.createMessage(`⭐️ **@${bot.getName(msg.guild, serverDocument, member)}** has ${points} AwesomePoint${points==1 ? "" : "s"}`);
				});
			}
		} else {
			winston.warn(`Requested member does not exist so ${commandData.name} cannot be shown`, {svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id});
			msg.channel.createMessage("Who's that? I'd like to meet them 🤝");
		}
	} else {
		db.users.find({
			_id: {
				$in: Array.from(msg.guild.members.keys())
			},
			points: {
				$gt: 0
			}
		}).sort({
			points: -1
		}).limit(10).exec((err, userDocuments) => {
			msg.channel.createMessage(userDocuments ? userDocuments.map(a => {
				return `**@${bot.getName(msg.guild, serverDocument, msg.guild.members.get(a._id))}:** ${a.points} AwesomePoint${a.points==1 ? "" : "s"}`;
			}).join("\n") : "No one on this server has any points! Use `@user +1` to give upvote someone. 🌟");
		});
	}
};