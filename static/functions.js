$(document).ready(function(){

	//---------------------------
	// Header animation
	//---------------------------
	if ( $("#headerPanel").length ) {
		
		//Cache variables
		var headerPanel = $("#headerPanel"),
			height = headerPanel.height() - 30,
			toggler = $("#togglePanel");
			
		//Hide the header by default
		headerPanel.css({ marginTop: -height });
		toggler.addClass("closed");
		
		toggler.click(function(){
			slideHeader();
		});

		$("#header").find("a").click(function(){
			slideHeader();
			return true;
		});
		
		// Show and hide header
		function slideHeader(){
			if ( toggler.hasClass("closed") ){
				headerPanel.animate({
					marginTop: 0
				},400,"linear");
				toggler.removeClass("closed");
			}else{
				headerPanel.animate({
					marginTop: -height
				},400,"linear");
				toggler.addClass("closed");
			}
		}	
		
	}
	
});