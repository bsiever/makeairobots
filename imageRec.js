// More API functions here:
// https://github.com/googlecreativelab/teachablemachine-community/tree/master/libraries/image

// the link to your model provided by Teachable Machine export panel

let imgArr = [];
let imgSensitivity = 15;

// Load the image model and setup the webcam
async function initImg(reconnecting = false) {

    if (reconnecting) $('#reconnectModal').fadeOut();

    maxPredictions = model.getTotalClasses();
    let classLabels = model.getClassLabels();

    // Convenience function to setup a webcam
    const flip = true; // whether to flip the webcam

    try {
        webcam = new tmImage.Webcam(500, 500, flip); // width, height, flip
        let camId = -1;

        let selectedCam = $('#cam').find(':selected').text();
        for (let i = 0; i < videoDevices.length; i++) {
            if (videoDevices[i].label === selectedCam) camId = videoDevices[i].deviceId;
        }
        if (camId !== -1) {
            await webcam.setup({deviceId: camId}); // request access to the webcam
        } else {
            await webcam.setup(); // request access to the webcam
        }

        $('#canvas').hide(() => {
            $('.projectName').removeClass('loading');
            $('.projectName').text('IMAGE MODEL');
            $('#webcam-container').show();
            $('#label-container').fadeIn();
            $('#message-log').fadeIn();
        });
        if (cookie) $('#overlay').fadeOut();
        await webcam.play();
        window.requestAnimationFrame(imgLoop);

        // append elements to the DOM
        let cameraContainer = document.getElementById('webcam-container');
        if (cameraContainer.hasChildNodes()) {
            cameraContainer.removeChild(cameraContainer.firstChild);
            cameraContainer.appendChild(webcam.canvas);
        } else {
            cameraContainer.appendChild(webcam.canvas);
        }

        labelContainer = document.getElementById('label-container');
        imgArr = createClasses(classLabels, maxPredictions);
    } catch (err) {
        openReconnectCameraModal(err);
    }
}

function openReconnectCameraModal(err) {

    console.log("ERROR: [IMAGE_REC]: " + err);

    $('.projectName').removeClass('loading').text('OOPS!');
    $('#overlay').fadeIn();
    $('#reconnectModal').fadeIn();

}

// Edit Sept 28, 2022: truncate class names to 12 characters .substring(0, 12)
async function imgLoop() {
    if (continous && !settingsOpen) {
        if (!continous && heldClasses.length > 0) continous = false;

        webcam.update(); // update the webcam frame
        let foundPrediction = await ImgPredict();
        if (foundPrediction.foundI || foundPrediction.foundI === 0) imgArr[foundPrediction.foundI]++;
        if (imgArr[foundPrediction.foundI] > imgSensitivity) {
            for (let j = 0; j < heldClasses.length; j++) {
                if (heldClasses[j] === foundPrediction.className) {
                    continous = false;
                }
            }
            if (foundPrediction.className !== lastDetection) {
                for (let i = 0; i < imgArr.length; ++i) imgArr[i] = 0;
                lastDetection = foundPrediction.className;
                $('.check-img').css('visibility', 'hidden');
                $(`#check-${foundPrediction.foundI}`).css('visibility', 'visible');
                serialSubmit(foundPrediction.className);
            } else {
                imgArr[foundPrediction.foundI] = 0;
            }
        }
    }
    window.requestAnimationFrame(imgLoop);
}

// run the webcam image through the image model
async function ImgPredict() {
    let foundI;
    let className;
    // predict can take in an image, video or canvas html element
    const prediction = await model.predict(webcam.canvas);

    for (let i = 0; i < maxPredictions; i++) {
        const meter = labelContainer.childNodes[i];
        const span = meter.childNodes[1].firstChild;
        const percentage = Math.floor(prediction[i].probability * 100);

        meter.firstChild.innerHTML = prediction[i].className;
        span.style.width = `${percentage}%`;
        span.firstChild.innerHTML = `${percentage}%`;

        if (prediction[i].probability.toFixed(2) > 0.94) {
            span.classList.add('threshold-color');
            foundI = i;
            className = prediction[i].className;
        } else {
            span.classList.remove('threshold-color');
        }
    }
    return {foundI: foundI, className: className};
}
