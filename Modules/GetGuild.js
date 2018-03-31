/**
 * A settings object that determines the parsing method for the getGuild handler
 * @typedef {Object} GetGuildSettings
 * @property {boolean} [strict] - Indicates if the handler should ONLY parse data requested in the settings object
 * @property {(array|string)} [resolve] - A list of all the values that the handler should manually parse, if this property is a string and strict is enabled, the handler will parse only this value
 * @property {(array|string)} [fullResolveMembers] - A list of member ID's indicating the parser what members should be fully parsed using the toJSON method, rather than the default (ID)
 * @property {array} [fullResolveMaps] - A list of map names indicating the parser what collections should be fully parsed using the toJSON method, rather than using the default (list of ID's)
 * @property {string} [mutualOnlyTo] - A user ID that must be present in the guild's member collection before parsing
 * @property {string} [findFilter] - A search query to filter through all guilds before parsing
 * @property {string} [parse] - If set to "noKeys", multiple results will be parsed in an array rather than an object
 */

/**
 * Handler for incoming getGuild messages
 * @param guild {Discord.Guild} The guild whose data is being fetched
 * @param settings {GetGuildSettings} Settings to parse the guild data
 * @param respond {function} Callback function to be called with the payload for a getGuild return message
 * @returns {*}
 */
const messageHandler = (guild, settings, respond) => {
	let payload = {};
	if (!settings.strict) {
		payload = guild.toJSON();
		payload.memberList = payload.members;
		payload.members = {};
		payload.channels = guild.channels.toJSON();
	}

	if (settings.resolve && settings.resolve.constructor === Array) {
		settings.resolve.forEach(prop => {
			if (guild[prop].toJSON) payload[prop] = guild[prop].toJSON();
			else payload[prop] = guild[prop];
		});
	} else if (typeof settings.resolve === "string" && settings.strict) {
		return respond({ target: guild.id, err: null, result: guild[settings.resolve] });
	}

	if (settings.fullResolveMembers && settings.fullResolveMembers.constructor === Array) {
		if (!payload.members) payload.members = {};
		settings.fullResolveMembers.forEach(member => {
			const rawMember = member === "OWNER" ? guild.owner : guild.members.get(member);
			if (rawMember) {
				payload.members[rawMember.id] = rawMember.toJSON();
				payload.members[rawMember.id].user = rawMember.user.toJSON();
			}
		});
	} else if (settings.fullResolveMembers && typeof settings.fullResolveMembers === "string") {
		if (!payload.members) payload.members = {};
		const query = settings.fullResolveMembers;

		let usr = guild.members.get(query);
		if (!usr) {
			const usernameQuery = query.substring(0, query.lastIndexOf("#") > -1 ? query.lastIndexOf("#") : query.length);
			const discriminatorQuery = query.indexOf("#") > -1 ? query.substring(query.lastIndexOf("#") + 1) : "";
			const usrs = guild.members.filter(a => (a.user || a).username === usernameQuery);
			if (discriminatorQuery) {
				usr = usrs.find(a => (a.user || a).discriminator === discriminatorQuery);
			} else if (usrs.size > 0) {
				usr = usrs.first();
			}
		}

		if (usr) {
			payload.members[usr.id] = usr.toJSON();
			payload.members[usr.id].user = usr.user.toJSON();
		}
	}

	if (settings.fullResolveMaps) {
		settings.fullResolveMaps.forEach(collection => {
			const rawCollection = guild[collection];
			if (rawCollection && rawCollection.toJSON) payload[collection] = rawCollection.toJSON();
		});
	}

	return respond({ target: guild.id, err: null, result: payload });
};

class GetGuild {
	constructor (client, target) {
		this.client = client;
		this.target = target;
		this._fetchedCollections = [];
	}

	_send (settings) {
		if (this.client.guilds.has(this.target)) return messageHandler(this.client.guilds.get(this.target), settings, payload => payload.result);
		return this.client.IPC.send("getGuild", { target: this.target, settings }).then(msg => {
			if (msg.err && msg.err !== 404) throw msg.err;
			if (msg.err && msg.err === 404) return null;
			return msg.result;
		});
	}

	async initialize (members, mutualOnlyTo) {
		this.success = false;
		if (typeof members === "string") members = [members];
		const response = await this._send({ fullResolveMembers: members, mutualOnlyTo });
		if (response) Object.assign(this, response);
		else return;
		this.success = true;
		return this;
	}

	async fetchProperty (properties) {
		if (typeof properties === "string") properties = [properties];
		const response = await this._send({ resolve: properties, strict: true });
		if (response) Object.assign(this, response);
		return this;
	}

	async reSync () {
		const fetchedCollections = {};
		this._fetchedCollections.forEach(collection => {
			fetchedCollections[collection] = this[collection];
		});
		const response = await this._send({});
		if (response) Object.assign(this, response);
		Object.keys(fetchedCollections).forEach(collection => {
			this[collection] = fetchedCollections[collection];
			fetchedCollections[collection] = undefined;
		});
		return this;
	}

	async fetchCollection (collections) {
		if (typeof collections === "string") collections = [collections];
		const response = await this._send({ fullResolveMaps: collections, strict: true });
		if (response) {
			Object.assign(this, response);
			this._fetchedCollections = this._fetchedCollections.concat(collections);
		}
		return this;
	}

	async fetchMember (members, isQuery) {
		if (typeof members === "string" && !isQuery) members = [members];
		if (!isQuery) {
			members.forEach(member => {
				if (this.members.hasOwnProperty(member)) members.splice(members.indexOf(member), 1);
			});
		}
		const response = await this._send({ fullResolveMembers: members, strict: true });
		if (response) Object.assign(this.members, response.members);
		if (!isQuery) return this;
		else return Object.values(response.members)[0];
	}

	static getAll (client, settings) {
		return client.IPC.send("getGuild", { target: "*", settings: settings }).then(msg => {
			if (msg.err && msg.err !== 404) throw msg.err;
			if (msg.err && msg.err === 404) return null;
			return msg.result;
		});
	}
}

module.exports = {
	GetGuild,
	handler: messageHandler,
};
