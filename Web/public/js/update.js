let finished = false;

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
		<h4 class='subtitle is-4'>
			Updating GAB will cause incoming messages and web requests to be ignored.
		</h4>
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
	`,
	cfh: `Please help us update your Configuration files by filling them in again below. You should check carefully for new additions! <strong>Don't change the new version tag.</strong>`,
	fh: `You can deselect some files you don't want to be updated.<br><strong>If you do not deselect a file, all local modifications to that file will be lost.</strong>`,
	install_c: `
		<h2 id='status-title' class='title is-2'>
			Installing configuration files...
		</h2>
		<br>
		<h5 id='status-subtitle' class='subtitle is-5'>
			Do not close this tab!
		</h5>
		<br>
	`,
	filetable: `
		<table class='table is-fullwidth'>
			<thead>
				<tr>
					<th>
						Type
					</th>
					<th>
						Filename
					</th>
					<th>
						Install
					</th>
				</tr>
			</thead>
			<tfoot></tfoot>
			<tbody id='table-body'>
			</tbody>
		</table>
	`,
	install: `
		<h2 id='status-title' class='title is-2'>
			Installing files...
		</h2>
		<br>
		<h5 id='status-subtitle' class='subtitle is-5'>
			Do not close this tab!
		</h5>
		<br>
	`,
}

const e = {
  prepare: () => {
    $('#status-title').html("Preparing for update...");
  },
  metadata: () => {
    $('#status-title').html("Fetching version metadata...");
  },
  downloading: () => {
    $('#status-title').html("Downloading latest version files...");
  },
  files_conf: socket => {
    socket.on("files_conf", (data) => {
      if (data.length > 0) {
				let updateButton = $("#continue-button");
        $('#status-title').html("Configure Update");
        $('#status-subtitle').html(t.cfh);
				let modalcm = CodeMirror.fromTextArea(document.getElementById("modal-code-area"), {
  				mode: "javascript",
  				lineWrapping: true,
  				lineNumbers: true, 
  				fixedGutter: true,
  				styleActiveLine: true,
  				theme: "monokai",
					readOnly: true,
				});
				modalcm.refresh();
				let len = data.length;
        for (let i = 0; i < len; i++) {
        	$('#content-container').append(`${data[i].file} - <a id='code-modal-show-${i}'>View original</a><div class='control'><textarea id='${data[i].file}'> ${data[i].dataNew} </textarea></div><br><br>`);
					$('#code-modal-show-'+i).click( event => {
          	showCodeModal(data[event.target.id.replace("code-modal-show-", "")].dataOld, modalcm)
          });
					
        	let cm = CodeMirror.fromTextArea(document.getElementById(data[i].file), {
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

				updateButton.html("Next")
				updateButton.removeClass('is-loading');
        updateButton.unbind();
				updateButton.click(() => {
					updateButton.addClass('is-loading');
					let files_conf = [];
					
					for (let ii = 0; ii < len; ii++) {
						let p = {
							file: data[ii].file,
							data: $(document.getElementById(data[ii].file)).next('.CodeMirror')[0].CodeMirror.getValue(),
						};
						
						files_conf.push(p);
					}
					
					updateContent(t.install_c, () => socket.emit("files_conf", files_conf));
				});
      } else {
        socket.emit("files_conf", []);
      }
    });
    socket.emit("confirm", "filesc");
  },
	files: (socket) => {
		socket.on("files", (data) => {
			let updateButton = $("#continue-button");
			updateButton.unbind();
			
			$('#status-title').html("Configure Update");
			$('#status-subtitle').html(t.fh);
			$('#content-container').append(t.filetable)

			let len = data.length;
			for (let i = 0; i < len; i++) {
				$('#table-body').append(`<tr><td><span class='tag ${extensionColorPick(data[i].split('.')[1].toUpperCase())}'>${data[i].split('.')[1].toUpperCase()}</span></td><th>${data[i]}</th><td><label class='is-medium checkbox'><input id='check-${data[i]}' type='checkbox' checked></label></td></tr>`)
			}
			updateButton.removeClass('is-loading');
			
			let files = [];
			updateButton.click(() => {
				updateButton.addClass('is-loading');
				
				for (let ii = 0; ii < len; ii++) {
					if ($(document.getElementById('check-'+data[ii])).is(":checked") === true) files.push(data[ii]);
				}
				
				socket.emit("files", files);
			})
		});
		
		socket.emit("confirm", "files");
	},
	install: () => {
		$('#content-container').html(t.install);
	},
	done: () => {
		$('#status-title').html("Finishing update...");
	},
	finished: socket => {
  	finished = true;
  	socket.close();
		$('#status-title').html("Update finished!");
		$('#status-subtitle').html("You may now restart GAB and reload this tab.");
		let updateButton = $("#continue-button");
		updateButton.html("&#92; (•◡•) /");
		updateButton.removeClass('is-loading');
		updateButton.unbind();
	} 
};

$(document).ready(function() {
	let updateButton = $("#continue-button");
	let state = 0;

  updateButton.click(() => {
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
				const post = () => $.post("/dashboard/management/version?svrid=maintainer", () => {
					const socket = io('/dashboard/management/version');

					socket.on("update", data => {
						e[data](socket);
					});
					socket.on("disconnect", () => {
						if (finished) return;
						$('#hero-container').attr('class', 'hero is-bold is-warning');
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