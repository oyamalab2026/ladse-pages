jQuery.noConflict();
(function($) {
	var view_outline = "";
	var targetArea = $('.article-body');
	var top_indent = 0;
	var before_indent = 0;
	$(':header', targetArea).each(function(i){
		var indent = $(this).prop("tagName").match(/h(\d+)/i);
		if (top_indent == 0 || top_indent > indent[1]) top_indent =  indent[1];
	})

	$(':header', targetArea).each(function(i){
		var text = $(this).text();
		var target_id = $(this).attr('id');
		var target_tag = $(this).prop("tagName");
		if (!target_id) target_id = "keni_toc_"+i;
		$(this).attr('id',target_id);
		var indent = target_tag.match(/h(\d+)/i);

		if (before_indent != indent[1]) {
			if (before_indent < indent[1]) {
				view_outline = view_outline + '<ol>\n';
			} else if (before_indent > indent[1]) {
				for (i = indent[1]; i < before_indent; i++) {
					view_outline = view_outline + '</ol>\n';
					view_outline = view_outline + '</li>\n';
				}
			} else {
				view_outline = view_outline + '</li>\n';
			}
		}
		view_outline = view_outline + '<li class="indent'+(indent[1] - top_indent)+'"><a href="#'+target_id+'">'+ text+'</a>';

		before_indent = indent[1];
	});

	if (view_outline != "") {
		if (targetArea.find('#keni_toc').length == 0) $('<div id="keni_toc"></div>').prependTo($('.article-body'));
		$("#keni_toc").html('<p class="keni-toc-title">■目次</p>'+view_outline);
	}
})(jQuery);