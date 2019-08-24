const BaseEvent = require("../BaseEvent.js");

class RoleDelete extends BaseEvent {
	async handle (role) {
		const serverDocument = await Servers.findOne(role.guild.id);
		if (!serverDocument) {
			return logger.debug("Failed to find server data for role deletion", { svrid: role.guild.id, roleid: role.id });
		}
		const serverQueryDocument = serverDocument.query;

		let updated = false;

		const adminQueryDocument = serverQueryDocument.clone.id("config.admins", role.id);
		if (adminQueryDocument.val) {
			updated = true;
			adminQueryDocument.remove();
		}

		if (serverDocument.config.custom_roles.includes(role.id)) {
			updated = true;
			serverQueryDocument.pull("config.custom_roles", role.id);
		}

		for (const filter in serverDocument.config.moderation.filters) {
			if (serverDocument.config.moderation.filters[filter].violator_role_id === role.id) {
				updated = true;
				serverQueryDocument.remove(`config.moderation.filters.${filter}.violator_role_id`);
			}
		}

		if (serverDocument.config.moderation.new_member_roles.includes(role.id)) {
			updated = true;
			serverQueryDocument.pull("config.moderation.new_member_roles", role.id);
		}

		serverDocument.config.ranks_list.forEach(rankDocument => {
			if (rankDocument.role_id === role.id) {
				updated = true;
				serverQueryDocument.clone.id("config.ranks_list", role.id).remove("role_id");
			}
		});

		if (updated) {
			serverDocument.save().catch(err => {
				logger.warn("Failed to save server data for role deletion", { svrid: role.guild.id, roleid: role.id }, err);
			});
		}
	}
}

module.exports = RoleDelete;
