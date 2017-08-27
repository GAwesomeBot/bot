const Util = require("./Utils.js");

/**
 * A rich embed creator for you lazy people!
 * Credit to Discord.js, inspired heavily from them.
 * @param {Object} [data] Data to set in the rich embed already
 */
class Embed {
	constructor (data = {}) {
		/**
     * The type of this embed
     * @type {string}
     */
		this.type = data.type;

		/**
			* The title of this embed
			* @type {?string}
			*/
		this.title = data.title;

		/**
			* The description of this embed
			* @type {?string}
			*/
		this.description = data.description;

		/**
			* The URL of this embed
			* @type {?string}
			*/
		this.url = data.url;

		/**
			* The color of the embed
			* @type {?number}
			*/
		this.color = data.color;

		/**
			* The timestamp of this embed
			* @type {?number}
			*/
		this.timestamp = data.timestamp ? new Date(data.timestamp).getTime() : null;

		/**
			* The fields of this embed
			* @type {Object[]}
			* @property {string} name The name of this field
			* @property {string} value The value of this field
			* @property {boolean} inline If this field will be displayed inline
			*/
		this.fields = data.fields || [];

		/**
			* The thumbnail of this embed (if there is one)
			* @type {?Object}
			* @property {string} url URL for this thumbnail
			* @property {string} proxyURL ProxyURL for this thumbnail
			* @property {number} height Height of this thumbnail
			* @property {number} width Width of this thumbnail
			*/
		this.thumbnail = data.thumbnail ? {
			url: data.thumbnail.url,
			proxyURL: data.thumbnail.proxy_url,
			height: data.height,
			width: data.width,
		} : null;

		/**
			* The image of this embed, if there is one
			* @type {?Object}
			* @property {string} url URL for this image
			* @property {string} proxyURL ProxyURL for this image
			* @property {number} height Height of this image
			* @property {number} width Width of this image
			*/
		this.image = data.image ? {
			url: data.image.url,
			proxyURL: data.image.proxy_url,
			height: data.height,
			width: data.width,
		} : null;

		/**
			* The author of this embed (if there is one)
			* @type {?Object}
			* @property {string} name The name of this author
			* @property {string} url URL of this author
			* @property {string} iconURL URL of the icon for this author
			* @property {string} proxyIconURL Proxied URL of the icon for this author
			*/
		this.author = data.author ? {
			name: data.author.name,
			url: data.author.url,
			iconURL: data.author.iconURL,
			proxyIconURL: data.author.proxyIconUrl,
		} : null;

		/**
			* The footer of this embed
			* @type {?Object}
			* @property {string} text The text of this footer
			* @property {string} iconURL URL of the icon for this footer
			* @property {string} proxyIconURL Proxied URL of the icon for this footer
			*/
		this.footer = data.footer ? {
			text: data.footer.text,
			iconURL: data.footer.iconURL,
			proxyIconURL: data.footer.proxyIconURL,
		} : null;
	}

	/**
   * The date this embed was created
   * @type {?Date}
   * @readonly
   */
	get createdAt () {
		return this.timestamp ? new Date(this.timestamp) : null;
	}

	/**
   * The hexadecimal version of the embed color, with a leading hash
   * @type {string}
   * @readonly
   */
	get hexColor () {
		return this.color ? `#${this.color.toString(16).padStart(6, "0")}` : null;
	}

	/**
   * Adds a field to the embed (max 25).
   * @param {String} name The name of the field
   * @param {String} value The value of the field
   * @param {boolean} [inline=false] Set the field to display inline
   * @returns {Embed}
   */
	addField (name, value, inline = false) {
		if (this.fields.length >= 25) throw new RangeError(`You can't have more than 25 fields.`);
		name = Util.resolveString(name);
		if (!String(name) || name.length > 256) throw new RangeError(`The embed field name is invalid, or is longer than 256 characters.`);
		value = Util.resolveString(value);
		if (!String(value) || value.length > 1024) throw new RangeError(`The embed field value is invalid or is longer than 1024 characters`);
		this.fields.push({ name, value, inline });
		return this;
	}

