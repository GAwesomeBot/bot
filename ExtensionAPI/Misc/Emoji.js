const { Collection, SnowflakeUtil: Snowflake } = require("discord.js");
const Guild = require("../Guilds/Guild");
const Role = require("../Guilds/GuildRole");
let _rawEmoji;

class Emoji {
	constructor (rawEmoji) {
		/**
     * The guild this emoji is part of
     * @type {Guild}
     */
		this.guild = new Guild(rawEmoji.guild);

		/**
     * The ID of the emoji
     * @type {Snowflake}
     */
		this.id = rawEmoji.id;

		/**
     * The name of the emoji
     * @type {string}
     */
		this.name = rawEmoji.name;

		/**
     * Whether or not this emoji requires colons surrounding it
     * @type {boolean}
     */
		this.requiresColons = rawEmoji.requiresColons;

		/**
     * Whether this emoji is managed by an external service
     * @type {boolean}
     */
		this.managed = rawEmoji.managed;

		_rawEmoji = rawEmoji;
	}

	/**
   * The timestamp the emoji was created at
   * @type {number}
   * @readonly
   */
	get createdTimestamp () {
		return Snowflake.deconstruct(this.id).timestamp;
	}

	/**
   * The time the emoji was created
   * @type {Date}
   * @readonly
   */
	get createdAt () {
		return new Date(this.createdTimestamp);
	}

	/**
   * A collection of roles this emoji is active for (empty if all), mapped by role ID
   * @type {Collection<Snowflake, Role>}
   * @readonly
   */
	get roles () {
		const roles = new Collection();
		for (const role of _rawEmoji._roles) {
			if (_rawEmoji.guild.roles.has(role)) roles.set(role, new Role(_rawEmoji.guild.roles.get(role)));
		}
		return roles;
	}

	/**
   * The URL to the emoji file
   * @type {string}
   * @readonly
   */
	get url () {
		return _rawEmoji.url;
	}

	/**
   * The identifier of this emoji, used for message reactions
   * @type {string}
   * @readonly
   */
	get identifier () {
		if (this.id) return `${this.name}:${this.id}`;
		return encodeURIComponent(this.name);
	}

	edit (data, reason) {
		_rawEmoji.edit(data, reason).then(newRawEmoji => Promise.resolve(new Emoji(newRawEmoji))).catch(err => Promise.reject(err));
	}

	/**
   * Set the name of the emoji.
   * @param {string} name The new name for the emoji
   * @param {string} [reason] The reason for changing the emoji's name
   * @returns {Promise<Emoji>}
   */
	setName (name, reason) {
		this.edit({ name }, reason).then(newRawEmoji => Promise.resolve(new Emoji(newRawEmoji))).catch(err => Promise.reject(err));
	}

	/**
   * Add a role to the list of roles that can use this emoji.
   * @param {Role} role The role to add
	 * @param {string} [reason] The reason for adding the role
   * @returns {Promise<Emoji>}
   */
	addRestrictedRole (role, reason) {
		this.addRestrictedRoles([role], reason).then(newRawEmoji => Promise.resolve(new Emoji(newRawEmoji))).catch(err => Promise.reject(err));
	}

	/**
   * Add multiple roles to the list of roles that can use this emoji.
   * @param {Role[]} roles Roles to add
	 * @param {string} [reason] The reason for adding the role(s)
   * @returns {Promise<Emoji>}
   */
	addRestrictedRoles (roles, reason) {
		const newRoles = new Collection(this.roles);
		for (const role of roles) {
			if (_rawEmoji.guild.roles.has(role.id)) newRoles.set(role.id, new Role(role));
		}
		this.edit({ roles: newRoles }, reason).then(newRawEmoji => Promise.resolve(new Emoji(newRawEmoji))).catch(err => Promise.reject(err));
	}

	/**
   * Remove a role from the list of roles that can use this emoji.
   * @param {Role} role The role to remove
	 * @param {string} [reason] The reason for removing the role
   * @returns {Promise<Emoji>}
   */
	removeRestrictedRole (role, reason) {
		this.removeRestrictedRoles([role], reason).then(newRawEmoji => Promise.resolve(new Emoji(newRawEmoji))).catch(err => Promise.reject(err));
	}

	/**
   * Remove multiple roles from the list of roles that can use this emoji.
   * @param {Role[]} roles Roles to remove
	 * @param {string} [reason] The reason for removing the role(s)
   * @returns {Promise<Emoji>}
   */
	removeRestrictedRoles (roles, reason) {
		const newRoles = new Collection(this.roles);
		for (const role of roles) {
			if (newRoles.has(role.id)) newRoles.delete(role.id);
		}
		this.edit({ roles: newRoles }, reason).then(newRawEmoji => Promise.resolve(new Emoji(newRawEmoji))).catch(err => Promise.reject(err));
	}

	toString () {
		return this.requiresColons ? `<:${this.name}:${this.id}>` : this.name;
	}
}

module.exports = Emoji;
