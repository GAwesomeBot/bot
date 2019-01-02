const { VM } = require("vm2");
const fs = require("fs-nextra");
const API = require("./API");
const { Sandbox } = API;

const getExtensionCode = versionDocument => fs.readFile(`${__dirname}/../../Extensions/${versionDocument.code_id}.gabext`, "utf8");

const parseScopes = versionDocument => {
	const { scopes } = versionDocument;
	const parsed = {
		messages: {
			readChannel: false,
			readGlobal: false,
			write: false,
			manage: false,
		},
		roles: {
			read: false,
			manage: false,
		},
		channels: {
			read: false,
			manage: false,
		},
		guild: {
			read: false,
			manage: false,
			kick: false,
			ban: false,
		},
		members: {
			read: false,
			manage: false,
		},
		accessDocument: false,
	};

	scopes.forEach(scope => {
		switch (scope) {
			case "ban":
				parsed.guild.ban = true;
				// Fall through
			case "kick":
				parsed.guild.kick = true;
				break;
			case "roles_manage":
				parsed.roles.manage = true;
				// Fall through
			case "roles_read":
				parsed.roles.read = true;
				break;
			case "channels_manage":
				parsed.channels.manage = true;
				// Fall through
			case "channels_read":
				parsed.channels.read = true;
				break;
			case "guild_manage":
				parsed.guild.manage = true;
				// Fall through
			case "guild_read":
				parsed.guild.read = true;
				break;
			case "members_manage":
				parsed.members.manage = true;
				// Fall through
			case "members_read":
				parsed.members.read = true;
				break;
			case "messages_global":
				parsed.messages.readGlobal = true;
				// Fall through
			case "messages_read":
				parsed.messages.readChannel = true;
				break;
			case "messages_write":
				parsed.messages.write = true;
				break;
			case "messages_manage":
				parsed.messages.manage = true;
				break;
			case "config":
				parsed.accessDocument = true;
		}
	});
	return parsed;
};

module.exports = async (client, serverDocument, extensionDocument, versionDocument, params) => {
	let extensionCode;
	try {
		extensionCode = await getExtensionCode(versionDocument);
	} catch (err) {
		// eslint-disable-next-line max-len
		return winston.warn(`Failed to load extension code for ${versionDocument.type} extension "${extensionDocument.name}"`, { svrid: params.guild.id, extid: extensionDocument._id, v: versionDocument._id }, err);
	}
	try {
		const scopes = parseScopes(versionDocument);
		const vm = new VM({
			timeout: versionDocument.timeout,
			sandbox: new Sandbox(client, serverDocument, extensionDocument, versionDocument, params, scopes),
		});
		vm.run(extensionCode);
	} catch (err) {
		winston.debug(`Failed to run ${versionDocument.type} extension "${extensionDocument.name}": ${err.stack}`, { svrid: params.guild.id, extid: extensionDocument._id, v: versionDocument._id }, err);
	}
};
