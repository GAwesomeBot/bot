/* GAwesomeBot by Gilbert - Available under the GPL V2 License - Some rights reserved - https://github.com/GilbertGobbels/GAwesomeBot */

// Namespaces
const GAwesomeData = {};
const GAwesomeUtil = {};
const GAwesomePaths = {};
const GAwesomeListeners = {};

GAwesomeData.activity = { guildData: {} };
GAwesomeData.blog = { editor: {} };
GAwesomeData.wiki = { bookmarks: JSON.parse(localStorage.getItem("wiki-bookmarks")) || [], editor: {} };
GAwesomeData.extensions = {};
GAwesomeData.timers = [];
GAwesomeData.dashboard = { servers: {} };
GAwesomeUtil.dashboard = {};

GAwesomeData.config = {
	debug: localStorage.getItem("gab:debug") || false,
};

GAwesomeData.blog.subtitles = [
	"Dolphin Musings",
	"The fault in our syntax",
	"How to go viral",
	"I wish I were a GAB",
	"A robot's memoir",
	"Why do we exist?",
	"What is love?",
	"Updating GAB; my story",
	"What did I ever do to you?",
	"BitQuote made this happen",
	"I didn't want this either",
	"The tragic story",
	"Developer Vs. Bot",
	"What did we mess up today?",
	"Where are your fingers?",
	"Beautiful Duwang",
	"Nominated for best GAB-related blog",
	"Add to bookmarks, but only if you want to",
	"New posts every randomized time period!",
	"It's like free education",
	"These really aren't funny",
];

GAwesomeData.extensions.html = {
	start: {
		"#installer-title": "Installing $EXTNAME",
		"#installer-subtitle": "Extension Information",
	},
	config: {
		global: () => {
			GAwesomeData.extensions.state.data.server = GAwesomeData.extensions.servers.find(svr => svr.id === $("#installer-serverSelect").val());
			$("#installer-selector").hide();
		},
		"#installer-continue": () => `
				Next &nbsp;
				<span class="icon is-small">
					<i class="fa fa-arrow-right"></i>
				</span>
			`,
		"#installer-subtitle": () => "Extension Configuration",
		"#installer-content": () => {
			let info = `
				<div class="box has-text-left">
				<h4 class="subtitle is-4">
					Options for <strong>${GAwesomeData.extensions.state.extension.name}</strong>
				</h4>
				`;
			if (["keyword", "command"].includes(GAwesomeData.extensions.state.extension.type)) {
				info += `
				<div class="field">
					<label class="label">Permissions</label>
					<div class="control">
						<span class="select is-primary">
							<select name="installer-adminLevel">
								<option value="0" selected>@everyone</option>
								<option value="1">Admin level &ge;1</option>
								<option value="2">Admin level &ge;2</option>
								<option value="3">Admin level &ge;3</option>
							</select>
						</span>
					</div>
					<span class="help">The extension will only respond to members that have the selected bot admin level (or higher).</span>
				</div>`;
			}
			info += `
				<div class="field">
					<label class="label">Channel(s)</label>
				`;
			$.get(`/api/servers/${GAwesomeData.extensions.state.data.server.id}/channels`, data => {
				const channels = Object.values(data).filter(ch => ch.type === "text").sort((a, b) => a.rawPosition - b.rawPosition);
				channels.forEach(ch => {
					info += `
						<label class="checkbox">
						<input name="installer-disabled_channel_ids-${ch.id}" class="installer-disabled_channel_ids" type="checkbox">
							#${ch.name}
						</label>
						<br>`;
				});
				info += `
				</div>
				<div class="field">
					<div class="control has-addons">
						<a class="button is-small" onclick="GAwesomeUtil.toggleChannels('installer-disabled_channel_ids', true);">
							<span>Select All</span>
						</a>
						<a class="button is-small" onclick="GAwesomeUtil.toggleChannels('installer-disabled_channel_ids', false);">
							<span>Deselect All</span>
						</a>
					</div>
					<span class="help">The extension will run only in these channels.</span>
				</div></div>`;
				$("#installer-content").html(info);
			});
		},
	},
	confirm: {
		"#installer-continue": () => "Install",
		"#installer-subtitle": () => "Confirmation",
	},
};

GAwesomeUtil.setInterval = (...args) => {
	const timer = setInterval(...args);
	GAwesomeData.timers.push(timer);
	return timer;
};

GAwesomeUtil.reload = () => window.location.reload(true);
GAwesomeUtil.refresh = () => Turbolinks.visit("");
GAwesomeUtil.snapshot = tagName => {
	const tag = document.getElementsByTagName(tagName)[0];
	if (!Turbolinks || !Turbolinks.controller) return;
	const cache = Turbolinks.controller.cache.snapshots;
	if (tag && cache && cache[window.location.href]) cache[window.location.href][tagName] = tag.cloneNode(true);
	return cache[window.location.href];
};

GAwesomeUtil.log = (msg, level, force) => {
	if (!GAwesomeData.config.debug && !force) return;
	if (!msg || typeof msg !== "string" || (level && !["log", "warn", "error"].includes(level))) return console.warn("[GAwesomeBot] [WARN] Invalid Arguments for log()");
	console[level || "log"](`[GAwesomeBot] [${level === "log" || !level ? "DEBUG" : level.toUpperCase()}] ${msg}`);
};
GAwesomeUtil.error = msg => GAwesomeUtil.log(msg, "error", true);
GAwesomeUtil.warn = msg => GAwesomeUtil.log(msg, "warn", true);

GAwesomeUtil.debugDump = () => {
	GAwesomeUtil.log("[DUMP:INFO] Pass this information to a GAB Support Member and they will assist you further!", "log", true);
	const { dashboard: { socket }, builder } = GAwesomeData;
	if (GAwesomeData.dashboard.socket) GAwesomeData.dashboard.socket = {};
	if (GAwesomeData.builder) GAwesomeData.builder = {};
	GAwesomeUtil.log(`[DUMP:APPDATA] ${JSON.stringify(GAwesomeData)}`, "log", true);
	GAwesomeData.dashboard.socket = socket;
	GAwesomeData.builder = builder;
	GAwesomeUtil.log(`[DUMP:SESSIONDATA] ${JSON.stringify(localStorage)}`, "log", true);
	GAwesomeUtil.log(`[DUMP:LIBDATA] ${JSON.stringify({
		tl: typeof Turbolinks !== "undefined", io: typeof io !== "undefined", np: typeof NProgress !== "undefined", fs: typeof saveAs !== "undefined",
		sa: typeof swal !== "undefined", ac: typeof AutoComplete !== "undefined", cm: typeof CodeMirror !== "undefined", md: typeof md5 !== "undefined",
	})}`, "log", true);
};

