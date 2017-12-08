/**
 * Credit to https://gist.github.com/devsnek/658baf5e5581c6deeab256d6bdd9e7bb
 */
module.exports = (type = "master") => {
	const Module = require("module");
	const { writeFile } = require("fs-nextra");
	const { join, relative: pathRelative } = require("path");

	const CACHE_NAME = `package-cache-${type}.json`;

	const defaultResolveFilename = Module._resolveFilename.bind(Module);
	const cwd = process.cwd();

	let CACHE = { files: {}, version: null };

	try {
		CACHE.version = require(join(cwd, "package.json")).version;
	} catch (_) {
		CACHE.version = require("../package.json").version;
	}

	try {
		const tmp = require(join(cwd, CACHE_NAME));
		if (CACHE.version && tmp.version && CACHE.version === tmp.version) CACHE = tmp;
	} catch (_) {
		try {
			const tmp = require(`../${CACHE_NAME}`);
			if (CACHE.version && tmp.version && CACHE.version === tmp.version) CACHE = tmp;
		} catch (__) {
		// eslint-disable-line
		}
	}

	const saveCache = () => writeFile(join(cwd, CACHE_NAME), JSON.stringify(CACHE))
		.catch(err => {
			if (err) process.emitWarning("Saving startup cache failed", "StartupCacheWarning");
		});

	const actions = [];
	actions.add = action => {
		actions.push(action);
		(function run () {
			const x = actions.shift();
			if (x) x().then(run);
		}());
	};

	const toCanonicalPath = filename => {
		const relative = pathRelative(cwd, filename);
		if (relative.indexOf("..") === 0) return null;
		return relative.replace("\\\\", "/");
	};

	const newResolveFilename = (request, parent) => {
		const key = `${toCanonicalPath(parent.id)}:${request}`;
		let canonical = CACHE.files[key];
		let filename = canonical ? join(cwd, canonical) : null;
		if (filename) return filename;

		filename = defaultResolveFilename(request, parent);
		canonical = toCanonicalPath(filename);
		if (canonical && canonical.includes("node_modules")) {
			CACHE.files[key] = canonical;
			actions.add(saveCache);
		}
		return filename;
	};

	Module._resolveFilename = newResolveFilename;
};
