// more documentation available at
// https://github.com/tensorflow/tfjs-models/tree/master/speech-commands

// the link to your model provided by Teachable Machine export panel
// const URL = 'https://teachablemachine.withgoogle.com/models/RXd6aD1HY/';

let audArr = [];
let audSensitivity = 3;
const audioCanvas = document.getElementById('audioCanvas');
const visualCTX = audioCanvas.getContext('2d');
let freqs;

async function createModel(checkpointURL, metadataURL) {
	const recognizer = speechCommands.create(
		'BROWSER_FFT', // fourier transform type, not useful to change
		undefined, // speech commands vocabulary feature, not useful for your models
		checkpointURL,
		metadataURL
	);

	// check that model and metadata are loaded via HTTPS requests.
	await recognizer.ensureModelLoaded();

	return recognizer;
}

async function createVisuals() {
	let audId;

	let selectedAud = $('#aud').find(':selected').text();
	for (let i = 0; i < audioDevices.length; i++) {
		if (audioDevices[i].label === selectedAud) audId = audioDevices[i].deviceId;
	}
	navigator.mediaDevices
		.getUserMedia({
			audio: {
				deviceId: audId || devices[0].deviceId,
			},
		})
		.then((stream) => {
			const context = new (window.AudioContext || window.webkitAudioContext)();
			const analyser = context.createAnalyser();
			const source = context.createMediaStreamSource(stream);
			source.connect(analyser);

			freqs = new Uint8Array(analyser.frequencyBinCount);

			function draw() {
				let radius = 75;
				let bars = 100;

				// Draw Background
				visualCTX.fillStyle = 'white';
				visualCTX.fillRect(0, 0, audioCanvas.width, audioCanvas.height);

				// Draw circle
				visualCTX.beginPath();
				visualCTX.arc(audioCanvas.width / 2, audioCanvas.height / 2, radius, 0, 2 * Math.PI);
				visualCTX.stroke();
				analyser.getByteFrequencyData(freqs);

				// Draw label
				// visualCTX.font = '500 24px Helvetica Neue';
				// const avg = [...Array(255).keys()].reduce((acc, curr) => acc + freqs[curr], 0) / 255;
				// visualCTX.fillStyle = 'rgb(' + 200 + ', ' + (200 - avg) + ', ' + avg + ')';
				// visualCTX.textAlign = 'center';
				// visualCTX.textBaseline = 'top';
				// visualCTX.fillText('sound', audioCanvas.width / 2, audioCanvas.height / 2 - 24);

				// Draw bars
				for (var i = 0; i < bars; i++) {
					let radians = (Math.PI * 2) / bars;
					let bar_height = freqs[i] * 0.5;

					let x = audioCanvas.width / 2 + Math.cos(radians * i) * radius;
					let y = audioCanvas.height / 2 + Math.sin(radians * i) * radius;
					let x_end = audioCanvas.width / 2 + Math.cos(radians * i) * (radius + bar_height);
					let y_end = audioCanvas.height / 2 + Math.sin(radians * i) * (radius + bar_height);
					let color = 'rgb(' + 255 + ', ' + (200 - freqs[i]) + ', ' + freqs[i] + ')';
					visualCTX.strokeStyle = color;
					visualCTX.lineWidth = 3;
					visualCTX.beginPath();
					visualCTX.moveTo(x, y);
					visualCTX.lineTo(x_end, y_end);
					visualCTX.stroke();
				}

				requestAnimationFrame(draw);
			}

			requestAnimationFrame(draw);
		});
}

async function initAudio(modelURL, metadataURL) {
	createVisuals();
	const recognizer = await createModel(modelURL, metadataURL);
	const classLabels = recognizer.wordLabels(); // get class labels
	const labelContainer = document.getElementById('label-container');
	audArr = createClasses(classLabels);

	$('#webcam-container').hide(() => {
		$('.projectName').removeClass('loading');
		$('.projectName').text('AUDIO MODEL');
		$('#audio-container').fadeIn();
		$('#canvas').hide();
		$('#message-log').fadeIn();
	});
	if (cookie) $('#overlay').fadeOut();
	$('#label-container').fadeIn();

	// listen() takes two arguments:
	// 1. A callback function that is invoked anytime a word is recognized.
	// 2. A configuration object with adjustable fields

	recognizer.listen(
		(result) => {
			if (continous && !settingsOpen) {
				if (!continous && heldClasses.length > 0) continous = false;
				// render the probability scores per class
				for (let i = 0; i < classLabels.length; i++) {
					const meter = labelContainer.childNodes[i];
					const span = meter.childNodes[1].firstChild;
					const percentage = Math.floor(result.scores[i] * 100);

					meter.firstChild.innerHTML = classLabels[i];
					span.style.width = `${percentage}%`;
					span.firstChild.innerHTML = `${percentage}%`;

					if (result.scores[i].toFixed(2) > 0.9) {
						audArr[i]++;
						span.classList.add('threshold-color');

						if (audArr[i] > (sensitivity * 5) / 100) {
							for (let j = 0; j < heldClasses.length; j++) {
								if (heldClasses[j] === classLabels[i]) {
									continous = false;
								}
							}
							if (classLabels[i] !== lastDetection) {
								for (let i = 0; i < audArr.length; ++i) audArr[i] = 0;
								lastDetection = classLabels[i];
								$('.check-img').css('visibility', 'hidden');
								$(`#check-${i}`).css('visibility', 'visible');
								serialSubmit(classLabels[i]);
							} else {
								audArr[i] = 0;
							}
						}
					} else {
						span.classList.remove('threshold-color');
					}
				}
			}
		},
		{
			includeSpectrogram: true, // in case listen should return result.spectrogram
			probabilityThreshold: 0.75,
			invokeCallbackOnNoiseAndUnknown: true,
			overlapFactor: 0.5, // probably want between 0.5 and 0.75. More info in README
		}
	);
	// Stop the recognition in 5 seconds.
	// setTimeout(() => recognizer.stopListening(), 5000);
}