GAwesomeUtil.toggleAds = value => {
	document.cookie = `adsPreference=${value !== "true"}; path=/`;
	GAwesomeUtil.refresh();
};

GAwesomeUtil.SFS = () => {
	try {
		// Save builder code if it exists
		$("#builder-code-box").val(cm.getDoc().getValue());
	} catch (err) {
		// No-op
	}
	// Set form state to current serialized form
	GAwesomeData.IFS = $("#form").serialize();
	GAwesomeData.HUM = true;
	// Reset save button
	$("#form-submit span:nth-child(2)").html("Save");
	// Update Turbolinks snapshots
	GAwesomeUtil.snapshot("body");
};

GAwesomeUtil.submitForm = () => {
	$("#form-submit").addClass("is-loading");
	GAwesomeData.HUM = true;
	if (GAwesomeData.builders) Object.values(GAwesomeData.builders).forEach(a => a.save());
	$.ajax({
		method: "POST",
		url: location.pathname + location.search,
		data: $("#form").serialize(),
	})
		.always((data) => {
			GAwesomeUtil.SFS();
			const form = $("#form-submit");
			form.removeClass("is-loading");
			if (data !== "OK" && data.status !== 200 && data.status !== 302) {
				GAwesomeUtil.log(`Failed to save dashboard settings. Server returned status ${data.status}.`, "error");
				form.find("span:nth-child(1)").html("<i class='fa fa-exclamation'></i>");
				form.find("span:nth-child(2)").html("Error");
			} else {
				form.find("span:nth-child(2)").html("Saved");
			}

			$(".menu-modifier").each((index, modifier) => {
				modifier = $(modifier);
				const tag = $(modifier.data("modifies"));
				if (modifier.is(":checked")) tag.removeClass("is-hidden");
				else tag.addClass("is-hidden");
			});
		});
};

GAwesomeUtil.setUserAutocomplete = svrid => {
	const loadAutoComplete = data => new AutoComplete({
		selector: ".user-autocomplete",
		minChars: 2,
		source: (query, res) => {
			query = query.toLowerCase();
			res(data.filter((a) => a.toLowerCase().includes(query)));
		},
	});

	const cachedData = GAwesomeUtil.dashboard.getCache(svrid, "userlist");
	if (cachedData) return loadAutoComplete(cachedData);

	$.getJSON(`/api/list/users${svrid ? `?svrid=${svrid}` : ""}`, data => {
		loadAutoComplete(data);
		GAwesomeUtil.dashboard.setCache(svrid, "userlist", data);
	});
};

GAwesomeUtil.updateHeader = () => {
	const currentNavItem = $(`#nav-${window.location.pathname.split("/")[1]}`);
	if (currentNavItem) {
		currentNavItem.addClass("is-tab");
	}
};

GAwesomeUtil.toggleChannels = (classname, value) => {
	const elements = document.getElementsByClassName(classname);
	const len = elements.length;
	for (let i = 0; i < len; i++) {
		elements[i].checked = value;
	}
};

GAwesomeUtil.scrollToTop = div => {
	$("html, body").animate({ scrollTop: div ? div.offset().top : 0 }, 172);
};

GAwesomeUtil.switchActivityLayout = type => {
	if (!type) {
		type = localStorage.getItem("servers-layout");
		if (!type) {
			localStorage.setItem("servers-layout", "grid");
			type = localStorage.getItem("servers-layout");
		}
	} else {
		localStorage.setItem("servers-layout", type);
	}
	switch (type) {
		case "grid":
			$("#grid-layout-button").addClass("is-primary");
			$("#list-layout").addClass("is-hidden");
			$("#grid-layout").removeClass("is-hidden");
			$("#list-layout-button").removeClass("is-primary");
			break;
		case "list":
			$("#list-layout-button").addClass("is-primary");
			$("#list-layout").removeClass("is-hidden");
			$("#grid-layout-button").removeClass("is-primary");
			$("#grid-layout").addClass("is-hidden");
			break;
	}
};

GAwesomeUtil.activityBanGuild = svrid => {
	if (confirm("Are you sure you want to remove this guild from the activity page? It will no longer be visible on this page.")) {
		$.post("/dashboard/maintainer/servers/server-list", { removeFromActivity: svrid }).done(() => {
			const cardContent = $(`#cardContent-${svrid}`);
			GAwesomeData.activity.guildData[svrid] = cardContent.html();
			cardContent.html(`
				<a class="has-text-centered is-4" href="javascript:GAwesomeUtil.activityUnbanGuild('${svrid}')">
    			<span class="icon">
        		<i class="fa fa-refresh"></i>
    			</span>
    			Undo ban
				</a>
			`);
			cardContent.addClass("has-text-centered");
		});
	}
};

GAwesomeUtil.activityUnbanGuild = svrid => {
	$.post("/dashboard/maintainer/servers/server-list", { unbanFromActivity: svrid }).done(() => {
		const cardContent = $(`#cardContent-${svrid}`);
		cardContent.removeClass("has-text-centered");
		cardContent.html(GAwesomeData.activity.guildData[svrid]);
	});
};

GAwesomeUtil.activityViewportUpdate = mq => {
	if (window.location.pathname.split("/")[1] !== "activity" && window.location.pathname.split("/")[1] !== "extensions") return;
	if (mq.matches) {
		$(".header-search-box").removeClass("is-large");
		document.getElementById("frame").style.paddingLeft = "15px";
		document.getElementById("frame").style.paddingRight = "15px";
		if (window.location.pathname !== "/activity/users") {
			GAwesomeUtil.switchActivityLayout("list");
		}
	} else {
		$(".header-search-box").addClass("is-large");
		document.getElementById("frame").style.paddingLeft = "0px";
		document.getElementById("frame").style.paddingRight = "0px";
	}
};

GAwesomeUtil.uploadContent = (uploads, type) => {
	if (uploads) {
		const reader = new FileReader();
		reader.onload = (event) => {
			GAwesomeData[type].editor.value(event.target.result);
		};
		reader.readAsText(uploads[0]);
		document.getElementById("composer-content-upload").value = null;
	}
};

GAwesomeUtil.uploadCode = uploads => {
	if (uploads) {
		const reader = new FileReader();
		reader.onload = (event) => {
			GAwesomeData.builder.getDoc().setValue(event.target.result);
		};
		reader.readAsText(uploads[0]);
		document.getElementById("builder-code-upload").value = null;
	}
};

