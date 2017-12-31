module.exports = async ({ client, Constants: { Colors } }, { serverDocument }, msg, commandData) => {
	const handleMissingMember = () => {
		winston.verbose(`Couldn't find any user or the user doesn't exist so "${commandData.name}" command can't be ran`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id });
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

	const sendAvatarImage = (m, isUserOnly) => {
		msg.channel.send({
			embed: {
				title: `@__${isUserOnly ? m.tag : client.getName(msg.guild, serverDocument, m)}__'s Avatar`,
				color: Colors.BLUE,
				image: {
					url: isUserOnly ? m.displayAvatarURL() : m.user.displayAvatarURL(),
				},
			},
		});
	};

	let member = msg.member;
	let fetchedUsr = false;
	if (msg.suffix && msg.suffix !== "me" && !/^\d+$/.test(msg.suffix.trim())) {
		member = client.memberSearch(msg.suffix.trim(), msg.guild);
	} else if (msg.suffix && /^\d+$/.test(msg.suffix.trim())) {
		member = client.users.fetch(msg.suffix.trim(), true);
		fetchedUsr = true;
	}
	if (member) {
		if (member instanceof Promise) {
			try {
				member = await member;
			} catch (err) {
				return handleMissingMember();
			}
			if (member && ((!fetchedUsr && member.user) || (fetchedUsr && member))) sendAvatarImage(member, fetchedUsr);
		} else {
			sendAvatarImage(member, false);
		}
	} else {
		handleMissingMember();
	}
};
