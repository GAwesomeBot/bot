const ecolors = {
	EJS: "is-danger",
	HTML: "is-danger",
	JS: "is-warning",
	CSS: "is-primary",
	JSON: "is-info"
}

const t = {
	confirm: `
		<h1 class='title is-1'>
			Are you sure?
		</h1>
		<br>
		<h2 class='subtitle is-2'>
			Updating will cause GAB to ignore incoming messages and web requests.
		</h2>
		<br>
		<div class='notification is-warning is-bold'>
			<strong>Do not exit this tab or close GAB while updating!</strong>
			<br>
			Doing so may lead to your instance becoming corrupted.
		</div>
		<br>
	`,
	connecting: `
		<h2 id='status-title' class='title is-2'>
			Connecting to socket...
		</h2>
		<br>
		<h5 id='status-subtitle' class='subtitle is-5'>
			Do not close this tab!
		</h5>
		<br>
		<br>
	`,
}

const e = {
  prepare: () => {
  	console.log("ELLO ELLO M8")
		console.log($("#status-title"));
    $('#status-title').html("Preparing for update...");
  },
  metadata: () => {
    $('#status-title').html("Fetching version metadata...");
  },
  downloading: () => {
    $('#status-title').html("Downloading newest version...");
  },
  files_conf: (socket) => {
    socket.on("files_conf", (data) => {
      if (data.length > 0) {
        $('#status-title').html("Update configuration");
        $('#status-subtitle').html("Please help us update your Configuration files by filling them in again below. You should check carefully for new additions! <strong>Don't change the new version tag.</strong>");
				var modalcm = CodeMirror.fromTextArea(document.getElementById("modal-code-area"), {
  				mode: "javascript",
  				lineWrapping: true,
  				lineNumbers: true, 
  				fixedGutter: true,
  				styleActiveLine: true,
  				theme: "monokai",
					readOnly: true
				});
				modalcm.refresh()
        for (var i = 0; i < data.length; i++) {
        	$('#content-container').append(`${data[i].file} - <a id='code-modal-show-${i}'>View original</a><p class='control'><textarea id='${data[i].file}'> ${data[i].datan} </textarea></p><br><br>`);
					$('#code-modal-show-'+i).click( event => {
          	showCodeModal(data[event.target.id.replace("code-modal-show-", "")].datao, modalcm)
          });
					
        	var cm = CodeMirror.fromTextArea(document.getElementById(data[i].file), {
          	mode: "javascript",
            lineWrapping: true,
            lineNumbers: true, 
            fixedGutter: true,
            styleActiveLine: true,
            theme: "monokai"
          });
          cm.refresh();
					$('code').data(data[i].file, cm)
        }
        
				$('#start-button').html("Next")
        $('#start-button').removeClass('is-loading');
				$('#start-button').unbind();
        $('#start-button').attr('id', 'next-button');
				$('#next-button').click(() => {
					$('#next-button').addClass('is-loading')
					var files_conf = [];
					
					for (var ii = 0; ii < data.length; ii++) {
						var p = {
							file: data[ii].file,
							data: $(document.getElementById(data[ii].file)).next('.CodeMirror')[0].CodeMirror.getValue()
						};
						
						files_conf.push(p)
					}
					
					$('#content-container').html("<h2 id='status-title' class='title is-2'>Installing configuration files...</h2><br><h5 id='status-subtitle' class='subtitle is-5'>Do not close this tab!</h5><br><br>");
					
					socket.emit("files_conf", files_conf);
				})
      } else {
        socket.emit("files_conf", []);
      }
    });
    socket.emit("confirm", "filesc");
  },
	files: (socket) => {
		socket.on("files", (data) => {
			// Let's make sure the button's on the same level as us.
			$('#start-button').attr('id', 'next-button');
			$('#next-button').unbind();
			
			$('#status-title').html("Update configuration");
			$('#status-subtitle').html("You can deselect some files you don't want to be updated.<br><strong>If you do not deselect a file, all local modifications to that file will be lost.</strong>")
			$('#content-container').append(`<table class='table'><thead><tr><th>Type</th><th>Filename</th><th>Install</th></tr></thead><tfoot>Try to keep as many files as possible selected! We can not provide support to issues that have been patched.</tfoot><tbody id='table-body'></tbody>`)
			
			for (var k = 0; k < data.length; k++) {
				$('#table-body').append(`<tr><td><span class='tag ${extensionColorPick(data[k].split('.')[1].toUpperCase())}'>${data[k].split('.')[1].toUpperCase()}</span></td><th>${data[k]}</th><td><label class='is-medium checkbox'><input id='check-${data[k]}' type='checkbox' checked></label></td></tr>`)
			}
			$('#next-button').removeClass('is-loading');
			
			var cfiles = [];
			$('#next-button').click(() => {
				$('#next-button').addClass('is-loading');
				
				for (var ki = 0; ki < data.length; ki++) {
					if ($(document.getElementById('check-'+data[ki])).is(":checked") === true) {cfiles.push(data[ki])}
				}
				
				socket.emit("files", cfiles);
			})
		});
		
		socket.emit("confirm", "files");
	},
	install: () => {
		$('#content-container').html("<h2 id='status-title' class='title is-2'>Installing files...</h2><br><h5 id='status-subtitle' class='subtitle is-5'>Do not close this tab!</h5><br><br>");
	},
	done: () => {
		$('#status-title').html("Finishing update...");
	},
	finished: () => {
		$('#status-title').html("Update finished!");
		$('#status-subtitle').html("You may now restart GAB and reload this tab.");
		$('#next-button').html("&#92; (•◡•) /");
		$('#next-button').removeClass('is-loading');
		$('#next-button').unbind();
	} 
};

$(document).ready(function() {
	let updateButton = $("#moreinfo-button");
	let state = 0;

  updateButton.click(() => {
  	console.log(state);
  	switch (state) {
			case 0:
				$('#new-version-info').slideToggle(86);
				updateButton.html('Update');
				state++;
				break;
			case 1:
				updateContent(t.confirm);
				updateButton.html("Let's go!");
				state++;
				break;
			case 2:
				const post = () => $.post("/dashboard/maintainer/version?svrid=maintainer", () => {
					const socket = io('/dashboard/maintainer/version');

					socket.on("update", data => {
						console.log(data);
						e[data](socket);
					});
					socket.on("disconnect", () => {
						$('#hero-container').attr('class', 'hero is-bold is-dark');
						$('#status-title').html("Lost connection to socket!");
						$('#status-subtitle').html("This isn't good... Try restarting GAB or getting support.");
						updateButton.removeClass('is-loading').attr('disabled', '').html("ᕙ(⇀‸↼‶)ᕗ");
						socket.disconnect();
					});
					socket.emit("update", "start");
				});

				updateContent(t.connecting, post);
				updateButton.addClass('is-loading');
				state++;
				break;
		}
	});
});

function closeCodeModal () {
	$("html").removeClass("is-clipped");
	$("#config-modal").removeClass("is-active");
}

function showCodeModal (data, CMEditor) {
	CMEditor.getDoc().setValue(data);
	$("html").addClass("is-clipped");
	$("#config-modal").addClass("is-active");
}

function extensionColorPick (extension) {
	if (ecolors[extension]) {
		return ecolors[extension];
	} else {
		return 'is-dark'
	}
}

function updateContent (html, callback) {
	$("#content-container").slideToggle(300, function() {
		$(this).html(html).slideToggle(300);
		if (callback) callback();
	});
}