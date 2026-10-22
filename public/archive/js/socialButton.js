jQuery.noConflict();
(function($) {

	$('.sns-list').append('<script>(function(w,d){ var s,e = d.getElementsByTagName("script")[0], a=function(u,f){if(!d.getElementById(f)){s=d.createElement("script"); s.async=!0;s.src=u;if(f){s.id=f;}e.parentNode.insertBefore(s,e);}}; a("https://apis.google.com/js/plusone.js"); a("//b.st-hatena.com/js/bookmark_button_wo_al.js"); a("//platform.twitter.com/widgets.js","twitter-wjs"); a("//connect.facebook.net/ja_JP/sdk.js#xfbml=1&version=v2.4","facebook-jssdk"); })(this, document);<\/script>');

})(jQuery)