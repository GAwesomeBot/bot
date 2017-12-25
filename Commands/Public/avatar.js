module.exports = async ({ client, Constants: { Colors } }, documents, msg, commandData) => {
	const handleMissingMember = () => {
		winston.verbose(`Couldn't find any member or the member doesn't exist so "${commandData.name}" command can't be ran`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id });
		msg.channel.send({
			embed: {
				color: Colors.LIGHT_ORANGE,
				title: `I don't know who that is!`,
				description: `You can admire my beautiful face instead! 💖`,
				image: {
					url: client.user.displayAvatarURL(),
				},
			},
		});
	};

	const sendAvatarImage = (m, avatar) => {
		msg.channel.send({
			embed: {
				title: `__${m.user.username}__'s Avatar`,
				color: Colors.BLUE,
				image: {
					url: avatar,
				},
			},
		});
	};

	let member = msg.member;
	if (msg.suffix && msg.suffix !== "me") {
		member = client.memberSearch(msg.suffix, msg.guild);
	}
	if (member) {
		if (member instanceof Promise) {
			try {
				member = await member;
			} catch (err) {
				return handleMissingMember();
			}
			if (member && member.user) sendAvatarImage(member, member.user.displayAvatarURL());
		} else {
			sendAvatarImage(member, member.user.displayAvatarURL());
		}
	} else {
		handleMissingMember();
	}
};
