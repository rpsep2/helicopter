//speed 3, ani speed 2000, create speed 1700
//speed 2, ani speed 1700, create speed 1400
//speed 1, ani speed 1400, create speed 1100

var is_device = document.URL.indexOf( 'http://' ) === -1 && document.URL.indexOf( 'https://' ) === -1;

if(is_device)
    document.addEventListener('deviceReady', onDeviceReady);
else
    $(document).ready(init);

var no_ads = window.localStorage.getItem('helicopter_no_ads') ? window.localStorage.getItem('helicopter_no_ads') : false;
var admobid = {};
var NativeAudio;
var mute = window.localStorage.getItem('helicopter_mute') ? true : false;

function onDeviceReady(){
    // Preload audio resources
    // complex CAN be stopped/ looped
    // simple can not - they just play.
    NativeAudio = window.plugins.NativeAudio;
    NativeAudio.preloadComplex('bg_sound', 'sounds/background.wav', 0.5, 1, 0, function(msg){
    }, function(msg){
        console.log( 'error: ' + msg );
    });

    NativeAudio.preloadComplex('fly_sound', 'sounds/fly.mp3', 1, 1, 0, function(msg){
    }, function(msg){
        console.log( 'error: ' + msg );
    });

    NativeAudio.preloadSimple('crash_sound', 'sounds/crash.mp3', function(msg){
    }, function(msg){
        console.log( 'error: ' + msg );
    });

    NativeAudio.preloadSimple('click_sound', 'sounds/click.wav', function(msg){
    }, function(msg){
        console.log( 'error: ' + msg );
    });

    NativeAudio.preloadSimple('success_sound', 'sounds/success.mp3', function(msg){
    }, function(msg){
        console.log( 'error: ' + msg );
    });

    NativeAudio.preloadSimple('highscore_sound', 'sounds/highscore.mp3', function(msg){
    }, function(msg){
        console.log( 'error: ' + msg );
    });

    if( /(android)/i.test(navigator.userAgent) ){
        admobid = { // for Android
            banner: 'ca-app-pub-8099513553195534/7510762403',
            interstitial: 'ca-app-pub-8099513553195534/1464228807',
        };
    }else if(/(ipod|iphone|ipad)/i.test(navigator.userAgent)){
        admobid = { // for iOS
            banner: 'ca-app-pub-8099513553195534/6693335605',
            interstitial: 'ca-app-pub-8099513553195534/9567260005',
        };
    }else{
        admobid = { // for Windows Phone
            banner: 'ca-app-pub-8099513553195534/7510762403',
            interstitial: 'ca-app-pub-8099513553195534/1464228807',
        };
    }

    //Ads
    if(typeof AdMob != 'undefined' && !no_ads){
        AdMob.createBanner({
            adId: admobid.banner,
            position: AdMob.AD_POSITION.BOTTOM_CENTER,
            autoShow: true,
            overlap: true,
            isTesting: false, // REMOVE FOR PROD!!
        });

        // prepare a new interstitual
        AdMob.prepareInterstitial( {adId:admobid.interstitial, autoShow:false, overlap: true} );
    }

    init();

    setTimeout(function() {
        StatusBar.hide();
        navigator.splashscreen.hide();
        if (!mute)
            NativeAudio.loop('bg_sound');
    }, 4000);
}

