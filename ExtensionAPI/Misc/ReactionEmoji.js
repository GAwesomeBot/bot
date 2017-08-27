class ReactionEmoji {
	constructor (reaction, name, id) {
		/**
     * The message reaction this emoji refers to
     * @type {MessageReaction}
     */
		this.reaction = reaction;

		/**
     * The name of this reaction emoji
     * @type {string}
     */
		this.name = name;

		/**
			* The ID of this reaction emoji
			* @type {?Snowflake}
			*/
		this.id = id;
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

	/**
   * Creates the text required to form a graphical emoji on Discord.
   * @returns {string}
   */
	toString () {
		return this.id ? `<:${this.name}:${this.id}>` : this.name;
	}
}

module.exports = ReactionEmoji;
