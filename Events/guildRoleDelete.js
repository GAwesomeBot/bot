// Server role deleted
module.exports = (bot, db, config, winston, svr, role) => {
	db.servers.findOne({_id: svr.id}, (err, serverDocument) => {
		if(!err && serverDocument) {
			// Remove role from config if necessary
			let updated = false;
			const adminDocument = serverDocument.config.admins.id(role.id);
			if(adminDocument) {
				updated = true;
				adminDocument.remove();
			}
			if(serverDocument.config.custom_roles.indexOf(role.id)>-1) {
				updated = true;
				serverDocument.config.custom_roles.splice(serverDocument.config.custom_roles.indexOf(role.id), 1);
			}
			for(const filter in serverDocument.toObject().config.moderation.filters) {
				if(serverDocument.config.moderation.filters[filter].violator_role_id==role.id) {
					updated = true;
					serverDocument.config.moderation.filters[filter].violator_role_id = null;
				}	
			}
			if(serverDocument.config.moderation.new_member_roles.indexOf(role.id)>-1) {
				updated = true;
				serverDocument.config.moderation.new_member_roles.splice(serverDocument.config.moderation.new_member_roles.indexOf(role.id), 1);
			}
			for(let i=0; i<serverDocument.config.ranks_list.length; i++) {
				if(serverDocument.config.ranks_list[i].role_id==role.id) {
					updated = true;
					serverDocument.config.ranks_list[i].role_id = null;
				}
			}

			// Save changes to serverDocument if necessary
			if(updated) {
				serverDocument.save(err => {
					winston.error("Failed to save server data for removing role", {svrid: svr.id}, err);
				});
			}
		} else {
			winston.error("Failed to find server data for serverRoleDeleted", {svrid: svr.id}, err);
		}
	});
};