GAwesomeUtil.downloadContent = () => {
	const blob = new Blob([document.getElementById("composer-content").value], { type: "text/markdown;charset=utf-8" });
	saveAs(blob, `${document.getElementById("composer-title").value || "Untitled"}.md`);
};

GAwesomeUtil.downloadCode = fileName => {
	const blob = new Blob([GAwesomeData.builder.getValue()], { type: "text/markdown;charset=utf-8" });
	saveAs(blob, `${fileName || document.getElementById("builder-title").value || "Untitled"}.gabext`);
};

GAwesomeUtil.loadSource = (extid, extv, extname) => {
	if (!GAwesomeData.extensions.source) GAwesomeData.extensions.source = {};
	if (!GAwesomeData.extensions.source[extid]) {
		return $.get(`/extensions/${extid}?v=${extv}`, code => {
			GAwesomeData.extensions.source[extid] = code;
			return GAwesomeUtil.showSource(extid, extv, extname, code);
		}, "text");
	} else {
		return GAwesomeUtil.showSource(extid, extv, extname, GAwesomeData.extensions.source[extid]);
	}
};

GAwesomeUtil.showSource = (extid, extv, extname, code) => {
	$("#extension-source-download").attr({
		href: `/extensions/${extid}?v=${extv}`,
		download: `${extname}.gabext`,
	});
	$("#extension-source-name").html(extname);
	if (!GAwesomeData.builder || !document.body.contains(GAwesomeData.builder.getTextArea())) {
		GAwesomeData.builder = CodeMirror.fromTextArea(document.getElementById("extension-source-viewer"), {
			mode: "javascript",
			lineWrapping: true,
			lineNumbers: true,
			fixedGutter: true,
			styleActiveLine: true,
			readOnly: true,
			theme: "monokai",
		});
	}
	GAwesomeData.builder.setValue(code);
	$("html").addClass("is-clipped");
	$("#extension-source-modal").addClass("is-active");
	setImmediate(() => GAwesomeData.builder.refresh());
};

GAwesomeUtil.searchWiki = query => {
	Turbolinks.visit(`/wiki?q=${encodeURIComponent(query)}`);
};

GAwesomeUtil.getBookmarkLink = id => `${window.location.pathname.split("/").slice(-1)[0]}#${id}`;

GAwesomeUtil.bookmarkWikiSection = elem => {
	const link = GAwesomeUtil.getBookmarkLink(elem.parentNode.id);
	if (GAwesomeData.wiki.bookmarks.indexOf(link) > -1) {
		GAwesomeData.wiki.bookmarks.splice(GAwesomeData.wiki.bookmarks.indexOf(link), 1);
	} else {
		GAwesomeData.wiki.bookmarks.push(link);
	}
	localStorage.setItem("wiki-bookmarks", JSON.stringify(GAwesomeData.wiki.bookmarks));

	$(elem).toggleClass("is-dark is-text");
	GAwesomeUtil.populateWikiBookmarks();
};

GAwesomeUtil.populateWikiSections = () => {
	let subMenu = "<ul>";
	const pageSections = document.getElementById("frame").querySelectorAll("h1, h2, h3");
	for (let i = 0; i < pageSections.length; i++) {
		if (i > 0 && pageSections[i].tagName !== "H3" && pageSections[i - 1] && pageSections[i - 1].tagName === "H3") {
			subMenu += "</ul>";
		}
		subMenu += "<li>";
		if (pageSections[i].tagName === "H3" && ((i > 0 && pageSections[i - 1] && pageSections[i - 1].tagName !== "H3") || i === 0)) {
			subMenu += "<ul>";
		}
		subMenu += `<a class='heading-shortcut-link' href='#${pageSections[i].id}' data-turbolinks='false'>${pageSections[i].innerHTML}</a></li>`;

		// eslint-disable-next-line max-len
		pageSections[i].innerHTML += `&nbsp;<a class='button is-text ${pageSections[i].tagName === "H3" ? "is-small" : ""} heading-shortcut-link' style='text-decoration:none;' href='#${pageSections[i].id}' data-turbolinks='false'><i class='fa fa-link'></i></a>&nbsp;<a class='button ${GAwesomeData.wiki.bookmarks.indexOf(GAwesomeUtil.getBookmarkLink(pageSections[i].id)) > -1 ? "is-dark" : "is-text"} ${pageSections[i].tagName === "H3" ? "is-small" : ""}' style='text-decoration:none;' onclick='GAwesomeUtil.bookmarkWikiSection(this);'><i class='fa fa-bookmark'></i></a>`;
	}
	subMenu += "</ul>";
	if (pageSections[pageSections.length - 1] && pageSections[pageSections.length - 1].tagName === "H3") {
		subMenu += "</ul>";
	}
	$("#submenu").html(subMenu);
	$("table").addClass("table");

	$(".heading-shortcut-link").click(function handler () {
		$("html, body").animate({
			scrollTop: $(`#${this.href.substring(this.href.lastIndexOf("#") + 1)}`).offset().top,
		}, 172);
	});
};

GAwesomeUtil.populateWikiBookmarks = () => {
	if (GAwesomeData.wiki.bookmarks.length > 0) {
		$("#bookmarks-menu").removeClass("is-hidden");
		$("#menu-spacer").removeClass("is-hidden");

		GAwesomeData.wiki.bookmarks = GAwesomeData.wiki.bookmarks.sort();
		let subMenu = "<ul>";
		for (let i = 0; i < GAwesomeData.wiki.bookmarks.length; i++) {
			subMenu += `<li><a href='${GAwesomeData.wiki.bookmarks[i]}' data-turbolinks='false'>${decodeURI(GAwesomeData.wiki.bookmarks[i]).replace("#", " &raquo; ")}</a></li>`;
		}
		subMenu += "</ul>";

		$("#bookmarks-submenu").html(subMenu);
	} else {
		$("#bookmarks-menu").addClass("is-hidden");
		$("#menu-spacer").addClass("is-hidden");
	}
};

GAwesomeUtil.isLoading = elem => $(elem).addClass("is-loading");
GAwesomeUtil.isFinished = elem => $(elem).removeClass("is-loading");

GAwesomeUtil.publishExtension = extid => {
	if (confirm("Are you sure you want to publish this extension? Everyone will be able to view and use this extension!")) {
		NProgress.start();
		$(`#publish-${extid}`).remove();
		$.ajax({
			type: "POST",
			url: `/extensions/${extid}/publish`,
			data: {},
		})
			.always(() => {
				NProgress.done();
				NProgress.remove();
			});
	}
};

