let model, webcam, labelContainer, maxPredictions, ctx, modelName, socketId;
let cookie = false;
let pageNumber = 1;
let maxPageNum = 3;
let ignoredClasses = [];
let found = {
    continous: true,
    bool: false,
};

let heldClasses = [];
let continous = true;
let lastDetection = '';
let settingsOpen = false;
let sensitivity;
//const socket = io(); 
var host = location.hostname;
let socket;

// Not needed. Remove soon.
/*
//alert(host);
if(host == 'localhost' || host == '127.0.0.1')
	socket = io('http://localhost:8080');
else
	socket = io('https://'+host+':8080');

socket.on('user-id', (userId) => {
	console.log('Connected with id: ' + userId);
	socketId = userId;
});

socket.on('disconnect', () => {
	console.log(`User disconnected`);
});
*/

function validURL(str) {
    var pattern = new RegExp(
        '^(https?:\\/\\/)?' + // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
        '(\\#[-a-z\\d_]*)?$',
        'i'
    ); // fragment locator
    return !!pattern.test(str);
}

// Rewrite to remove socket.io since it is not doing anything useful
submitUrl.onclick = async () => {
    // socket.emit('check-url', { url: teachableUrl.value, socketId: socketId });
    if (validURL(teachableUrl.value)) {
        $('#webcam-container').fadeOut(() => {
            $('#canvas').fadeOut();
            $('#label-container').fadeOut();
            $('#results').removeClass('hide-imp');
            found.bool = false;
            openPort();
            chooseModel(teachableUrl.value);
            changePage(true);
        });
    } else {
        alertUser('Invalid URL');
    }
};

// Not needed. Remove soon.
/*
socket.on('valid-url', (valid) => {
	if (valid && window.innerWidth > 900) {
		$('#webcam-container').fadeOut(() => {
			$('#canvas').fadeOut();
			$('#label-container').fadeOut();
			$('#results').removeClass('hide-imp');
			found.bool = false;
			openPort();
			chooseModel(teachableUrl.value);
			changePage(true);
		});
	} else {
		alertUser('Invalid URL');
	}
});
*/

// Choose between Image, Pose or Audio model based on the URL
async function chooseModel(URL) {
    const modelURL = URL + 'model.json';
    const metadataURL = URL + 'metadata.json';

    // load the model and metadata
    // Refer to tmImage.loadFromFiles() in the API to support files from a file picker
    // or files from your local hard drive
    // Note: the pose library adds "tmImage" object to your window (window.tmImage)
    // Note: the pose library adds a tmPose object to your window (window.tmPose)
    model = await tmImage.load(modelURL, metadataURL);
    let metaName = model._metadata.modelName;
    $('.undercard').fadeIn();
    $('.projectName').text('Loading');
    $('.projectName').addClass('loading');

    if (!cookie) {
        showInstructions();
    } else {
        $('#overlay').fadeIn();
    }

    if (metaName === 'tm-my-image-model') {
        initImg();
    } else if (metaName === 'TMv2') {
        initAudio(modelURL, metadataURL);
    } else if (metaName === 'my-pose-model') {
        model = await tmPose.load(modelURL, metadataURL);
        initPose();
    } else {
        console.log('Error');
    }
}

// Truncate the class labels to 12 characters
// Add Newline
// Serial Submit to  Microbit
function serialSubmit(classPrediction) {

    console.log(classPrediction)
    party();
    addLog(`AI sent ${classPrediction.substring(0, 12)} to the Microbit`);
    writeToSerial(classPrediction.substring(0, 12));
}

// Change site page
function changePage(direction) {
    if (direction) {
        setTimeout(function () {
            $(`#page-${pageNumber}`).fadeOut('fast', function () {
                pageNumber++;
                $(`#page-${pageNumber}`).fadeIn('slow');
            });
        }, 100);
    }
}

$('#label-container').on('click', '.toggle-switch', function (event) {

    fireClickEvent("toggle_click", true, event?.currentTarget?.checked)

    event.stopPropagation();
    event.stopImmediatePropagation();
    let id = $(this).parents()[2].id;
    for (let i = 0; i < heldClasses.length; i++) {
        if (heldClasses[i] === id) {
            addLog(`${id} removed stop and hold`);
            heldClasses.splice(i, 1);
            continous = true;
            return;
        }
    }

    addLog(`${id} assigned stop and hold`);
    heldClasses.push(id);
});

$('#help-button').click(() => {
    fireClickEvent("btn_click", true, "help_btn")
    $('.help-content').slideToggle();
});

