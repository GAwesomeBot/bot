const moment = require("moment-timezone");

module.exports = async ({ client, Constants: { Colors, Text }, Utils: { GetFlagForRegion } }, { serverDocument }, msg, commandData) => {
	const commandUses = Object.values(serverDocument.command_usage).reduce((a, b) => a + b, 0);
	const { guild, guild: { region } } = msg;
	const created = moment(guild.createdTimestamp).tz("Europe/London");
	const onlineMembers = guild.members.filter(m => m.presence.status !== "offline").size;
	const regionInfo = (await guild.fetchVoiceRegions()).get(region);
	const publicData = serverDocument.config.public_data;

	const fields = [];
	const generalText = [
		`**»** Created: ${created.format("DD.MM.YYYY [at] HH:mm:ss")}`,
		`**»** Voice region: ${regionInfo ? regionInfo.name : region || "Unknown"} ${GetFlagForRegion(region)}${regionInfo && regionInfo.deprecated ? " (DEPRECATED)" : ""}`,
		`**»** Verification level: ${Text.GUILD_VERIFICATION_LEVEL(guild.verificationLevel)}`,
	];
	fields.push({
		name: "General Info 📝",
		value: generalText.join("\n"),
		inline: true,
	});
	const serverConfigs = [
		`🛠 Command Prefix: **${serverDocument.config.command_prefix}**`,
		`🛡 Bot Admins: **${serverDocument.config.admins.length}**`,
		`🗃 Server Category: **${publicData.server_listing.category}**`,
	];
	if (!configJSON.activityBlocklist.includes(guild.id) && publicData.isShown && publicData.server_listing.isEnabled) {
		serverConfigs.push(`🌎 Everyone can join the server from the activity page`);
		serverConfigs.push(`ℹ You can join by using [**this invite URL**](${publicData.server_listing.invite_link})`);
	}
	fields.push({
		name: `Server Configs ⚙️`,
		value: serverConfigs.join("\n"),
		inline: true,
	});
	const channelsText = [
		`⌨️ Text: **${guild.channels.filter(c => c.type === "text").size}**`,
		`🔉 Voice: **${guild.channels.filter(c => c.type === "voice").size}**`,
		`📁 Categories: **${guild.channels.filter(c => c.type === "category").size}**`,
	];
	fields.push({
		name: `Channel Info [${guild.channels.size}]:`,
		value: channelsText.join("\n"),
		inline: true,
	});
	const numbersText = [
		`👥 Members: **${guild.memberCount}** (of which **${onlineMembers}** ${onlineMembers === 1 ? "is" : "are"} online)`,
		`🏷 Roles: **${guild.roles.size - 1}**`,
		`👌 Custom Emojis: **${guild.emojis.size}**`,
		`💬 Messages Today: **${serverDocument.messages_today}**`,
		`🔧 Commands used this week: **${commandUses}**`,
	];
	fields.push({
		name: "Crunchy Numbers 🔢",
		value: numbersText.join("\n"),
		inline: true,
	});
	const specialText = [];
	if (guild.mfaLevel > 0) {
		specialText.push("**»** This server requires 2FA Authentication");
	}
	if (guild.features.includes("VERIFIED")) {
		specialText.push("**»** This server is **verified**!");
	}
	if (guild.features.includes("MORE_EMOJI")) {
		specialText.push("**»** This server can have **more than 50 custom emoji**!");
	}
	if (guild.features.includes("VIP_REGIONS")) {
		specialText.push("**»** This server can use **VIP voice regions**!");
	}
	if (guild.features.includes("INVITE_SPLASH")) {
		specialText.push(`**»** This server can use a **custom invite splash background**!${guild.splash ? ` It is currently set to [this](${guild.splashURL({ format: "png", size: 2048 })})` : ""}`);
	}
	if (guild.features.includes("VANITY_URL")) {
		const customInvite = guild.vanityURLCode;
		specialText.push(`**»** This server can use a **custom vanity URL**!${customInvite ? ` It is currently set to https://discord.gg/${customInvite}` : ""}`);
	}
	if (specialText.length) {
		fields.push({
			name: "Special Features ⭐",
			value: specialText.join("\n"),
			inline: false,
		});
	}

	msg.send({
		embed: {
			author: {
				name: `Owned by ${guild.owner.user.tag}`,
				iconURL: guild.owner.user.displayAvatarURL(),
			},
			color: Colors.INFO,
			title: `Information for ${guild.name} :: ${guild.id}`,
			url: `${configJS.hostingURL}activity/servers?q=${encodeURIComponent(guild.name)}`,
			fields,
			thumbnail: {
				url: guild.iconURL(),
			},
			footer: {
				text: `This server is on shard ${client.shardID}.`,
			},
		},
	});
};