GAwesomeUtil.deleteExtension = (extid, divid) => {
	if (confirm("Are you sure you want to delete this extension? This action is irreversible!")) {
		NProgress.start();
		$.ajax({
			type: "POST",
			url: `/extensions/${extid}/delete`,
			data: {},
		})
			.always(() => {
				if (!divid) {
					$(`#delete-${extid}`).parent().parent()
						.remove();
				} else {
					GAwesomeUtil.removeElement($(`#${divid}`), null, null);
				}
				NProgress.done();
				NProgress.remove();
			});
	}
};

GAwesomeUtil.saveExtension = (isGallery, URL) => {
	NProgress.start();
	GAwesomeData.HUM = true;
	const extensionData = $("#form").serializeArray();
	extensionData.find(a => a.name === "code").value = GAwesomeData.builder.getValue();
	$.ajax({
		method: "POST",
		url: isGallery ? URL : window.location.pathname + window.location.search,
		data: extensionData,
	})
		.always((data) => {
			const form = $("#form-submit");
			NProgress.done();
			NProgress.remove();
			GAwesomeUtil.SFS();
			if (data !== "OK" && data.status !== 200 && data.status !== 302) {
				form.find("span:nth-child(1)").html("<i class='fa fa-exclamation'></i>");
				form.find("span:nth-child(2)").html("Error");
			} else if (isGallery) {
				Turbolinks.visit("/extensions/my");
			} else {
				Turbolinks.visit(URL);
			}
		});
};

GAwesomeUtil.voteExtension = extid => {
	const voteButton = $(`#vote-${extid}`);
	const vote = voteButton.html().trim();
	voteButton.html(vote === "-1" ? "+1" : "-1");
	$.post(`/extensions/${extid}/upvote`);
	const pointCounter = $(`#points-${extid}`);
	pointCounter.html(vote === "-1" ? Number(pointCounter.html()) - 1 : Number(pointCounter.html()) + 1);
};

GAwesomeUtil.unpublishExtension = extid => {
	if (!confirm("Are you sure you want to unpublish this extension? It will no longer be usable or visible by guilds, points are preserved.")) return;
	NProgress.start();
	const card = $(`#card-${extid}`);
	$.post(`/extensions/${extid}/unpublish`);
	card.remove();
	NProgress.done();
	NProgress.remove();
};

GAwesomeUtil.rejectExtension = extid => {
	let reason = prompt("Reason to reject:");
	if (reason === "") reason = "No reason given.";
	else if (reason === null) return;
	NProgress.start();
	$.ajax({
		method: "POST",
		url: `/extensions/${extid}/reject`,
		data: { reason },
	})
		.done(() => {
			$(`#card-${extid}`).remove();
			NProgress.done();
			NProgress.remove();
		});
};

GAwesomeUtil.removeExtension = extid => {
	let reason = prompt("Reason to remove:");
	if (reason === "") reason = "No reason given.";
	else if (reason === null) return;
	NProgress.start();
	$.ajax({
		method: "POST",
		url: `/extensions/${extid}/remove`,
		data: { reason },
	})
		.done(() => {
			$(`#card-${extid}`).remove();
			NProgress.done();
			NProgress.remove();
		});
};

GAwesomeUtil.acceptExtension = extid => {
	NProgress.start();
	$.post(`/extensions/${extid}/accept`).done(() => {
		NProgress.done();
		NProgress.remove();
		Turbolinks.visit("/extensions/gallery");
	});
};

GAwesomeUtil.featureExtension = extid => {
	const featureButton = $(`#feature-${extid}`);
	const featured = featureButton.html().trim() !== "Feature";
	featureButton.html(featured ? "Feature" : "Unfeature");
	$.post(`/extensions/${extid}/feature`);
	const featuredTag = $(`#featured-${extid}`);
	featuredTag.html(featured ? "" : "<span class=\"tag is-primary\">Featured</span>&nbsp;");
};

GAwesomeUtil.openExtensionInstaller = (extid, v, svrid) => {
	GAwesomeUtil.log("Launching extension installer in window");
	const width = window.screen.width - 600;
	const height = window.screen.height - 800;
	GAwesomeData.extensions.window = window.open(`/extensions/${extid}/install?v=${v}${svrid ? `&svrid=${svrid}&update=true` : ""}`, "GAB Extension Installer",
		`height=800,width=600,left=${width / 2},top=${height / 2}`);
	GAwesomeData.extensions.window.focus();
};

GAwesomeUtil.installExtension = ({ target }) => {
	GAwesomeUtil.log("[INSTALLER] Start install");

	const searchParams = new URLSearchParams(window.location.search);

	const button = $(target);
	button.addClass("is-loading");

	const data = `${$(".installer-step-form").serialize()}&v=${searchParams.get("v")}`;

	GAwesomeUtil.log(`[INSTALLER] Send POST with form data '${data}'`);
	$.ajax({
		method: "POST",
		url: `/dashboard/${searchParams.get("svrid")}/other/extensions`,
		data,
	}).always(res => {
		if (res !== "OK" && res.status !== 200) {
			GAwesomeUtil.log(`[INSTALLER] Received non-OK status code from POST request. Response Code: ${res.status}`, "error");
			swal("Failed to install extension.", "Contact support or try again later.", "error").then(() => button.removeClass("is-loading")).catch();
		} else {
			GAwesomeUtil.log("[INSTALLER] POST request successful.");
			button.removeClass("is-loading");
			swal("Successfully installed extension!", "You can now close this window.", "success").then(() => window.close()).catch();
		}
	});
};

GAwesomeUtil.updateExtension = (button) => {
	GAwesomeUtil.SFS();
	NProgress.start();
	button.addClass("is-loading");
	const extid = button.data("extid");

	const data = `${$(`#extension-update-form-${extid}`).serialize()}`;

	$.ajax({
		method: "POST",
		url: window.location.pathname,
		data,
	}).always(res => {
		NProgress.done();
		if (res !== "OK" && res.status !== 200) {
			swal("Failed to update extension.", "Contact support or try again later.", "error").then(() => button.removeClass("is-loading")).catch();
		} else {
			button.removeClass("is-loading");
		}
	});
};

GAwesomeUtil.uninstallExtension = extid => {
	NProgress.start();
	const element = $(`#extension-${extid}`);
	const URL = `${window.location.pathname}/${extid}`;
	GAwesomeUtil.removeElement(element, null, URL);
};

