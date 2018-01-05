const { VM } = require("vm2");
const fs = require("fs-nextra");
const API = require("./API");
const Sandbox = API.Sandbox;

const getExtensionCode = extensionDocument => fs.readFile(`${__dirname}/../../Extensions/${extensionDocument.code_id}.gabext`, "utf8");

const parseScopes = extensionDocument => {
	const scopes = extensionDocument.scopes;
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

exports.run = async (bot, serverDocument, extensionDocument, params) => {
	let extensionCode;
	try {
		extensionCode = await getExtensionCode(extensionDocument);
	} catch (err) {
		return winston.warn(`Failed to load the extension code for ${extensionDocument.type} extension "${extensionDocument.name}"`, { svrid: params.guild.id, extid: extensionDocument._id }, err);
	}
	try {
		const scopes = parseScopes(extensionDocument);
		const vm = new VM({
			timeout: extensionDocument.timeout,
			sandbox: new Sandbox(bot, serverDocument, extensionDocument, params, scopes),
		});
		vm.run(extensionCode);
	} catch (err) {
		winston.debug(`Failed to run ${extensionDocument.type} extension "${extensionDocument.name}": ${err.stack}`, { svrid: params.guild.id, extid: extensionDocument._id });
	}
};
