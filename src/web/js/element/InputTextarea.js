export { InputTextarea };

class InputTextarea extends HTMLElement {
	constructor() {
		super();
		this._root = this.attachShadow({ mode: 'open' });
	}
	connectedCallback() {
		this._root.appendChild(document.createElement('style')).textContent = `
:host(*) {
	display: block;
	position: relative;
}

textarea {
	appearance: none;
	position: relative;
	font-size: 1em;
	font-weight: normal;
	outline: none !important;
	font-family: Comfortaa, Verdana, "Helvetica Neue", Helvetica, Arial, sans-serif !important;
	height: 14em;
	padding: 0.5em 0.75em 0 0.75em;
	border-radius: 0.5em;
	background: rgba(255, 255, 255, 0.85);
	vertical-align: top;
	border: none;
	width: 100%;
	color: black;
	user-select: text;
}

button.speech {
	background-image: url(image/location.svg);
	background-size: 1.4em;
	top: 0;
	right: 0;
	border-radius: 0 0.4em;
	background-repeat: no-repeat;
	background-position-x: 0.3em;
	background-position-y: 0.3em;
	background-color: rgba(100, 150, 200, 0.2);
	border: none;
	padding: 0.5em 1em;
	outline: none;
	cursor: pointer;
	font: inherit;
	font-size: 0.8em;
	position: absolute;
	font-size: 1.3em;
    width: 2em;
    height: 2em;
    margin: 0;
}

*::-webkit-scrollbar {
	display: none;
}`;
		this._root.appendChild(document.createElement('textarea')).onkeyup = e => this.value = this._root.querySelector('textarea').value;
		var speechButton = this._root.appendChild(document.createElement('button'));
		speechButton.classList.add('icon');
		speechButton.classList.add('speech');
		speechButton.onclick = this.captureAudio;
	}
	captureAudio() {
		if (navigator.device && navigator.device.capture) {
			navigator.device.capture.captureAudio(
				captureSuccess,
				captureError,
				{ limit: 1 }
			);
			return;
		}

		if (SpeechRecognition) {
			if (isRecording) {
				stopSpeechRecognition();
			} else {
				startSpeechRecognition();
			}
			return;
		}

		if (!navigator.mediaDevices || !window.MediaRecorder) {
			alert('Audio capture plugin is not available and browser recording is unsupported.');
			return;
		}

		if (isRecording) {
			stopRecording();
		} else {
			startRecording();
		}
	}
	startSpeechRecognition() {
		speechRecognition = new SpeechRecognition();
		speechRecognition.lang = 'de-DE';
		speechRecognition.interimResults = true;
		speechRecognition.continuous = false;
		speechTranscript = '';

		speechRecognition.onresult = event => {
			speechTranscript = Array.from(event.results)
				.map(result => result[0].transcript)
				.join(' ');
			descriptionInput.value = speechTranscript;
			currentEntry.description = speechTranscript;
		};

		speechRecognition.onend = () => {
			isRecording = false;
			captureAudioButton.textContent = 'Record Audio Description';
			audioLabel.textContent = speechTranscript ? 'Speech transcription complete.' : 'No speech detected.';
			speechRecognition = null;
		};

		speechRecognition.onerror = event => {
			alert('Speech recognition error: ' + (event.error || event.message || 'unknown error'));
			isRecording = false;
			captureAudioButton.textContent = 'Record Audio Description';
			audioLabel.textContent = 'Speech transcription failed.';
			speechRecognition = null;
		};

		speechRecognition.start();
		isRecording = true;
		audioLabel.textContent = 'Listening for speech...';
		captureAudioButton.textContent = 'Stop Transcription';
	}
	startRecording() {
		navigator.mediaDevices.getUserMedia({ audio: true })
			.then(stream => {
				recordingStream = stream;
				recordedChunks = [];
				mediaRecorder = new MediaRecorder(stream);

				mediaRecorder.ondataavailable = event => {
					if (event.data && event.data.size > 0) {
						recordedChunks.push(event.data);
					}
				};

				mediaRecorder.onstop = () => {
					const blob = new Blob(recordedChunks, { type: 'audio/webm' });
					const reader = new FileReader();

					reader.onload = () => {
						currentEntry.audioFile = reader.result;
						currentEntry.audioName = `Browser audio ${new Date().toISOString()}`;
						audioLabel.textContent = `Audio recorded: ${currentEntry.audioName}`;
						audioPlayer.hidden = false;
						audioPlayer.src = currentEntry.audioFile;
						appendAudioNoteToDescription();
						captureAudioButton.textContent = 'Record Audio Description';
						isRecording = false;
						stopRecordingStream();
					};

					reader.onerror = () => {
						alert('Unable to read recorded audio.');
						isRecording = false;
						captureAudioButton.textContent = 'Record Audio Description';
						stopRecordingStream();
					};

					reader.readAsDataURL(blob);
				};

				mediaRecorder.onerror = () => {
					alert('Browser audio recording failed.');
					isRecording = false;
					captureAudioButton.textContent = 'Record Audio Description';
					stopRecordingStream();
				};

				mediaRecorder.start();
				isRecording = true;
				audioLabel.textContent = 'Recording audio...';
				captureAudioButton.textContent = 'Stop Recording';
			})
			.catch(error => {
				alert('Unable to access microphone: ' + (error.message || error));
			});
	}
	stopRecording() {
		if (mediaRecorder && mediaRecorder.state === 'recording') {
			mediaRecorder.stop();
		} else {
			stopRecordingStream();
			isRecording = false;
			captureAudioButton.textContent = 'Record Audio Description';
		}
	}
	stopSpeechRecognition() {
		if (speechRecognition) {
			speechRecognition.stop();
		}
		isRecording = false;
		captureAudioButton.textContent = 'Record Audio Description';
		audioLabel.textContent = 'Speech transcription stopped.';
		speechRecognition = null;
	}
	stopRecordingStream() {
		if (recordingStream) {
			recordingStream.getTracks().forEach(track => track.stop());
			recordingStream = null;
		}
		mediaRecorder = null;
	}
	captureSuccess(mediaFiles) {
		const [file] = mediaFiles;
		currentEntry.audioFile = file.fullPath || file.localURL || file.name;
		currentEntry.audioName = file.name || 'Recorded audio';
		audioLabel.textContent = `Audio recorded: ${currentEntry.audioName}`;
		audioPlayer.hidden = false;
		audioPlayer.src = currentEntry.audioFile;
		appendAudioNoteToDescription();
	}
	captureError(error) {
		alert('Audio capture failed: ' + error.code);
	}
	appendAudioNoteToDescription() {
		const note = '[Audio recorded]';
		const currentText = descriptionInput.value.trim();
		if (currentText.includes(note)) {
			return;
		}
		descriptionInput.value = currentText ? `${currentText}\n${note}` : note;
		currentEntry.description = descriptionInput.value;
	}
}