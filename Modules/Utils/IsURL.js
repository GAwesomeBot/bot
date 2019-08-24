const pattern = [
	`^(https?:\\/\\/)`,
	`((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|`,
	`((\\d{1,3}\\.){3}\\d{1,3}))`,
	`(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*`,
	`(\\?[;&a-z\\d%_.~+=-]*)?`,
	`(\\#[-a-z\\d_]*)?$`,
].join("");
const regex = new RegExp(pattern, "i");

module.exports = url => regex.test(url);
