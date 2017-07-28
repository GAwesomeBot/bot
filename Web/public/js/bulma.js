jQuery(document).ready(bulma);

function bulma() {
    var $toggle = $("#nav-toggle");
    var $menu = $("#nav-menu");

    $toggle.click(function() {
        $(this).toggleClass("is-active");
        $menu.slideToggle(86);
    });

    $(".modal-button").click(function() {
        var target = $(this).data("target");
        $("html").addClass("is-clipped");
        $(target).addClass("is-active");
    });

    $(".modal-background, .modal-close").click(function() {
        $("html").removeClass("is-clipped");
        $(this).parent().removeClass("is-active");
    });

    $(".modal-card-head .delete, .modal-card-foot .button").click(function() {
        $("html").removeClass("is-clipped");
        $("#modal-ter").removeClass("is-active");
    });
}