GAwesomePaths.extensions = () => {
	if (window.location.pathname === "/extensions/builder") {
		setTimeout(() => GAwesomeUtil.SFS(), 0);
		GAwesomeData.builder = CodeMirror.fromTextArea(document.getElementById("builder-code-box"), {
			mode: "javascript",
			lineWrapping: true,
			lineNumbers: true,
			fixedGutter: true,
			styleActiveLine: true,
			theme: "monokai",
		});
		GAwesomeData.builder.refresh();
	} else if (window.location.pathname.endsWith("/install")) {
		$("#installer-submit").click(GAwesomeUtil.installExtension);
	}
};

GAwesomeUtil.updateBlogSubtitle = () => {
	const headerSubtitle = $("#blog-header-subtitle");
	const newSubtitle = GAwesomeData.blog.subtitles[Math.floor(Math.random() * GAwesomeData.blog.subtitles.length)];
	headerSubtitle.fadeOut({ duration: 500 }).queue(next => {
		headerSubtitle.html(newSubtitle);
		next();
	}).fadeIn({ duration: 500 });
};

GAwesomeUtil.dashboardWrapper = func => {
	if (window.location.pathname.split("/")[1] !== "dashboard") {
		return "This function can only be executed within the dashboard.";
	} else {
		return func();
	}
};

GAwesomeUtil.dashboard.connect = () => GAwesomeUtil.dashboardWrapper(() => {
	if (GAwesomeData.dashboard.socket) {
		GAwesomeUtil.log("Closing stale Dashboard socket");
		GAwesomeData.dashboard.socket.close();
	}
	GAwesomeUtil.log("Opening new Dashboard socket");
	GAwesomeData.dashboard.socket = io(window.location.pathname, { transports: ["websocket"] });
	GAwesomeData.dashboard.socket.on("update", data => {
		GAwesomeUtil.log(`Received Socket data: ${JSON.stringify(data)}`);
		if (!GAwesomeData.HUM && GAwesomeData.dashboard.svrid === data.location && localStorage.getItem("dashboardUpdates") !== "none") {
			$("html").addClass("is-clipped");
			$("#update-modal").addClass("is-active");
		}
	});
	GAwesomeData.dashboard.socket.on("err", data => {
		GAwesomeUtil[data.fatal ? "error" : "warn"](`Dashboard Socket responded with a ${data.error} error code.`);
	});
	GAwesomeData.dashboard.socket.on("logs", data => {
		const line = `[${data.timestamp}] [${data.level}] ${data.message}`;
		GAwesomeData.dashboard.terminal.print(line);
		$(".Terminal").animate({ scrollTop: $(".Terminal").prop("scrollHeight") }, 500);
	});
});

GAwesomeUtil.dashboard.setCache = (svr, key, data, expire = 300) => {
	if (!GAwesomeData.cache) GAwesomeData.cache = new Map();
	if (!GAwesomeData.cache.has(svr)) GAwesomeData.cache.set(svr, new Map());
	GAwesomeData.cache.get(svr).set(key, { data, expireAt: Math.floor(Date.now() / 1000) + expire });
};

GAwesomeUtil.dashboard.getCache = (svr, key) => {
	if (!GAwesomeData.cache || !GAwesomeData.cache.has(svr) || !GAwesomeData.cache.get(svr).has(key)) return undefined;
	const cache = GAwesomeData.cache.get(svr).get(key);
	if (cache.expireAt < Math.floor(Date.now() / 1000)) {
		GAwesomeData.cache.get(svr).delete(key);
		return undefined;
	}
	return cache.data;
};

GAwesomeUtil.removeElement = (element, parent, url) => {
	const afterDelete = () => {
		element.fadeOut(400, () => {
			const onlyChild = element.is(":only-child");
			element.remove();
			if (onlyChild) {
				if (parent) parent.addClass("is-hidden");
				$(".no-elements-message").removeClass("is-hidden");
			}
			GAwesomeUtil.SFS();
			NProgress.done();
			NProgress.remove();
		});
	};

	if (url) {
		$.ajax({
			url,
			method: "DELETE",
		}).always(afterDelete);
	} else {
		afterDelete();
	}
};

GAwesomeUtil.dashboard.removeTableElement = elem => GAwesomeUtil.dashboardWrapper(() => {
	const button = $(elem);
	button.addClass("is-loading");

	const tableRow = button.parents("tr");
	const table = tableRow.parents("table");
	const buttonName = button.attr("name");

	GAwesomeUtil.removeElement(tableRow, table, `${window.location.pathname}/${buttonName}`);
});

GAwesomeUtil.dashboard.updateCommandSettings = (modal, settingsBox) => {
	// eslint-disable-next-line max-len
	const generateStr = (adminLevel, channelCount, totalChannelCount) => `${adminLevel === 0 ? channelCount === 0 ? "Dis" : "En" : `Admin level &ge;${adminLevel}${channelCount === 0 ? ", dis" : ", en"}`}abled in ${channelCount - totalChannelCount === 0 || channelCount === 0 ? "all" : channelCount} channel${channelCount - totalChannelCount === 0 || channelCount !== 1 ? "s" : ""}`;

	const inputs = modal.find(":input");
	const data = inputs.serializeArray();
	const channelCount = data.filter(input => input.name.match(/.*-disabled_channel_ids-.*/)).length;
	const totalChannelCount = inputs.filter((i, input) => $(input).attr("name").match(/.*-disabled_channel_ids-.*/)).length;
	const adminLevel = Number(data.filter(input => input.name.endsWith("-adminLevel"))[0].value);
	const overview = generateStr(adminLevel, channelCount, totalChannelCount);
	settingsBox.html(overview);
};

GAwesomeUtil.dashboard.validateForm = () => GAwesomeUtil.dashboardWrapper(() => {
	const form = $("#form")[0];
	if (!form) return true;
	return form.reportValidity();
});

GAwesomeUtil.dashboard.newRSSFeed = () => GAwesomeUtil.dashboardWrapper(() => {
	if (!GAwesomeUtil.dashboard.validateForm()) return;
	const newRssUrl = $("#new-rss-url").val();
	const newRssName = $("#new-rss-name").val();
	if (!newRssUrl || !newRssName) return;

	swal("RSS Feed Checking", "Before an RSS Feed can be added, it must first be checked. GAwesomeBot will check the RSS Feed to confirm that it works as expected.", {
		icon: "info",
		buttons: {
			cancel: true,
			check: {
				text: "Check",
				closeModal: false,
			},
		},
	}).then(val => {
		if (val !== "check") return false;
		GAwesomeUtil.SFS();
		return GAwesomeUtil.dashboard.post({
			"new-url": newRssUrl,
			"new-name": newRssName.toLowerCase(),
		});
	})
		.then(result => result && swal("RSS Feed successfully added.", "", "success"))
		.then(result => {
			if (!result) return;
			$("#form").submit();
			Turbolinks.visit("");
		})
		.catch(() => {
			swal("RSS Feed Check Failed", "Your RSS Feed could not be verified while checking. Please confirm the URL you supplied is a valid RSS Feed and try again.", "error");
		});
});

