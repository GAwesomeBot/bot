const { encryptionPassword, encryptionIv } = require("../Configurations/config");
const { discord: { clientID } } = require("../Configurations/auth");
const { createCipheriv, createDecipheriv, pbkdf2Sync } = require("crypto");

const pass = Buffer.from(`${clientID}:${encryptionPassword}`).toString("base64");

let password;

module.exports = class EncryptionManager {
	constructor (client) {
		this.client = client;
		client.fetchApplication().then(data => {
			password = pbkdf2Sync(pass, data.owner.id, 100000, 16, "sha512").toString("hex");
		}).catch();
	}

	encrypt (data) {
		const cipher = createCipheriv("aes256", password, encryptionIv);
		let encrypted = cipher.update(data, "utf8", "hex");
		encrypted += cipher.final("hex");
		return encrypted;
	}

	decrypt (data) {
		const decipher = createDecipheriv("aes256", password, encryptionIv);
		let decrypted = decipher.update(data, "hex", "utf8");
		decrypted += decipher.final("utf8");
		return decrypted;
	}
};
