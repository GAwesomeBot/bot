module.exports = {
	addMember: async (guild, voiceChannel, member) => {
		let channel = guild.channels.find(ch => ch.topic && ch.topic.includes(`gab:voicetext:${voiceChannel.id}`));
		if (!channel || channel.type !== "text") {
			channel = await guild.channels.create(`${voiceChannel.name.replaceAll(" ", "").toLowerCase().replace(/[^-_a-z0-9]/ig, "")}-voicetext`, {
				topic: `The GAB voicetext channel for **${voiceChannel.name}**.\n\nNote: Modifying the following line will desync this channel from its voice counterpart.\ngab:voicetext:${voiceChannel.id}`,
				parent: voiceChannel.parent,
				permissionOverwrites: [{ id: guild.id, deny: "VIEW_CHANNEL", type: "role" }],
				reason: `Voicetext Management`,
			});
		}
		await channel.createOverwrite(member.id, {
			VIEW_CHANNEL: true,
		}, "Voicetext Management");
	},
	removeMember: async (guild, voiceChannel, member) => {
		const channel = guild.channels.find(ch => ch.topic && ch.topic.includes(`gab:voicetext:${voiceChannel.id}`));
		if (channel && channel.type === "text") {
			await channel.createOverwrite(member.id, {
				VIEW_CHANNEL: null,
			}, "Voicetext Management");
		}
	},
};
