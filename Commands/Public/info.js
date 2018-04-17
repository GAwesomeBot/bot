const moment = require("moment");

const getFlagForRegion = region => {
	if (!region) {
		return ":x:";
	}
	if (region.startsWith("vip-")) {
		region = region.substring(4);
	}
	switch (region) {
		case "amsterdam":
			return ":flag_nl:";
		case "brazil":
			return ":flag_br:";
		case "frankfurt":
			return ":flag_de:";
		case "hongkong":
			return ":flag_hk:";
		case "japan":
			return ":flag_jp:";
		case "london":
			return ":flag_gb:";
		case "russia":
			return ":flag_ru:";
		case "singapore":
			return ":flag_sg:";
		case "sydney":
			return ":flag_au:";
	}
	if (region.startsWith("eu-")) {
		return ":flag_eu:";
	}
	if (region.startsWith("us-")) {
		return ":flag_us:";
	}
	return ":interrobang:";
};
const getDescriptionForVerificationLevel = level => {
	switch (level) {
		case 0:
			return "None";
		case 1:
			return "Low - must have verified email on account";
		case 2:
			return "Medium - must be registered on Discord for longer than 5 minutes";
		case 3:
			return "High - (╯°□°）╯︵ ┻━┻ - must be a member of the server for longer than 10 minutes";
		case 4:
			return "Very High - ┻━┻ミヽ(ಠ益ಠ)ﾉ彡┻━┻ - must have a verified phone number";
	}
};

module.exports = async ({ client, Constants: { Colors } }, { serverDocument }, msg, commandData) => {
	let commandUses = 0;
	for (const k in serverDocument.command_usage) {
		commandUses += serverDocument.command_usage[k];
	}
	const guild = msg.guild;
	const created = moment(guild.createdTimestamp);
	const onlineMembers = guild.members.filter(m => m.presence.status === "online").size;
	const region = guild.region;
	const regionInfo = (await guild.fetchVoiceRegions()).get(region);
	const publicData = serverDocument.config.public_data;

	const embedFields = [];
	const generalText = [
		`**»** Guild ID: ${guild.id}`,
		`**»** Owner: ${guild.owner}`,
		`**»** Created: ${created.format("DD-MM-YYYY HH:mm:ss")} (${created.fromNow()})`,
		`**»** Voice region: ${regionInfo ? regionInfo.name : region || "Unknown"} ${getFlagForRegion(region)}${regionInfo && regionInfo.deprecated ? " (DEPRECATED)" : ""}`,
		`**»** Verification level: ${getDescriptionForVerificationLevel(guild.verificationLevel)}`,
	];
	if (!configJSON.activityBlocklist.includes(guild.id) && publicData.isShown) {
		generalText.push(`**»** This server is shown on the activity page using the category '${publicData.server_listing.category}'${publicData.server_listing.isEnabled ? ". Everyone can join it from there" : ""}`);
	}
	embedFields.push({
		name: "General Info :pencil:",
		value: generalText.join("\n"),
		inlinee: false,
	});
	const numbersText = [
		`**»** Members: ${guild.memberCount} (of which ${onlineMembers} ${onlineMembers === 1 ? "is" : "are"} online)`,
		`**»** Text channels: ${guild.channels.filter(c => c.type === "text").size}`,
		`**»** Voice channels: ${guild.channels.filter(c => c.type === "voice").size}`,
		`**»** Channel Categories: ${guild.channels.filter(c => c.type === "category").size}`,
		`**»** Roles: ${guild.roles.size - 1}`,
		`**»** Custom emoji: ${guild.emojis.size}`,
		`**»** Messages today: ${serverDocument.messages_today}`,
		`**»** Commands used this week: ${commandUses}`,
	];
	embedFields.push({
		name: "Crunchy Numbers :1234:",
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
		embedFields.push({
			name: "Special Features :star:",
			value: specialText.join("\n"),
			inline: false,
		});
	}

	msg.send({
		embed: {
			color: Colors.LIGHT_GREEN,
			title: `Information for ${guild.name}`,
			fields: embedFields,
			thumbnail: {
				url: guild.iconURL(),
			},
			footer: {
				text: `This server is on shard ${client.shardID}.`,
			},
		},
	});
};
