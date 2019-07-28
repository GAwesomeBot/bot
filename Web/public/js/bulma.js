window.bulma = () => {
	$("html").removeClass("is-clipped");
	const $toggle = $("#nav-toggle");
	const $menu = $("#nav-menu");

	$toggle.click(function handler () {
		$(this).toggleClass("is-active");
		$menu.slideToggle(86);
	});

	$(".modal-button").click(function handler () {
		const target = $(this).data("target");
		$("html").addClass("is-clipped");
		$(target).addClass("is-active");
	});

	$(".modal-background, .modal-close").click(function handler () {
		if ($(this).parent().attr("id") === "installer-modal") return;
		if ($(this).parent().hasClass("command-item-modal")) GAwesomeUtil.dashboard.updateCommandSettings($(this).parent(), $($(this).parent().data("target")));
		$("html").removeClass("is-clipped");
		$(this).parent().removeClass("is-active");
	});

	$(".modal-card-head .delete, .modal-card-foot .button").click(() => {
		$("html").removeClass("is-clipped");
		$("#modal-ter").removeClass("is-active");
	});

	$("[data-toggle-gfa]").click(function handler () {
		const toggleSwitch = $(this);
		const targetAddon = $(`#${toggleSwitch.data("toggle-gfa")}`);
		if (!targetAddon[0]) return;
		targetAddon.slideToggle();
	});
	$("[data-toggle-gfba]").click(function handler () {
		const toggleSwitch = $(this);
		const targetAddon = $(`#${toggleSwitch.data("toggle-gfba")}`);
		if (!targetAddon[0]) return;
		const isDisabled = targetAddon.attr("disabled");
		if (isDisabled) targetAddon.removeAttr("disabled");
		else targetAddon.attr("disabled", true);
	});

	const validateElement = (element) => {
		if (!element || !element.data("validate-form")) return true;
		const formId = element.data("validate-form");
		const form = document.getElementById(formId);

		if (!form) return true;
		else return form.reportValidity();
	};

	$("[data-select-isa]").click(function handler () {
		const installerStep = $(this);
		if (installerStep.attr("disabled") || installerStep.hasClass("is-active")) return;

		const targetAddon = $(`#${installerStep.data("select-isa")}`);
		if (!targetAddon[0]) return;

		const selectedStep = $(".installer-step.is-active");
		const selectedAddon = $(`#${selectedStep.data("select-isa")}`);
		if (!validateElement(selectedStep)) return;

		selectedAddon.slideUp();
		selectedStep.removeClass("is-active");
		targetAddon.slideDown();
		installerStep.addClass("is-active");
	});
	$(".button[data-next-is]").click(function handler () {
		const button = $(this);
		const currentStep = $(".installer-step.is-active");
		const nextStep = $(`#${button.data("next-is")}`);

		if (!nextStep[0] || !validateElement(button)) return;

		currentStep.addClass("is-success").removeClass("is-active");
		$(`#${currentStep.data("select-isa")}`).slideUp();
		nextStep.removeAttr("disabled").addClass("is-active");
		$(`#${nextStep.data("select-isa")}`).slideDown();
	});
};
