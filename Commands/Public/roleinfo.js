const moment = require("moment");
const PaginatedEmbed = require("../../Modules/MessageUtils/PaginatedEmbed");

module.exports = async ({ client, Constants: { Colors, Text }, Utils: { TitlecasePermissions } }, documents, msg, commandData) => {
	if (!msg.suffix) {
		const roles = msg.guild.roles;
		let sortedRoles = [...roles.values()].sort((a, b) => b.position - a.position);
		const descriptions = [];
		for (let i = 0; i < roles.size; i += 50) {
			const roleSegment = sortedRoles.slice(i, i + 50).join("\n");
			descriptions.push(`${i ? `...${i} previous roles\n` : ""}${roleSegment}${i + 50 < roles.size ? `\n...and ${roles.size - i - 50} more` : ""}`);
		}
		const menu = new PaginatedEmbed(msg, {
			color: Colors.INFO,
			title: `This guild has ${roles.size} roles:`,
			footer: roles.size > 50 ? `Page {currentPage} out of {totalPages}` : "",
		}, {
			descriptions,
		});
		await menu.init();
	} else {
		let role;
		try {
			role = await client.roleSearch(msg.suffix, msg.guild);
		} catch (err) {
			if (err.code === "FAILED_TO_FIND") {
				return msg.send({
					embed: {
						color: Colors.SOFT_ERR,
						title: "What's that role? 🏷️",
						description: "I do not know anything about a role with that name.",
						footer: {
							text: "You can find a list of all roles by simply executing this command without any arguments.",
						},
					},
				});
			}
			throw err;
		}
		const permissions = role.permissions.toArray(false).join(", ");
		const elements = [
			`🎨 Color: **${role.color ? role.hexColor.toUpperCase() : "None"}**`,
			`👥 Members: **${role.members.size}**`,
			`#⃣ Position: **${msg.guild.roles.size - role.position}**`,
			`🕒 Created: **${moment(role.createdTimestamp).fromNow()}**`,
		];
		if (role.mentionable) {
			elements.push("📢 Mentionable by everyone");
		}
		if (role.hoist) {
			elements.push("📌 Hoisted in member list");
		}
		if (role.managed) {
			elements.push("🤖 Managed by an integration");
		}
		// TODO in case no additional permissions granted for role?
		elements.push(`👌 Permissions:\n\`\`\`${TitlecasePermissions(permissions)}\`\`\``);
		return msg.send({
			embed: {
				title: `Information for role ${role.name} :: ${role.id}`,
				color: role.color || null,
				description: elements.join("\n"),
			},
		});
	}
};
