WDN.navigation = function() {
    var expandedHeight = 0;
    var ul_h, lockHover = false;
    return {

        preferredState : 0,

        currentState : -1,

        /**
         * URL determined to be this site's homepage
         */
        siteHomepage : false,

        /**
         * DOM element for the "HOME" LI
         */
        homepageLI : false,

        /**
         * Stores an expand/collapse timeout.
         */
        timeout : false,

        /**
         * The delay before expand occurs
         */
        expandDelay : 400,

        /**
         * The delay before collapse occurs
         */
        collapseDelay : 120,

        changeSiteNavDelay : 400,
        
        cssTransitionsSupport : (function(){
        	q = false;
        	var div = document.createElement('div');
        	div.innerHTML = '<div style="-webkit-transition:color 1s linear;-ms-transition:color 1s linear;-o-transition:color 1s linear;-moz-transition:color 1s linear;"></div>';
        	q = (div.firstChild.style.webkitTransition !== undefined) || (div.firstChild.style.MozTransition !== undefined) || (div.firstChild.style.OTransition !== undefined) || (div.firstChild.style.MsTransition !== undefined);
        	delete div;
        	return q;
        })(),
        
        /**
         * Initialize the navigation, and determine what the correct state
         * should be (expanded/collapsed).
         * @todo determine what it should be
         */
        initialize : function() {
        	if (WDN.jQuery('body').hasClass('popup')
                || WDN.jQuery('body').hasClass('document')
                || WDN.jQuery('#breadcrumbs ul li').size() == 0) {
                // This page has no navigation
                return;
            }
        	
        	WDN.log('let us fix the presentation');
        	WDN.navigation.fixPresentation();

            WDN.navigation.determineSelectedBreadcrumb();
            WDN.navigation.linkSiteTitle();
			
            // Store the current state of the cookie
            if (WDN.getCookie('n') == 1) {
                WDN.navigation.preferredState = 1;
            }
            
            // find the last-link in breadcrumbs
            WDN.jQuery('#breadcrumbs > ul > li > a').last().parent().addClass('last-link');
            
            // add an expand toggler UI element
            var $toggler = WDN.jQuery('<div class="expand_toggle"><a href="#" /></div>').prependTo('#wdn_navigation_wrapper');
            $toggler.children('a').click(function(evt) {
            	if (WDN.navigation.currentState === 0) {
            		WDN.navigation.expand();
            	} else {
            		WDN.navigation.collapse();
            	}
            	return false;
            });
            $toggler.hover(function() {
            	lockHover = !lockHover;
            	WDN.jQuery('#wdn_navigation_bar').mouseout();
            }, function() {
            	lockHover = !lockHover;
            	WDN.jQuery('#wdn_navigation_bar').mouseover();
            });
            
            // add the pinned state UI element
            var $pin = WDN.jQuery('<div class="pin_state"><a href="#" /></div>').appendTo('#wdn_navigation_wrapper');
            $pin.children('a').click(function(evt) {
            	WDN.navigation.setPreferredState(evt);
            	return false;
            });
            
            WDN.loadJS('wdn/templates_3.0/scripts/plugins/hoverIntent/jQuery.hoverIntent.js', function() {
                WDN.jQuery('#breadcrumbs ul li a').hoverIntent({
                    over:        WDN.navigation.switchSiteNavigation,
                    out:         function(){},
                    timeout:     WDN.navigation.changeSiteNavDelay,
                    sensitivity: 1, // Mouse must not move
                    interval:    120
                });
                WDN.navigation.initializePreferredState();
            });
        },
        
        /**
         * This function cleans up the navigation visual presentations
         */
        fixPresentation : function(){
        	var primaries = WDN.jQuery('#navigation > ul > li');
        	var primaryCount = primaries.length;
        	while (primaryCount % 6 > 0) {
        		WDN.jQuery('#navigation > ul').append('<li class="empty"><a /><ul><li/></ul></li>');
        		primaryCount++;
        	}
        	primaries = WDN.jQuery('#navigation > ul > li');
        	
        	var secondaries = primaries.has('ul');
        	if (secondaries.length){
        		primaries.not(':has(ul)').each(function(){
        			WDN.jQuery(this).append('<ul><li/></ul>');
        		});
        	}
        	
        	// fix old IE for CSS3
        	var majorIEVersion = WDN.jQuery.browser.version.split(".")[0];
        	if (WDN.jQuery.browser.msie && majorIEVersion < 9) {
        		WDN.log("Fixing IE CSS3");
        		var $bar_starts = WDN.jQuery('#navigation > ul > li:nth-child(6n+1)');
        		$bar_starts.addClass('start');
        		WDN.jQuery('#navigation > ul > li:nth-child(6n+6)').addClass('end');
        		WDN.jQuery('#navigation > ul > li:nth-child(n+7)').addClass('mid-bar');
        		$bar_starts.last().prevAll().addClass('top-bars');
        		WDN.jQuery('#navigation > ul > li ul li:last-child').addClass('last');
        	}
        	
        	var ah = [];
        	var primaryLinks = WDN.jQuery('> a', primaries);
            primaryLinks.each(function(i){
            	var row = Math.floor(i/6);
            	var height = WDN.jQuery(this).outerHeight();
                if(!ah[row] || height > ah[row]) {
                    ah[row] = height;
                }
            });
            
            primaryLinks.each(function(i){
            	var row = Math.floor(i/6);
            	var height = WDN.jQuery(this).outerHeight();
            	var pad = parseFloat(WDN.jQuery(this).css('padding-top'));
                if (height < ah[row]) {
                	var new_ah = [(ah[row] - height) / 2];
                	new_ah[1] = new_ah[0];
                	
                	if (WDN.jQuery.browser.msie) {
                		 if (majorIEVersion == 8) {
                			 new_ah[0] -= 1;
                		 } else if (majorIEVersion == 7 && WDN.jQuery(this).parent().hasClass('empty')) {
                			 new_ah[0] -= 1;
                			 new_ah[1] -= 1;
                		 }
                	}
                	WDN.jQuery(this).css({
                		'padding-top' : new_ah[0] + pad + 'px',
            			'padding-bottom' : new_ah[1] + pad + 'px'
                	});
                }
            });
            
    		ul_h = [];
    		var secondaryLists = WDN.jQuery('ul', primaries);
        	secondaryLists.each(function(i){
        		var row = Math.floor(i/6), height;
        		if (WDN.jQuery('body').hasClass('liquid') && !(WDN.jQuery.browser.msie && majorIEVersion < 8)) {
        			height = WDN.jQuery(this).outerHeight();
        		} else {
        			height = WDN.jQuery(this).height();
        		}
        		if(!ul_h[row] || height > ul_h[row]) {
        			ul_h[row] = height;
        		}
        	});
        	//loop through again and apply new height
        	secondaryLists.each(function(i){
        		var row = Math.floor(i/6);
    	    	WDN.jQuery(this).css({'height':ul_h[row]+'px'});
            });
        	
        	// Fix liquid box-sizing
    		if (WDN.jQuery('body').hasClass('liquid') && WDN.jQuery.browser.msie && majorIEVersion < 8) {
    			// Fix box-size
    			var firstRun = true;
    			var resizeFunc = function() {
    				var $wrapper = WDN.jQuery('#wdn_navigation_wrapper');
    				
    				$wrapper.css('width', '');
    				$wrapper.css('padding-right', 0);
    				$wrapper.each(function() {
    					var contentWidth = WDN.jQuery(this).width();
    					var outerWidth = WDN.jQuery(this).outerWidth();
    					WDN.jQuery(this).css('width', contentWidth * 2 - outerWidth);
					});
    				
    			};
    			resizeFunc();
    			WDN.jQuery(window).unbind('resize').bind('resize', resizeFunc);
    		}
        	
        	WDN.log('we have fixed the presentation.');
        },
        
        transitionEnd: function() {
        	WDN.navigation.setWrapperClass('expanded');
        },
        
        /**
         * This function should determine which breadcrumb should be selected.
         */
        determineSelectedBreadcrumb : function() {
            // First we search for a defined homepage.

            if (WDN.jQuery('link[rel=home]').length) {
                WDN.navigation.siteHomepage = WDN.toAbs(WDN.jQuery('link[rel=home]').attr('href'), window.location.toString());
                WDN.log('Setting homepage to '+WDN.navigation.siteHomepage);
            }

            if (WDN.navigation.siteHomepage === false) {
                WDN.log('No homepage set!');
                // Right now, stupidly select the second element.
                WDN.navigation.setHomepageLI(WDN.jQuery('#breadcrumbs > ul >  li:nth-child(2)'));
            } else {
                WDN.log('Homepage has been set.');
                // Make all the hrefs absolute.
                WDN.jQuery('#breadcrumbs > ul > li > a').each(
                        function() {
                            if (this.href == WDN.navigation.siteHomepage) {
                                WDN.navigation.setHomepageLI(WDN.jQuery(this).parent());
                                return false;
                            }
                        }
                    );
                if (WDN.jQuery('#breadcrumbs > ul > li.selected').size() < 1) {
                    WDN.log('We are on the current homepage.');
                    WDN.navigation.setHomepageLI(WDN.jQuery('#breadcrumbs > ul > li:last-child'));
                }
            }
        },

        setHomepageLI: function(li)
        {
            WDN.navigation.homepageLI = li;
            WDN.jQuery(li).addClass('selected');
            if (WDN.jQuery(li).children('a').size()) {
                // Found the homepage url in the breadcrumbs
                WDN.navigation.siteHomepage = WDN.jQuery(li).find('a').attr('href');
            } else {
                // Assume it's the current page
                WDN.navigation.siteHomepage = window.location;
                WDN.jQuery(li).wrapInner('<a href="'+WDN.navigation.siteHomepage+'"></a>');
            }
        },

        /**
         * This function will check for/add a link to the homepage in the site title.
         */

        linkSiteTitle: function() {
            // check if the link already exists
            if (WDN.jQuery("#titlegraphic h1 a").length > 0 || !WDN.navigation.siteHomepage) {
                return;
            }
            // create the link using whatever the Homepage is set to
            WDN.jQuery("#titlegraphic h1").wrapInner('<a href="' + WDN.navigation.siteHomepage +'" />');
        },
        
        /**
         * Expand the navigation section.
         */
        expand : function() {
        	WDN.log('expand called');
        	if (WDN.navigation.currentState === 1) {
        		return;
        	}
        	
        	if (WDN.navigation.currentState !== -1 && WDN.navigation.preferredState != 1 && WDN.navigation.cssTransitionsSupport) {
        		WDN.navigation.setWrapperClass('changing');
        	} else {
        		WDN.navigation.transitionEnd();
        	}
        	
        	WDN.navigation.currentState = 1;
        },

        /**
         * Collapse the navigation
         */
        collapse : function(switchNav) {
            WDN.log('collapse called');
            if (WDN.navigation.currentState === 0) {
                return;
            }
            
            WDN.navigation.setWrapperClass('collapsed');
            WDN.navigation.currentState = 0;
            if (switchNav !== false) {
            	WDN.navigation.switchSiteNavigation(WDN.jQuery(WDN.navigation.homepageLI).children('a:first-child'), false);
            }
        },

        /**
         * Set a delay for collapsing the navigation.
         */
        startCollapseDelay: function(event) {
            WDN.log('start collapse delay');
            clearTimeout(WDN.navigation.timeout);
            if (WDN.navigation.currentState === 0 || WDN.navigation.preferredState == 1) {
                // Already collapsed, or, prefer to stay open
                return;
            }
            WDN.navigation.timeout = setTimeout(WDN.navigation.collapse, WDN.navigation.collapseDelay);
        },

        setPreferredState : function(event) {
            WDN.log('set preferred state');
            if (WDN.getCookie('n')!=1) {
                WDN.log('Setting preferred navigation state OPEN');

                WDN.setCookie('n',1,1209600);
                WDN.navigation.preferredState = 1;
                WDN.analytics.trackNavigationPreferredState("Open");
            } else {
                WDN.log('Setting preferred navigation state CLOSED');
                WDN.setCookie('n',0,-100);
                WDN.navigation.preferredState = 0;
                WDN.analytics.trackNavigationPreferredState("Closed");
            }
            WDN.navigation.initializePreferredState();
        },

        /**
         * This function determines the user's preference for navigation.
         * There are two options, expanded or collapsed.
         */
        initializePreferredState : function() {
            WDN.log('initializepreferredstate, current state is '+WDN.navigation.currentState);
            
            WDN.jQuery('#navigation').addClass('disableTransition');
            var mouseout;
            var pinUI = WDN.jQuery('#wdn_navigation_wrapper .pin_state a');
            
            if (WDN.navigation.preferredState == 1) {
            	mouseout = WDN.jQuery.noop;
            	pinUI.attr('title', 'Click to un-pin');
            	WDN.navigation.expand();
        	} else {
        		mouseout = function() {
        			if (!lockHover) {
        				WDN.navigation.startCollapseDelay();
        			}
        		};
        		pinUI.attr('title', 'Click to pin open');
        		WDN.navigation.collapse(false);
        	}
            
            WDN.navigation.applyStateFixes();
            
            if (WDN.navigation.cssTransitionsSupport) {
            	WDN.jQuery('#navigation').bind(
        			'webkitTransitionEnd transitionend oTransitionEnd msTransitionEnd',
        			function(event) {
        				if (WDN.navigation.currentState == 1) {
        					WDN.navigation.transitionEnd();
        				}
        			}
            	);
            }

            WDN.jQuery('#wdn_navigation_bar').hoverIntent({
                over:        function() {
                	if (!lockHover) {
                		WDN.navigation.expand();
                	}
                },
                out:         mouseout,
                timeout:     WDN.navigation.expandDelay,
                sensitivity: 1, // Mouse must not move
                interval:    120
            });
            
            WDN.jQuery('#navigation').removeClass('disableTransition');
        },
        
        applyStateFixes : function() {
        	WDN.jQuery('#wdn_content_wrapper').css('margin-top', '');
        	
        	if (WDN.navigation.preferredState == 1) {
        		WDN.navigation.setWrapperPState('pinned');
        	} else {
	        	WDN.navigation.setWrapperPState('unpinned');
	        	var nav_height = WDN.jQuery('#wdn_navigation_wrapper').height();
	        	if (nav_height > 41) {
	        		WDN.jQuery('#wdn_content_wrapper').css('margin-top', nav_height);
	        	}
        	}
        },

        switchSiteNavigation : function(event, expand) {
            WDN.log('Switch site nav called');
            if (expand === undefined) {
                expand = true;
            }
            var breadcrumb = (event.target) ? event.target : event;
            if (WDN.jQuery(breadcrumb).parent().hasClass('selected')) {
                WDN.log('already showing this nav');
                return true;
            }

            var height = WDN.jQuery('#navigation > ul').height() || 50;
            var oldSelected = WDN.jQuery('#breadcrumbs > ul > li.selected:first');

            if (!WDN.jQuery('div.storednav', oldSelected).length && WDN.jQuery('#navigation > ul').length) {
                WDN.log('Storing it');
                // Store the current navigation
                WDN.navigation.storeNav(oldSelected, WDN.jQuery('#navigation > ul'));
            } else {
                WDN.jQuery('#navigation > ul').remove();
            }

            // Set the hovered breadcrumb link to selected
            oldSelected.removeClass('selected');
            WDN.jQuery(breadcrumb).parent().addClass('selected');
            // Check for stored navigation
            if (WDN.jQuery(breadcrumb).siblings('div.storednav').length) {
                WDN.log("Already got it.");
                // We've already grabbed the nav for this link
                WDN.navigation.setNavigationContents(WDN.jQuery(breadcrumb).siblings('div.storednav').children().clone(), expand);
                return true;
            }

            WDN.jQuery('#navloading').remove();
            WDN.jQuery('#navigation').append('<div id="navloading" style="height:'+height+'px;"></div>');

            var nav_sniffer = 'http://www1.unl.edu/wdn/templates_3.0/scripts/navigationSniffer.php?u=';
            nav_sniffer = nav_sniffer+escape(WDN.toAbs(breadcrumb.href, window.location));
            WDN.log('Attempting to retrieve navigation from '+nav_sniffer);
            WDN.get(nav_sniffer, '', function(data, textStatus) {
                try {
                    if (textStatus == 'success') {
                        var breadcrumbParent = WDN.jQuery(breadcrumb).parent();
                        WDN.navigation.storeNav(breadcrumbParent, data);
                        if (breadcrumbParent.hasClass('selected')) {
                            WDN.navigation.setNavigationContents(data, expand);
                        }
                    } else {
                        // Error message
                        WDN.log('Incorrect status code returned remotely retrieving navigation.');
                        WDN.log(data);
                        WDN.log(textStatus);
                    }
                } catch(e) {
                    WDN.log('Caught error remotely retrieving navigation.');
                    WDN.log(e);
                }
            });
            return false;
        },

        setNavigationContents : function(contents, expand) {
        	WDN.log('setNavigationContents called');
        	WDN.jQuery('#navigation').addClass('disableTransition');
            WDN.jQuery('#navloading').remove();
            WDN.jQuery('#navigation').children('ul').remove()
                .end().prepend(contents);
            
            WDN.navigation.currentState = -1;
            WDN.navigation.setWrapperClass('expanded');
            WDN.navigation.fixPresentation();
            WDN.navigation.collapse(false);
        	WDN.navigation.applyStateFixes();
        	
        	WDN.jQuery('#navigation').removeClass('disableTransition');
        	
        	if (expand) {
        		WDN.navigation.expand();
        	}
        },

        setWrapperClass : function(css_class) {
        	var $wrapper = WDN.jQuery('#wdn_wrapper');
        	$wrapper.removeClass('nav_changing');
        	
            if (css_class=='collapsed') {
            	$wrapper.removeClass('nav_expanded nav_changing').addClass('nav_'+css_class);
                return;
            }

            $wrapper.removeClass('nav_collapsed').addClass('nav_'+css_class);
        },
        
        setWrapperPState : function(css_class) {
        	WDN.jQuery('#wdn_wrapper').removeClass('nav_changing nav_unpinned nav_pinned').addClass('nav_' + css_class);
        },

        storeNav : function(li, data) {
            var storednavDiv = WDN.jQuery(li).children('div.storednav');
            if (storednavDiv.length) {
                storednavDiv.empty();
            } else {
                storednavDiv = WDN.jQuery('<div class="storednav"/>');
                WDN.jQuery(li).append(storednavDiv);
            }
            storednavDiv.append(data);
        }
    };
}();