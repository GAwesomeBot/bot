function submitForm() {
	$("#form-submit").addClass("is-loading");
	hide_update_modal = true;
	$.ajax({
		method: "POST",
		url: location.pathname + location.search,
		data: $("#form").serialize()
	})
		.always(function(data) {
			const form = $("#form-submit");
			form.removeClass("is-loading");
			if (data !== "OK" && data.status !== 200 && data.status !== 302) {
				form.find("span:nth-child(1)").html("<i class='fa fa-exclamation'></i>");
				form.find("span:nth-child(2)").html("Error");
			}
			else form.find("span:nth-child(2)").html("Saved");

			$(".menu-modifier").each((index, modifier) => {
				modifier = $(modifier);
				const tag = $(modifier.data("modifies"));
				if (modifier.is(":checked")) tag.removeClass("is-hidden");
				else tag.addClass("is-hidden");
			});
		});
}

$(window).bind("beforeunload", function(e) {
	const form_state = $("#form").serialize();
	if (initial_form_state !== form_state) {
		const message = "You have unsaved changes on this page. Do you want to leave this page and discard your changes or stay on this page?";
		e.returnValue = message;
		return message;
	}
});

document.addEventListener("turbolinks:before-visit", function(e) {
	const form_state = $("#form").serialize();
	if (initial_form_state !== form_state) {
		const message = "You have unsaved changes on this page. Are you sure you want to leave this page and discard your changes?";
		if (!confirm(message)) {
			e.preventDefault();
			NProgress.done();
			NProgress.remove();
		}
	}
});

$(window).scroll(function() {
	if($(window).scrollTop() + $(window).height() > $(document).height() - 150) {
		if ($("#form-buttons").css("display" ) !== "none") {
			$("#form-buttons").fadeOut(86);
		}
	}
});
setInterval(function() {
	const form_state = $("#form").serialize();
	if (initial_form_state !== form_state) hide_update_modal = false;
	if($(window).scrollTop() + $(window).height() <= $(document).height() - 150) {
		if(initial_form_state!=form_state && $("#form-buttons").css("display")=="none") {
			$("#form-buttons").fadeIn(86);
		} else if(initial_form_state==form_state && $("#form-buttons").css("display")!="none") {
			$("#form-buttons").fadeOut(86);
		}
	}
}, 1000);