function init(){
    var $helicopter = $('#helicopter');
    var $container = $('#container');
    var $body = $('body');
    var $wrapper = $('#wrapper');
    var $gameover = $('#gameover');
    var $gameover_overlay = $('#gameover-overlay');
    var $intro = $('#intro');
    var $instructions = $('#instructions');
    var $game_score = $('#end-score');
    var $best_score = $('#best-score');
    var $end_best_score = $('#end-best-score');
    var $score = $('#score');
    var cur_score = 0;
    var $roof = $('#roof');
    var roof_height = $roof.height();
    var $floor = $('#floor');
    var floor_height = $floor.height();
    var $grass = $('.grass');
    var remove_block;
    var create_obstacles;
    var create_trails;
    var create_fire;
    var start_scoring;
    var next_score;
    var first_score;
    var delay_fall;
    var delay_fly;
    var window_width = parseInt($(window).width());
    var window_height = parseInt($(window).height());
    var copter_height = $helicopter.height();
    var copter_width = $helicopter.width();
    var start_pos;
    var min_gap = parseInt(copter_height) + 35; //set the min gap for calculations here based on copter height
    var min_top_pos = parseInt(min_gap + roof_height); // minimum position top for a feasable top gap
    var min_bottom_pos = parseInt(min_gap + floor_height); //minimim position bottom for a feasable bottom gap
    var min_height = window_height - floor_height - min_gap - 100;
    var max_height = window_height - min_gap - roof_height - floor_height; //max height a block can be
    var max_bottom = window_height /2; //dont want a gap bigger than half the screen, too easy
    var max_top = window_height /2; //dont want a gap bigger than half the screen, too easy
    var total_gap = window_height - floor_height - roof_height;
    var gamecenter_auth = false;
    var $lives = $('#lives-count');
    var num_lives = window.localStorage.getItem('helicopter_lives') ? window.localStorage.getItem('helicopter_lives') : 10;
    var $purchase = $('#purchase');
    var $no_lives = $('#no-lives');
    var $life_timer_wrap = $('#life-timer-wrap');
    var $life_timer = $('#life-timer');
    var life_regen_every = 5; // in minutes
    var time_until_next_life = (life_regen_every * 60); //  30 minutes in seconds
    var life_regen_counter;
    var $free_helicopters = $('#helicopter_lives_free');
    var has_shared_before = window.localStorage.getItem('helicopter_has_shared') ? true : false;

    /* --  SETTINGS -- */
    var speed = 1.2; // set the speed depending on difficulty selected, lower = harder
    var ani_speed = set_ani_speed();
    var create_obstacle_speed = ani_speed - 400;

    var best_score = window.localStorage.getItem('helicopter_best_score');

    //change for app deployment
    var start_event = 'ontouchend' in document ? 'touchstart' : 'mousedown';
    var end_event = 'ontouchend' in document ? 'touchend' : 'mouseup';

    // Show the start screen
    show_start();

    // auth gamecenter
    if (is_device)
        do_gamecenter_auth();

    // setup purchases
    if (is_device)
        setup_purchases();

    // resume timer for lives, add any lives etc
    init_life_regen();

    if (mute) {
        $('#sound-toggle').addClass('mute');
        update_sound();
    }

    // on resume, recalculate lifes
    document.addEventListener('resume', init_life_regen);

    $instructions.on(start_event, function(){
        $body.on(start_event, copter_touchstart).on(end_event, copter_touchend);
        $instructions.hide();
        create_obstacles = setInterval(create_obstacle, create_obstacle_speed);
        check_collisions = setInterval(check_collision, 20);
        increase_speed = setInterval(increment_speed, 1000);
    });

    function set_ani_speed(){
        return 1100 + (speed * 300);
    }

    function increment_speed(){
        if(ani_speed > 1200){
            ani_speed = ani_speed -= 20;
        }
    }

    function copter_touchstart(){
        var matrix = $helicopter.css('-webkit-transform').replace(/[^0-9\-.,]/g, '').split(',');
        var cur_top = matrix[5];
        var new_top = parseInt(cur_top - window_height);

        $helicopter.css('-webkit-transform', 'translate3d(0, '+ new_top +'px, 0)');

        setTimeout(function(){
            // play a flying sound
            if(is_device && !mute){
                NativeAudio.play('fly_sound');
            }
        },20);
    }

    function copter_touchend(){
        var matrix = $helicopter.css('-webkit-transform').replace(/[^0-9\-.,]/g, '').split(',');
        var cur_top = matrix[5];
        var new_top = parseInt(cur_top) + window_height;

        $helicopter.css('-webkit-transform', 'translate3d(0, '+ new_top +'px, 0)');

        setTimeout(function(){
            //stop flying sound
            if(is_device){
                NativeAudio.stop('fly_sound');
            }
        },20)
    }

    function grass_scroll(){
        $grass.css('-webkit-transition','all '+ ani_speed/1000 +'s linear');

        var current_bg_pos = $grass.css('background-position-x');
        var new_bg_pos = parseInt(current_bg_pos) - window_width;

        $grass.css('background-position-x', new_bg_pos+'px');
    }

    function create_obstacle(){
        var $block = $(document.createElement('div')).addClass('obstacle');

        var block_height = randomNumberFromRange(min_height, max_height);
        var moving_block = 0;


        // moving blocks at 10+ but randomly. except at exactly 10 we want a moving block.
        // at 20+ we want ALL blocks to be moving
        // at 30+ we make the blocks bigger even though they are moving
        // at 40+ we make the blocks bigger again even though they are moving (realistic biggest size)
        // TODO: future update - further increases to difficulty at 50+ like smaller playing field?? - 'roof' and 'floor'
        // constantly moving in Indiana Jones Style
        if (cur_score >= 40) {
            moving_block = 1;
            block_height = block_height / 1.2;
        }
        else if (cur_score >= 30) {
            moving_block = 1;
            block_height = block_height / 1.3;
        }
        else if (cur_score >= 20) {
            moving_block = 1;
            block_height = block_height / 1.5;
        }
        else if (cur_score >= 10) {
            // either 1 if 10, or random 0/1 otherwise
            moving_block = (cur_score === 10) ? 1 : (Math.round(Math.random() * 1));
            if (moving_block === 1)
                block_height = block_height / 2;
        }

        $block.css('height', block_height);

        /* -- code to decide where to place the block -- */

        // randomly generates either 0 or 1
        var top_bottom = Math.round(Math.random() * 1);

        // assign 0 to a block at bottom
        if(top_bottom === 0){

            //generate random number between 2 numbers.
            var rand_bottom = randomNumberFromRange(min_bottom_pos, max_bottom);

            $block.css('bottom', rand_bottom+'px')

        //else its 1, assign this to block at bottom
        }else{

            //generate random number between 2 numbers.
            var rand_top = randomNumberFromRange(min_top_pos, max_top);

            $block.css('top', rand_top+'px')

        }

        $block.css('-webkit-transition', 'all '+ ani_speed/1000 + 's linear');
        $wrapper.append($block);

        //set timeout to allow element to be in DOM before animating it
        setTimeout(function(){
            var $new_obstacle = $('.obstacle').not('.moving');
            if (moving_block === 1) {
                if (top_bottom === 0) {
                    var top_gap = total_gap - (rand_bottom + block_height);
                    $new_obstacle.addClass('moving').css('-webkit-transform','translate3d(-'+ parseInt(window_width + 40) +'px,-'+top_gap+'px,0)');
                }
                else {
                    var bottom_gap = total_gap - (rand_top + block_height);
                    $new_obstacle.addClass('moving').css('-webkit-transform','translate3d(-'+ parseInt(window_width + 40) +'px,'+bottom_gap+'px,0)');
                }
            }
            else {
                $new_obstacle.addClass('moving').css('-webkit-transform','translate3d(-'+ parseInt(window_width + 40) +'px,0,0)');
            }
            next_score = setTimeout(function(){
                add_score();
            },(ani_speed/5) *4);
        },20)

        // after the obstacle has gone accross screen, remove it
        remove_block = setTimeout(function(){
            $('.obstacle.moving').first().remove();
        },ani_speed);
    }

    function randomNumberFromRange(min,max){
        return(Math.floor(Math.random()*(max-min+1)+min));
    }

    function create_trail(){
        var $trail = $(document.createElement('div')).addClass('trail');
        $trail.css('top', parseInt($helicopter.offset().top +5));
        $wrapper.prepend($trail);

        setTimeout(function(){
            var $new_trail = $('.trail').not('.move-trail');
            $new_trail.addClass('move-trail');

            setTimeout(function(){
                $new_trail.remove();
            },200)
        },10);
    }

    function fire(){
        var $fire = $(document.createElement('div')).addClass('fire');
        $fire.css({'top' : parseInt($helicopter.offset().top) , 'left' : parseInt($helicopter.offset().left)+25 });
        $wrapper.prepend($fire);

        setTimeout(function(){
            var $new_fire = $('.fire').not('.move-fire');
            $new_fire.addClass('move-fire');

            setTimeout(function(){
                $new_fire.remove();
            },200);
        },10);
    }

    function check_collision(){
        var offset = $helicopter.offset();
        var copter_top = offset.top;
        var copter_bottom = parseInt(copter_top + copter_height);
        var copter_left = offset.left;
        var copter_right = parseInt(copter_left + copter_width);

        var hit = false;

        if(copter_top <= 0){
            hit = true;
            show_gameover(false, copter_top, true);
            //stop this continuing
            return false;
        }

        if(copter_bottom >= (window_height-floor_height)){
            hit = true;
            show_gameover(true, copter_top);
            //stop this continuing
            return false;
        }

        $.each($('.obstacle'), function(i, block){
            var block = $(block);
            var block_offset = block.offset();
            var block_top = block_offset.top;
            var block_bottom = parseInt(block_top + block.height());
            var block_left = block_offset.left;
            var block_right = parseInt(block_left + block.width());

            if(copter_top < block_bottom){
                if(copter_right > block_left){
                    if(copter_bottom > block_top){
                        if(copter_left < block_right){
                            hit = true;
                            $('.obstacle').addClass('hit');
                        }
                    }
                }
            }

            if(hit){
                //clear all looping functions
                show_gameover(false, copter_top);

                //stop this continuing
                return false;
            }

        });

    }

    function add_score(){
        cur_score = cur_score+=1;
        $score.text(cur_score);

        if (is_device && !mute) {
            NativeAudio.play('success_sound');
        }
    }

    function show_gameover(hit_bottom, copter_top, hit_top){
        //remove touch listeners to control copter
        $body.off();

        if(is_device){
            //vibrate
            var platform = device.platform;
            if(platform.match(/ios/i)) {
                navigator.vibrate(300);
                //navigator.notification.vibrate(300);
            }

            //stop flying sound
            NativeAudio.stop('fly_sound');

            // BUG:sometimes we can touchstart at exactly the right (wrong) moment and fly sound plays again
            setTimeout(function() {
                NativeAudio.stop('fly_sound');
            }, 50);
        }

        // play a crashing sound
        if(is_device && !mute){
            NativeAudio.play('crash_sound');
        }

        //clear all looping functions
        clearInterval(create_obstacles);
        clearInterval(check_collisions);
        clearInterval(create_trails);
        clearInterval(start_scoring);
        clearTimeout(next_score);
        clearTimeout(remove_block);
        clearInterval(scroll_grass);
        clearInterval(increase_speed);

        // Reset ani_speed
        ani_speed = set_ani_speed();

        //stop grass
        var current_bg_pos = $grass.css('background-position-x');
        $grass.removeAttr('style').css('background-position-x' , current_bg_pos);

        // stop obstacles
        $('.obstacle').each(function(i, ob) {
            var current_obstacle_matrix = $(ob).css('transform').replace(/[^0-9\-.,]/g, '').split(',');
            var current_obstacle_left = current_obstacle_matrix[4];
            var current_obstacle_top = current_obstacle_matrix[5];

            $(ob).css({
                '-webkit-transition': 'none',
                '-webkit-transform': 'translate3d(' + current_obstacle_left + 'px,'+ current_obstacle_top +'px,0)'
            }).removeClass('moving');
        });

        //make helicopter plumit to death
        //if we hit the bottom, dont move anything just keep still
        if(hit_bottom)
            $helicopter.addClass('fall').removeAttr('style').show().css('top', Math.round(copter_top));
        else {
            $helicopter.addClass('fall').css('-webkit-transform','translate3d(0, '+ parseInt(window_height - start_pos - floor_height - copter_width + 20) +'px, 0) rotate(90deg)');
        }

        //check best score + update if new best + show user
        best_score = window.localStorage.getItem('helicopter_best_score');
        var game_score = cur_score;
        $game_score.html('<span>GAME SCORE</span>'+game_score);
        var new_best = false;

        if(!best_score || (game_score > best_score)){
            new_best = true;
            best_score = game_score
            window.localStorage.setItem('helicopter_best_score', best_score);
            $end_best_score.html('<span>BEST SCORE</span>' + game_score + '<span class="new">NEW!</span>').addClass('new-best');
        }
        else {
            $end_best_score.html('<span>BEST SCORE</span>'+best_score);
        }

        $best_score.html('<span>BEST SCORE</span>'+best_score);

        //remove trail
        $('.trail').remove();

        // update lives
        num_lives -= 1;
        window.localStorage.setItem('helicopter_lives', num_lives);
        update_lives();

        // we are now on 9 lives - init life regen
        if (num_lives == 9) {
            window.localStorage.setItem('helicopter_time_since_life', new Date());
            init_life_regen();
        }

        setTimeout(function(){
            // remove any obstacles
            $('.obstacle').remove();

            //reset score
            cur_score = 0;

            //hide in game score
            $score.hide();

            //show gameover screen
            $gameover.show()
            setTimeout(function(){
                $gameover.addClass('show-gameover');
            },10);

            create_fire = setInterval(fire, 50);

            if (new_best && is_device && !mute)
                NativeAudio.play('highscore_sound');

            // submit score to leaderboard if new best, and alrady authed
            if (gamecenter_auth && new_best)
                submit_highscore();

        },600);
    }

    $('#ok').on(end_event, show_start);

    function show_start(){
        // show the interstitial, and prepare another one ready
        var rand_num = randomNumberFromRange(1, 6);
        if(rand_num == 2 && is_device && typeof AdMob != 'undefined' && !no_ads){
            AdMob.showInterstitial();
            // prepare a new interstitual
            AdMob.prepareInterstitial( {adId:admobid.interstitial, autoShow:false} );
        }

        var timeout = 0;

        // black fade in out like oldschool games
        if ($gameover.is(':visible')) {
            $container.addClass('restart');
            timeout = 200;

            setTimeout(function() {
                $container.removeClass('restart');
            }, 400);
        }

        setTimeout(function() {
            clearInterval(create_fire);
            $('.fire').remove();
            $helicopter.removeAttr('style').removeClass('fall').hide();

            $gameover.hide().removeClass('show-gameover');
            $intro.show();

            best_score = window.localStorage.getItem('helicopter_best_score');

            if(best_score)
                $best_score.html('<span>BEST SCORE</span>'+best_score).show();

            // Reset this
            $end_best_score.removeClass('new-best');

            grass_scroll();
            scroll_grass = setInterval(grass_scroll, ani_speed);

            update_lives();
        }, timeout);
    }

    $('#start').on(end_event, show_instructions);

    function show_instructions(){
        if (num_lives > 0) {
            $intro.hide();
            $instructions.show();
            $helicopter.show();
            $score.text('0').show();
            start_pos = $helicopter.offset().top;

            create_trails = setInterval(create_trail, 50);
        }
        else {
            // no lives left
            show_purchase();
        }
    }

    //setup hovers
    $('#start, #ok, .rate, .remove-ads, .leaderboard, .share, .purchase-product, #close-purchase').on(start_event, function(){
        $(this).addClass('hover');
    }).on(end_event, function(){
        $(this).removeClass('hover');
        if (is_device && !mute) {
            NativeAudio.play('click_sound');
        }
    });

    // Setup Rate button
    $('.rate').on(end_event, function(){
        if (is_device)
            var platform = device.platform;
        else
            var platform = 'android';

        if(platform.match(/ios/i))
            window.open('itms-apps://itunes.apple.com/app/helicopter!/id1189567725?ls=1&mt=8');
        else
            window.open('market://details?id=co.uk.rp_digital.helicopter_free');
    });

    // Setup remove ads button - purchase, and store the fact user has purchased
    $('.remove-ads').on(end_event, show_purchase);
    $lives.on(end_event, show_purchase);

    $('.share').on(end_event, function() {
        html2canvas(document.body, {
            onrendered: function(canvas) {
                var base64 = canvas.toDataURL();
                share_score(base64);
            }
        });
    });

    function share_score(base64, free_lives) {
        // Beware: passing a base64 file as 'data:' is not supported on Android 2.x: https://code.google.com/p/android/issues/detail?id=7901#c43
        // Hint: when sharing a base64 encoded file on Android you can set the filename by passing it as the subject (second param)
        if (is_device)
            if (free_lives) {
                var msg = 'Check out this Helicopter! game on the App Store';
                if (best_score) {
                    msg = msg + ' - can you beat my score of ' + best_score;
                }
                window.plugins.socialsharing.share(msg, 'Helicopter!', base64, null, function(result) {
                    if (result == true) {
                        add_lives_for_share();
                    }
                    else {
                        navigator.notification.alert("Don't worry, you can share at any time for your free Helicopters!", function(){}, 'Share Not Completed');
                    }
                });
            }
            else {
                if (best_score) {
                    var msg = 'I got a new best score of ' + best_score + ' on Helicopter!';
                    var title = 'Helicopter Highscore';
                }
                else {
                    var msg = 'Check out this Helicopter! game on the App Store';
                    var title = 'Helicopter!';
                }
                window.plugins.socialsharing.share(msg, title, base64, null, function(result) {
                    if (result == true && !has_shared_before) {
                        add_lives_for_share();
                    }
                });
            }
    }

    function add_lives_for_share() {
        navigator.notification.alert('Have 10 helicopters on us', function(){}, 'Thanks for sharing!');
        num_lives += 10;
        update_lives();
        // this will actually stop life regen to stop users being able to regen lives above 10
        if (life_regen_counter)
            clearInterval(life_regen_counter);

        init_life_regen();

        // set to true
        has_shared_before = true;
        window.localStorage.setItem('helicopter_has_shared', 'true');
        $free_helicopters.hide();
    }

    $('.leaderboard').on(end_event, show_leaderboard);

    function show_leaderboard() {
        if (is_device) {
            if (gamecenter_auth) {
                var platform = device.platform;
                if (platform.match(/ios/i)) {
                    var data = {
                        leaderboardId: "helicopter.highscores"
                    };
                    gamecenter.showLeaderboard(gamecenter_show_success, gamecenter_show_fail, data);
                }
                else {
                    // TODO android
                }
            }
            else {
                navigator.notification.alert('There was an error loading the Game Center Highscores. Please check your settings and try again.', function() {}, 'Game Center Error');
            }
        }
    }

    function submit_highscore() {
        if (is_device) {
            var platform = device.platform;
            if (platform.match(/ios/i)) {
                var data = {
                    score: best_score,
                    leaderboardId: "helicopter.highscores"
                };
                gamecenter.submitScore(gamecenter_submit_success, gamecenter_submit_fail, data);
            }
            else {
                // TODO: android
            }
        }
    }

    function do_gamecenter_auth() {
        // different for ios vs android
        var platform = device.platform;

        if (platform.match(/ios/i))
            gamecenter.auth(gamecenter_auth_success, gamecenter_auth_fail);
        else {
            // TODO: android
        }
    }

    function gamecenter_auth_success() {
        gamecenter_auth = true;
    }

    function gamecenter_auth_fail() {
        gamecenter_auth = false;
    }

    function gamecenter_submit_success() {
    }

    function gamecenter_submit_fail() {
    }

    function gamecenter_show_success() {
    }

    function gamecenter_show_fail(data) {
        navigator.notification.alert('There was an error loading the Game Center Highscores. Please check your settings and try again.', function() {}, 'Game Center Error');
    }

    /* in app purchases */

    // use localstorage to update local var (quicker than using the store)
    // store will update again once its finished refreshing etc.
    // this just means we can show correct data instantly

    function setup_purchases() {
        // First inform the store about our three configured products:

        // A consumable 10 lives product
        store.register({
            id:    'helicopter_lives',
            alias: 'Helicopter Lives',
            type:   store.CONSUMABLE
        });

        /*// A consumable 25 lives product
        store.register({
            id:    'co.uk.jobooz.helicopter.lives25',
            alias: '25 lives',
            type:   store.CONSUMABLE
        });

        // A consumable 50 lives product
        store.register({
            id:    'co.uk.jobooz.helicopter.lives50',
            alias: '50 lives',
            type:   store.CONSUMABLE
        });*/

        // A non-consumable (one-off) 'Full version / no ads' product
        store.register({
            id:    'remove_ads',
            alias: 'Remove Ads',
            type:   store.NON_CONSUMABLE
        });

        // Now configure event listeners:
        // ------------------------------

        // When any product gets updated (or refreshed), its details are passed to app
        store.when("product").updated(function (p) {
            // This is a good place to prepare or render the UI based on these refreshed details:
            if (p.valid) {
                var productId = p.id;
                var nice_id = productId.split('.').pop();
                var data = {
                    id: productId, // call store.order(id) to buy this product
                    title: p.title,
                    description: p.description,
                    canPurchase: p.canPurchase,
                    price: p.price, // in the currency of the users App Store account
                    owned: p.owned
                };

                // store so we can have easy access later if needs be?
                window.localStorage.setItem('helicopter_' + nice_id, JSON.stringify(data));

                // update the display details, price etc on the purchase screen
                update_store_item(data);
            }
        });

        // When the purchase of lives is approved, update lives count
        store.when("Helicopter Lives").approved(function (order) {
            num_lives += 10;
            update_lives();
            hide_purchase();
            // this will actually stop life regen to stop users being able to regen lives above 10
            clearInterval(life_regen_counter);
            init_life_regen();
            order.finish();
        });

        // When the purchase of no adverts, update
        store.when("Remove Ads").approved(function (order) {
            remove_ads();
            hide_purchase();
            order.finish();
        });

        // Deal with errors:
        // -----------------
        store.error(function(error) {
            navigator.notification.alert('ERROR ' + error.code + ': ' + error.message);
        });

        // As the last step, refresh the store:
        // -------------------------------------

        // This will contact the server to check all registered products validity and ownership status.
        // It's mostly fine to do this only at application startup but you can refresh it more often.
        store.refresh();
    }

    function update_store_item(data) {
        // get the el
        var productId = data.id;
        var nice_id = productId.split('.').pop();
        var $el = $('#' + nice_id);

        // update price
        $el.find('.price').html('<span>' + data.price + '</span>');

        // update title
        $el.find('.title').html(data.title);

        // update productId data
        $el.data('productId', data.id);

        // update UI - remove ads or update lives count
        /*if (nice_id == 'lives') {
            // update localstorage & var
            num_lives += 10;
            update_lives();
        }
        else if (nice_id == 'lives25') {
            num_lives += 25;
            update_lives();
        }
        else if (nice_id == 'lives50') {
            num_lives += 50;
            update_lives();
        }*/

        // remove ads is non consumable, so if its already owned, make sure we remove ads
        // localstorage could get deleted, not be up to date somehow..
        if (nice_id == 'remove_ads' && data.owned) {
            remove_ads();
        }
        else {
            $el.show();
        }
    }

    function update_lives() {
        window.localStorage.setItem('helicopter_lives', num_lives);
        $lives.html(num_lives);
    }

    function remove_ads() {
        no_ads = true;
        window.localStorage.setItem('helicopter_no_ads', true);
        // hide the remove ads purchase option
        $('#remove_ads, .remove-ads').hide();
        AdMob.hideBanner();
    }

    function show_purchase() {
        $no_lives.hide();
        $life_timer_wrap.hide();
        $free_helicopters.hide();

        if (num_lives == 0) {
            $no_lives.show();
        }

        if (num_lives < 10){
            $life_timer_wrap.show();
        }

        if (!has_shared_before) {
            $free_helicopters.show();
        }

        $purchase.show();
        setTimeout(function(){
            $purchase.addClass('show-purchase');
        },10);
    }

    function hide_purchase() {
        $purchase.removeClass('show-purchase');
        setTimeout(function(){
            $purchase.hide();
        },300);
    }

    $('.purchase-product').on(end_event, function() {
        // if product id = free, show alert for sharing the game
        if ($(this).hasClass('free')) {
            console.log('yeh')
            navigator.notification.confirm(
                'Share us on social media and we will give you 10 helicopters for free!', // message
                function(buttonIndex) {
                    if (buttonIndex == 1) {
                        hide_purchase();
                        html2canvas(document.body, {
                            onrendered: function(canvas) {
                                var base64 = canvas.toDataURL();
                                share_score(base64, true);
                            }
                        });
                    }
                },            // callback to invoke with index of button pressed
                'Spread the word!',       // title
                ['Share','No Thanks']     // buttonLabels
            );
        }
        else {
            var productId = $(this).closest('.product').data('productId');
            if (is_device) {
                store.order(productId);
            }
        }
    });

    $('#close-purchase').on(end_event, hide_purchase);

    function init_life_regen() {
        // if user has 10 or more lives (purchased or regen to max 10 already)
        // cancel regen
        if (num_lives >= 10) {
            window.localStorage.removeItem('helicopter_time_since_life');
            clearInterval(life_regen_counter);
            return false;
        }

        var now = new Date();
        // default to now but this should always be set if we get to here
        var time_last_life = (window.localStorage.getItem('helicopter_time_since_life') && window.localStorage.getItem('helicopter_time_since_life') != 'Invalid Date') ? new Date(window.localStorage.getItem('helicopter_time_since_life')) : now;

        var time_diff = now - time_last_life; // gives milliseconds
        var diff_seconds = Math.floor(time_diff / 1000); // whole seconds
        var diff_minutes = Math.floor(time_diff / 60000); //whole minutes

        // workout how many lives, if any, we need to add
        var additional_lives = Math.floor(diff_minutes / life_regen_every);
        var seconds_since_last_life;

        // minutes since last life will be based on how long ago we added the last life for
        if (additional_lives >= 1) {
            num_lives = parseInt(num_lives) + parseInt(additional_lives);

            // could have been days since they last used the app - would generate hundreds of lives. max 10
            if (num_lives > 10)
                num_lives = 10;

            seconds_since_last_life = diff_seconds - (additional_lives * (life_regen_every * 60)); // total diff minus lives added (in seconds)
            update_lives();

            // weve added a life so hide no lives msg incase we were at 0 lives
            $no_lives.hide();
        }
        // else, its just the time diff
        else{
            seconds_since_last_life = diff_seconds;
        }

        // are we now at 10? dont bother with this stuff then
        // update localstorage date since last life. minus milliseconds
        window.localStorage.setItem('helicopter_time_since_life', new Date(now - (seconds_since_last_life * 1000)));

        // now we can display how many minutes **TO** the next life
        time_until_next_life = (life_regen_every * 60) - seconds_since_last_life;

        // kill then restart the countdown
        if (life_regen_counter)
            clearInterval(life_regen_counter);

        life_regen_counter = setInterval(life_regen_countdown, 1000);
    }

    // time until next life is in seconds
    function life_regen_countdown() {
        var mins = time_pad(Math.floor(time_until_next_life / 60)); // whole minutes
        var seconds = time_pad(time_until_next_life % 60); // remainder
        $life_timer.html(mins + ':' + seconds);
        time_until_next_life -= 1;

        if (time_until_next_life < 0) {
            // stop the interval
            clearInterval(life_regen_counter);

            // start this again, it will auto add 1 life
            init_life_regen();
        }
    }

    function time_pad(num) {
        if (num < 10)
            return '0' + num;
        else
            return num;
    }

    // toggle sound on/off
    $('#sound-toggle').on(end_event, function() {
        $(this).toggleClass('mute');
        update_sound();
    });

    function update_sound() {
        if ($('#sound-toggle').hasClass('mute')) {
            window.localStorage.setItem('helicopter_mute', true);
            mute = true;
            // stop directly
            if (is_device) {
                NativeAudio.stop('bg_sound');
                NativeAudio.stop('fly_sound');
            }
        }
        else {
            window.localStorage.removeItem('helicopter_mute');
            mute = false;
            // start loop again
            if (is_device)
                NativeAudio.loop('bg_sound');
        }
    }



    // difficulty
    //$('#easy, #medium, #hard').on(start_event, set_difficulty)

    /*function set_difficulty(){
        var $this = $(event.target);

        //check this isnt from the ok click event
        var id = $this.attr('id') != 'ok' ? $this.attr('id') : speed;

        //if id is undefined, its app open, so set default
        if(!id){
            id = 3;
        }

        switch(id){
            case 'easy':
            case 3:
                speed = 3;
                ani_speed = 1100 + (speed * 300);
                create_obstacle_speed = ani_speed - 400;
                $helicopter.attr('class','easy');
            break;
            case 'medium':
            case 2:
                speed = 2;
                ani_speed = 1100 + (speed * 300);
                create_obstacle_speed = ani_speed - 400;
                $helicopter.attr('class','medium');
            break;
            case 'hard':
            case 1:
                speed = 1;
                ani_speed = 1100 + (speed * 300);
                create_obstacle_speed = ani_speed - 400;
                $helicopter.attr('class','hard');
            break;
        }

        if(id != speed){
            $('.selected').removeClass('selected');
            $this.addClass('selected');
        }

    }*/


}