GAwesomeUtil.dashboard.recheckRSSFeed = name => GAwesomeUtil.dashboardWrapper(() => {
	swal("RSS Feed Re-checking", "Your RSS Feed was disabled because it couldn't be fetched and parsed. You can re-enable Streaming Updates for this RSS Feed by re-checking it.", {
		icon: "warning",
		buttons: {
			cancel: true,
			check: {
				text: "Re-check",
				closeModal: false,
			},
		},
	}).then(val => {
		if (val !== "check") return false;
		GAwesomeUtil.SFS();
		return GAwesomeUtil.dashboard.post({
			"recheck-name": name,
		});
	})
		.then(result => result && swal("RSS Feed successfully re-enabled.", "", "success"))
		.then(result => {
			if (!result) return;
			$("#form").submit();
			Turbolinks.visit("");
		})
		.catch(() => {
			swal("RSS Feed Re-check Failed", "Your RSS Feed could not be verified while checking. Please confirm the feed URL is valid and try again.", "error");
		});
});

GAwesomeUtil.dashboard.newStreamer = () => GAwesomeUtil.dashboardWrapper(() => {
	if (!GAwesomeUtil.dashboard.validateForm()) return;

	const newStreamerName = $("#new-streamer-name").val();
	const newStreamerType = $("#new-streamer-type").val();

	if (!newStreamerName || !newStreamerType) return;

	swal("Streamer Checking", "Before a new Streamer can be added, it must first be checked. GAwesomeBot will check the Streamer to confirm that they exist.", {
		icon: "info",
		buttons: {
			cancel: true,
			check: {
				text: "Check",
				closeModal: false,
			},
		},
	}).then(val => {
		if (val !== "check") return false;
		GAwesomeUtil.SFS();
		return GAwesomeUtil.dashboard.post({
			"new-name": newStreamerName,
			"new-type": newStreamerType,
		});
	})
		.then(result => result && swal("Streamer successfully added.", "", "success"))
		.then(result => {
			if (!result) return;
			$("#form").submit();
			Turbolinks.visit("");
		})
		.catch(() => {
			swal("Streamer Check Failed", "Your Streamer was not found. Please confirm the username or ID you supplied and try again.", "error");
		});
});

GAwesomeUtil.dashboard.post = payload => new Promise((resolve, reject) => {
	$.ajax({
		url: window.location.pathname,
		method: "POST",
		data: payload,
	}).success(resolve)
		.fail(reject);
});

GAwesomeUtil.dashboard.setup = {};
GAwesomeData.dashboard.setup = { step: 0, maxStep: 4 };
GAwesomeUtil.dashboard.setup.start = () => {
	GAwesomeData.dashboard.setup.step = 0;
	const buttons = $(".setup-nav-button");
	buttons.click(function clickHandler () {
		return GAwesomeUtil.dashboard.setup.nav(this);
	});
	GAwesomeUtil.dashboard.setup.nextStep(buttons);
};
GAwesomeUtil.dashboard.setup.nav = btn => {
	const direction = $(btn).data("nav");
	if (direction === "next") GAwesomeUtil.dashboard.setup.nextStep(btn);
	else if (direction === "prev") GAwesomeUtil.dashboard.setup.prevStep(btn);
};

GAwesomeUtil.dashboard.setup.nextStep = btn => {
	const { step } = GAwesomeData.dashboard.setup;

	$(".setup-nav-button[data-nav='prev']").removeAttr("disabled");
	const button = $(btn);
	button.addClass("is-loading");

	const currentStep = $(`.setup-step[data-step=${step}]`);
	const nextStep = $(`.setup-step[data-step=${step + 1}]`);

	currentStep.addClass("is-completed is-success").removeClass("is-active");
	nextStep.addClass("is-active");

	const contentBox = $(`.setup-content`);
	const currentStepContent = $(`.setup-content-item[data-step=${step}]`);
	const nextStepContent = $(`.setup-content-item[data-step=${step + 1}]`);

	GAwesomeUtil.scrollToTop($(".setup-progress"));
	contentBox.slideUp(1000, () => {
		currentStepContent.removeClass("is-active");
		nextStepContent.addClass("is-active");
		if (step + 1 === GAwesomeData.dashboard.setup.maxStep) button.html("Finish");
		if (step === GAwesomeData.dashboard.setup.maxStep) return GAwesomeUtil.dashboard.setup.save();
		setTimeout(() => {
			contentBox.slideDown(1000);
			button.removeClass("is-loading");
		}, 1000);
		GAwesomeData.dashboard.setup.step++;
	});
};

GAwesomeUtil.dashboard.setup.prevStep = btn => {
	const { step } = GAwesomeData.dashboard.setup;
	if (step < 2) return;

	$(".setup-nav-button[data-nav='next']").html("Next");
	const button = $(btn);
	button.addClass("is-loading");

	const currentStep = $(`.setup-step[data-step=${step}]`);
	const prevStep = $(`.setup-step[data-step=${step - 1}]`);

	currentStep.removeClass("is-active");
	prevStep.removeClass("is-completed is-success").addClass("is-active");

	const contentBox = $(`.setup-content`);
	const currentStepContent = $(`.setup-content-item[data-step=${step}]`);
	const prevStepContent = $(`.setup-content-item[data-step=${step - 1}]`);

	GAwesomeUtil.scrollToTop($(".setup-progress"));
	contentBox.slideUp(1000, () => {
		currentStepContent.removeClass("is-active");
		prevStepContent.addClass("is-active");
		if (step === 2) button.attr("disabled", true);
		setTimeout(() => {
			contentBox.slideDown(1000);
			button.removeClass("is-loading");
		}, 1000);
		GAwesomeData.dashboard.setup.step--;
	});
};

GAwesomeUtil.dashboard.setup.save = () => {
	const serialized = $("form").serialize();
	GAwesomeUtil.SFS();
	$.ajax({
		method: "POST",
		url: location.pathname + location.search,
		data: serialized,
	}).always(() => {
		Turbolinks.visit("./overview");
	});
};

GAwesomePaths.landing = () => {
	$(".section-shortcut-link").click(function handler () {
		$("html, body").animate({
			scrollTop: $(`#${this.href.substring(this.href.lastIndexOf("#") + 1)}`).offset().top,
		}, 172);
	});
};

