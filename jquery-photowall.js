/*
    jQuery PhotoWall with ShowBox
    jQuery image gallery script with fullscreen mode.
    http://creotiv.github.com/jquery-photowall
    
    Copyright (C) 2012  Andrey Nikishaev(creotiv@gmail.com, http://creotiv.in.ua)

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
/*
function getScrollBarWidth () {
	var inner = document.createElement('p');
	inner.style.width = "100%";
	inner.style.height = "200px";
 
	var outer = document.createElement('div');
	outer.style.position = "absolute";
	outer.style.top = "0px";
	outer.style.left = "0px";
	outer.style.visibility = "hidden";
	outer.style.width = "200px";
	outer.style.height = "150px";
	outer.style.overflow = "hidden";
	outer.appendChild (inner);
 
	document.body.appendChild (outer);
	var w1 = inner.offsetWidth;
	outer.style.overflow = 'scroll';
	var w2 = inner.offsetWidth;
	if (w1 == w2) w2 = outer.clientWidth;
 
	document.body.removeChild (outer);
 
	return (w1 - w2);
};*/
 
function $_GET(){
  var s = location.hash.substr(2);
  a = s.match(/[^&#=]*=[^&#=]*/g);
  r = {};
  if(a) {
	  for (i=0; i<a.length; i++) {
		r[a[i].match(/[^&#=]*/)[0]] = a[i].match(/=([^&#]*)/)[0].replace('=', '');
	  }
  }
  return r;
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
    },
	
	init: function(op) {	
	    PhotoWall.options = $.extend(PhotoWall.options,op);

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
			    data[i]['th'].width  = Math.round(data[i]['th'].width * fact);
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
		    $(window).scrollTop(0);
		    imgArray = PhotoWall._photos;
		} else {
		    // when we need to update list of images. 
	        imgArray   = data;
            line       = PhotoWall._last_line[0];
		    totalWidth = PhotoWall._last_line[1];
		}
        
        var addImage = function(id,padding,w,h,big,th,cw,ch) {
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
                +'width="'+w+'" height="'+h+'" style="'+img_pos+'" /></a></div>'
	        );
			        
			if($.browser.msie) {
				t.find('img').hide();
				if(PhotoWall._inited)
				    t.find('img').load(function(){$(this).fadeIn(300);});
			} else {
				t.find('img').css('opacity',0);
				if(PhotoWall._inited)
				    t.find('img').load(function(){
				        $(this).delay(Math.random()*(1000 - 300)+300)
				               .animate({"opacity":1},{duration:1000})
	                });
			}
			return t;
        }
        /*
            Create line of images and add it to container body.
        */
		var showLine = function(line,total_width,last,first) {
		    var ln = $("<div class='line' style='float:left'></div>")
                     .appendTo(PhotoWall._el);
			var num_photos = line.length;		
            var space = (first)?(PhotoWall._c_width*PhotoWall.options.firstBigWidthPercent+PhotoWall.options.padding*2):0;			
			var hCoef = (PhotoWall._c_width-space-num_photos*PhotoWall.options.padding*2) / total_width;
			if(last)
				var hCoef = 1;
            var l = 0;
			for(var k in line) {	
				var w = Math.round(line[k].th.width*hCoef);
				var h = Math.round(line[k].th.height*hCoef);
                var t;
                // This needed to fit images in container, because due to round 
                // function it can be different in few pixels.
                l += w;
                if(!last && k == (num_photos-1)) {
                    w += (PhotoWall._c_width-space-num_photos*PhotoWall.options.padding*2)-l;
                }
                
				t = addImage(line[k].id,PhotoWall.options.padding,w,h,line[k].img,line[k].th.src); 
				ln.prepend(t);
			}
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
				
				imgArray[i]['th'].width  = Math.round(imgArray[i]['th'].width * fact);
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
		if(!PhotoWall._inited) {
		    PhotoWall._inited = true;
            // After first load need to resize, because scrollbars can be added.
		    PhotoWall.RESIZE();
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
		ShowBox.init('#gallery a.pw-link',{
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
		$(".pw-zoom").live(PhotoWall.options.zoomAction,function (){
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
		$(".pw-zoom").live('mouseleave',function(){
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
    version: "0.1.4a",

    _opened: false,
    _preview_locked: false,
    _images: [],
    _index: 0,
    _current: '',
    _inited: false,
    _th: null,
    options: {
        closeCallback: function(){},
        menuBarContent:'',
        onUpdate: null
    },

    init: function(el,op) {
        ShowBox.options = $.extend(ShowBox.options,op);
        
        ShowBox._init(el);
        ShowBox._initEvents(el);
        ShowBox._parseGet();
    },
    _init: function(el) {
        ShowBox._images.push([]);
        var menuBarContent = ShowBox.options.menuBarContent;
        if(ShowBox.options.menuBarContent) {
            menuBarContent = 
                '<div class="showbox-menubar unselect" unselectable="on" style="display:none !important;">'
                +         ShowBox.options.menuBarContent
                +'</div>';
        }
        if(!ShowBox._inited) {
            $(
                '<div id="showbox" style="display:none;">'
                +'    <div id="showbox-exit"></div>'
                +     menuBarContent
                +'    <div class="showbox-image unselect" unselectable="on">'
                +'    </div>'
                +'    <div id="showbox-loader"></div>'
                +'    <div class="showbox-preview unselect">'
                +'        <div class="showbox-pv-lock"></div>'
                +'        <div class="showbox-th-counter" unselectable="on"></div>'
                +'    </div>'
                +'</div>'
            ).appendTo('body');
        }
        $('body').append(            
            '<div id="showbox-thc'+(ShowBox._images.length-1)+'" style="overflow:hidden;position:relative;width:100%;"><div class="showbox-th-container clearfix" style="position:abolute;top:-999999px;"></div></div>'
        );
        var i = 0;
        var lc  = ShowBox._images.length-1;
        $(el).each(function(){
            var t   = $(this);
            ShowBox._images[lc].push([t.attr('href'),t.find('img').attr('src')]);
            ShowBox._addThumb(lc,ShowBox._images[lc][i][1],i);
            i++;
        });
    },
    _initEvents: function(el) {
        if(el) {
            $(el).live('click',function(e){
                e.preventDefault();
				ShowBox._opened = true;
                var gal = ShowBox._images.length-1;
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
                if(ShowBox._preview_locked) return;
                ShowBox.OPENPREVIEW(this);
            });
            $('#showbox .showbox-preview').mouseleave(function(){
                if(!ShowBox._opened) return;
                if(ShowBox._preview_locked) return;
                ShowBox.CLOSEPREVIEW(this);
            });
            $('#showbox .showbox-preview').click(function(){
                if(!ShowBox._opened) return;
                ShowBox.LOCKPREVIEW(this);
            });
            $(window).resize(function(){
                ShowBox.RESIZE(this);
            });
        }
    },
    _parseGet: function() {
        var get = $_GET();
        if(get['p'] && get['gal']) {
			ShowBox._opened = true;
            var gal = parseInt(get['gal'])-1;
            var p   = parseInt(get['p'])-1;
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
    _show: function(gal) {
        var thc = $('#showbox-thc'+gal).detach();
        thc.appendTo('#showbox .showbox-preview');
        $('#showbox-thc'+gal+' .showbox-th-container').css({position:'',top:'0px'});
        $('#showbox-loader').show();
        $('body').css('overflow','hidden');
        $('#showbox').fadeIn(200,function() {
            ShowBox._changeImage(ShowBox._index);
        });
    },
    _addThumb: function(gal,im,i) {
    	$('<div class="showbox-th"><img src="'+im+'" /></div>')
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
        if(typeof(ShowBox.options.onUpdate) == 'function') {
            ShowBox.options.onUpdate();
        }
    },
    _changeImage: function(ind) {
        $('#showbox-loader').show();
        $('#showbox .showbox-menubar').hide();
        $('#showbox .showbox-menubar div').remove();	
        ind = parseInt(ind);
        var total = ShowBox._images[ShowBox._current].length;
        ShowBox._setCounter(ind+1,total);
        window.location.hash = '!p='+(ind+1)+'&gal='+(ShowBox._current+1);
        $('#showbox .showbox-menubar').append(ShowBox.options.menuBarContent);
        ShowBox._onChangePhoto();
        ShowBox._index = ind;
        $('#showbox .showbox-img').remove();
        ShowBox._th.removeClass('showbox-th-active');
        ShowBox._th = $('#showbox .showbox-th').eq(ind).addClass('showbox-th-active');
        
        var img = $('<img class="showbox-img" style="display:none;"/>')            
        .prependTo('#showbox .showbox-image').click(ShowBox._next);    
                      
        img.attr('src',ShowBox._images[ShowBox._current][ind][0])
        .load(function(){
            var iW = $(this).width();
            var iH = $(this).height();
            $(this).attr({
                width:iW,
                height:iH
            }).fadeIn(400);
            $('#showbox-loader').hide();   
            $('#showbox .showbox-menubar').show();
            ShowBox.RESIZE();
        });
    },
    _setCounter: function(num,total) {
        $('#showbox .showbox-th-counter').html(num+' of '+total);
    },
    _clearHash: function() {
        window.location.hash = '!';
    },
	opened: function() {
		return ShowBox._opened;
	},
    EXIT: function(el){
        ShowBox._clearHash();
        ShowBox._opened = false;
        $('body').css('overflow','auto');
        $('#showbox').hide();
        ShowBox.options.closeCallback();
        $('#showbox .showbox-menubar').hide();
        $('#showbox .showbox-image img').remove();
		$('#showbox-thc'+ShowBox._current+' .showbox-th-container').css({position:'absolute',top:'-10000px'});
        $('#showbox-thc'+ShowBox._current).detach().appendTo('body');
    },
    KEYPRESSED: function(e) {
        if(e.keyCode==27) {
            ShowBox.EXIT();
        }
        if(e.keyCode==39) {
            ShowBox._next();
        }
        if(e.keyCode==37) {
            ShowBox._prev();
        }
    },
    OPENPREVIEW: function(el){
        $(el).animate({bottom:0},{queue: false,duration:150});
    },
    CLOSEPREVIEW: function(el){
        $(el).animate({bottom:-75},{queue: false,duration:150});
    },
    LOCKPREVIEW: function(el){
        ShowBox._preview_locked = ShowBox._preview_locked?false:true;
        if(ShowBox._preview_locked) {
            $('#showbox .showbox-pv-lock').show();
            $(el).css({
                'background': '#111',
                'border-top': '1px solid #383838'
            });
        } else {
            $('#showbox .showbox-pv-lock').hide();
            $(el).css({
                'background': '',
                'border-top': ''
            });
        }
    },
    RESIZE: function(el){
        if(!ShowBox._opened) return;
        var showbox = $('#showbox');
        var img = $('#showbox .showbox-image img');
        var cW  = showbox.width();
        var cH  = showbox.height()-146;
        if(!ShowBox.options.menuBarContent)
            cH  = showbox.height()-111;
        var iH  = parseInt(img.attr('height'));
        var iW  = parseInt(img.attr('width'))
        var factor = 1;
        if(iH > (cH))
            factor = cH/iH;
        if(iW > cW)    
            factor *= cW/iW;
        var imW  = Math.round(factor * iW);
        var imH  = Math.round(factor * iH);
        if(imH > iH || imW > iW) {
            imW = iW;
            imH = iH;
        }
        var imL  = Math.round((cW - imW)/2);
        var imT  = Math.round((cH - imH)/2)+5;
        $('#showbox .showbox-image').css({
            'width': imW+'px',
            'height': imH+'px',
            'margin-left': imL+'px',
            'margin-top': imT+'px'
        }).find(' img').css({
            'width': imW+'px',
            'height': imH+'px'
        });
        var thL = Math.round(cW/2) - (ShowBox._index * 64 + 30);
        $('#showbox .showbox-th-container').animate({
            left:  thL
        },{duration:300,queue:false});	
	}
}
