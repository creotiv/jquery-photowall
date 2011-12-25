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
};
 
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

(function(w, d, s) {
  function go(){
    var js, fjs = d.getElementsByTagName(s)[0], load = function(url, id) {
	  if (d.getElementById(id)) {return;}
	  js = d.createElement(s); js.src = url; js.id = id;
	  fjs.parentNode.insertBefore(js, fjs);
	};
    load('https://connect.facebook.net/en_US/all.js#xfbml=1', 'fbjssdk');
    load('https://apis.google.com/js/plusone.js', 'gplus1js');
    load('https://platform.twitter.com/widgets.js', 'tweetjs');
  }
  if (w.addEventListener) { w.addEventListener("load", go, false); }
  else if (w.attachEvent) { w.attachEvent("onload",go); }
}(window, document, 'script'));

/*
    TODO: Add screen size check on zoom.
*/
var PhotoWall = {
	photos: {},
	gallery: [],
	el: null,
	options: {},

	_next_line_factor: 0.95,
	_remove_image_factor: 1.15,
	_c_width: 0,
	_c_height: 0,
	_zoom_trigger: null,
	_zs: null,
	_zoom_timeout: null,
	_last_line: [],
	_show_box_padding: 45,
	_show_box_menubar: 35,
	_show_box_current: null,
	_show_box_current_ind: 0,
    _show_box_lunched: false,
	_must_resize: false,
	
	init: function(op) {	
	    PhotoWall.options = $.extend({
	        lineMaxHeight:150
	        ,padding:10
	        ,zoomAction:'mouseenter'
	        ,zoomTimeout:500
	        ,zoomDuration:300
	        ,showBoxPadding: 2
	        ,showBoxThumbSize: 60
        },op);
        
		PhotoWall.el = op.el+' .body';
		PhotoWall._c_width = $(PhotoWall.el).width()-getScrollBarWidth();
		PhotoWall._c_height = $(PhotoWall.el).height();	
		$(PhotoWall.el).html('');
		
		$(window).resize(PhotoWall._resize);
	},
	_resize: function() {
		var w = $(PhotoWall.el).width();
		var h = $(PhotoWall.el).height();	
        if($('#showbox').is(":visible") || 
           (PhotoWall._c_width == w && PhotoWall._c_height == h)
        ) {PhotoWall._must_resize=true;return;}
        PhotoWall._c_width = w;
		PhotoWall._c_height = h;	
        PhotoWall._must_resize=false;
		$(PhotoWall.el).html('');
		PhotoWall.show();
	},
	// Here we resize all photos to max line height and replace main data array.
	load: function(data) {
	    var items = [];
	    for(var i in data) {
	        var el = data[i];
	        var fact  = PhotoWall.options.lineMaxHeight/el.th[0].height;
	        var fact2 = el.th[1].height/el.th[0].height;
	        
			data[i]['th'][0].width  = Math.floor(data[i]['th'][0].width * fact);
			data[i]['th'][0].height = PhotoWall.options.lineMaxHeight;
		    data[i]['th'][1].width  = Math.floor(data[i]['th'][0].width * fact2);
		    data[i]['th'][1].height = Math.floor(data[i]['th'][0].height * fact2);
	        items.push(data[i]);
	    }
        PhotoWall.photoIndex = items;
        PhotoWall.photos = data;
		PhotoWall.show();
	},
	// Here we resize all photos to max line height and update main data array.
	update: function(data) {
	    var items = [];
	    for(var i in data) {
	        var el = data[i];
	        var fact  = PhotoWall.options.lineMaxHeight/el.th[0].height;
	        var fact2 = el.th[1].height/el.th[0].height;
	        
			data[i]['th'][0].width  = Math.floor(data[i]['th'][0].width * fact);
			data[i]['th'][0].height = PhotoWall.options.lineMaxHeight;
		    data[i]['th'][1].width  = Math.floor(data[i]['th'][0].width * fact2);
		    data[i]['th'][1].height = Math.floor(data[i]['th'][0].height * fact2);
	        items.push(data[i]);
	    }
        PhotoWall.photoIndex = items;
        PhotoWall.photos = $.extend(PhotoWall.photos,data);
		PhotoWall.show(data);
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
		    if(!PhotoWall.photos) return;
		    $(PhotoWall.el).html('');
		    $(window).scrollTop(0);
		    imgArray = PhotoWall.photos;
		} else {
	        imgArray   = data;
            line       = PhotoWall._last_line[0];
		    totalWidth = PhotoWall._last_line[1];
		}
		var type = 'display:inline-block;';
		if($.browser.msie) 
			type = 'float:left;';
			
		var showLine = function(line,total_width,last) {
		    var ln = $("<div class='line' style='float:left'></div>")
                     .appendTo(PhotoWall.el); 
			var hCoef = PhotoWall._c_width / total_width;
			if(last)
				var hCoef = 1;
			var l = 0;
			var max = line.length;			
			
			for(var k in line) {	
				var w = Math.round(line[k].th[0].width*hCoef);
				var h = Math.round(line[k].th[0].height*hCoef);
				l += w+PhotoWall.options.padding;
				if(max-1 == k && !last) {
					w += PhotoWall._c_width - l;
					l += PhotoWall._c_width - l;
				}
				var t = $('<div id="'+line[k].id+'" class="pw-photo clearfix" style="'
				          +'position:relative;margin:'
				          +Math.round(PhotoWall.options.padding/2)+'px;'
				          +'top:0px;left:0px;width:'+w+'px;height:'+h+'px;'+type
				          +'"><a class="pw-link" href="'+line[k].img
				          +'"><img class="pw-zoom" style="position:absolute;'
				          +'top:0px;left:0px;" src="'+line[k].th[0].src+'" '
				          +'width="'+w+'" height="'+h+'" /></a></div>'
				        );
				if($.browser.msie) {
					t.find('img').hide().load(function(){$(this).fadeIn(3000);});
				} else {
					t.find('img').css('opacity',0).load(function(){
					    $(this).delay(Math.random()*(1000 - 300)+300)
					           .animate({"opacity":1},{duration:1000})
		            });
				}
				ln.append(t);
			}
			return ln;
		};
		var first = true;
		for(var i in imgArray) {	
			var e = imgArray[i];
			line.push(e);
			totalWidth += e.th[0].width+PhotoWall.options.padding;
			
			if(totalWidth >= PhotoWall._c_width*PhotoWall._next_line_factor 
			&& totalWidth <= PhotoWall._c_width*PhotoWall._remove_image_factor) 
			{
			    if(first && PhotoWall._last_line.length) { 
		            PhotoWall._last_line[2].remove();
			        first = false;
		        }
				var ln = showLine(line,totalWidth);
                PhotoWall._last_line = [line,totalWidth,ln];
				line = [];
				totalWidth = 0;
			} 
			else if(totalWidth >= PhotoWall._c_width*PhotoWall._next_line_factor 
			&& totalWidth > PhotoWall._c_width*PhotoWall._remove_image_factor) 
			{
			    if(first && PhotoWall._last_line.length) { 
		            PhotoWall._last_line[2].remove();
			        first = false;
		        }
				line.pop();
				showLine(line,totalWidth-e.th[0].width-PhotoWall.options.padding);
				line = [e];
				totalWidth = e.th[0].width+PhotoWall.options.padding;
			}	
		}
		if(line) {
		    if(first && PhotoWall._last_line.length) { 
	            PhotoWall._last_line[2].remove();
		        first = false;
	        }
			var ln = showLine(line,totalWidth,1);
		    PhotoWall._last_line = [line,totalWidth,ln];
		}
		PhotoWall.initGUI(); 
	},
	/*
	    Initialize GUI.
	*/
	initGUI: function() {
	    if(PhotoWall.options.zoom)
		    PhotoWall.initZoom();
		if(PhotoWall.options.showBox)
		    ShowBox.init('#gallery a.pw-link',{
		        closeCallback:function(){
		            PhotoWall._resize();
		            if(PhotoWall._zs) {;
			            var th = PhotoWall._zs[0];
			            var thn = PhotoWall._zs[1];
			            PhotoWall._zs = null;
			            thn.find('img').css({
				            "width": $(th).width(),
				            "height": $(th).height(),
				            "padding":0
			            });
			            thn.css({
				            "left": $(th).offset().left-PhotoWall.options.padding*0.5,
				            "top": $(th).offset().top-PhotoWall.options.padding*0.5
			            });
			            thn.remove();
				    }
	            },
	            menuBarContent: '<div style="float:left;margin-top: 5px;width:80px;"><div class="g-plusone" data-size="medium"></div></div><div style="float:left;margin-top:5px;width:90px;"><a href="https://twitter.com/share" class="twitter-share-button">Tweet</a></div><div style="float:left;margin-top:5px;width:80px;" id="fblike"><fb:like send="false" layout="button_count" width="100" show_faces="false"></fb:like></div>',
	            socialUpdate: true
		    });
	},
	/*
	    Initialize image zoom on mouse over.
	*/
	initZoom: function() {
		$(".pw-zoom").live('mouseleave',function(){
		    clearTimeout(PhotoWall._zoom_timeout);
		    var t = $(this).parent().parent();
		    t.css({'box-shadow':'none'});			
			t.css({'-webkit-box-shadow':'none'});
			t.css({'-moz-box-shadow':'none'});
		});
		
		$(".pw-zoom").live(PhotoWall.options.zoomAction,function () {
			var tht = this;
			if(!parseInt($(tht).css('opacity'))) return;
			clearTimeout(PhotoWall._zoom_timeout);
			PhotoWall._zoom_trigger = this;
			var th = $(this).parent().parent();
			th.css({'box-shadow':'0 0 '+(PhotoWall.options.padding*0.5)+'px rgba(0,0,0,0.7)'});			
			th.css({'-webkit-box-shadow':'0 0 '+(PhotoWall.options.padding*0.5)+'px rgba(0,0,0,0.7)'});
			th.css({'-moz-box-shadow':'0 0 '+(PhotoWall.options.padding*0.5)+'px rgba(0,0,0,0.7)'});
			PhotoWall._zoom_timeout = setTimeout(function(){
				var th = tht;
				if(PhotoWall._zoom_trigger != th) return;
				
				if(PhotoWall._zs) {;
			        var th = PhotoWall._zs[0];
			        var thn = PhotoWall._zs[1];
			        PhotoWall._zs = null;
			        thn.find('img').css({
				        "width": $(th).width(),
				        "height": $(th).height(),
				        "padding":0
			        });
			        thn.css({
				        "left": $(th).offset().left-PhotoWall.options.padding*0.5,
				        "top": $(th).offset().top-PhotoWall.options.padding*0.5
			        });
			        thn.remove();
				}
				
				var photo  = $(th).parent().parent();
				var item   = PhotoWall.photos[photo.attr('id')];

				var bigIMG = $('<img/>');
				bigIMG.attr('src',item.th[1].src);
				thn = photo.clone();
				thn.addClass('pw-zoomed');
				bigIMG.load(function(){ 
				    var t1 = $(th);
				    var t2 = thn.find('img');
				    t1.attr('src',$(this).attr('src'));
					t2.attr('src',$(this).attr('src'));
					$(this).remove();
				});		
				
				PhotoWall._zs = [th,thn];
				thn.appendTo(PhotoWall.el);
				thn.css({
					"position":"absolute",
					"left":$(th).offset().left-PhotoWall.options.padding*0.5+"px",
					"top":$(th).offset().top-PhotoWall.options.padding*0.5+"px"	
				});
					
				var w  = item.th[1].width;
				var h  = item.th[1].height;
				var dw = item.th[1].width - item.th[0].width;
				var dh = item.th[1].height - item.th[0].height;
				var l  = -(dw) * 0.5-PhotoWall.options.padding*0.5;
				var t  = -(dh) * 0.5-PhotoWall.options.padding*0.5;
				var o  = $(th).offset(); 
				var wn = $(window);
				
				if(o.left + l + w > (wn.width()+wn.scrollLeft()))
					l -= (o.left + l + w) - (wn.width()+wn.scrollLeft())+PhotoWall.options.padding*2; 
				
				if(o.left + l < +wn.scrollLeft())
					l -= (o.left + l)-wn.scrollLeft();
				
				if(o.top + t + h > (wn.height()+wn.scrollTop()))
					t -= (o.top + t + h) - (wn.height()+wn.scrollTop())+PhotoWall.options.padding*2; 
				
				if(o.top + t < wn.scrollTop())
					t -= (o.top + t)-wn.scrollTop();
	
				l = o.left + l;
				t = o.top + t;
				thn.find('img').removeClass('pw-zoom');
				thn.animate({
					"left": l,
					"top": t,
					"width": w+PhotoWall.options.padding,
					"height": h+PhotoWall.options.padding
				}, {
					queue: false,
					duration: PhotoWall.options.zoomDuration,
					easing: 'linear'
				});
				thn.find('img').animate({
					"width": w,
					"height": h,
					"padding": PhotoWall.options.padding*0.5
				}, {
					queue: false,
					duration: PhotoWall.options.zoomDuration,
				    easing: 'linear'
				});
				thn.css("z-index", 1000);
			},PhotoWall.options.zoomTimeout);
		});
		
		$('.pw-zoomed').live('mouseleave',function(){
			if(!PhotoWall._zs) return;
			var th = PhotoWall._zs[0];
			var thn = PhotoWall._zs[1];
			PhotoWall._zs = null;
			thn.find('img').css({
				"width": $(th).width(),
				"height": $(th).height(),
				"padding":0
			});
			thn.css({
				"left": $(th).offset().left-PhotoWall.options.padding*0.5,
				"top": $(th).offset().top-PhotoWall.options.padding*0.5
			});
			thn.remove();
		});
	}
}

