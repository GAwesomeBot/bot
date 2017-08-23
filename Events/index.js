exports.events = keyMirror([
	"GuildCreate",
	"GuildMemberAdd",
	"MessageCreate",
	"Ready",
]);

exports.eventFilePath = event => `./Events/${event}.js`;

function keyMirror (arr) {
	const mirror = {};
	for (const item of arr) mirror[item] = item;
	return mirror;
}
