var initial_form_state;
function saveFormState() {
	try{
		$("#builder-code-box").val(cm.getDoc().getValue());
	} catch(err) {}
	hide_update_modal = true;
	initial_form_state = $('#form').serialize();
}

$(window).bind("beforeunload", function(e) {
	var form_state = $("#form").serialize();
	if(initial_form_state!=form_state) {
		var message = "You have unsaved changes on this page. Do you want to leave this page and discard your changes or stay on this page?";
		e.returnValue = message;
		return message;
	}
});

$(window).scroll(function() {
	if($(window).scrollTop() + $(window).height() > $(document).height() - 150) {
		if($("#form-buttons").css("display")!="none") {
			$("#form-buttons").fadeOut(86);
		}
	}
});
setInterval(function() {
	if($(window).scrollTop() + $(window).height() <= $(document).height() - 150) {
		var form_state = $("#form").serialize();
		if(initial_form_state!=form_state && $("#form-buttons").css("display")=="none") {
			$("#form-buttons").fadeIn(86);
		} else if(initial_form_state==form_state && $("#form-buttons").css("display")!="none") {
			$("#form-buttons").fadeOut(86);
		}
	}
}, 1000);