var ShowBox = {
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
        socialUpdate: true
    },

    init: function(el_or_data,op) {
        ShowBox.options = $.extend(ShowBox.options,op);
        
        ShowBox._init(el_or_data);
        ShowBox._initEvents(el_or_data);
        ShowBox._parseGet();
    },
    _init: function(el) {
        ShowBox._images.push([]);
        if(!ShowBox._inited) {
            $(
                '<div id="showbox" style="display:none;">'
                +'    <div id="showbox-exit"></div>'
                +'    <div class="showbox-menubar unselect" unselectable="on" style="display:none">'
                +         ShowBox.options.menuBarContent
                +'    </div>'
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
            '<div id="showbox-thc'+(ShowBox._images.length-1)+'" class="showbox-th-container clearfix" style="position:absolute;top:-10000px;"></div>'
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
        $('#showbox-thc'+gal).css({position:'',top:'0px'});
        $('#showbox-loader').show();
        $('body').css('overflow','hidden');
        $('#showbox').fadeIn(200,function() {
            ShowBox._opened = true;
            ShowBox._changeImage(ShowBox._index);
        });
    },
    _addThumb: function(gal,im,i) {
        $('<div class="showbox-th"><img src="'+im+'" /></div>')
        .appendTo('#showbox-thc'+gal).find('img').load(function(){
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
    _updateSocials: function() {
        if(ShowBox.options.socialUpdate) {
            if(typeof(FB) !== 'undefine')
                 FB.XFBML.parse(document.getElementById('fblike'));
            if(typeof(gapi) !== 'undefined')
                gapi.load('googleapis.client:plusone:gcm_ppb');
            if(typeof(twttr) !== 'undefined') {
                $('#showbox .twitter-share-button').attr('data-url',location.href);
                twttr.widgets.load();
            }
        }
    },
    _changeImage: function(ind) {
        $('#showbox-loader').show();
        $('#showbox .showbox-menubar').hide();
        $('#showbox .showbox-menubar div').remove();
        ind = parseInt(ind);
        var total = ShowBox._images[ShowBox._current].length;
        ShowBox._setCounter(ind+1,total);
        window.location.hash = 'p='+(ind+1)+'&gal='+(ShowBox._current+1);
        $('#showbox .showbox-menubar').append(ShowBox.options.menuBarContent);
        ShowBox._updateSocials();
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
            }).fadeIn(200);
            $('#showbox-loader').hide();   
            $('#showbox .showbox-menubar').show();
            ShowBox.RESIZE();
        });
    },
    _setCounter: function(num,total) {
        $('#showbox .showbox-th-counter').html(num+' of '+total);
    },
    _clearHash: function() {
        window.location.hash = '_';
    },
    EXIT: function(el){
        ShowBox._clearHash();
        ShowBox._opened = false;
        $('body').css('overflow','auto');
        $('#showbox').hide();
        ShowBox.options.closeCallback();
        $('#showbox .showbox-image img').remove();
        $('#showbox-thc'+ShowBox._current).detach()
        .css({position:'absolute',top:'-10000px'}).appendTo('body');
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
        var cH  = showbox.height()-141;
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
        var imT  = Math.round((cH - imH)/2);
        $('#showbox .showbox-image').css({
            'width': imW+'px',
            'height': imH+'px',
            'margin-left': imL+'px',
            'margin-top': imT+'px'
        }).find(' img').css({
            'width': imW+'px',
            'height': imH+'px',
        });
        var thL = Math.round(cW/2) - (ShowBox._index * 64 + 30);
        $('#showbox .showbox-th-container').css({
            left:  thL+'px',
        });
    },
    
}