$('#message-log').click(() => {
    fireClickEvent("btn_click", true, "message_log")
    $('.log-content').slideToggle();
});

// Custom Alert Function
function alertUser(msg) {
    $('#alert-text').text(msg);
    $('#alert-div').fadeIn(() => {
        $('#alert-ok').click(() => {
            $('#alert-div').fadeOut();
        });
    });
}

//Log Microbit Site actions
function addLog(event) {
    if ($('#log p').attr('id') === 'firstLog') {
        $('#log').html(`<p class="log-paragraph"><strong>${new Date().toLocaleTimeString()}</strong>   ${event}</p><hr>`);
    } else {
        $('#log').append(`<p class="log-paragraph"><strong>${new Date().toLocaleTimeString()}</strong>   ${event}</p><hr>`);
    }
}

//Toggle the settings button
function toggleSettings(el) {

    fireClickEvent("settings_click", true, settingsOpen ? "settings_closed" : "settings_open")

    settingsOpen = !settingsOpen;
    el.classList.toggle('spin');
    $('.switch, .slider-container').toggleClass('inline-block');
    $('.check').toggleClass('hide-imp');
    $('.popup').toggleClass('flex');
    if (!settingsOpen) {
        $('.settings-tooltip').text('Open Settings');
        $('#results-heading').fadeOut(function () {
            $(this).text('RESULTS!').fadeIn();
        });
        $('.popuptext, .settings-hidden').fadeOut();
    } else {
        $('.settings-tooltip').text('Close Settings');
        $('#results-heading').fadeOut(function () {
            $(this).text('SETTINGS!').fadeIn();
            $('.settings-hidden').fadeIn();
        });
    }
}

// Create the cookie to expire in 30 days
function setCookie(cname) {
    const d = new Date();
    d.setTime(d.getTime() + 30 * 24 * 60 * 60 * 1000);
    let expires = 'expires=' + d.toUTCString();
    document.cookie = cname + '=ai-training;' + expires + ';path=/';
}

// Get any available cookies
function getCookie(cname) {
    let name = cname + '=';
    let ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return '';
}

// Check if there's relevant cookies
function checkCookie() {
    let user = getCookie('username');
    if (user != '') {
        cookie = true;
    } else {
        setCookie('username', user);
    }
}

// Edit Sept 28, 2022: truncate class names to 12 characters .substring(0, 12)
function createClasses(classes, modelLength = false) {
    let length = modelLength || classes.length;
    let arr = new Array(length);
    for (let i = 0; i < length; i++) {
        // Shorten the class names to 12 characters since longer than 16 characters has trouble being received by the micro:bit
        // Trim trailing spaces so that the class names can be copied from this web UI and pasted into microbit makecode
        classes[i] = classes[i].substring(0, 12).trim()
        $('#label-container').append(
            `<div class='meter' id="${
                classes[i]
            }"><p class='label'></p><span class='meter-container'><span><p></p></span></span><span class='toggle-container'><span class="check" ><img class="check-img" id="check-${[
                i,
            ]}" src="./check_bold.svg" alt="checkmark"></span><label class="switch"><input type="checkbox" class="toggle-switch" ><span class="slider round"></span></label></span></div>`
        );
        arr[i] = 0;
    }
    return arr;
}

function togglePopup(popup) {
    fireClickEvent('popup_click', true, popup)
    $(`#${popup}`).slideToggle();
}

$('#slider').slider({
    range: 'min',
    min: 0,
    max: 100,
    value: 15,
    slide: function (event, ui) {
        $('#amount').val(ui.value);
        sensitivity = ui.value;
        $(this).find('.ui-slider-handle').text(`${sensitivity}%`);
    },
    create: function (event, ui) {
        sensitivity = $(this).slider('value');
        $(this).find('.ui-slider-handle').text(`${sensitivity}%`);
    },
});

// show the instruction modules
function showInstructions() {
    $('#overlay').fadeIn();
    $('#settingsInfo').fadeIn(() => {
        $('#settingsInfo button').on('click', () => {
            $('#settingsInfo').fadeOut(() => {
                $('#newCodeInfo').fadeIn(() => {
                    $('#newCodeInfo button').on('click', () => {
                        $('#newCodeInfo').fadeOut(() => {
                            $('#logInfo').fadeIn(() => {
                                $('#logInfo button').on('click', () => {
                                    $('#overlay').hide();
                                    $('#logInfo').hide();
                                });
                            });
                        });
                    });
                });
            });
        });
    });
}