GAwesomePaths.activity = () => {
	GAwesomeUtil.activityViewportUpdate(GAwesomeListeners.activityMQL);

	if (window.location.pathname === "/activity/users") {
		document.getElementById("search-button").href = "javascript:GAwesomeUtil.searchUsers(document.getElementById('search-input').value);";
		document.getElementById("search-input").onkeydown = function handler () {
			if (event.keyCode === 13) {
				GAwesomeUtil.searchUsers(this.value);
			}
		};
		$.getJSON("/api/list/users", (data) => {
			GAwesomeData.searchInputAutocomplete = new AutoComplete({
				selector: "#search-input",
				minChars: 2,
				source: (q, res) => {
					q = q.toLowerCase();
					res(data.filter((a) => a.toLowerCase().indexOf(q) > -1));
				},
			});
		});
	} else {
		GAwesomeData.activity.guildData = {};
		document.getElementById("search-button").href = "javascript:GAwesomeUtil.searchServers(document.getElementById('search-input').value);";
		document.getElementById("search-input").setAttribute("list", "servers");
		document.getElementById("search-input").onkeydown = function handler () {
			if (event.keyCode === 13) {
				GAwesomeUtil.searchServers(this.value);
			}
		};
		$.getJSON("/api/list/servers", (data) => {
			GAwesomeData.searchInputAutocomplete = new AutoComplete({
				selector: "#search-input",
				minChars: 2,
				source: (q, res) => {
					q = q.toLowerCase();
					res(data.filter((a) => a.toLowerCase().indexOf(q) > -1));
				},
			});
		});
		GAwesomeUtil.switchActivityLayout();
		GAwesomeUtil.showActivitySelections();
	}
};

GAwesomePaths.blog = () => {
	setTimeout(() => {
		GAwesomeUtil.SFS();
	}, 0);
	const headerSubtitle = $("#blog-header-subtitle");
	if (headerSubtitle[0]) {
		GAwesomeUtil.setInterval(GAwesomeUtil.updateBlogSubtitle, 60000);
	}
	if (!window.location.toString().endsWith("/compose") && !window.location.toString().endsWith("/new")) return;
	const converter = new showdown.Converter({
		tables: true,
		simplifiedAutoLink: true,
		strikethrough: true,
		tasklists: true,
		smoothLivePreview: true,
		smartIndentationFix: true,
	});
	GAwesomeData.blog.editor = new SimpleMDE({
		element: document.getElementById("composer-content"),
		forceSync: true,
		spellChecker: false,
		promptURLs: true,
		previewRender: (text) => {
			$(".editor-preview").addClass("content");
			$(".editor-preview-side").addClass("content");
			return converter.makeHtml(text);
		},
	});
};

GAwesomePaths.wiki = () => {
	setTimeout(() => {
		GAwesomeUtil.SFS();
	}, 0);
	GAwesomeData.wiki.bookmarks = JSON.parse(localStorage.getItem("wiki-bookmarks")) || [];
	GAwesomeUtil.populateWikiBookmarks();
	if (!window.location.toString().endsWith("/edit") && !window.location.toString().endsWith("/new")) return;
	const converter = new showdown.Converter({
		tables: true,
		simplifiedAutoLink: true,
		strikethrough: true,
		tasklists: true,
		smoothLivePreview: true,
		smartIndentationFix: true,
	});
	GAwesomeData.wiki.editor = new SimpleMDE({
		element: document.getElementById("composer-content"),
		forceSync: true,
		spellChecker: false,
		promptURLs: true,
		previewRender: (text) => {
			$(".editor-preview").addClass("content");
			$(".editor-preview-side").addClass("content");
			return converter.makeHtml(text);
		},
	});
};

GAwesomePaths.dashboard = () => GAwesomeUtil.dashboardWrapper(() => {
	$(".close-update-modal").unbind();
	$(".close-update-modal").click(() => {
		$("html").removeClass("is-clipped");
		$("#update-modal").removeClass("is-active");
	});
	GAwesomeUtil.dashboard.connect();
	if (window.location.pathname.endsWith("/setup")) GAwesomeUtil.dashboard.setup.start();
	const sectionPage = window.location.pathname.split("/")[4];
	switch (sectionPage) {
		case "command-options": {
			$("#ban_gif").on("blur", () => {
				if ($("#ban_gif").val() === "Default") {
					$("#default_ban_gif").hide();
					$("#ban_gif_field").removeClass("has-addons");
					return $("#ban_gif_preview").attr("src", "https://imgur.com/3QPLumg.gif");
				}
				$("#ban_gif_field").addClass("has-addons");
				$("#default_ban_gif").show();
				$("#ban_gif_preview").attr("src", $("#ban_gif").val());
			});
			break;
		}
		case "name-display": {
			const example = $("#currentExample");
			const useNickname = $("#name_display-use_nick");
			const useDiscriminator = $("#name_display-show_discriminator");
			useNickname.click(() => {
				if (useNickname.is(":checked") && GAwesomeData.nickname !== "") {
					example.text(GAwesomeData.nickname);
				} else {
					example.text(GAwesomeData.username);
				}
				if (useDiscriminator.is(":checked")) {
					example.text(`${example.text().trim()}#${GAwesomeData.discriminator}`);
				}
			});
			useDiscriminator.click(() => {
				if (useDiscriminator.is(":checked")) {
					example.text(`${example.text()}#${GAwesomeData.discriminator}`);
				} else {
					example.text(example.text().trim().slice(0, -5));
				}
			});
			break;
		}
		case "injection": {
			const elements = document.getElementsByClassName("code-box");
			GAwesomeData.builders = {};
			for (let i = 0; i < elements.length; i++) {
				const element = elements.item(i);
				GAwesomeData.builders[element.id] = CodeMirror.fromTextArea(element, {
					mode: "javascript",
					lineWrapping: true,
					lineNumbers: true,
					fixedGutter: true,
					styleActiveLine: true,
					theme: "monokai",
				});
				GAwesomeData.builders[element.id].on("change", () => GAwesomeData.builders[element.id].save());
			}
			break;
		}
		case "extension-builder": {
			GAwesomeData.builder = CodeMirror.fromTextArea(document.getElementById("builder-code-box"), {
				mode: "javascript",
				lineWrapping: true,
				lineNumbers: true,
				fixedGutter: true,
				styleActiveLine: true,
				theme: "monokai",
			});
			break;
		}
	}
});

GAwesomeListeners.activityMQL = window.matchMedia("screen and (max-width: 768px)");
GAwesomeListeners.activityMQL.addListener(GAwesomeUtil.activityViewPortUpdate);

