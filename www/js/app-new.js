//speed 3, ani speed 2000, create speed 1700
//speed 2, ani speed 1700, create speed 1400
//speed 1, ani speed 1400, create speed 1100

var is_device = document.URL.indexOf( 'http://' ) === -1 && document.URL.indexOf( 'https://' ) === -1;

if(is_device)
    document.addEventListener('deviceReady', onDeviceReady);
else
    $(document).ready(init);

var fly_sound;
var crash_sound;
var admobid = {};

function onDeviceReady(){
    fly_sound = new Media('sounds/fly.mp3');
    crash_sound = new Media('sounds/crash.mp3');
    fly_sound.setVolume(1);
    crash_sound.setVolume(1);

    if( /(android)/i.test(navigator.userAgent) ){
        admobid = { // for Android
            banner: 'ca-app-pub-8099513553195534/7510762403',
            interstitial: 'ca-app-pub-8099513553195534/1464228807'
        };
    }else if(/(ipod|iphone|ipad)/i.test(navigator.userAgent)){
        admobid = { // for iOS
            banner: 'ca-app-pub-8099513553195534/7510762403',
            interstitial: 'ca-app-pub-8099513553195534/1464228807'
        };
    }else{
        admobid = { // for Windows Phone
            banner: 'ca-app-pub-8099513553195534/7510762403',
            interstitial: 'ca-app-pub-8099513553195534/1464228807'
        };
    }

    //Ads
    if(typeof AdMob != 'undefined' && !no_ads){
        AdMob.createBanner({
            adId : admobid.banner,
            position : AdMob.AD_POSITION.BOTTOM_CENTER,
            autoShow : true,
            isTesting: false, // REMOVE FOR PROD!!
        });

        // prepare a new interstitual
        AdMob.prepareInterstitial( {adId:admobid.interstitial, autoShow:false} );
    }

    init();

    setTimeout(function() {
        navigator.splashscreen.hide();
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
    var no_ads = window.localStorage.getItem('helicopter_no_ads') ? window.localStorage.getItem('helicopter_no_ads') : false;
    var $purchase = $('#purchase');
    var $no_lives = $('#no-lives');
    var $life_timer_wrap = $('#life-timer-wrap');
    var $life_timer = $('#life-timer');

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

    $instructions.on(start_event, function(){
        $body.on(start_event, copter_touchstart).on(end_event, copter_touchend);
        $instructions.hide();
        create_obstacles = setInterval(create_obstacle, create_obstacle_speed);
        check_collisions = setInterval(check_collision, 50);
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
            if(is_device){
                fly_sound.play();
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
                fly_sound.stop();
                fly_sound.release();
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
        if (cur_score >= 20) {
            moving_block = 1;
            block_height = block_height / 2;
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
            show_gameover();
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
                        }
                    }
                }
            }

            if(hit){
                //clear all looping functions
                show_gameover();

                //stop this continuing
                return false;
            }

        });

    }

    function add_score(){
        cur_score = cur_score+=1;
        $score.text(cur_score);
    }

    function show_gameover(hit_bottom, copter_top){
        //remove touch listeners to control copter
        $body.off();

        if(is_device){
            //vibrate
            //var platform = device.platform;
            //if(platform.match(/ios/i))
                //navigator.notification.vibrate(300);

            //stop flying sound
            setTimeout(function(){
                fly_sound.stop();
                fly_sound.release();
            },30);
        }

        // play a crashing sound
        if(is_device){
            crash_sound.play({playAudioWhenScreenIsLocked : false});
            setTimeout(function(){
                crash_sound.release();
            },2500);
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
            });
        });

        //make helicopter plumit to death
        //if we hit the bottom, dont move anything just keep still
        if(hit_bottom)
            $helicopter.addClass('fall').removeAttr('style').show().css('top', Math.round(copter_top));
        else
            $helicopter.addClass('fall').css('-webkit-transform','translate3d(0, '+ parseInt(window_height - start_pos - floor_height - copter_width + 20) +'px, 0) rotate(90deg)');

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

            // TODO: play a success kind of sound
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

            // submit score to leaderboard if new best, and alrady authed
            if (gamecenter_auth)
                submit_highscore();

        },600);
    }

    $('#ok').on(end_event, show_start);

    function show_start(){
        // show the interstitial later, e.g. at end of game level
        var rand_num = randomNumberFromRange(1, 3);
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
    $('#start, #ok, .rate, .remove-ads, #leaderboard, #share').on(start_event, function(){
        $(this).addClass('hover');
    }).on(end_event, function(){
        $(this).removeClass('hover');
    });

    // Setup Rate button
    // TODO!! update iOS url
    $('.rate').on(end_event, function(){
        if (is_device)
            var platform = device.platform;
        else
            var platform = 'android';

        if(platform.match(/ios/i))
            window.open('itms-apps://itunes.apple.com/us/app/domainsicle-domain-name-search/id511364723?ls=1&mt=8'); // or itms://
        else
            window.open('market://details?id=co.uk.rp_digital.helicopter_free');
    });

    // Setup remove ads button - purchase, and store the fact user has purchased
    $('.remove-ads').on(end_event, show_purchase);

    // TODO???
    $('#share').on(end_event, function() {
    });

    $('#leaderboard').on(end_event, show_leaderboard);

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
            id:    'co.uk.jobooz.helicopter.lives',
            alias: '10 lives',
            type:   store.CONSUMABLE
        });

        // A consumable 25 lives product
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
        });

        // A non-consumable (one-off) 'Full version / no ads' product
        store.register({
            id:    'co.uk.jobooz.helicopter.remove_ads',
            alias: 'no ads',
            type:   store.NON_CONSUMABLE
        });

        // Now configure event listeners:
        // ------------------------------

        // When any product gets updated (or refreshed), its details are passed to app
        store.when("product").updated(function (p) {
            // This is a good place to prepare or render the UI based on these refreshed details:
            var productId = p.id;
            var nice_id = productId.split('.').pop();
            if (p.valid) {
                var data = {
                    id: productId, // call store.order(id) to buy this product
                    title: p.title,
                    description: p.description,
                    canPurchase: p.canPurchase,
                    price: p.price, // in the currency of the users App Store account
                    owned: p.owned
                };

                // store so we can have easy access later if needs be
                window.localStorage.setItem('helicopter_' + nice_id, JSON.stringify(data));

                // update the display details, price etc on the purchase 'screen'
                update_store_item(data);
            }
        });

        // When the purchase of lives is approved, update lives count
        store.when("10 lives").approved(function (order) {
            alert(JSON.stringify(order));
            order.finish();
        });

        // When the store is ready all products are loaded and in their "final" state.
        store.ready(function() {
            console.log("The store is ready");
        });

        // Deal with errors:
        // -----------------

        store.error(function(error) {
          alert('ERROR ' + error.code + ': ' + error.message);
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
        $el.find('.price').html(data.price);

        // update title
        $el.find('.title').html(data.title);

        // update productId data
        $el.data('productId', data.id);

        // is it owned? (remove_ads only really)
        if (data.owned) {
            $el.addClass('owned');
        }
        else {
            $el.removeClass('owned');
        }

        // update UI - remove ads or update lives count
        if (nice_id == 'lives') {
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
        }
        else if (nice_id == 'remove_ads') {
            remove_ads();
        }
    }

    function update_lives() {
        window.localStorage.setItem('helicopter_lives', num_lives);
        console.log(num_lives)
        $lives.html(num_lives);
    }

    function remove_ads() {
        no_ads = true;
        window.localStorage.setItem('helicopter_no_ads', true);
        AdMob.hideBanner();
    }

    function show_purchase() {
        $no_lives.hide();
        $life_timer_wrap.hide();

        if (num_lives == 0) {
            $no_lives.show();
        }

        if (num_lives < 10){
            $life_timer_wrap.show();
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