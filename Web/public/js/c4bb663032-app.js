/* GAwesomeBot by Gilbert - Available under the GPL V2 License - Some rights reserved - https://github.com/GilbertGobbels/GAwesomeBot */
const GAwesomeData = {};
const GAwesomeUtil = {};
const GAwesomePaths = {};

GAwesomeData.activity = { guildData: {} };
GAwesomeData.blog = { editor: {} };
GAwesomeData.wiki = { bookmarks: JSON.parse(localStorage.getItem("wiki-bookmarks")) || [], editor: {} };

GAwesomeUtil.updateHeader = () => {
	const currentNavItem = $("#nav-" + window.location.pathname.split("/")[1]);
	if(currentNavItem) {
		currentNavItem.addClass("is-tab");
	}
};

GAwesomeUtil.switchActivityLayout = type => {
	if(!type) {
		type = localStorage.getItem("servers-layout");
		if(!type) {
			localStorage.setItem("servers-layout", "grid");
			type = localStorage.getItem("servers-layout");
		}
	} else {
		localStorage.setItem("servers-layout", type);
	}
	switch(type) {
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
		$.post("/dashboard/servers/server-list?svrid=maintainer", { removeFromActivity: svrid }).done(() => {
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
	$.post("/dashboard/servers/server-list?svrid=maintainer", { unbanFromActivity: svrid }).done(() => {
		const cardContent = $(`#cardContent-${svrid}`);
		cardContent.removeClass("has-text-centered");
		cardContent.html(GAwesomeUtil.activity.guildData[svrid]);
	});
};

GAwesomeUtil.activityViewportUpdate = mq => {
	if (window.location.pathname.split("/")[1] !== "activity") return;
	if (mq.matches) {
		$(".header-search-box").removeClass("is-large");
		document.getElementById("frame").style.paddingLeft = "15px";
		document.getElementById("frame").style.paddingRight = "15px";
		if (document.getElementById("search-select").value === "servers") {
			switchLayout("list");
		}
	} else {
		$(".header-search-box").addClass("is-large");
		document.getElementById("frame").style.paddingLeft = "0px";
		document.getElementById("frame").style.paddingRight = "0px";
	}
};

GAwesomeUtil.uploadContent = (uploads, type) => {
	if(uploads) {
		const reader = new FileReader();
		reader.onload = function(event) {
			GAwesomeData[type].editor.value(event.target.result);
		};
		reader.readAsText(uploads[0]);
		document.getElementById("composer-content-upload").value = null;
	}
};

GAwesomeUtil.downloadContent = () => {
	const blob = new Blob([document.getElementById("composer-content").value], {type: "text/markdown;charset=utf-8"});
	saveAs(blob, (document.getElementById("composer-title").value || "Untitled") + ".md");
};

GAwesomeUtil.searchWiki = query => {
	Turbolinks.visit("/wiki?q=" + encodeURIComponent(query));
};

GAwesomeUtil.getBookmarkLink = id => {
	return window.location.pathname.split("/").slice(-1)[0] + "#" + id;
};

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
		if(i > 0 && pageSections[i].tagName !== "H3" && pageSections[i-1] && pageSections[i-1].tagName === "H3") {
			subMenu += "</ul>";
		}
		subMenu += "<li>";
		if (pageSections[i].tagName === "H3" && ((i > 0 && pageSections[i-1] && pageSections[i-1].tagName !== "H3") || i === 0)) {
			subMenu += "<ul>"
		}
		subMenu += "<a class='heading-shortcut-link' href='#" + pageSections[i].id + "' data-turbolinks='false'>" + pageSections[i].innerHTML + "</a></li>";

		pageSections[i].innerHTML += "&nbsp;<a class='button is-text " + (pageSections[i].tagName === "H3" ? "is-small" : "") + " heading-shortcut-link' style='text-decoration:none;' href='#" + pageSections[i].id + "' data-turbolinks='false'><i class='fa fa-link'></i></a>&nbsp;<a class='button " + (GAwesomeData.wiki.bookmarks.indexOf(GAwesomeUtil.getBookmarkLink(pageSections[i].id))>-1 ? "is-dark" : "is-text") + " " + (pageSections[i].tagName === "H3" ? "is-small" : "") + "' style='text-decoration:none;' onclick='GAwesomeUtil.bookmarkWikiSection(this);'><i class='fa fa-bookmark'></i></a>"
	}
	subMenu += "</ul>";
	if (pageSections[pageSections.length - 1] && pageSections[pageSections.length - 1].tagName === "H3") {
		subMenu += "</ul>";
	}
	$("#submenu").html(subMenu);
	$("table").addClass("table");

	$(".heading-shortcut-link").click(function() {
		$("html, body").animate({
			scrollTop: $("#" + this.href.substring(this.href.lastIndexOf("#")+1)).offset().top
		}, 172);
	});
};

GAwesomeUtil.populateWikiBookmarks = () => {
	if (GAwesomeData.wiki.bookmarks.length > 0) {
		$("#bookmarks-menu").removeClass("is-hidden");
		$("#menu-spacer").removeClass("is-hidden");

		GAwesomeData.wiki.bookmarks = GAwesomeData.wiki.bookmarks.sort();
		let subMenu = "<ul>";
		for(let i = 0; i < GAwesomeData.wiki.bookmarks.length; i++) {
			subMenu += "<li><a href='" + GAwesomeData.wiki.bookmarks[i] + "' data-turbolinks='false'>" + decodeURI(GAwesomeData.wiki.bookmarks[i]).replace("#", " &raquo; ") + "</a></li>";
		}
		subMenu += "</ul>";

		$("#bookmarks-submenu").html(subMenu);
	} else {
		$("#bookmarks-menu").addClass("is-hidden");
		$("#menu-spacer").addClass("is-hidden");
	}
};

GAwesomePaths["landing"] = () => {
	$(".section-shortcut-link").click(function() {
		$("html, body").animate({
			scrollTop: $("#" + this.href.substring(this.href.lastIndexOf("#")+1)).offset().top
		}, 172);
	});
};

GAwesomePaths["activity"] = () => {
	GAwesomeUtil.activityViewportUpdate(GAwesomeListeners.activityMQL);

	if (window.location.pathname === "/activity/users") {
		document.getElementById("search-button").href = "javascript:GAwesomeUtil.searchUsers(document.getElementById('search-input').value);";
		document.getElementById("search-input").onkeydown = function() {
			if(event.keyCode === 13) {
				GAwesomeUtil.searchUsers(this.value);
			}
		};
		$.getJSON("/userlist", function(data) {
			searchInputAutocomplete = new autoComplete({
				selector: "#search-input",
				minChars: 2,
				source: function(q, res) {
					q = q.toLowerCase();
					res(data.filter(function(a) {
						return a.toLowerCase().indexOf(q)>-1;
					}));
				}
			});
		});
	} else {
		GAwesomeData.activity.guildData = {};
		document.getElementById("search-button").href = "javascript:GAwesomeUtil.searchServers(document.getElementById('search-input').value);";
		document.getElementById("search-input").setAttribute("list", "servers");
		document.getElementById("search-input").onkeydown = function() {
			if (event.keyCode === 13) {
				GAwesomeUtil.searchServers(this.value);
			}
		};
		$.getJSON("/serverlist", function(data) {
			searchInputAutocomplete = new autoComplete({
				selector: "#search-input",
				minChars: 2,
				source: function(q, res) {
					q = q.toLowerCase();
					res(data.filter(function(a) {
						return a.toLowerCase().indexOf(q)>-1;
					}));
				}
			});
		});
		GAwesomeUtil.switchActivityLayout();
		GAwesomeUtil.showActivitySelections();
	}
};

GAwesomePaths["blog"] = () => {
	setTimeout(function() {
		saveFormState();
	}, 0);
	if (window.location.pathname !== "/blog/compose") return;
	const converter = new showdown.Converter({
		tables: true,
		simplifiedAutoLink: true,
		strikethrough: true,
		tasklists: true,
		smoothLivePreview: true,
		smartIndentationFix: true
	});
	GAwesomeData.blog.editor = new SimpleMDE({
		element: document.getElementById("composer-content"),
		forceSync: true,
		spellChecker: false,
		promptURLs: true,
		previewRender: function(text) {
			$(".editor-preview").addClass("content");
			$(".editor-preview-side").addClass("content");
			return converter.makeHtml(text);
		}
	});
};

GAwesomePaths["wiki"] = () => {
	setTimeout(function() {
		saveFormState();
	}, 0);
	GAwesomeData.wiki.bookmarks = JSON.parse(localStorage.getItem("wiki-bookmarks")) || [];
	GAwesomeUtil.populateWikiBookmarks();
	if (window.location.pathname !== "/wiki/edit") return;
	const converter = new showdown.Converter({
		tables: true,
		simplifiedAutoLink: true,
		strikethrough: true,
		tasklists: true,
		smoothLivePreview: true,
		smartIndentationFix: true
	});
	GAwesomeData.wiki.editor = new SimpleMDE({
		element: document.getElementById("composer-content"),
		forceSync: true,
		spellChecker: false,
		promptURLs: true,
		previewRender: function(text) {
			$(".editor-preview").addClass("content");
			$(".editor-preview-side").addClass("content");
			return converter.makeHtml(text);
		}
	});
};

document.addEventListener("turbolinks:load", () => {
	GAwesomeUtil.updateHeader();
	hide_update_modal = false;
	initial_form_state = $("#form").serialize();
	let func = GAwesomePaths[window.location.pathname.split("/")[1]]
	if (window.location.pathname.split("/")[1] === "") func = GAwesomePaths["landing"];
	if (func) func();
});

const GAwesomeListeners = {};

GAwesomeListeners.activityMQL = window.matchMedia("screen and (max-width: 768px)");
GAwesomeListeners.activityMQL.addListener(GAwesomeUtil.activityViewPortUpdate);
