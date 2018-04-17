const moment = require("moment-timezone");

module.exports = async ({ client, Constants: { Colors, Text }, Utils: { GetFlagForRegion } }, { serverDocument }, msg, commandData) => {
	let commandUses = Object.values(serverDocument.command_usage).reduce((a, b) => a + b, 0);
	const guild = msg.guild;
	const created = moment(guild.createdTimestamp).tz("Europe/London");
	const onlineMembers = guild.members.filter(m => m.presence.status === "online").size;
	const region = guild.region;
	const regionInfo = (await guild.fetchVoiceRegions()).get(region);
	const publicData = serverDocument.config.public_data;

	const fields = [];
	const generalText = [
		`**»** Created: ${created.format("DD-MM-YYYY [at] HH:mm:ss")} (${created.fromNow()})`,
		`**»** Voice region: ${regionInfo ? regionInfo.name : region || "Unknown"} ${GetFlagForRegion(region)}${regionInfo && regionInfo.deprecated ? " (DEPRECATED)" : ""}`,
		`**»** Verification level: ${Text.GUILD_VERIFICATION_LEVEL(guild.verificationLevel)}`,
	];
	if (!configJSON.activityBlocklist.includes(guild.id) && publicData.isShown) {
		generalText.push(`**»** This server is shown on the activity page using the category '${publicData.server_listing.category}'${publicData.server_listing.isEnabled ? ". Everyone can join it from there" : ""}`);
	}
	fields.push({
		name: "General Info 📝",
		value: generalText.join("\n"),
		inline: false,
	});
	const numbersText = [
		`**»** Members: ${guild.memberCount} (of which ${onlineMembers} ${onlineMembers === 1 ? "is" : "are"} online)`,
		`**»** Text channels: ${guild.channels.filter(c => c.type === "text").size}`,
		`**»** Voice channels: ${guild.channels.filter(c => c.type === "voice").size}`,
		`**»** Channel categories: ${guild.channels.filter(c => c.type === "category").size}`,
		`**»** Roles: ${guild.roles.size - 1}`,
		`**»** Custom emoji${guild.emojis.size === 1 ? "" : "s"}: ${guild.emojis.size}`,
		`**»** Messages today: ${serverDocument.messages_today}`,
		`**»** Commands used this week: ${commandUses}`,
	];
	fields.push({
		name: "Crunchy Numbers 🔢",
		value: numbersText.join("\n"),
		inline: false,
	});
	const specialText = [];
	if (guild.mfaLevel > 0) {
		specialText.push("**»** This server requires 2FA Authentication");
	}
	if (guild.features.includes("VERIFIED")) {
		specialText.push("**»** This server is **verified**!");
	}
	if (guild.features.includes("MORE_EMOJI")) {
		specialText.push("**»** This server can use **more than 50 custom emoji**!");
	}
	if (guild.features.includes("VIP_REGIONS")) {
		specialText.push("**»** This server can use **VIP voice regions**!");
	}
	if (guild.features.includes("INVITE_SPLASH")) {
		specialText.push(`**»** This server can use a **custom invite splash background**!${guild.splash ? ` It is currently set to [this](${guild.splashURL({ format: "png", size: 2048 })})` : ""}`);
	}
	if (guild.features.includes("VANITY_URL")) {
		let customInvite;
		if (guild.me.permissions.has("MANAGE_GUILD")) {
			customInvite = (await client.api.guilds(guild.id)["vanity-url"].get()).code;
		}
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