document.addEventListener("turbolinks:load", () => {
	try {
		GAwesomeUtil.log("Start load page JS");
		// Update active navbar item
		GAwesomeUtil.updateHeader();

		// Prepare Bulma Javascript Listeners
		bulma();

		// Clear old timers
		GAwesomeData.timers.forEach((timer, index) => {
			clearTimeout(timer);
			GAwesomeData.timers.splice(index, 1);
		});

		// Initialize forms
		GAwesomeData.HUM = false;
		GAwesomeData.IFS = $("#form").serialize();

		// Close old dashboard socket if still open
		if (GAwesomeData.dashboard.socket) {
			GAwesomeUtil.log("Closing stale Dashboard socket");
			GAwesomeData.dashboard.socket.close();
			delete GAwesomeData.dashboard.socket;
		}

		// Find page function
		// eslint-disable-next-line prefer-destructuring
		GAwesomeData.section = window.location.pathname.split("/")[1];
		let func = GAwesomePaths[GAwesomeData.section];
		if (GAwesomeData.section === "") func = GAwesomePaths.landing;

		// Execute page function and finish loading bar when done
		if (func) func();
		NProgress.done(true);
		GAwesomeUtil.log(`Finished loading page using ${GAwesomeData.section !== "" ? GAwesomeData.section : "landing"} section handler`);
	} catch (err) {
		NProgress.done();
		NProgress.remove();
		GAwesomeUtil.error(`An exception occurred while trying to prepare ${location.pathname}: ${err}`);
		swal("An exception occurred.", err.toString(), "error");
	}
});

$(document).on("turbolinks:click", ({ originalEvent }) => {
	const a = document.createElement("a");
	a.href = originalEvent.data.url;
	const targetIsDashboard = a.pathname.startsWith("/dashboard") && a.pathname !== "/dashboard";
	const currentLocationIsDashboard = window.location.pathname.startsWith("/dashboard") && window.location.pathname !== "/dashboard";
	if (targetIsDashboard && currentLocationIsDashboard) NProgress.configure({ parent: "section.section.is-white" });
	else NProgress.configure({ parent: "body" });
	NProgress.start();
});

$(document).on("turbolinks:before-visit", (e) => {
	const FS = $("#form").serialize();
	if (GAwesomeData.IFS !== FS) {
		const message = "You have unsaved changes on this page. Are you sure you want to leave this page and discard your changes?";
		if (!confirm(message)) {
			e.preventDefault();
			NProgress.done();
			NProgress.remove();
		}
	}
});
$(window).bind("beforeunload", (e) => {
	const FS = $("#form").serialize();
	if (GAwesomeData.IFS !== FS) {
		const message = "You have unsaved changes on this page. Do you want to leave this page and discard your changes or stay on this page?";
		e.returnValue = message;
		return message;
	}
});

$(window).scroll(function handler () {
	if ($("#form-buttons") && $("#form-buttons").is(":visible")) {
		$("#scroll-top-button-container").css("padding-bottom", "75px");
	} else {
		$("#scroll-top-button-container").css("padding-bottom", "25px");
	}
	if ($(this).scrollTop() > 200 && $(this).scrollTop() < $(document).height() - 1200) {
		$("#scroll-top-button-container").fadeIn(86);
	} else {
		$("#scroll-top-button-container").fadeOut(86);
	}
});
$(window).scroll(() => {
	if ($(window).scrollTop() + $(window).height() > $(document).height() - 150) {
		if ($("#form-buttons").css("display") !== "none") {
			$("#form-buttons").fadeOut(86);
		}
	}
});

setInterval(() => {
	const FS = $("#form").serialize();
	if (GAwesomeData.IFS !== FS) GAwesomeData.HUM = false;
	if ($(window).scrollTop() + $(window).height() <= $(document).height() - 150) {
		if (GAwesomeData.IFS !== FS && $("#form-buttons").css("display") === "none") {
			$("#form-buttons").fadeIn(86);
		} else if (GAwesomeData.IFS === FS && $("#form-buttons").css("display") !== "none") {
			$("#form-buttons").fadeOut(86);
		}
	}
}, 1000);

/* Down here are only easter eggs, pinky promise. You'll ruin all the fun if you don't find them for yourself! */
let keys = [];
const konami = "38,38,40,40,37,39,37,39,66,65";
const dolphin = "68,69,76,73,71,72,84,69,68,32,68,79,76,80,72,73,78";
const unknown = "38c972419c82c3059933ecefee492ad2";
window.addEventListener("keydown", (e) => {
	if (e.keyCode !== 16) {
		keys.push(e.keyCode);
	}
	if (keys.toString().includes(konami)) {
		keys = [];
		document.body.innerHTML = document.body.innerHTML.replace(/GAwesomeBot/g, "TacoBot");
		document.body.innerHTML = document.body.innerHTML.split("/static/img/icon.png").join("/static/img/tinytaco.png");
		document.getElementById("header").style.backgroundImage = "url('/static/img/header-bg-taco.jpg')";
	}
	if (keys.toString().includes(dolphin)) {
		keys = [];
		$("*").contents().filter(function handler () {
			return this.nodeType === Node.TEXT_NODE && this.nodeValue.trim() !== "";
		})
			.each(function handler () {
				let info = "";
				for (let i = 0; i < this.nodeValue.length; i++) {
					info += "🐬";
				}
				this.nodeValue = info;
			});
	}
	if (md5(keys.toString()) === unknown) {
		keys = [];
		document.body.innerHTML = document.body.innerHTML.split("/GilbertGobbels/GAwesomeBot").join("/BitQuote/AwesomeBot");
		document.body.innerHTML = document.body.innerHTML.replace(/GAwesomeBot/g, "AwesomeBot Neo");
		document.body.innerHTML = document.body.innerHTML.split("/static/img/icon.png").join("/static/img/NEO.png");
		// eslint-disable-next-line max-len
		$("#footerText").html('<strong>AwesomeBot NEO</strong> by BitQuote & <a href="https://github.com/BitQuote">BitQuote</a>. Made with <a href="https://github.com/BitQuote">BitQuote</a> and <a href="https://github.com/BitQuote">BitQuote</a>. Site made with <a href="https://github.com/BitQuote">BitQuote</a> and <a href="https://github.com/BitQuote">BitQuote</a>. Artwork by <a href="https://github.com/BitQuote">BitQuote</a> and <a href="https://github.com/BitQuote">BitQuote</a>. All rights reserved by BitQuote.');
		$(".developer-card-name").html("BitQuote").attr("ondblclick", "");
		$(".developer-card-icon").attr("src", "/static/img/bitquote.png");
		$(".developer-card-role").html("(Evil) Creator, Bot Killer");
	}
}, true);