	/**
   * Convenience function for `<Embed>.addField('\u200B', '\u200B', inline)`.
   * @param {boolean} [inline=false] Set the field to display inline
   * @returns {Embed}
   */
	addBlankField (inline = false) {
		return this.addField("\u200B", "\u200B", inline);
	}

	/**
   * Sets the file to upload alongside the embed. This file can be accessed via `attachment://fileName.extension` when
   * setting an embed image or author/footer icons. Only one file may be attached.
   * @param {Array<FileOptions>} files Files to attach
   * @returns {MessageEmbed}
   */
	attachFiles (files) {
		if (this.files) this.files = this.files.concat(files);
		else this.files = files;
		return this;
	}

	/**
   * Sets the author of this embed.
   * @param {String|Array} name The name of the author
   * @param {string} [iconURL] The icon URL of the author
   * @param {string} [url] The URL of the author
   * @returns {Embed}
   */
	setAuthor (name, iconURL, url) {
		this.author = { name: Util.resolveString(name), iconURL, url };
		return this;
	}

	/**
   * Sets the color of this embed.
   * @param {Number|String|Array} color The color of the embed
   * @returns {Embed}
   */
	setColor (color) {
		this.color = Util.resolveColor(color);
		return this;
	}

	/**
   * Sets the description of this embed.
   * @param {String|Array} description The description
   * @returns {Embed}
   */
	setDescription (description) {
		description = Util.resolveString(description);
		if (description.length > 2048) throw new RangeError(`The description is too long! It can't be longer than 2048 characters!`);
		this.description = description;
		return this;
	}

	/**
   * Sets the footer of this embed.
   * @param {String|Array} text The text of the footer
   * @param {string} [iconURL] The icon URL of the footer
   * @returns {Embed}
   */
	setFooter (text, iconURL) {
		text = Util.resolveString(text);
		if (text.length > 2048) throw new RangeError(`The footer text is too long! It can't be longer than 2048 characters!`);
		this.footer = { text, iconURL };
		return this;
	}

	/**
   * Set the image of this embed.
   * @param {string} url The URL of the image
   * @returns {Embed}
   */
	setImage (url) {
		this.image = { url };
		return this;
	}

	/**
   * Set the thumbnail of this embed.
   * @param {string} url The URL of the thumbnail
   * @returns {Embed}
   */
	setThumbnail (url) {
		this.thumbnail = { url };
		return this;
	}

	/**
   * Sets the timestamp of this embed.
   * @param {Date} [timestamp=current date] The timestamp
   * @returns {Embed}
   */
	setTimestamp (timestamp = new Date()) {
		this.timestamp = timestamp.getTime();
		return this;
	}

	/**
   * Sets the title of this embed.
   * @param {String|Array} title The title
   * @returns {Embed}
   */
	setTitle (title) {
		title = Util.resolveString(title);
		if (title.length > 256) throw new RangeError(`The embed title is too long! It can't be longer than 256 characters!`);
		this.title = title;
		return this;
	}

	 /**
   * Sets the URL of this embed.
   * @param {string} url The URL
   * @returns {Embed}
   */
	setURL (url) {
		this.url = url;
		return this;
	}

	_apiTransform () {
		return {
			title: this.title,
			description: this.description,
			url: this.url,
			timestamp: this.timestamp ? new Date(this.timestamp) : null,
			color: this.color,
			fields: this.fields,
			files: this.files,
			thumbnail: this.thumbnail,
			image: this.image,
			author: this.author ? {
				name: this.author.name,
				url: this.author.url,
				icon_url: this.author.iconURL,
			} : null,
			footer: this.footer ? {
				text: this.footer.text,
				icon_url: this.footer.iconURL,
			} : null,
		};
	}
}

module.exports = Embed;
