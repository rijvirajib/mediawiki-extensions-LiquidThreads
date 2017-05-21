/**
 * LiquidThreads core javascript library.
 *
 * Exposes global object `liquidThreads`.
 * Exposes static method `jQuery.getCSS`.
 */

/* global liquidThreads */

( function ( mw, $ ) {

	window.wgWikiEditorIconVersion = 0;

	$.getCSS = function ( url, media ) {
		$( '<link>' ).attr( {
			href: url,
			media: media || 'screen',
			type: 'text/css',
			rel: 'stylesheet'
		} ).appendTo( 'head' );
	};

	window.liquidThreads = {
		currentReplyThread: null,
		currentToolbar: null,

		handleReplyLink: function ( e ) {
			var $container, threadId, params, $repliesElement, $replyDiv,
				$target = $( this );

			if ( e.preventDefault ) {
				e.preventDefault();
			}

			if ( !this.className && e.target ) {
				$target = $( e.target );
			}

			$container = $target.closest( '.lqt_thread' );
			threadId = $( this ).data( 'thread-id' );

			// hide the form for this thread if it's currently being shown
			if ( threadId === liquidThreads.currentReplyThread && $( '#wpTextbox1' ).is( ':visible' ) ) {
				liquidThreads.cancelEdit( {} );
				return;
			}

			params = { method: 'reply', thread: threadId };

			$repliesElement = $container.contents().filter( '.lqt-thread-replies' );
			$replyDiv = $repliesElement.contents().filter( '.lqt-reply-form' );
			$replyDiv = $replyDiv.add( $container.contents().filter( '.lqt-reply-form' ) );
			if ( !$replyDiv.length ) {
				// Create a div for it
				$replyDiv = $( '<div class="lqt-reply-form lqt-edit-form"/>' );

				// Try to find a place for it
				if ( !$repliesElement.length ) {
					$repliesElement = liquidThreads.getRepliesElement( $container );
				}

				$repliesElement.find( '.lqt-replies-finish' ).before( $replyDiv );
			}
			$replyDiv.show();

			liquidThreads.injectEditForm( params, $replyDiv, e.preload );
			liquidThreads.currentReplyThread = threadId;
		},

		getRepliesElement: function ( $thread /* a .lqt_thread */ ) {
			var $finishDiv, $repliesFinishElement,
				$repliesElement = $thread.contents().filter( '.lqt-thread-replies' );

			if ( !$repliesElement.length ) {
				$repliesElement = $( '<div class="lqt-thread-replies"/>' );

				$finishDiv = $( '<div class="lqt-replies-finish"/>' );
				$finishDiv.append( $( '<div class="lqt-replies-finish-corner"/>' ) );
				$finishDiv.contents().html( '&nbsp;' );
				$repliesElement.append( $finishDiv );

				$repliesFinishElement = $thread.contents().filter( '.lqt-replies-finish' );
				if ( $repliesFinishElement.length ) {
					$repliesFinishElement.before( $repliesElement );
				} else {
					$thread.append( $repliesElement );
				}
			}

			return $repliesElement;
		},

		checkEmptyReplies: function ( element, action ) {
			var contents = element.contents();

			contents = contents.not( '.lqt-replies-finish,.lqt-post-sep,.lqt-edit-form' );

			if ( !contents.length ) {
				if ( action === undefined || action === 'remove' ) {
					element.remove();
				} else {
					element.hide();
				}
			}
		},

		handleNewLink: function ( e ) {
			var params, $container,
				talkpage = $( this ).attr( 'lqt_talkpage' );

			if ( talkpage !== undefined ) {
				e.preventDefault();

				params = { talkpage: talkpage, method: 'talkpage_new_thread' };

				$container = $( '.lqt-new-thread' );
				$container.data( 'lqt-talkpage', talkpage );

				liquidThreads.injectEditForm( params, $container );
				liquidThreads.currentReplyThread = 0;
			}
		},

		handleEditLink: function ( e ) {
			var $parent, $container, params;

			e.preventDefault();

			// Grab the container.
			$parent = $( this ).closest( '.lqt-post-wrapper' );

			$container = $( '<div>' ).addClass( 'lqt-edit-form' );
			$parent.contents().fadeOut();
			$parent.append( $container );
			params = { method: 'edit', thread: $parent.data( 'thread-id' ) };

			liquidThreads.injectEditForm( params, $container );
		},

		injectEditForm: function ( params, $container, preload ) {
			var isIE7, $loadSpinner,
				page = $container.closest( '.lqt-thread-topmost' )
					.find( '.lqt-thread-talkpage-metadata' ).val();
			if ( !page ) {
				page = $container.data( 'lqt-talkpage' );
			}

			liquidThreads.cancelEdit( $container );

			isIE7 = $.client.test( { msie: [ [ '>=', 7 ], [ '<', 8 ] ] },
				$.client.profile(), true );

			$loadSpinner = $( '<div>' ).addClass( 'mw-ajax-loader lqt-loader' );
			$container.before( $loadSpinner );

			function finishShow() {
				// Scroll to the textbox
				var scrollOffset, $editLink,
					targetOffset = $container.offset().top,
					windowHeight = $( window ).height(),
					editBoxHeight = $container.height();

				if ( windowHeight < editBoxHeight ) {
					scrollOffset = targetOffset;
				} else {
					scrollOffset = targetOffset - windowHeight + editBoxHeight;
				}

				$( 'html, body' ).animate( { scrollTop: scrollOffset }, 'slow' );
				// Auto-focus and set to auto-grow as well
				$container.find( '#wpTextbox1' ).focus();
				// Focus the subject field if there is one. Overrides previous line.
				$container.find( '#lqt_subject_field' ).focus();

				// Update signature editor
				$container.find( 'input[name=wpLqtSignature]' ).hide();
				$container.find( '.lqt-signature-preview' ).show();

				$editLink = $( '<a class="lqt-signature-edit-button"/>' );
				$editLink.text( mw.msg( 'lqt-edit-signature' ) );
				$editLink.click( liquidThreads.handleEditSignature );
				$editLink.attr( 'href', '#' );
				$container.find( '.lqt-signature-preview' ).after( $editLink );
				$editLink.before( ' ' );
			}

			function finishSetup() {
				var $cancelButton, $currentFocused;

				// Kill the loader.
				$( '.lqt-loader' ).remove();

				if ( preload ) {
					$container.find( 'textarea' )[ 0 ].value = preload;
				}

				if ( isIE7 ) {
					setTimeout( finishShow, 500 );
				} else {
					$container.slideDown( 'slow', finishShow );
				}

				$cancelButton = $container.find( '#mw-editform-cancel' );
				$cancelButton.click( liquidThreads.cancelEdit );

				$container.find( '#wpTextbox1' ).attr( 'rows', 12 );
				$container.find( '#wpDiff' ).hide();

				if ( $.fn.wikiEditor ) {
					// cleanup unnecessary things from the old toolbar
					$( '#editpage-specialchars' ).remove();
					$( '#wpTextbox1' ).wikiEditor( 'removeFromToolbar', {
						section: 'main',
						group: 'insert',
						tool: 'signature'
					} );
					$( '#wpTextbox1' ).focus();
				}
				$currentFocused = $container.find( '#wpTextbox1' );
				mw.hook( 'ext.lqt.textareaCreated' ).fire( $currentFocused );
				$container.find( '#wpTextbox1, #wpSummary' ).focus( function () {
					$currentFocused = $( this );
				} );
			}

			mw.loader.using( [ 'mediawiki.action.edit' ],
				function () {
					if ( isIE7 ) {
						$container.empty().show();
					}
					liquidThreads.loadInlineEditForm( params, $container, function () {
						var dependencies = [ 'ext.wikiEditor', 'user.options',
							'jquery.wikiEditor.toolbar', 'jquery.wikiEditor.toolbar.config',
							'jquery.async', 'jquery.cookie' ];
						if ( mw.user.options.get( 'usebetatoolbar-cgd' ) ) {
							dependencies.push( 'jquery.wikiEditor.dialogs', 'jquery.wikiEditor.dialogs.config' );
						}
						mw.loader.using( dependencies, finishSetup );
					} );
				} );

		},

		loadInlineEditForm: function ( params, $container, callback ) {
			params.action = 'threadaction';
			params.threadaction = 'inlineeditform';
			params.token = mw.user.tokens.get( 'editToken' );

			( new mw.Api() ).post( params ).done( function ( result ) {
				$container.empty().append( $( result.threadaction.inlineeditform.html ).contents() );

				callback();
			} );
		},

		// From http://clipmarks.com/clipmark/CEFC94CB-94D6-4495-A7AA-791B7355E284/
		insertAtCursor: function ( myField, myValue ) {
			var sel, startPos, endPos;
			if ( document.selection ) {
				// IE support
				myField.focus();
				sel = document.selection.createRange();
				sel.text = myValue;
			} else if ( myField.selectionStart || myField.selectionStart === '0' ) {
				// MOZILLA/NETSCAPE support
				startPos = myField.selectionStart;
				endPos = myField.selectionEnd;
				myField.value = myField.value.substring( 0, startPos ) + myValue + myField.value.substring( endPos, myField.value.length );
			} else {
				myField.value += myValue;
			}
		},

		getSelection: function () {
			if ( window.getSelection ) {
				return window.getSelection().toString();
			} else if ( document.selection ) {
				return document.selection.createRange().text;
			} else if ( document.getSelection ) {
				return document.getSelection();
			} else {
				return '';
			}
		},

		cancelEdit: function ( e ) {
			if ( e !== undefined && e.preventDefault ) {
				e.preventDefault();
			}

			// XXX: Should this be e.target instead of e?
			$( '.lqt-edit-form' ).not( e ).each(
				function () {
					var repliesElement = $( this ).closest( '.lqt-thread-replies' );
					$( this ).fadeOut( 'slow',
						function () {
							$( this ).empty();

							if ( $( this ).parent().is( '.lqt-post-wrapper' ) ) {
								$( this ).parent().contents().fadeIn();
								$( this ).remove();
							}

							liquidThreads.checkEmptyReplies( repliesElement );
						} );
				} );

			liquidThreads.currentReplyThread = null;
		},

		setupMenus: function () {
			var $replyLink, $dragLI, $dragLink, $trigger,
				$post = $( this ),
				$toolbar = $post.contents().filter( '.lqt-thread-toolbar' ),
				threadID = $post.data( 'thread-id' ),
				$menu = $post.find( '.lqt-thread-toolbar-command-list' ),
				$menuContainer = $post.find( '.lqt-thread-toolbar-menu' );

			$menu.remove().appendTo( $menuContainer );
			$menuContainer.find( '.lqt-thread-toolbar-command-list' ).hide();

			// Add handler for reply link
			$replyLink = $toolbar.find( '.lqt-command-reply > a' );
			$replyLink.data( 'thread-id', threadID );
			$replyLink.click( liquidThreads.handleReplyLink );

			if ( !$menu.closest( '.lqt_thread' ).is( '.lqt-thread-uneditable' ) ) {
				// Add "Drag to new location" to menu
				$dragLI = $( '<li class="lqt-command-drag lqt-command" />' );
				$dragLink = $( '<a/>' ).text( mw.msg( 'lqt-drag-activate' ) );
				$dragLink.attr( 'href', '#' );
				$dragLI.append( $dragLink );
				$dragLink.click( liquidThreads.activateDragDrop );
				$menu.append( $dragLI );
			}

			// Remove split and merge
			$menu.contents().filter( '.lqt-command-split,.lqt-command-merge' ).remove();

			$trigger = $menuContainer.find( '.lqt-thread-actions-trigger' );

			$trigger.show();
			$menu.hide();

			// FIXME: After a drag-and-drop, this stops working on the thread and its replies
			$trigger.click(
				function ( e ) {
					var windowHeight, toolbarOffset, scrollPos, menuBottom;

					e.stopImmediatePropagation();
					e.preventDefault();

					// Hide the other menus
					$( '.lqt-thread-toolbar-command-list' ).not( $menu ).hide( 'fast' );

					$menu.toggle( 'fast' );

					windowHeight = $( window ).height();
					toolbarOffset = toolbar.offset().top;
					scrollPos = $( window ).scrollTop();

					menuBottom = ( toolbarOffset + 150 - scrollPos );

					if ( menuBottom > windowHeight ) {
						// Switch to an upwards menu.
						$menu.css( 'bottom', toolbar.height() );
					} else {
						$menu.css( 'bottom', 'auto' );
					}
				} );
		},

		setupThreadMenu: function ( menu, id ) {
			var $editSubjectField, $editSubjectLink;

			if ( menu.find( '.lqt-command-edit-subject' ).length ||
				menu.closest( '.lqt_thread' ).is( '.lqt-thread-uneditable' )
			) {
				return;
			}

			$editSubjectField = $( '<li/>' );
			$editSubjectLink = $( '<a href="#"/>' );
			$editSubjectLink.text( mw.msg( 'lqt-change-subject' ) );
			$editSubjectField.append( $editSubjectLink );
			$editSubjectField.click( liquidThreads.handleChangeSubject );
			$editSubjectField.data( 'thread-id', id );

			$editSubjectField.addClass( 'lqt-command-edit-subject' );

			// appending a space first to prevent cursive script character joining across elements
			menu.append( ' ', $editSubjectField );
		},

		handleChangeSubject: function ( e ) {
			var threadId, $header, headerText, $textbox, saveText, $saveButton,
				$cancelButton, $subjectForm;

			e.preventDefault();

			$( this ).closest( '.lqt-command-edit-subject' ).hide();

			// Grab the h2
			threadId = $( this ).data( 'thread-id' );
			$header = $( '#lqt-header-' + threadId );
			headerText = $header.find( 'input[name=raw-header]' ).val();

			$textbox = $( '<input type="textbox">' )
				.val( headerText )
				.attr( 'id', 'lqt-subject-input-' + threadId )
				.attr( 'size', '75' )
				.val( headerText );

			saveText = mw.msg( 'lqt-save-subject' );
			$saveButton = $( '<input type="button">' )
				.val( saveText )
				.click( liquidThreads.handleSubjectSave );

			$cancelButton = $( '<input type="button">' )
				.val( mw.msg( 'lqt-cancel-subject-edit' ) )
				.click( function () {
					var $form = $( this ).closest( '.mw-subject-editor' ),
						$header = $form.closest( '.lqt_header' );
					$header.contents().filter( '.mw-headline' ).show();
					$header.next().find( '.lqt-command-edit-subject' ).show();
					$form.remove();

				} );

			$header.contents().filter( 'span.mw-headline' ).hide();

			$subjectForm = $( '<span class="mw-subject-editor">' ).append(
				$textbox, '&nbsp;', $saveButton, '&nbsp;', $cancelButton
			);
			$subjectForm.data( 'thread-id', threadId );

			$header.append( $subjectForm );
		},

		handleSubjectSave: function () {
			var $spinner, request, code,
				$button = $( this ),
				$subjectForm = $button.closest( '.mw-subject-editor' ),
				$header = $subjectForm.closest( '.lqt_header' ),
				threadId = $subjectForm.data( 'thread-id' ),
				$textbox = $( '#lqt-subject-input-' + threadId ),
				newSubject = $.trim( $textbox.val() );

			if ( !newSubject ) {
				// eslint-disable-next-line no-alert
				alert( mw.msg( 'lqt-ajax-no-subject' ) );
				return;
			}

			// Add a spinner
			$spinner = $( '<div>' ).addClass( 'mw-ajax-loader' );
			$header.append( $spinner );
			$subjectForm.hide();

			request = {
				action: 'threadaction',
				threadaction: 'setsubject',
				subject: $.trim( newSubject ),
				thread: threadId,
				token: mw.user.tokens.get( 'editToken' )
			};

			// Set new subject through API.
			( new mw.Api() ).post( request ).done( function ( reply ) {
				var result;

				try {
					result = reply.threadaction.thread.result;
				} catch ( err ) {
					result = 'error';
				}

				if ( result === 'success' ) {
					$spinner.remove();
					$header.next().find( '.lqt-command-edit-subject' ).show();

					liquidThreads.doReloadThread( $( '#lqt_thread_id_' + threadId ) );
				} else {
					try {
						code = reply.error.code;

						if ( code === 'invalid-subject' ) {
							// eslint-disable-next-line no-alert
							alert( mw.msg( 'lqt-ajax-invalid-subject' ) );
						}

						$subjectForm.show();
						$spinner.remove();
					} catch ( err ) {
						// eslint-disable-next-line no-alert
						alert( mw.msg( 'lqt-save-subject-error-unknown' ) );
						$subjectForm.remove();
						$spinner.remove();
						$header.contents().filter( '.mw-headline' ).show();
						$header.next().find( '.lqt-command-edit-subject' ).show();
					}
				}
			} );
		},

		handleDocumentClick: function () {
			// Collapse all menus
			$( '.lqt-thread-toolbar-command-list' ).hide( 'fast' );
		},

		checkForUpdates: function () {
			var oldTS, threadId,
				threadModifiedTS = {},
				threads = [];

			$( '.lqt-thread-topmost' ).each( function () {
				var tsField = $( this ).find( '.lqt-thread-modified' );
				if ( tsField.length ) {
					oldTS = tsField.val();
					// Prefix is lqt-thread-modified-
					threadId = tsField.attr( 'id' ).substr( 'lqt-thread-modified-'.length );
					threadModifiedTS[ threadId ] = oldTS;
					threads.push( threadId );
				}
			} );

			// Optimisation: if no threads are to be checked, do not check.
			if ( !threads.length ) {
				return;
			}

			( new mw.Api() ).get( {
				action: 'query',
				list: 'threads',
				thid: threads.join( '|' ),
				thprop: 'id|subject|parent|modified'
			} ).done( function ( data ) {
				var threads = data.query.threads;

				$.each( threads, function ( i, thread ) {
					var threadId = thread.id,
						threadModified = thread.modified;

					if ( threadModified !== threadModifiedTS[ threadId ] ) {
						liquidThreads.showUpdated( threadId );
					}
				} );
			} );
		},

		showUpdated: function ( id ) {
			// Check if there's already an updated marker here
			var $notifier, $updateButton,
				$threadObject = $( '#lqt_thread_id_' + id );

			if ( $threadObject.find( '.lqt-updated-notification' ).length ) {
				return;
			}

			$notifier = $( '<div>' )
				.text( mw.msg( 'lqt-ajax-updated' ) + ' ' )
				.addClass( 'lqt-updated-notification' );

			$updateButton = $( '<a href="#">' )
				.text( mw.msg( 'lqt-ajax-update-link' ) )
				.addClass( 'lqt-update-link' )
				.click( liquidThreads.updateThread );

			$notifier.append( $updateButton );

			$threadObject.prepend( $notifier );
		},

		updateThread: function ( e ) {
			e.preventDefault();

			liquidThreads.doReloadThread( $( this ).closest( '.lqt_thread' ) );
		},

		doReloadThread: function ( $thread /* The .lqt_thread */ ) {
			var threadId = $thread.data( 'thread-id' ),
				$loader = $( '<div class="mw-ajax-loader" >' ),
				$header = $( '#lqt-header-' + threadId );

			$thread.prepend( $loader );

			// Build an AJAX request
			( new mw.Api() ).get( {
				action: 'query',
				list: 'threads',
				thid: threadId,
				thrender: 1
			} ).done( function ( data ) {
				// Load data from JSON
				var $newThread, targetOffset,
					html = data.query.threads[ threadId ].content,
					$newContent = $( html );

				// Clear old post and header.
				$thread.empty().hide();
				$header.empty().hide();

				// Replace post content
				$newThread = $newContent.filter( 'div.lqt_thread' );
				$thread
					.append( $newThread.contents() )
					.attr( 'class', $newThread.attr( 'class' ) );

				// Set up thread.
				$thread.find( '.lqt-post-wrapper' ).each( function () {
					liquidThreads.setupThread( $( this ) );
				} );

				$header.fadeIn();
				$thread.fadeIn();

				// Scroll to the updated thread.
				targetOffset = $thread.offset().top;
				$( 'html, body' ).animate( { scrollTop: targetOffset }, 'slow' );
			} );
		},

		setupThread: function ( $threadContainer ) {
			var i, $threadWrapper, threadId, $menu, threadLevelCommandSelector, $traverseElement,
				prefixLength = 'lqt_thread_id_'.length,
				// Add the interruption class if it needs it
				// FIXME: misses a lot of cases
				$parentWrapper = $( $threadContainer )
					.closest( '.lqt-thread-wrapper' ).parent().closest( '.lqt-thread-wrapper' );
			if ( $parentWrapper.next( '.lqt-thread-wrapper' ).length > 0 ) {
				$parentWrapper
					.find( '.lqt-thread-replies' )
					.addClass( 'lqt-thread-replies-interruption' );
			}

			// Update reply links
			$threadWrapper = $threadContainer.closest( '.lqt_thread' );
			threadId = $threadWrapper.attr( 'id' ).substring( prefixLength );

			$threadContainer.data( 'thread-id', threadId );
			$threadWrapper.data( 'thread-id', threadId );

			// Set up reply link
			$threadWrapper.find( '.lqt-add-reply' )
				.click( liquidThreads.handleReplyLink )
				.data( 'thread-id', threadId );

			// Hide edit forms
			$threadContainer.find( 'div.lqt-edit-form' ).each(
				function () {
					if ( $( this ).find( '#wpTextbox1' ).length ) {
						return;
					}

					this.style.display = 'none';
				} );

			// Update menus
			$threadContainer.each( liquidThreads.setupMenus );

			// Update thread-level menu, if appropriate
			if ( $threadWrapper.hasClass( 'lqt-thread-topmost' ) ) {
				// To perform better, check the 3 elements before the top-level thread container before
				//  scanning the whole document
				threadLevelCommandSelector = '#lqt-threadlevel-commands-' + threadId;
				$traverseElement = $threadWrapper;

				for ( i = 0; i < 3 && $menu === undefined; ++i ) {
					$traverseElement = $traverseElement.prev();
					if ( $traverseElement.is( threadLevelCommandSelector ) ) {
						$menu = $traverseElement;
					}
				}

				if ( typeof $menu === 'undefined' ) {
					$menu = $( threadLevelCommandSelector );
				}

				liquidThreads.setupThreadMenu( $menu, threadId );
			}
		},

		showReplies: function ( e ) {
			var $thread, threadId, $replies, $loader, $sep;

			e.preventDefault();

			// Grab the closest thread
			$thread = $( this ).closest( '.lqt_thread' ).find( 'div.lqt-post-wrapper' );
			threadId = $thread.data( 'thread-id' );
			$replies = $thread.parent().find( '.lqt-thread-replies' );
			$loader = $( '<div class="mw-ajax-loader">' );
			$sep = $( '<div class="lqt-post-sep">' ).html( '&nbsp;' );

			$replies.empty().hide().before( $loader );

			( new mw.Api() ).get( {
				action: 'query',
				list: 'threads',
				thid: threadId,
				thrender: '1',
				thprop: 'id'
			} ).done( function ( data ) {
				var content, $content;
				// Interpret
				if ( typeof data.query.threads[ threadId ] !== 'undefined' ) {
					content = data.query.threads[ threadId ].content;
					$content = $( content ).find( '.lqt-thread-replies' );

					// Inject
					$replies.empty().append( $content.contents() );

					// Remove post separator, if it follows the replies element
					if ( $replies.next().is( '.lqt-post-sep' ) ) {
						$replies.next().remove();
					}

					// Set up
					$replies.find( 'div.lqt-post-wrapper' ).each( function () {
						liquidThreads.setupThread( $( this ) );
					} );

					$replies.before( $sep );

					// Show
					$loader.remove();
					$replies.fadeIn( 'slow' );
				}
			} );
		},

		showMore: function ( e ) {
			var $loader, $thread, threadId, $startAtField, startAt;

			e.preventDefault();

			// Add spinner
			$loader = $( '<div class="mw-ajax-loader">' );
			$( this ).after( $loader );

			// Grab the appropriate thread
			$thread = $( this ).closest( '.lqt_thread' ).find( 'div.lqt-post-wrapper' ).first();
			threadId = $thread.data( 'thread-id' );

			// Find the hidden field that gives the point to start at.
			$startAtField = $( this ).siblings().filter( '.lqt-thread-start-at' );
			startAt = $startAtField.val();
			$startAtField.remove();

			( new mw.Api() ).get( {
				action: 'query',
				list: 'threads',
				thid: threadId,
				thrender: '1',
				thprop: 'id',
				threnderstartrepliesat: startAt
			} ).done( function ( data ) {
				var content = data.query.threads[ threadId ].content,
					$content = $( content ).find( '.lqt-thread-replies' ).first().contents().not( '.lqt-replies-finish' );

				if ( $content.is( '.lqt-post-sep' ) ) {
					$content = $content.not( $( $content[ 0 ] ) );
				}

				// Inject loaded content.
				$content.hide();
				$loader.after( $content );

				$content.find( 'div.lqt-post-wrapper' ).each( function () {
					liquidThreads.setupThread( $( this ) );
				} );

				$content.fadeIn();
				$loader.remove();
			} );

			$( this ).remove();
		},

		asyncWatch: function ( e ) {
			var $spinner, api, success, error,
				$button = $( this ),
				tlcOffset = 'lqt-threadlevel-commands-'.length,
				$oldButton = $button.clone(),
				// Find the title of the thread
				$threadLevelCommands = $button.closest( '.lqt_threadlevel_commands' ),
				title = $( '#lqt-thread-title-' + $threadLevelCommands.attr( 'id' ).substring( tlcOffset ) ).val(),
				// Check if we're watching or unwatching.
				action = '';

			if ( $button.hasClass( 'lqt-command-watch' ) ) {
				$button.removeClass( 'lqt-command-watch' ).addClass( 'lqt-command-unwatch' );
				$button.find( 'a' ).attr( 'href', $button.find( 'a' ).attr( 'href' ).replace( 'watch', 'unwatch' ) ).text( mw.msg( 'unwatch' ) );
				action = 'watch';
			} else if ( $button.hasClass( 'lqt-command-unwatch' ) ) {
				$button.removeClass( 'lqt-command-unwatch' ).addClass( 'lqt-command-watch' );
				action = 'unwatch';
				$button.find( 'a' ).attr( 'href', $button.find( 'a' ).attr( 'href' ).replace( 'unwatch', 'watch' ) ).text( mw.msg( 'watch' ) );
			}

			// Replace the watch link with a spinner
			$spinner = $( '<li>' ).html( '&nbsp;' ).addClass( 'mw-small-spinner' );
			$button.replaceWith( $spinner );

			// Check if we're watching or unwatching.
			api = new mw.Api();
			success = function () {
				$spinner.replaceWith( $button );
			};
			error = function () {
				// FIXME: Use a better i18n way to show this
				// eslint-disable-next-line no-alert
				alert( 'failed to connect.. Please try again!' );
				$spinner.replaceWith( $oldButton );
			};

			if ( action === 'unwatch' ) {
				api.unwatch( title ).done( success ).fail( error );
			} else if ( action === 'watch' ) {
				api.watch( title ).done( success ).fail( error );
			}

			e.preventDefault();
		},

		showThreadLinkWindow: function ( e ) {
			var $thread, linkTitle, linkURL;

			e.preventDefault();
			$thread = $( this ).closest( '.lqt_thread' );
			linkTitle = $thread.find( '.lqt-thread-title-metadata' ).val();
			linkURL = mw.util.getUrl( linkTitle );
			linkURL = mw.config.get( 'wgServer' ) + linkURL;
			if ( linkURL.substr( 0, 2 ) === '//' ) {
				linkURL = window.location.protocol + linkURL;
			}
			liquidThreads.showLinkWindow( linkTitle, linkURL );
		},

		showSummaryLinkWindow: function ( e ) {
			var linkURL, linkTitle;
			e.preventDefault();
			linkURL = mw.config.get( 'wgServer' ) + $( this ).attr( 'href' );
			if ( linkURL.substr( 0, 2 ) === '//' ) {
				linkURL = window.location.protocol + linkURL;
			}
			linkTitle = $( this ).parent().find( 'input[name=summary-title]' ).val();
			liquidThreads.showLinkWindow( linkTitle, linkURL );
		},

		showLinkWindow: function ( linkTitle, linkURL ) {
			var $urlLabel, $urlField, $urlRow, $titleLabel, $titleField, $titleRow,
				$table, $dialog;
			linkTitle = '[[' + linkTitle + ']]';

			// Build dialog
			$urlLabel = $( '<th>' ).text( mw.msg( 'lqt-thread-link-url' ) );
			$urlField = $( '<td>' ).addClass( 'lqt-thread-link-url' );
			$urlField.text( linkURL );
			$urlRow = $( '<tr>' ).append( $urlLabel ).append( $urlField );

			$titleLabel = $( '<th>' ).text( mw.msg( 'lqt-thread-link-title' ) );
			$titleField = $( '<td>' ).addClass( 'lqt-thread-link-title' );
			$titleField.text( linkTitle );
			$titleRow = $( '<tr>' ).append( $titleLabel ).append( $titleField );

			$table = $( '<table><tbody></tbody></table>' );
			$table.find( 'tbody' ).append( $urlRow ).append( $titleRow );

			$dialog = $( '<div>' ).append( $table );

			$( 'body' ).prepend( $dialog );

			$dialog.dialog( { width: 600 } );
		},

		handleAJAXSave: function ( e ) {
			var text, summary, signature, subject, replyThread,
				$bumpBox, bump, $spinner, page,
				$editform = $( this ).closest( '.lqt-edit-form' ),
				type = $editform.find( 'input[name=lqt_method]' ).val(),
				wikiEditorContext = $editform.find( '#wpTextbox1' ).data( 'wikiEditor-context' );

			if ( !wikiEditorContext || typeof ( wikiEditorContext ) === 'undefined' ||
					!wikiEditorContext.$iframe ) {
				text = $editform.find( '#wpTextbox1' ).val();
			} else {
				text = wikiEditorContext.$textarea.textSelection( 'getContents' );
			}

			if ( $.trim( text ).length === 0 ) {
				// eslint-disable-next-line no-alert
				alert( mw.msg( 'lqt-empty-text' ) );
				return;
			}

			summary = $editform.find( '#wpSummary' ).val();

			if ( $editform.find( 'input[name=wpLqtSignature]' ).length ) {
				signature = $editform.find( 'input[name=wpLqtSignature]' ).val();
			} else {
				signature = undefined;
			}

			// Check if summary is undefined
			if ( summary === undefined ) {
				summary = '';
			}

			subject = $editform.find( '#lqt_subject_field' ).val();
			replyThread = $editform.find( 'input[name=lqt_operand]' ).val();
			$bumpBox = $editform.find( '#wpBumpThread' );
			bump = $bumpBox.length === 0 || $bumpBox.is( ':checked' );

			$spinner = $( '<div class="mw-ajax-loader"/>' );
			$editform.prepend( $spinner );

			function replyCallback( data ) {
				var $parent = $( '#lqt_thread_id_' + data.threadaction.thread[ 'parent-id' ] ),
					$html = $( data.threadaction.thread.html ),
					$newThread = $html.find( '#lqt_thread_id_' + data.threadaction.thread[ 'thread-id' ] );

				$parent.find( '.lqt-thread-replies:first' ).append( $newThread );
				$parent.closest( '.lqt-thread-topmost' )
					.find( 'input.lqt-thread-modified' )
					.val( data.threadaction.thread.modified );
				liquidThreads.setupThread( $newThread.find( '.lqt-post-wrapper' ) );
				$( 'html, body' ).animate( { scrollTop: $newThread.offset().top }, 'slow' );
			}

			function newCallback( data ) {
				var $newThread = $( data.threadaction.thread.html );
				$( '.lqt-threads' ).prepend( $newThread );
				// remove the no threads message if it's on the page
				$( '.lqt-no-threads' ).remove();
				liquidThreads.setupThread( $newThread.find( '.lqt-post-wrapper' ) );
				$( 'html,body' ).animate( { scrollTop: $newThread.offset().top }, 'slow' );
			}

			function editCallback() {
				liquidThreads.doReloadThread( $editform.closest( '.lqt-thread-topmost' ) );
			}

			function errorCallback() {
				// Create a hidden field to mimic the save button, and
				// submit it normally, so they'll get a real error message.

				var $saveHidden = $( '<input>' ).attr( {
						type: 'hidden',
						name: 'wpSave',
						value: 'Save'
					} ),
					$form = $editform.find( '#editform' ).append( $saveHidden );

				$form.parent().data( 'non-ajax-submit', true ); // To avoid edit form open warning
				$form.submit();
			}

			function doneCallback( data ) {
				var result, callback;
				try {
					result = data.threadaction.thread.result;
				} catch ( err ) {
					result = 'error';
				}

				if ( result !== 'Success' ) {
					errorCallback();
					return;
				}

				if ( type === 'reply' ) {
					callback = replyCallback;
				}

				if ( type === 'talkpage_new_thread' ) {
					callback = newCallback;
				}

				if ( type === 'edit' ) {
					callback = editCallback;
				}

				$editform.empty().hide();

				callback( data );

				// Load the new TOC
				liquidThreads.reloadTOC();
			}

			if ( type === 'reply' ) {
				liquidThreads.doReply( replyThread, text, summary,
						doneCallback, bump, signature, errorCallback );

				e.preventDefault();
			} else if ( type === 'talkpage_new_thread' ) {
				page = $editform.closest( '.lqt-new-thread' ).data( 'lqt-talkpage' );
				if ( !page ) {
					page = $( $( '[lqt_talkpage]' )[ 0 ] ).attr( 'lqt_talkpage' ); // A couple of elements have this attribute, it doesn't matter which
				}
				liquidThreads.doNewThread( page, subject, text, summary,
						doneCallback, bump, signature, errorCallback );

				e.preventDefault();
			} else if ( type === 'edit' ) {
				liquidThreads.doEditThread( replyThread, subject, text, summary,
						doneCallback, bump, signature, errorCallback );
				e.preventDefault();
			}
		},

		reloadTOC: function () {
			var $contentsHeading, $loadTOCSpinner,
				$toc = $( '.lqt_toc' );

			if ( !$toc.length ) {
				$toc = $( '<table>' ).addClass( 'lqt_toc' );
				$( '.lqt-new-thread' ).after( $toc );

				$contentsHeading = $( '<h2/>' )
					.text( mw.msg( 'lqt_contents_title' ) );
				$toc.before( $contentsHeading );
			}

			$loadTOCSpinner = $( '<div class="mw-ajax-loader">' )
				.css( 'height', $toc.height() );
			$toc.empty().append( $loadTOCSpinner );
			$toc.load( window.location.href + ' .lqt_toc > *', function () {
				$loadTOCSpinner.remove();
			} );
		},

		doNewThread: function ( talkpage, subject, text, summary, doneCallback, bump, signature, errorCallback ) {
			var newTopicParams = {
				action: 'threadaction',
				threadaction: 'newthread',
				talkpage: talkpage,
				subject: subject,
				text: text,
				token: mw.user.tokens.get( 'editToken' ),
				render: '1',
				reason: summary,
				bump: bump
			};

			if ( $( '#wpCaptchaWord' ) ) {
				newTopicParams.captchaword = $( '#wpCaptchaWord' ).val();
			}

			if ( $( '#wpCaptchaId' ) ) {
				newTopicParams.captchaid = $( '#wpCaptchaId' ).val();
			}

			if ( typeof signature !== 'undefined' ) {
				newTopicParams.signature = signature;
			}
			( new mw.Api() ).post( newTopicParams ).done( doneCallback ).fail( errorCallback );
		},

		doReply: function ( thread, text, summary, callback, bump, signature ) {
			var replyParams = {
				action: 'threadaction',
				threadaction: 'reply',
				thread: thread,
				text: text,
				token: mw.user.tokens.get( 'editToken' ),
				render: '1',
				reason: summary,
				bump: bump
			};

			if ( $( '#wpCaptchaWord' ) ) {
				replyParams.captchaword = $( '#wpCaptchaWord' ).val();
			}

			if ( $( '#wpCaptchaId' ) ) {
				replyParams.captchaid = $( '#wpCaptchaId' ).val();
			}

			if ( typeof signature !== 'undefined' ) {
				replyParams.signature = signature;
			}

			( new mw.Api() ).post( replyParams ).done( callback );
		},

		doEditThread: function ( thread, subject, text, summary, callback, bump, signature ) {
			var request = {
				action: 'threadaction',
				threadaction: 'edit',
				thread: thread,
				text: text,
				render: 1,
				reason: summary,
				bump: bump,
				subject: subject,
				token: mw.user.tokens.get( 'editToken' )
			};

			if ( $( '#wpCaptchaWord' ) ) {
				request.captchaword = $( '#wpCaptchaWord' ).val();
			}

			if ( $( '#wpCaptchaId' ) ) {
				request.captchaid = $( '#wpCaptchaId' ).val();
			}

			if ( typeof signature !== 'undefined' ) {
				request.signature = signature;
			}

			( new mw.Api() ).post( request ).done( callback );
		},

		onTextboxKeyUp: function () {
			// Check if a user has signed their post, and if so, tell them they don't have to.
			var $weLqtSummaryTop, $elem, msg, $weTop,
				text = $.trim( $( this ).val() ),
				$prevWarning = $( '#lqt-sign-warning' );
			if ( text.match( /~~~~$/ ) ) {
				if ( $prevWarning.length ) {
					return;
				}

				// Show the warning
				$weLqtSummaryTop = $( this ).closest( '.lqt-summarize-form' );
				if ( $weLqtSummaryTop.length ) {
					msg = mw.msg( 'lqt-summary-sign-not-necessary' );
				} else {
					msg = mw.msg( 'lqt-sign-not-necessary' );
				}
				$elem = $( '<div>' ).attr( { id: 'lqt-sign-warning', 'class': 'error' } ).text( msg );
				$weTop = $( this ).closest( '.lqt-edit-form' ).find( '.wikiEditor-ui-top' );

				if ( $weTop.length ) {
					$weTop.before( $elem );
				} else {
					$( this ).before( $elem );
				}
			} else {
				$prevWarning.remove();
			}
		},

		activateDragDrop: function ( e ) {
			var $thread, threadId, scrollOffset, helperFunc, $header,
				$headline, $helper, draggableOptions, droppableOptions;
			// FIXME: Need a cancel drop action
			e.preventDefault();

			// Set up draggability.
			$thread = $( this ).closest( '.lqt_thread' );
			threadId = $thread.find( '.lqt-post-wrapper' ).data( 'thread-id' );
			// FIXME: what does all of this do? From here
			$( 'html, body' ).each( function () {
				if ( $( this ).attr( 'scrollTop' ) ) {
					scrollOffset = $( this ).attr( 'scrollTop' );
				}
			} );

			scrollOffset = scrollOffset - $thread.offset().top;

			if ( $thread.hasClass( 'lqt-thread-topmost' ) ) {
				$header = $( '#lqt-header-' + threadId );
				$headline = $header.contents().filter( '.mw-headline' ).clone();
				$helper = $( '<h2 />' ).append( $headline );
				helperFunc = function () { return $helper; };
			} else {
				helperFunc =
					function () {
						var $helper = $thread.clone();
						$helper.find( '.lqt-thread-replies' ).remove();
						return $helper;
					};
			}
			// to here.

			draggableOptions = {
				axis: 'y',
				opacity: '0.70',
				revert: 'invalid',
				helper: helperFunc
			};
			$thread.draggable( draggableOptions );

			// Kill all existing drop zones
			$( '.lqt-drop-zone' ).remove();

			// Set up some dropping targets. Add one before the first thread, after every
			//  other thread, and as a subthread of every post.
			function createDropZone( sortKey, parent ) {
				return $( '<div class="lqt-drop-zone" />' )
					.text( mw.msg( 'lqt-drag-drop-zone' ) )
					.data( 'sortkey', sortKey )
					.data( 'parent', parent );
			}

			// Add a drop zone at the very top unless the drag thread is the very first thread
			$( '.lqt-thread-topmost:first' )
				.not( $thread )
				.before( createDropZone( 'now', 'top' ) );

			// Now one after every thread except the drag thread
			// FIXME: Do not add one right before the current thread (bug 26237 comment 2)
			$( '.lqt-thread-topmost' ).not( $thread ).each( function () {
				var sortkey = $( this ).contents().filter( 'input[name=lqt-thread-sortkey]' ).val(),
					d = new Date(
						sortkey.substr( 0, 4 ),
						sortkey.substr( 4, 2 ) - 1, // month is from 0 to 11
						sortkey.substr( 6, 2 ),
						sortkey.substr( 8, 2 ),
						sortkey.substr( 10, 2 ),
						sortkey.substr( 12, 2 )
					);

				// Use proper date manipulation to avoid invalid timestamps such as
				// 20120101000000 - 1 = 20120100999999 (instead of 20111231235959)
				// (in that case the API would return an "invalid-sortkey" error)
				d.setTime( d.getTime() - 1 );
				sortkey = [
					d.getFullYear(),
					( d.getMonth() < 9 ? '0' : '' ) + ( d.getMonth() + 1 ),
					( d.getDate() < 10 ? '0' : '' ) + d.getDate(),
					( d.getHours() < 10 ? '0' : '' ) + d.getHours(),
					( d.getMinutes() < 10 ? '0' : '' ) + d.getMinutes(),
					( d.getSeconds() < 10 ? '0' : '' ) + d.getSeconds()
				].join( '' );
				$( this ).after( createDropZone( sortkey, 'top' ) );
			} );

			// Now one underneath every thread except the drag thread
			$( '.lqt_thread' ).not( $thread ).each( function () {
				var $repliesElement,
					$curThread = $( this );
				// don't put any drop zones under child threads
				if ( $.contains( $thread[ 0 ], $curThread[ 0 ] ) ) {
					return;
				}
				// don't put it right next to the thread
				if ( $curThread.find( '.lqt-thread-replies:first > .lqt_thread:last' )[ 0 ] === $thread[ 0 ] ) {
					return;
				}
				$repliesElement = liquidThreads.getRepliesElement( $curThread );
				$repliesElement.contents().filter( '.lqt-replies-finish' ).before( createDropZone( 'now', $curThread.data( 'thread-id' ) ) );
			} );

			droppableOptions = {
				activeClass: 'lqt-drop-zone-active',
				hoverClass: 'lqt-drop-zone-hover',
				drop: liquidThreads.completeDragDrop,
				tolerance: 'intersect'
			};

			$( '.lqt-drop-zone' ).droppable( droppableOptions );

			scrollOffset = scrollOffset + $thread.offset().top;

			// Reset scroll position
			$( 'html,body' ).attr( 'scrollTop', scrollOffset );
		},

		completeDragDrop: function ( e, ui ) {
			var params, emptyChecks,
				$thread = $( ui.draggable );

			// Determine parameters
			params = {
				sortkey: $( this ).data( 'sortkey' ),
				parent: $( this ).data( 'parent' )
			};

			// Figure out an insertion point
			if ( $( this ).prev().length ) {
				params.$insertAfter = $( this ).prev();
			} else if ( $( this ).next().length ) {
				params.$insertBefore = $( this ).next();
			} else {
				params.$insertUnder = $( this ).parent();
			}

			// Kill the helper.
			ui.helper.remove();

			setTimeout( function () { $thread.draggable( 'destroy' ); }, 1 );

			// Remove drop points and schedule removal of empty replies elements.
			emptyChecks = [];
			$( '.lqt-drop-zone' ).each( function () {
				var repliesHolder = $( this ).closest( '.lqt-thread-replies' );

				$( this ).remove();

				if ( repliesHolder.length ) {
					liquidThreads.checkEmptyReplies( repliesHolder, 'hide' );
					emptyChecks = $.merge( emptyChecks, repliesHolder );
				}
			} );

			params.emptyChecks = emptyChecks;

			// Now, let's do our updates
			liquidThreads.confirmDragDrop( $thread, params );
		},

		confirmDragDrop: function ( $thread, params ) {
			var $intro, $actionSummary, topLevel, wasTopLevel, buttons, $spinner,
				$summaryWrapper, $summaryPrompt, $summaryField,
				$subjectPrompt, $subjectField,
				$confirmDialog = $( '<div class="lqt-drag-confirm">' );

			// Add an intro
			$intro = $( '<p>' ).text( mw.msg( 'lqt-drag-confirm' ) );
			$confirmDialog.append( $intro );

			// Summarize changes to be made
			$actionSummary = $( '<ul>' );

			function addAction( msg ) {
				var $li = $( '<li/>' )
					.text( mw.msg( msg ) );
				$actionSummary.append( $li );
			}

			topLevel = ( params.parent === 'top' );
			wasTopLevel = $thread.hasClass( 'lqt-thread-topmost' );

			if ( params.sortkey === 'now' && wasTopLevel && topLevel ) {
				addAction( 'lqt-drag-bump' );
			} else if ( topLevel && params.sortkey !== 'now' ) {
				addAction( 'lqt-drag-setsortkey' );
			}

			if ( !wasTopLevel && topLevel ) {
				addAction( 'lqt-drag-split' );
			} else if ( !topLevel ) {
				addAction( 'lqt-drag-reparent' );
			}

			$confirmDialog.append( $actionSummary );

			// Summary prompt
			$summaryWrapper = $( '<p>' );
			$summaryPrompt = $( '<label for="reason">' ).text( mw.msg( 'lqt-drag-reason' ) );
			$summaryField = $( '<input type="text" size="45">' );
			$summaryField.addClass( 'lqt-drag-confirm-reason' )
				.attr( 'name', 'reason' )
				.attr( 'id', 'reason' )
				.keyup( function ( event ) {
					if ( event.keyCode === 13 ) {
						$( '#lqt-drag-save-button' ).click();
					}
				} );
			$summaryWrapper.append( $summaryPrompt, $summaryField );
			$confirmDialog.append( $summaryWrapper );

			if ( typeof params.reason !== 'undefined' ) {
				$summaryField.val( params.reason );
			}

			// New subject prompt, if appropriate
			if ( !wasTopLevel && topLevel ) {
				$subjectPrompt = $( '<p>' ).text( mw.msg( 'lqt-drag-subject' ) );
				$subjectField = $( '<input type="text" size="45">' )
					.addClass( 'lqt-drag-confirm-subject' )
					.attr( 'name', 'subject' );
				$subjectPrompt.append( $subjectField );
				$confirmDialog.append( $subjectPrompt );
			}

			// Now dialogify it.
			$( 'body' ).append( $confirmDialog );

			function successCallback() {
				$confirmDialog.dialog( 'close' );
				$confirmDialog.remove();
				$spinner.remove();
				liquidThreads.reloadTOC();
			}

			buttons = [ {
				id: 'lqt-drag-save-button',
				text: mw.msg( 'lqt-drag-save' ),
				click: function () {
					// Load data
					params.reason = $( this ).find( 'input[name=reason]' ).val();

					if ( !wasTopLevel && topLevel ) {
						params.subject = $.trim( $( this ).find( 'input[name=subject]' ).val() );
					}

					// Add spinners
					$spinner = $( '<div id="lqt-drag-spinner" class="mw-ajax-loader" />' );
					$thread.before( $spinner );

					if ( params.$insertAfter !== undefined ) {
						params.$insertAfter.after( $spinner );
					}

					$( this ).dialog( 'close' );

					liquidThreads.submitDragDrop( $thread, params,
						successCallback );
				}
			} ];
			$confirmDialog.dialog( { title: mw.msg( 'lqt-drag-title' ),
				buttons: buttons, modal: true, width: 550 } );
		},

		submitDragDrop: function ( $thread, params, callback ) {
			var newSortkey = params.sortkey,
				newParent = params.parent,
				threadId = $thread.find( '.lqt-post-wrapper' ).data( 'thread-id' ),
				topLevel = ( newParent === 'top' ),
				wasTopLevel = $thread.hasClass( 'lqt-thread-topmost' ),
				apiRequest = {
					action: 'threadaction',
					thread: threadId,
					reason: params.reason,
					token: mw.user.tokens.get( 'editToken' )
				};

			function doEmptyChecks() {
				$.each( params.emptyChecks, function ( k, element ) {
					liquidThreads.checkEmptyReplies( $( element ) );
				} );
			}

			function doneCallback( data ) {
				// TODO error handling
				var payload, oldParent, threadId, $reloadThread, newSortKey, ancestorId,
					result = 'success';

				if ( typeof data === 'undefined' || !data || typeof data.threadaction === 'undefined' ) {
					result = 'failure';
				}

				if ( typeof data.error !== 'undefined' ) {
					result = data.error.code + ': ' + data.error.info;
				}

				if ( result !== 'success' ) {
					// eslint-disable-next-line no-alert
					alert( 'Error: ' + result );
					doEmptyChecks();
					$( '#lqt-drag-spinner' ).remove();
					return;
				}

				if ( typeof data.threadaction.thread !== 'undefined' ) {
					payload = data.threadaction.thread;
				} else if ( typeof data.threadaction[ 0 ] !== 'undefined' ) {
					payload = data.threadaction[ 0 ];
				}

				if ( !wasTopLevel ) {
					oldParent = $thread.closest( '.lqt-thread-topmost' );
				}

				// Do the actual physical movement
				threadId = $thread.find( '.lqt-post-wrapper' )
					.data( 'thread-id' );

				// Assorted ways of returning a thread to its proper place.
				if ( typeof params.$insertAfter !== 'undefined' ) {
					$thread.remove();
					params.$insertAfter.after( $thread );
				} else if ( typeof params.$insertBefore !== 'undefined' ) {
					$thread.remove();
					params.$insertBefore.before( $thread );
				} else if ( typeof params.$insertUnder !== 'undefined' ) {
					$thread.remove();
					params.$insertUnder.prepend( $thread );
				}

				$thread.data( 'thread-id', threadId );
				$thread.find( '.lqt-post-wrapper' ).data( 'thread-id', threadId );

				if ( typeof payload[ 'new-sortkey' ] !== 'undefined' ) {
					newSortKey = payload[ 'new-sortkey' ];
					$thread.find( '.lqt-thread-modified' ).val( newSortKey );
					$thread.find( 'input[name=lqt-thread-sortkey]' ).val( newSortKey );
				} else {
					// Force an update on the top-level thread
					$reloadThread = $thread;

					if ( !topLevel && typeof payload[ 'new-ancestor-id' ] !== 'undefined' ) {
						ancestorId = payload[ 'new-ancestor-id' ];
						$reloadThread = $( '#lqt_thread_id_' + ancestorId );
					}

					liquidThreads.doReloadThread( $reloadThread );
				}

				// Kill the heading, if there isn't one.
				if ( !topLevel && wasTopLevel ) {
					$thread.find( 'h2.lqt_header' ).remove();
				}

				if ( !wasTopLevel && typeof oldParent !== 'undefined' ) {
					liquidThreads.doReloadThread( oldParent );
				}

				// Call callback
				if ( typeof callback === 'function' ) {
					callback();
				}

				doEmptyChecks();
			}

			if ( !topLevel || !wasTopLevel ) {
				// Is it a split or a merge

				if ( topLevel ) {
					// It is a split, and needs a new subject
					if ( typeof params.subject !== 'string' || params.subject.length === 0 ) {

						$( '#lqt-drag-spinner' ).remove();
						// eslint-disable-next-line no-alert
						alert( mw.msg( 'lqt-ajax-no-subject' ) );
						// here we should prompt the user again to enter a new subject
						return;
					}
					apiRequest.threadaction = 'split';
					apiRequest.subject = params.subject;
				} else {
					apiRequest.threadaction = 'merge';
					apiRequest.newparent = newParent;
				}

				if ( newSortkey !== 'none' ) {
					apiRequest.sortkey = newSortkey;
				}
				( new mw.Api() ).post( apiRequest ).done( doneCallback );
			} else if ( newSortkey !== 'none' ) {
				apiRequest.threadaction = 'setsortkey';
				apiRequest.sortkey = newSortkey;
				( new mw.Api() ).post( apiRequest ).done( doneCallback );
			}
		},

		handleEditSignature: function ( e ) {
			var $container, $saveButton;

			e.preventDefault();

			$container = $( this ).parent();

			$container.find( '.lqt-signature-preview' ).hide();
			$container.find( 'input[name=wpLqtSignature]' ).show();
			$( this ).hide();

			// Add a save button
			$saveButton = $( '<a href="#">' )
				.text( mw.msg( 'lqt-preview-signature' ) )
				.click( liquidThreads.handlePreviewSignature );

			$container.find( 'input[name=wpLqtSignature]' ).after( $saveButton );
		},

		handlePreviewSignature: function ( e ) {
			var $container, $spinner, $textbox, $preview;

			e.preventDefault();

			$container = $( this ).parent();

			$spinner = $( '<span class="mw-small-spinner">' );
			$( this ).replaceWith( $spinner );

			$textbox = $container.find( 'input[name=wpLqtSignature]' );
			$preview = $container.find( '.lqt-signature-preview' );

			$textbox.hide();

			( new mw.Api() ).post( {
				action: 'parse',
				text: $textbox.val(),
				pst: '1',
				prop: 'text'
			} ).done( function ( data ) {
				var html = $( $.trim( data.parse.text[ '*' ] ) );

				if ( html.length === 2 ) { // Not 1, because of the NewPP report
					html = html.contents();
				}

				$preview.empty().append( html ).show();
				$spinner.remove();
				$container.find( '.lqt-signature-edit-button' ).show();
			} );
		}
	};

	$( function () {
		// One-time setup for the full page

		// Update the new thread link
		var $threadContainers,
			newThreadLink = $( '.lqt_start_discussion a' );

		$( 'li#ca-addsection a' ).attr( 'lqt_talkpage', $( '.lqt_start_discussion a' ).attr( 'lqt_talkpage' ) );

		newThreadLink = newThreadLink.add( $( 'li#ca-addsection a' ) );

		if ( newThreadLink ) {
			newThreadLink.click( liquidThreads.handleNewLink );
		}

		// Find all threads, and do the appropriate setup for each of them

		$threadContainers = $( 'div.lqt-post-wrapper' );

		$threadContainers.each( function () {
			liquidThreads.setupThread( $( this ) );
		} );

		// Live bind for unwatch/watch stuff.
		$( document ).on( 'click', '.lqt-command-watch', liquidThreads.asyncWatch );
		$( document ).on( 'click', '.lqt-command-unwatch', liquidThreads.asyncWatch );

		// Live bind for link window
		$( document ).on( 'click', '.lqt-command-link', liquidThreads.showThreadLinkWindow );

		// Live bind for summary links
		$( document ).on( 'click', '.lqt-summary-link', liquidThreads.showSummaryLinkWindow );

		// For "show replies"
		$( document ).on( 'click', 'a.lqt-show-replies', liquidThreads.showReplies );

		// "Show more posts" link
		$( document ).on( 'click', 'a.lqt-show-more-posts', liquidThreads.showMore );

		// Edit link handler
		$( document ).on( 'click', '.lqt-command-edit > a', liquidThreads.handleEditLink );

		// Save handlers
		$( document ).on( 'click', '#wpSave', liquidThreads.handleAJAXSave );
		$( document ).on( 'keyup', '#wpTextbox1', liquidThreads.onTextboxKeyUp );

		// Hide menus when a click happens outside them
		$( document ).click( liquidThreads.handleDocumentClick );

		// Set up periodic update checking
		setInterval( liquidThreads.checkForUpdates, 60000 );

		$( window ).bind( 'beforeunload', function () {
			var confirmExitPage = false;
			$( '.lqt-edit-form:not(.lqt-summarize-form)' ).each( function ( index, element ) {
				var $textArea = $( element ).children( 'form' ).find( 'textarea' );
				if ( element.style.display !== 'none' && !$( element ).data( 'non-ajax-submit' ) && $textArea.val() ) {
					confirmExitPage = true;
				}
			} );
			if ( confirmExitPage ) {
				return mw.msg( 'lqt-pagechange-editformopen' );
			}
		} );
	} );

}( mediaWiki, jQuery ) );
