// Server details updated (name, icon, etc.)
module.exports = (bot, db, config, winston, svr, oldsvrdata) => {
	// Get server data
	db.servers.findOne({_id: svr.id}, (err, serverDocument) => {
		if(!err && serverDocument) {
			if(serverDocument.config.moderation.isEnabled) {
				// Send server_name_updated_message if necessary
				if(oldsvrdata.name!=svr.name && serverDocument.config.moderation.status_messages.server_name_updated_message.isEnabled) {
					winston.info(`Name of server '${oldsvrdata.name}' changed to '${svr.name}'`, {svrid: svr.id});
					const ch = svr.channels.get(serverDocument.config.moderation.status_messages.server_name_updated_message.channel_id);
					if(ch) {
						ch.createMessage(`Server name changed from \`${oldsvrdata.name}\` to \`${svr.name}\``);
					}
				}

				// Send server_icon_updated_message if necessary
				if(oldsvrdata.icon!=svr.icon && serverDocument.config.moderation.status_messages.server_icon_updated_message.isEnabled) {
					winston.info(`Icon of server '${oldsvrdata.name}' changed from '${oldsvrdata.icon}' to '${svr.icon}'`, {svrid: svr.id});
					const ch = svr.channels.get(serverDocument.config.moderation.status_messages.server_icon_updated_message.channel_id);
					if(ch) {
						ch.createMessage(`Server icon changed from \`${oldsvrdata.icon ? (`https://cdn.discordapp.com/icons/${svr.id}/${oldsvrdata.icon}.jpg`) : "<no icon>"}\` to \`${svr.iconURL || "<no icon>"}\``);
					}
				}

				// Send server_region_updated_message if necessary
				if(oldsvrdata.region!=svr.region && serverDocument.config.moderation.status_messages.server_region_updated_message.isEnabled) {
					winston.info(`Region of server '${oldsvrdata.name}' changed from ${oldsvrdata.region} to ${svr.region}`, {svrid: svr.id});
					const ch = svr.channels.get(serverDocument.config.moderation.status_messages.server_region_updated_message.channel_id);
					if(ch) {
						// Get emoji for regions
						const getRegionEmoji = region => {
							switch(region) {
								case "amsterdam":
									return ":flag_nl:";
								case "brazil":
									return ":flag_br:";
								case "frankfurt":
									return ":flag_de:";
								case "london":
									return ":flag_gb:";
								case "singapore":
									return ":flag_sg:";
								case "sydney":
									return ":flag_au:";
								case "us-central":
								case "us-east":
								case "us-south":
								case "us-west":
									return ":flag_us:";
								default:
									return ":grey_question:";
							}
						};
						
						// Format region string
						const getRegionString = region => {
							const emoji = getRegionEmoji(region);
							if(region.indexOf("us")==0) {
								region = region.substring(0, 2).toUpperCase() + region.slice(2);
							}
							return `**${region.charAt(0).toUpperCase()}${region.slice(1).replace("-", " ")}** ${emoji}`;
						};

						ch.createMessage(`Server region changed from ${getRegionString(oldsvrdata.region)} to ${getRegionString(svr.region)}`);
					}
				}
			}
		} else {
			winston.error("Failed to find server data for serverUpdated", {svrid: svr.id}, err);
		}
	});
};
