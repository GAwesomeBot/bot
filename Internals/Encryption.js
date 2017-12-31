const { encryptionPassword } = require("../Configurations/config");
const { discord: { clientID } } = require("../Configurations/auth");
const { createCipher, createDecipher, pbkdf2Sync } = require("crypto");

const pass = new Buffer(`${clientID}:${encryptionPassword}`).toString("base64");

let password;

module.exports = class EncryptionManager {
	constructor (client) {
		this.client = client;
		client.fetchApplication().then(data => {
			password = pbkdf2Sync(pass, data.owner.id, 100000, 1024, "sha512").toString("hex");
		});
	}

	encrypt (data) {
		let cipher = createCipher("aes256", password);
		let encrypted = cipher.update(data, "utf8", "hex");
		encrypted += cipher.final("hex");
		return encrypted;
	}

	decrypt (data) {
		let decipher = createDecipher("aes256", password);
		let decrypted = decipher.update(data, "hex", "utf8");
		decrypted += decipher.final("utf8");
		return decrypted;
	}
};
