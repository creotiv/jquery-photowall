/*
    jQuery PhotoWall with ShowBox
    jQuery image gallery script with fullscreen mode.
    http://creotiv.github.com/jquery-photowall
    
    Copyright (C) 2012  Andrey Nikishaev(creotiv@gmail.com, http://creotiv.in.ua)

    Permission is hereby granted, free of charge, to any person obtaining
    a copy of this software and associated documentation files (the
    "Software"), to deal in the Software without restriction, including
    without limitation the rights to use, copy, modify, merge, publish,
    distribute, sublicense, and/or sell copies of the Software, and to
    permit persons to whom the Software is furnished to do so, subject to
    the following conditions:

    The above copyright notice and this permission notice shall be
    included in all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
    MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
    NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
    LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
    OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
    WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

function $_GET(){
  var s = location.hash;
  a = s.match(/[^&#=]*=[^&#=]*/g);
  r = {};
  if(a) {
	  for (i=0; i<a.length; i++) {
		r[a[i].match(/[^&#=]*/)[0]] = a[i].match(/=([^&#]*)/)[0].replace('=', '');
	  }
  }
  return r;
} 

function escapeHtml(unsafe) {
return unsafe
.replace(/&/g, "&amp;")
.replace(/</g, "&lt;")
.replace(/>/g, "&gt;")
.replace(/"/g, "&quot;")
.replace(/'/g, "&#039;");
}

// Hotfix for adding jQuery.browser method onto newer versions (it got deprecated)
//if ( !jQuery.browser ) {
	jQuery.uaMatch = function( ua ) {
		ua = ua.toLowerCase();
		var match = /(chrome)[ \/]([\w.]+)/.exec( ua ) ||
		    /(webkit)[ \/]([\w.]+)/.exec( ua ) ||
		    /(opera)(?:.*version|)[ \/]([\w.]+)/.exec( ua ) ||
		    /(msie) ([\w.]+)/.exec( ua ) ||
		    ua.indexOf("compatible") < 0 && /(mozilla)(?:.*? rv:([\w.]+)|)/.exec( ua ) ||
		    [];
		return {
		    browser: match[ 1 ] || "",
		    version: match[ 2 ] || "0"
		};
	};
	
	matched = jQuery.uaMatch( navigator.userAgent );
	browser = {};
	if ( matched.browser ) {
    	browser[ matched.browser ] = true;
		browser.version = matched.version;
	}
	// Chrome is Webkit, but Webkit is also Safari.
	if ( browser.chrome ) {
 	   browser.webkit = true;
	} else if ( browser.webkit ) {
    	browser.safari = true;
	}
	jQuery.browser = browser;
//}

function isMobile() {
    return ('ontouchstart' in window);
}

function isWebkitMobile() {
    return (isMobile() && typeof document.body.style.webkitTextCombine === 'string');
}

function getScreenDimensions() {
	var d = document.createElement('div');
    d.style.position = 'absolute';
    d.style.left = '-100%';
    d.style.top = '-100%';
    d.style.width = '1in';
    d.style.height = '1in';
	document.body.appendChild (d);
    var devicePixelRatio = window.devicePixelRatio || 1;
    var dpi_x = d.offsetWidth * devicePixelRatio;
    var dpi_y = d.offsetHeight * devicePixelRatio;
	document.body.removeChild(d);
    var width = screen.width;
    var height = screen.height;
    // Android browsers other than Chrome currently report physical rather than
    // viewport screen size (April 2015)
    if (isWebkitMobile() && !($.browser.chrome)) {
        width = width / (dpi_x / 96.0);
        height = height / (dpi_x / 96.0);
    }
    var width_in = width / dpi_x;
    var height_in = height / dpi_y;
    var dim = {width: width_in, height: height_in};
//    alert(dim.width + 'in wide x ' + dim.height + 'in high');
    return dim;
}

/*
    TODO: Add screen size check on zoom.
*/
var PhotoWall = {
	version: "0.1.4",
	
	_photos: {},
	_el: null,
	_c_width: 0,
	_c_height: 0,
	_first_big: null,
	_zoom_trigger: null,
	_zs: null,
	_zoom_timeout: null,
	_last_line: [],
	_must_resize: false,
	_inited: false,
	_block_resize: false,
	_line_max_height:0,
    _body_overflow: $('body').css('overflow'),
    _script_path: $("script[src]").last().attr("src").split('?')[0].split('/').slice(0, -1).join('/')+'/',
	
	options: {
        lineMaxHeight:150
        ,lineMaxHeightDynamic: false
        ,baseScreenHeight: 600
		,isFirstBig: false              // Not implemented  
        ,firstBigWidthPercent: 0.41
        ,padding:10
        ,zoomAction:'mouseenter'
        ,zoomTimeout:500
        ,zoomDuration:300
        ,zoomImageBorder:5
        ,showBoxPadding: 2
        ,showBoxSocial: true
		,slideDuration:5000
    },
	
	init: function(op) {	
	    PhotoWall.options = $.extend(PhotoWall.options,op);
        PhotoWall.options.baseScreenHeight = $(window).height();
		PhotoWall._el = op.el+' .body';
		PhotoWall._c_width = $(PhotoWall._el).width();
		PhotoWall._c_height = $(PhotoWall._el).height();	
		PhotoWall._line_max_height = PhotoWall.options.lineMaxHeight;
		PhotoWall._setLineMaxHeightDynamic();
		$(PhotoWall._el).html('').addClass('clearfix');
		$(window).resize(PhotoWall.RESIZE);
	},
	_init_socials:   function go(){
        var s = 'script';
        var d = document;
        var js, fjs = d.getElementsByTagName(s)[0], load = function(url, id) {
	      if (d.getElementById(id)) {return;}
	      js = d.createElement(s); js.src = url; js.id = id;
	      fjs.parentNode.insertBefore(js, fjs);
	    };
        load('https://connect.facebook.net/en_US/all.js#xfbml=1', 'fbjssdk');
        load('https://apis.google.com/js/plusone.js', 'gplus1js');
        load('https://platform.twitter.com/widgets.js', 'tweetjs');
    },
    _setLineMaxHeightDynamic: function() {
        if(PhotoWall.options.lineMaxHeightDynamic) {
		    var fact = $(window).height()/PhotoWall.options.baseScreenHeight;
		    PhotoWall.options.lineMaxHeight = (PhotoWall._line_max_height*fact >= 100)?(PhotoWall._line_max_height*fact):100;
		}  
    },
	RESIZE: function() {
		var w = $(PhotoWall._el).width();
		var h = $(PhotoWall._el).height();
		
		PhotoWall._setLineMaxHeightDynamic();
		
        if((!PhotoWall.options.lineMaxHeightDynamic && PhotoWall._c_width == w) || PhotoWall._block_resize)
			return;
        if(ShowBox.opened()) {
			PhotoWall._must_resize=true;
			return;
		}
		PhotoWall._c_width = w;
		PhotoWall._c_height = h;	
        PhotoWall._must_resize=false;
		$(PhotoWall._el).html('');
		PhotoWall.show();
	},
	// Here we resize all photos to max line height and replace main data array.
	load: function(data) {
	    if(!PhotoWall.options.lineMaxHeightDynamic) {
	        for(var i in data) {
	            var fact  = PhotoWall.options.lineMaxHeight/data[i].th.height;
			    data[i]['th'].width  = Math.floor(data[i]['th'].width * fact);
			    data[i]['th'].height = PhotoWall.options.lineMaxHeight;
	        }
	    }
        PhotoWall._photos = data;
		PhotoWall.show();
	},
	/* This method render images by lines to the container.
	   If 'data' is set then images from 'data' will be appended to the container,
	   else images from container will be replace by the images from the main array.
    */
	show: function(data) {
        var imgArray = new Array();	   
        var line = [];
		var totalWidth = 0;	
		if(!data) {
		    // when we load images
		    if(!PhotoWall._photos) return;
		    $(PhotoWall._el).html('');
		    //$(window).scrollTop(0);
		    imgArray = PhotoWall._photos;
		} else {
		    // when we need to update list of images. 
	        imgArray   = data;
            line       = PhotoWall._last_line[0];
		    totalWidth = PhotoWall._last_line[1];
		}
        
        var addImage = function(id,padding,w,h,big,th,cw,ch,desc) {
            var img_pos = '';
            var crop = '';
            if(cw && ch) {
                img_pos = 'position:absolute;left:-'+Math.round((w-cw)/2)+'px;top:-'+Math.round((h-ch)/2)+'px;'
                crop = 'pw-crop';
            } 
            var t = $('<div id="'+id+'" class="pw-photo '+crop+' clearfix" style="'
                +'margin:'+padding+'px;'
                +'width:'+w+'px;height:'+h+'px;float:left;'
                +'"><a class="pw-link" href="'+big
                +'"><img class="pw-zoom" src="'+th+'" '
                +'width="'+w+'" height="'+h+'" style="'+img_pos+'" title="'+escapeHtml(desc)+'" /></a></div>'
	        );
			if($.browser.msie) {
				t.find('img').hide().load(function(){$(this).fadeIn(300);});
			} else {
				t.find('img').css('opacity',0).load(function(){
			        $(this).delay(Math.random()*(1000 - 300)+300)
			               .animate({"opacity":1},{duration:1000});
                });
			}
			return t;
        }
        /*
            Create line of images and add it to container body.
        */
		var showLine = function(line,total_width,last,first) {
			var num_photos = line.length;		
		    var ln = $("<div class='pw-line' style='width:"+(total_width+num_photos*PhotoWall.options.padding*2)+"px'></div>")
                     .appendTo(PhotoWall._el);
            var space = (first)?(PhotoWall._c_width*PhotoWall.options.firstBigWidthPercent+PhotoWall.options.padding*2):0;			
			var hCoef = (PhotoWall._c_width-space-num_photos*PhotoWall.options.padding*2) / total_width;
			if(last)
				var hCoef = 1;
            var l = 0;
			for(var k in line) {	
				var w = Math.floor(line[k].th.width*hCoef);
				var h = Math.floor(line[k].th.height*hCoef);
                var t;
                // This needed to fit images in container, because due to round 
                // function it can be different in few pixels.
                l += w;
                if(!last && k == (num_photos-1)) {
                    w += (PhotoWall._c_width-space-num_photos*PhotoWall.options.padding*2)-l;
                }
                
				if(line[k].th.desc == undefined) {
					line[k].th.desc = '';
				}
				t = addImage(line[k].id,PhotoWall.options.padding,w,h,line[k].img,line[k].th.src,null,null,line[k].th.desc);
				ln.append(t);
			}
			ln.css({'width': PhotoWall._c_width});
			return t;
		};/* End of showLine() */

        var lines = 0;
		var firstLineHeight = PhotoWall.options.padding*2;
		var first = true;
        for(var i in imgArray) {	
			var space = 0;
		    var first_space = false;
		    var e = null;
		    //PhotoWall.options.lineMaxHeight = PhotoWall._line_max_height;
		    
		    // if lineMaxHeight changes on resize then recompute image sizes.
		    if(PhotoWall.options.lineMaxHeightDynamic) {
   				var fact  = PhotoWall.options.lineMaxHeight/imgArray[i].th.height;
				
				imgArray[i]['th'].width  = Math.floor(imgArray[i]['th'].width * fact);
				imgArray[i]['th'].height = PhotoWall.options.lineMaxHeight;
		    }
			if(PhotoWall.options.isFirstBig && first) {
			    PhotoWall._first_big = imgArray[i];
		        first = false;
		        continue;
		    }
			
			if(lines < 2 && PhotoWall.options.isFirstBig) {
			    var h = PhotoWall._first_big.th.height;
			    //PhotoWall.options.lineMaxHeight = (Math.round(h/2) < PhotoWall._line_max_height)?Math.round(h/2):PhotoWall._line_max_height;
                first_space = true;
                space       = PhotoWall._c_width*PhotoWall.options.firstBigWidthPercent;  
            }
			
			line.push(imgArray[i]);
			totalWidth += imgArray[i].th.width;

			if(totalWidth >= (PhotoWall._c_width - space)) 
			{
			    var ln = showLine(line,totalWidth,0,first_space);
                if(lines < 2)
					firstLineHeight += ln.height();
				PhotoWall._last_line = [line,totalWidth,ln];
				line = [];
                totalWidth = 0;
                lines++;
			}
		}
	    if(PhotoWall.options.isFirstBig) {
            var im = PhotoWall._first_big;
            var fact = PhotoWall._c_width*PhotoWall.options.firstBigWidthPercent/imgArray[i].width;
            var w = im.width * fact;
            var h = im.height * fact;
			im.th.width = w;
			im.th.height = h;
			im.th.src = im.img;
			im.th.zoom_src = im.img;
			PhotoWall._first_big = addImage(
				im.id,
				PhotoWall.options.padding,
				w,
				h,
				im.img,
				im.img
			).prependTo(PhotoWall._el);
        }
        
		if(line) {
			if(lines < 2 && PhotoWall.options.isFirstBig)
                first_space = true;
		    var ln = showLine(line,totalWidth,1,first_space);
		    PhotoWall._last_line = [line,totalWidth,ln];
		}
        // Hack: Fix line width if scroll bar not present.
	    if(PhotoWall._c_width < $(PhotoWall._el).width()) {
            PhotoWall.RESIZE();
	    }
		$('.pw-line').css({'width': PhotoWall._c_width + 'px'});
		if(!PhotoWall._inited) {
		    PhotoWall._inited = true;
		    PhotoWall.initGUI();
		}			
	},
	/*
	    Initialize GUI.
	*/
	initGUI: function() {
		if(PhotoWall.options.zoom)
		    PhotoWall.initZoom();
		if(PhotoWall.options.showBox)
		    PhotoWall.initShowBox();
	},
	/*
	    Initialize ShowBox.
	*/
	initShowBox: function() {
		var menuBar = '';
		var update  = null; 
		if(PhotoWall.options.showBoxSocial) {
			menuBar = '<div style="padding-top: 5px;width: 250px;position: relative;left: 50%;margin-left: -125px;"><div style="float:left;margin-top: 5px;width:80px;"><div id="gplus" class="g-plusone" data-size="medium"></div></div><div style="float:left;margin-top:5px;width:90px;"><a href="https://twitter.com/share" class="twitter-share-button">Tweet</a></div><div style="float:left;margin-top:5px;width:80px;" id="fblike"><fb:like send="false" layout="button_count" width="100" show_faces="false"></fb:like></div></div>';
			update  = function(){
				if(typeof(FB) !== 'undefined')
					 FB.XFBML.parse(document.getElementById('fblike'));
				if(typeof(gapi) !== 'undefined') {
					gapi.plusone.render(document.getElementById('gplus'),{
						'href':location.href,
						'annotation':'bubble',
						'width': 90,
						'align': 'left',
						'size': 'medium'
					});
				}
				if(typeof(twttr) !== 'undefined') {
					$('#showbox .twitter-share-button').attr('data-url',location.href);
					twttr.widgets.load();
				}		            
			};
		}
		ShowBox.init(PhotoWall._el+' a.pw-link',{
			closeCallback:function(){
				if(PhotoWall._must_resize) {
					PhotoWall.RESIZE();
				}
			},
			menuBarContent: menuBar,
			onUpdate: update
		});
		if(PhotoWall.options.showBoxSocial) 
			PhotoWall._init_socials();
	},
	/*
	    Initialize image zoom.
	*/
	initZoom: function() {
		$(".pw-zoom").on(PhotoWall.options.zoomAction,function (){
			var img = $(this);
			if(!parseInt(img.css('opacity'))) return;
							
			img.stop().addClass('pw-photo-hover');
			// Make images to zoom only after some time to prevent zoom on mouse move.
			PhotoWall._zoom_timeout = setTimeout(function(){
				img.removeClass('pw-photo-hover');				
				img.addClass('pw-photo-zoomed');
				if(PhotoWall._zoom_timeout) {
					PhotoWall._zs = [img.width(),img.height()];
					var container  = img.parent().parent();
					var item   = PhotoWall._photos[container.attr('id')];
					// Preload zoomed image and replace old only when it loaded.
					var bigIMG = $('<img/>');
					bigIMG.attr('src',item.th.zoom_src);
					bigIMG.load(function(){ 
						img.attr('src',$(this).attr('src'));
						$(this).remove();
					});		
                    // calculating zoom image size
					var w  = Math.round(img.width()*item.th.zoom_factor);
					var h  = Math.round(img.height()*item.th.zoom_factor);
					// calculating diff size
					var dw = w - img.width();
					var dh = h - img.height();
					// calculating left and top margin
					var l  = -(dw) * 0.5-PhotoWall.options.zoomImageBorder;
					var t  = -(dh) * 0.5-PhotoWall.options.zoomImageBorder;
					
					var o  = container.offset(); 
					var wn = $(window);
					var winFact = 1;
					// Prevent image to expand out of visible part of window 
					if(o.left + l + w > (wn.width()+wn.scrollLeft()))
						l -= (o.left + l + w) - (wn.width()+wn.scrollLeft())+PhotoWall.options.zoomImageBorder*2; 
					
					if(o.left + l < wn.scrollLeft())
						l -= (o.left + l)-wn.scrollLeft();
					
					if(o.top + t + h > (wn.height()+wn.scrollTop()))
						t -= (o.top + t + h) - (wn.height()+wn.scrollTop())+PhotoWall.options.zoomImageBorder*2; 
					
					if(o.top + t < wn.scrollTop())
						t -= (o.top + t)-wn.scrollTop();
		            // END
		            // Prevent image from being bigger then visible part of window
		            if(w+PhotoWall.options.zoomImageBorder*2 > wn.width()) 
		                winFact *= (wn.width()-PhotoWall.options.zoomImageBorder*2)/(w+PhotoWall.options.zoomImageBorder*2);
		                
		            if((h*winFact+PhotoWall.options.zoomImageBorder*2) > wn.height()) 
		                winFact *= (wn.height()-PhotoWall.options.zoomImageBorder*2)/(h*winFact+PhotoWall.options.zoomImageBorder*2);
		            // END
		            
		            // Zooming
					img.animate({
						"margin-left": 	l,
						"margin-top": 	t,
						"width": 		Math.round(w*winFact),
						"height": 		Math.round(h*winFact),
						"padding": 		PhotoWall.options.zoomImageBorder
					}, {
						queue: 		false,
						duration: 	PhotoWall.options.zoomDuration,
						easing: 	'linear'
					});
				}
			},PhotoWall.options.zoomTimeout);
		});
		$(".pw-zoom").on('mouseleave',function(){
			var img = $(this);
			var container  = img.parent().parent();
			var item   = PhotoWall._photos[container.attr('id')];
			if (PhotoWall._zoom_timeout) {
					clearTimeout(PhotoWall._zoom_timeout)
					PhotoWall._zoom_timeout = null;
			}
			img.removeClass('pw-photo-hover');
			if(img.hasClass('pw-photo-zoomed')) {
				img.stop().css({
					"margin":  '',
					"padding": '',
			        "width":		PhotoWall._zs[0] + 'px',
			        "height": 		PhotoWall._zs[1] + 'px'
		
				});
				PhotoWall._zs = null;
				img.removeClass('pw-photo-zoomed');
			}
		});
	}
}
/*
	ShowBox - Fullscreen image viewer that overlay on the current page.
*/
var ShowBox = {
    version: "0.1.5",

    _opened: false,
    _preview_locked: false,
    _images: [],
    _index: 0,
    _current: '',
    _inited: false,
    _th: null,
	_slideshow_on:false,
	_slideshow_id: 0,
    _hover_show_duration: 5000,
    options: [],

    init: function(el,op) {
        var a = {
            closeCallback: function(){},
            menuBarContent:'',
            onUpdate: null
        };
        ShowBox.options.push($.extend(a,op));
        ShowBox._init(el);
        ShowBox._initEvents(el);
        ShowBox._parseGet();
    },
    _init: function(el) {
        ShowBox._images.push([]);
        if(ShowBox.options[ShowBox.options.length-1].menuBarContent) {
            $('body').append(                 
                '<div id="showbox-menubar'+(ShowBox.options.length-1)+'">'
                +         ShowBox.options[ShowBox.options.length-1].menuBarContent
                +'</div>'
            );
        }
        if(!ShowBox._inited) {
            $(
                '<div id="showbox" style="display:none;">'
                +'    <div id="showbox-exit" class="hidable">Back to the gallery</div>'
                +'    <div class="showbox-menubar unselect" unselectable="on" style="display:none !important;"></div>'
                +'    <div class="showbox-image unselect" unselectable="on">'
                +'        <p class="showbox-th-counter" unselectable="on"></p>'
                +'    <p class="showbox-desc select" unselectable="off"></span></p>'
                +'    </div>'
                +'    <div id="showbox-loader"></div>'
                +'    <div class="showbox-preview unselect tohide">'
                +'        <div id="showbox-controls">'
                +'        <span class="showbox-pv-lock"></span>'
                +'        <span id="showbox-control-box"  class="hidable">'
                +'        <span id="nav-box">'
                +'        <span id="prev-button" class="nav-button">❮</span>'
                +'        <span id="play-button" class="nav-button">►</span>'
                +'        <span id="pause-button" class="nav-button">‖</span>'
                +'        <span id="next-button" class="nav-button">❯</span>'
                +'        <span id="fullscreen-button" class="nav-button">&nbsp;</span>'
                +'        <span id="no-fullscreen-button" class="nav-button">X</span>'
                +'        </span>'
                +'        </span>'
                +'        </div>'
                +'        <div id="showbox-thc'+(ShowBox.options.length-1)+'" class="showbox-thc">'
                +'          <div class="showbox-th-container clearfix"></div>'
                +'          <p>Browse pictures by using the arrows of your keyboard or by clicking on the current picture.</p>'
                +'        </div>'
                +'    </div>'
                +'</div>'
            ).appendTo('body');
        }
        ShowBox._adjustToScreenSize();
        // Only show the full screen button if the browser supports it
		if (screenfull.enabled) {
		   $('#fullscreen-button').show();
		}
        var i = 0;
        var lc  = ShowBox._images.length-1;
        $(el).each(function(){
            var t   = $(this);
            ShowBox._images[lc].push([t.attr('href'),t.find('img').attr('src'),t.find('img').attr('title')]);
            ShowBox._addThumb(lc,ShowBox._images[lc][i][1],i,ShowBox._images[lc][i][2]);
            i++;
        });
    },
    _adjustToScreenSize: function() {
        // dolphin and perhaps other mobile browsers do not recognize the @media
        // rule for physical screen size, so handle adjustments here manually
        if($.browser.chrome) {
            // Chrome does a good job of automatically adjusting to the viewport
            return;
        }
        var dim = getScreenDimensions();
        if(dim.width < 1.5) {
            var device_css =  PhotoWall._script_path + 'one-five-inch.css';
            $('#device-style').attr('href', device_css);
        } else if(dim.width < 3) {
            var device_css =  PhotoWall._script_path + 'three-inch.css';
            $('#device-style').attr('href', device_css);
        } else if(dim.width < 7) {
            var device_css =  PhotoWall._script_path + 'seven-inch.css';
            $('#device-style').attr('href', device_css);
        }
    },
    _initEvents: function(el) {
        if(el) {
            var num = ShowBox._images.length-1;
            $(el).on('click',function(e){
                e.preventDefault();
				ShowBox._opened = true;
                var gal = num;
                ShowBox._current = gal;
                var src = $(this);
                for(var i in ShowBox._images[gal]) {
                    if(ShowBox._images[gal][i][0] == src.attr('href')) {
                        ShowBox._index = parseInt(i);
                        ShowBox._th = $('#showbox-thc'+gal+' .showbox-th').eq(i).addClass('showbox-th-active');
                        break;
                    }
                }
                ShowBox._show(gal);
            });
        }
        if(!ShowBox._inited) {
            ShowBox._inited = true;
            $(document).keyup(function(e){
               if(!ShowBox._opened) return;
               ShowBox.KEYPRESSED(e);
            });
            $('#showbox-exit').click(function(){
                if(!ShowBox._opened) return;
                ShowBox.EXIT(this);
            });
            $('#showbox .showbox-preview').mouseenter(function(){
                if(isMobile()) return; // Only use tap to activate on touch screens
                if(ShowBox._preview_locked) return;
				setTimeout(function() {
					if($('#showbox-control-box:hover').length == 0)
                		ShowBox.OPENPREVIEW($('#showbox .showbox-preview'));
					}, 100);
            });
            $('#showbox .showbox-preview').mouseleave(function(){
                if(!ShowBox._opened) return;
                if(isMobile()) return; // Only use tap to activate on touch screens
                if(ShowBox._preview_locked) return;
                ShowBox.CLOSEPREVIEW(this);
            });
            $('#showbox .showbox-preview').click(function(e){
				e.stopImmediatePropagation();
                if(!ShowBox._opened) return;
                ShowBox.LOCKPREVIEW(this);
                if(ShowBox._preview_locked)
                	ShowBox.OPENPREVIEW(this);
                else
                    ShowBox.CLOSEPREVIEW(this);
            });
            $(window).resize(function(){
                ShowBox.RESIZE(this);
            });
            $('#showbox').mouseenter(function(){
                clearTimeout($(this).data('timeoutId'));
				$('.hidable').animate({"opacity":1},{duration:500});
            }).mouseleave(function(){
                var el = $(this);
                var timeoutId = setTimeout(function(){
                    $('.hidable').animate({"opacity":0},{duration:500});
                }, ShowBox._hover_show_duration);
                el.data('timeoutId', timeoutId); 
            });
/*
            $('#showbox').mouseenter(function(){
				$('.hidable').animate({"opacity":1},{duration:500});
            });
            $('#showbox').mouseleave(function(){
                if($('#showbox:hover').length == 0) {
                    setTimeout(function() {
                        $('.hidable').animate({"opacity":0},{duration:500});
                    }, ShowBox._hover_show_duration);
                }
            });
*/
            $('#next-button').click(function(e){
				e.stopImmediatePropagation();
				ShowBox._nextImage();
            });
            $('#prev-button').click(function(e){
				e.stopImmediatePropagation();
				ShowBox._prevImage();
            });
            $('#play-button').click(function(e){
				e.stopImmediatePropagation();
				ShowBox._play();
            });
            $('#pause-button').click(function(e){
				e.stopImmediatePropagation();
				ShowBox._pause();
            });
            $('#fullscreen-button').click(function(e){
				e.stopImmediatePropagation();
				var target = $('.showbox-image')[0];
				screenfull.request(target);
            });
            $('#no-fullscreen-button').click(function(e){
				e.stopImmediatePropagation();
				screenfull.exit();
            });
            $('#showbox .showbox-image').draggable({axis:'x',
                revert: true,
                revertDuration: 0,
                stop: function( e, ui ) {
                  if(ui.position.left == 0) {
                      return;
                  }
                  if(ui.position.left < 0) {
                    ShowBox._nextImage();
                  } else {
                    ShowBox._prevImage();
                  }
                }
            });
        	$('#showbox .showbox-th-container').draggable({axis:'x'});
            $(window).on("orientationchange",function(event){
                if(ShowBox.opened()) {
                    // Brute force for now, couldn't find a way to get the browser to redo
                    // its layout entirely based on the orientation change
                    location.reload();
                }
                //alert("Orientation is: " + event.orientation);
            });
            window.onhashchange = function() {
                var get = $_GET();
                if(get['p'] && get['gal']) {
                    ShowBox._parseGet();
                } else {
                    ShowBox.EXIT();
                }
            };
		if (screenfull.enabled) {
			$(document).on(screenfull.raw.fullscreenchange, function () {
    			//console.log('Fullscreen change: ' + screenfull.isFullscreen);
				if(screenfull.isFullscreen) {
        			$('#showbox .showbox-desc').hide();
       				var controls = $('#showbox-control-box').clone(true).addClass("fullScreen_controls")
                        .css({position:"fixed", bottom: "3px"});
        			controls.appendTo('#showbox .showbox-image');
					$('#fullscreen-button').hide();
					$('#no-fullscreen-button').show();

                    // IE11 fullscreen bug workarounds
                    if($.browser.msie) {
                        $('.tohide').hide();
                        $('#showbox .showbox-image').css({
                            'margin': 0
                        });
                    }
                    // Android bug workarounds
                    if(isWebkitMobile()) {
                        $('.tohide').hide();
		                $(PhotoWall._el).hide();
                        $('#showbox .showbox-image').css({
                            'position': 'fixed',
                            'top': 0,
                            'left': 0,
                            'right': 0,
                            'bottom': 0
                        });
                    }
				} else {
					$('.fullScreen_controls').remove();
					ShowBox._adjustPlayButtons(ShowBox._slideshow_on);
					$('#no-fullscreen-button').hide();
					$('#fullscreen-button').show();
                    // Android bug workarounds
                    if(isWebkitMobile()) {
                        $('.tohide').show();
		                $(PhotoWall._el).show();
                        $('#showbox .showbox-image').css({
                            'position': 'relative'
                        });
                        ShowBox.CLOSEPREVIEW($('#showbox .showbox-preview'));
                    }
                    // Have to recalculate and redisplay image
        			ShowBox._changeImage(ShowBox._index);
        			$('#showbox .showbox-desc').show();
				}

			});
          }
        }
    },
    _parseGet: function() {
        var get = $_GET();
        if(get['p'] && get['gal']) {
			ShowBox._opened = true;
            var gal = parseInt(get['gal'])-1;
            var p   = parseInt(get['p'])-1;
            if((ShowBox.options.length-1) != gal)
                return;
            ShowBox._index = p;
            ShowBox._current = gal;
            ShowBox._th = $('#showbox-thc'+gal+' .showbox-th').eq(p).addClass('showbox-th-active');
            ShowBox._show(gal);
        }
    },
    _next: function() {
        var total = ShowBox._images[ShowBox._current].length;
        ShowBox._index += 1;
        if(ShowBox._index >= total)
            ShowBox._index = 0;
        ShowBox._changeImage(ShowBox._index);
    },
    _prev: function() {
        var total = ShowBox._images[ShowBox._current].length;
        ShowBox._index -= 1;
        if(ShowBox._index < 0)
            ShowBox._index = total-1;
        ShowBox._changeImage(ShowBox._index);
    },
    _nextImage: function() { //Invoked on mouse click or key press
		ShowBox._pause();
		ShowBox._next();
    },
    _prevImage: function() { //Invoked on mouse click or key press
		ShowBox._pause();
		ShowBox._prev();
    },
    _play: function() {
		ShowBox._adjustPlayButtons(true);
		if(!ShowBox._slideshow_on) {
			ShowBox._slideshow_on = true;
			ShowBox._slideshow_id = setTimeout(ShowBox._next, PhotoWall.options.slideDuration);
		}
    },
    _pause: function() {
		ShowBox._adjustPlayButtons(false);
		ShowBox._stop();
    },
	_adjustPlayButtons: function(on) {
		if(on) {
			$('#play-button').hide();
			$('#pause-button').show().css("display", "inline-block");
		} else {
		    $('#pause-button').hide();
			$('#play-button').show().css("display", "inline-block");
		}
	},
    _togglePlay: function() {
		(ShowBox._slideshow_on) ? ShowBox._pause() : ShowBox._play();
    },
    _stop: function() {
		if(ShowBox._slideshow_on) {
			clearTimeout(ShowBox._slideshow_id);
			ShowBox._slideshow_on = false;
			ShowBox._slideshow_id = 0;
		}
    },
    _show: function(gal) {
        $('.pw-line').hide();
        var thc = $('#showbox-thc'+gal).detach();
        var mb = $('#showbox-menubar'+gal).detach();
        thc.appendTo('#showbox .showbox-preview');
        mb.prependTo('#showbox .showbox-menubar');
        thc.css({top:'0px'});
        mb.css({position:'relative',top:'0px'});
        
        $('#showbox-loader').show();
        $('body').css('overflow','hidden');
        $('#showbox').fadeIn(200,function() {
            ShowBox._changeImage(ShowBox._index);
        });
        if(!ShowBox._preview_locked)
		    ShowBox.CLOSEPREVIEW($('#showbox .showbox-preview'));
    },
    _addThumb: function(gal,im,i,desc) {
		$('<div class="showbox-th"><img src="'+im+'" title="'+escapeHtml(desc)+'" /></div>')
        .appendTo('#showbox-thc'+gal+' .showbox-th-container').find('img').load(function(){
            var w = $(this).width();
            var h = $(this).height();
            var l = 0;
            var t = 0;
            var fact = 1;
            if(w >= h) {
                fact = 60/h;
            } else {
                fact = 60/w;
            }
            w = Math.round(w * fact);
            h = Math.round(h * fact);
            l  = Math.round((w - 60)/2); 
            $(this).attr({
                width: w,
                height: h
            }).css({
                left: -l,
                top: -t
            });
        }).parent().click(function(e){
            e.stopPropagation();
            var ind = i;
            ShowBox._changeImage(ind);
        });
    },
    _onChangePhoto: function() {
        if(typeof(ShowBox.options[ShowBox._current].onUpdate) == 'function') {
            ShowBox.options[ShowBox._current].onUpdate();
        }
    },
    _initImage: function(img, ind) {
//        img.click(ShowBox._next);
        //bugfix for IE
        if($.browser.msie) {
            try{
                img.width();
                img.height();
             } catch(err){};
        }
        img.attr({
            width:img.prop('width'),
            height:img.prop('height')
        });
        ShowBox._images[ShowBox._current][ind].push(img);
    },
    _preloadImage: function(ind) {
        if(ShowBox._images[ShowBox._current][ind].length < 4) {
            var img = $('<img class="showbox-img" style="display:none;"/>');
            img.attr('src',ShowBox._images[ShowBox._current][ind][0])
            .load(function() {
                ShowBox._initImage(img, ind);
                if(ShowBox._index == ind) {
                    var desc = ShowBox._images[ShowBox._current][ind][2];
                    ShowBox._showImage(img, desc);
                }
            });
        }
    },
    _showImage: function(img, desc) {
		var slideshow_on = ShowBox._slideshow_on;
		ShowBox._stop();
//		$('#showbox .showbox-img img').animate({opacity:0},2000,
//            function() { $('#showbox .showbox-img').remove(); });
        $('#showbox .showbox-img').remove();
        $('#showbox .showbox-desc').text("");
		img.css({display:'block',opacity:0});
        img.prependTo('#showbox .showbox-image');
        $('#showbox .showbox-menubar').show();
        ShowBox.RESIZE();
        $('#showbox-loader').hide();
        $('#showbox .showbox-image').css({opacity:1});
        img.css({display:'block',opacity:0}).animate({opacity:1},600);
        $('#showbox .showbox-desc').text(desc);
        var total = ShowBox._images[ShowBox._current].length;
        ShowBox._setCounter(ShowBox._index+1,total);
		if(slideshow_on) {
			ShowBox._play();
		}
        // Preload the next image
        var ind = ShowBox._index + 1;
        if(ind >= total)
            ind = 0;
        ShowBox._preloadImage(ind);
    },
    _changeImage: function(ind) {
        ind = parseInt(ind);
        window.location.hash = 'p='+(ind+1)+'&gal='+(ShowBox._current+1);
        $('#showbox .showbox-menubar').html(ShowBox.options[ShowBox._current].menuBarContent);
        ShowBox._onChangePhoto();
        ShowBox._index = ind;
        ShowBox._th.removeClass('showbox-th-active');
        ShowBox._th = $('#showbox .showbox-th').eq(ind).addClass('showbox-th-active');

        // Is this image already downloaded?
        if(ShowBox._images[ShowBox._current][ind].length > 3) {
            var img = ShowBox._images[ShowBox._current][ind][3];
            var desc = ShowBox._images[ShowBox._current][ind][2];
            ShowBox._showImage(img, desc);
        } else {
            $('#showbox-loader').show();
            ShowBox._preloadImage(ind);
        }
    },
    _setCounter: function(num,total) {
        $('#showbox .showbox-th-counter').html(num+' of '+total);
    },
    _clearHash: function() {
        window.location.hash = '_';
    },
	opened: function() {
		return ShowBox._opened;
	},
    EXIT: function(el){
        ShowBox._clearHash();
        ShowBox._opened = false;
//        $('body').css('overflow',PhotoWall._body_overflow);
        $('body').css('overflow','auto');
        $('#showbox').hide();
        ShowBox.options[ShowBox._current].closeCallback();
        $('#showbox .showbox-menubar').hide();
        $('#showbox .showbox-image img').remove();
        $('#showbox .showbox-image p').text("");
		$('#showbox-thc'+ShowBox._current).css({top:'-10000px'}).detach().appendTo('body');
		$('#showbox-menubar'+ShowBox._current).css({position:'absolute',top:'-10000px'}).detach().appendTo('body');
        $('.pw-line').show();
    },
    KEYPRESSED: function(e) {
        if(e.keyCode==27 || e.keyCode==13) {
			ShowBox._stop();
            if(!screenfull.isFullscreen) {
                ShowBox.EXIT();
            }
        }
        if(e.keyCode==32) {
			ShowBox._togglePlay();
        }
        if(e.keyCode==39) {
            ShowBox._nextImage();
        }
        if(e.keyCode==37) {
            ShowBox._prevImage();
        }
    },
    OPENPREVIEW: function(el){
        $(el).animate({bottom:0},{queue: false,duration:150});
    },
    CLOSEPREVIEW: function(el){
        var gal = (ShowBox.options.length-1);
		var bot = -$('#showbox-thc'+gal).height();
        // Chrome mobile oddity
        if (isWebkitMobile() && ($.browser.chrome)) {
            if (Math.abs(window.orientation) == 90) {
            } else {
               bot += 20;
            }
        }
        $(el).animate({bottom:bot},{queue: false,duration:150});
        ShowBox._preview_locked = false;
        $('#showbox .showbox-pv-lock').hide();
        $(el).removeClass("preview-locked");
    },
    LOCKPREVIEW: function(el){
        ShowBox._preview_locked = ShowBox._preview_locked?false:true;
        if(ShowBox._preview_locked) {
            $('#showbox .showbox-pv-lock').show().css("display", "inline-block");
            $(el).addClass("preview-locked");
        } else {
            $('#showbox .showbox-pv-lock').hide();
            $(el).removeClass("preview-locked");
        }
    },
    RESIZE: function(el){
        if(!ShowBox._opened) return;
        var showbox = $('#showbox');
        var img = $('#showbox .showbox-image img');
        var cW  = (screenfull.isFullscreen) ? $(window).width() : showbox.width();
        var gal = (ShowBox.options.length-1);
		var bot = $('#showbox-thc'+gal).height();
        var cH  = (screenfull.isFullscreen) ? $(window).height() : showbox.height() - bot;
        var iH  = parseInt(img.attr('height'));
        var iW  = parseInt(img.attr('width'))
        var factor = Math.min(cH/iH, cW/iW);
        var imW  = Math.round(factor * iW);
        var imH  = Math.round(factor * iH);
        var imL  = Math.round((cW - imW)/2);
        var imT  = Math.round((cH - imH)/2) /*+5*/;
        $('#showbox .showbox-image').css({
            'width': imW+'px',
            'height': imH+'px',
        }).find(' img').css({
            'width': imW+'px',
            'height': imH+'px'
        });
/*
        console.log(
        alert(
                "cW=" + cW +", cH=" + cH + ", iW=" + iW + ", iH=" + iH + ", imW=" + imW + ", imH=" + imH
                 + ", imL=" + imL + ", imT=" + imT
                 + ", sbTop=" + $('#showbox .showbox-image').position().top + ", sbLeft=" + $('#showbox .showbox-image').position().left
                 + ", sbW=" + $('#showbox .showbox-image').width() + ", sbH=" + $('#showbox .showbox-image').height()
                 + ", wW=" + $(window).width() + ", wH=" + $(window).height()
                 + ", dW=" + $(document).width() + ", dH=" + $(document).height()
        );
*/
		if(screenfull.isFullscreen) {
            $('#showbox .showbox-image').css({
                'margin': '0px',
                'min-height': '100%'
            });
		  	$('#showbox .showbox-image img').css({
            	'margin-left': imL+'px',
            	'margin-top': imT+'px'
            });
		} else {
		  	$('#showbox .showbox-image').css({
            	'margin-left': imL+'px',
            	'margin-top': imT+'px'
            });
		  	$('#showbox .showbox-image img').css({
            	'margin': '0px',
            });
        	var thL = Math.round(cW/2) - (ShowBox._index * 64 + 30);
        	$('#showbox .showbox-th-container').animate({
            	left:  thL
        	},{duration:300,queue:false});	
		}
	}
}
