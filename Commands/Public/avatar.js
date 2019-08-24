module.exports = async ({ client, Constants: { Colors } }, { serverDocument }, msg, commandData) => {
	const handleMissingMember = () => {
		logger.verbose(`Couldn't find any user or the user doesn't exist so "${commandData.name}" command can't be ran`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id });
		msg.send({
			embed: {
				color: Colors.LIGHT_ORANGE,
				title: `I don't know who that is!`,
				description: `You can admire my beautiful face instead! 💖`,
				image: {
					url: client.user.displayAvatarURL({ size: 512 }),
				},
			},
		});
	};

	const sendAvatarImage = (m, isUserOnly) => {
		msg.send({
			embed: {
				title: `@__${isUserOnly ? m.tag : client.getName(serverDocument, m)}__'s Avatar`,
				color: Colors.BLUE,
				image: {
					url: isUserOnly ? m.displayAvatarURL({ size: 512 }) : m.user.displayAvatarURL({ size: 512 }),
				},
			},
		});
	};

	let { member } = msg;
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
