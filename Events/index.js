exports.Events = keyMirror([
	"Ready",
	"MessageCreate",
]);

exports.EventFilePath = event => `./Events/${event}.js`;

function keyMirror (arr) {
	const mirror = {};
	for (const item of arr) mirror[item] = item;
	return mirror;
}
