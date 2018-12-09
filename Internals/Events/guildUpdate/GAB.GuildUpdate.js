const BaseEvent = require("../BaseEvent");
const { StatusMessages } = require("../../Constants");
const { GetFlagForRegion } = require("../../../Modules/Utils");

class GuildUpdate extends BaseEvent {
	async handle (oldGuild, guild) {
		const serverDocument = await Servers.findOne(guild.id);
		if (!serverDocument) {
			return winston.debug("Failed to find server data for guild modification", { svrid: guild.id });
		}

		if (!serverDocument.config.moderation.isEnabled) return;

		if (oldGuild.name !== guild.name && serverDocument.config.moderation.status_messages.server_name_updated_message.isEnabled) {
			winston.verbose(`Name of guild '${oldGuild.name}' changed to '${guild.name}'`, { svrid: guild.id });
			const channel = guild.channels.get(serverDocument.config.moderation.status_messages.server_name_updated_message.channel_id);
			if (channel) {
				channel.send({
					embed: StatusMessages.GUILD_UPDATE_NAME(oldGuild.name, guild),
				});
			}
		}

		if (oldGuild.icon !== guild.icon && serverDocument.config.moderation.status_messages.server_icon_updated_message.isEnabled) {
			// eslint-disable-next-line max-len
			winston.verbose(`Guild Icon changed from \`${oldGuild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${oldGuild.icon}.jpg` : "default"}\` to '${guild.iconURL() || "default"}'`, { svrid: guild.id });
			const channel = guild.channels.get(serverDocument.config.moderation.status_messages.server_icon_updated_message.channel_id);
			if (channel) {
				channel.send({
					embed: StatusMessages.GUILD_UPDATE_ICON(oldGuild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${oldGuild.icon}.jpg` : null, guild),
				});
			}
		}

		if (oldGuild.region !== guild.region && serverDocument.config.moderation.status_messages.server_region_updated_message.isEnabled) {
			winston.verbose(`Region of guild '${oldGuild.name}' changed from '${oldGuild.region}' to '${guild.region}'`, { svrid: guild.id });
			const channel = guild.channels.get(serverDocument.config.moderation.status_messages.server_region_updated_message.channel_id);
			if (channel) {
				const getRegionString = region => {
					const emoji = GetFlagForRegion(region);
					if (region.startsWith("us-") || region.startsWith("eu-")) return `**${region.substring(0, 2).toUpperCase()} ${region.charAt(3).toUpperCase()}${region.slice(4)}** ${emoji}`;
					else return `**${region.charAt(0).toUpperCase()}${region.slice(1)}** ${emoji}`;
				};

				channel.send({
					embed: StatusMessages.GUILD_UPDATE_REGION(getRegionString(oldGuild.region), getRegionString(guild.region), guild),
				});
			}
		}
	}
}

module.exports = GuildUpdate;
