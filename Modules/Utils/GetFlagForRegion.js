module.exports = region => {
	if (!region) {
		return ":x:";
	}
	if (region.startsWith("vip-")) {
		region = region.substring(4);
	}
	switch (region) {
		case "amsterdam":
			return ":flag_nl:";
		case "brazil":
			return ":flag_br:";
		case "frankfurt":
			return ":flag_de:";
		case "hongkong":
			return ":flag_hk:";
		case "japan":
			return ":flag_jp:";
		case "london":
			return ":flag_gb:";
		case "russia":
			return ":flag_ru:";
		case "singapore":
			return ":flag_sg:";
		case "sydney":
			return ":flag_au:";
	}
	if (region.startsWith("eu-")) {
		return ":flag_eu:";
	}
	if (region.startsWith("us-")) {
		return ":flag_us:";
	}
	return ":interrobang:";
};
