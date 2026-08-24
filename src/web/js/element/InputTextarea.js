export { InputTextarea };

class InputTextarea extends HTMLElement {
	isRecording = false;
	mediaRecorder = null;
	recordingStream = null;
	recordedChunks = [];
	speechRecognition = null;
	speechTranscript = '';
	audioPlayer;
	currentEntry = {
		imageData: null,
		coords: null,
		address: null,
		time: null,
		audioFile: null,
		audioName: null,
		description: ''
	};

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
		this.audioPlayer = document.createElement('audio-player');
		this.audioPlayer.controls = 'hidden';
	}
	captureAudio() {
		var host = this.getRootNode().host;
		if (navigator.device && navigator.device.capture) {
			navigator.device.capture.captureAudio(
				host.captureSuccess,
				host.captureError,
				{ limit: 1 }
			);
			return;
		}

		if (host.speechRecognition) {
			if (host.isRecording)
				host.stopSpeechRecognition();
			else
				host.startSpeechRecognition();
			return;
		}

		if (!navigator.mediaDevices || !window.MediaRecorder) {
			alert('Audio capture plugin is not available and browser recording is unsupported.');
			return;
		}

		if (host.isRecording)
			host.stopRecording();
		else
			host.startRecording();
	}
	startSpeechRecognition() {
		var host = this.getRootNode().host;
		host.speechRecognition = new SpeechRecognition();
		host.speechRecognition.lang = 'de-DE';
		host.speechRecognition.interimResults = true;
		host.speechRecognition.continuous = false;
		host.speechTranscript = '';

		host.speechRecognition.onresult = event => {
			host.speechTranscript = Array.from(event.results)
				.map(result => result[0].transcript)
				.join(' ');
			host._root.querySelector('textarea').value = host.speechTranscript;
			host.currentEntry.description = host.speechTranscript;
		};

		host.speechRecognition.onend = () => {
			host.isRecording = false;
			//host.captureAudioButton.textContent = 'Record Audio Description';
			console.log(host.speechTranscript ? 'Speech transcription complete.' : 'No speech detected.');
			host.speechRecognition = null;
		};

		host.speechRecognition.onerror = event => {
			alert('Speech recognition error: ' + (event.error || event.message || 'unknown error'));
			host.isRecording = false;
			//host.captureAudioButton.textContent = 'Record Audio Description';
			console.log('Speech transcription failed.');
			host.speechRecognition = null;
		};

		host.speechRecognition.start();
		host.isRecording = true;
		console.log('Listening for speech...');
		//host.captureAudioButton.textContent = 'Stop Transcription';
	}
	startRecording() {
		navigator.mediaDevices.getUserMedia({ audio: true })
			.then(stream => {
				var host = this.getRootNode().host;
				host.recordingStream = stream;
				host.recordingStream = [];
				host.mediaRecorder = new MediaRecorder(stream);

				host.mediaRecorder.ondataavailable = event => {
					if (event.data && event.data.size > 0) {
						host.recordingStream.push(event.data);
					}
				};

				host.mediaRecorder.onstop = () => {
					const blob = new Blob(t.recordingStream, { type: 'audio/webm' });
					const reader = new FileReader();

					reader.onload = () => {
						host.currentEntry.audioFile = reader.result;
						host.currentEntry.audioName = `Browser audio ${new Date().toISOString()}`;
						console.log(`Audio recorded: ${host.currentEntry.audioName}`);
						host.audioPlayer.hidden = false;
						host.audioPlayer.src = host.currentEntry.audioFile;
						host.appendAudioNoteToDescription();
						//host.captureAudioButton.textContent = 'Record Audio Description';
						host.isRecording = false;
						host.stopRecordingStream();
					};

					reader.onerror = () => {
						alert('Unable to read recorded audio.');
						host.isRecording = false;
						//host.captureAudioButton.textContent = 'Record Audio Description';
						host.stopRecordingStream();
					};

					reader.readAsDataURL(blob);
				};

				this.mediaRecorder.onerror = () => {
					alert('Browser audio recording failed.');
					host.isRecording = false;
					//host.captureAudioButton.textContent = 'Record Audio Description';
					host.stopRecordingStream();
				};

				host.mediaRecorder.start();
				host.isRecording = true;
				console.log('Recording audio...');
				//host.captureAudioButton.textContent = 'Stop Recording';
			})
			.catch(error => {
				alert('Unable to access microphone: ' + (error.message || error));
			});
	}
	stopRecording() {
		var host = this.getRootNode().host;
		if (host.mediaRecorder && host.mediaRecorder.state === 'recording')
			host.mediaRecorder.stop();
		else {
			host.stopRecordingStream();
			host.isRecording = false;
			//host.captureAudioButton.textContent = 'Record Audio Description';
		}
	}
	stopSpeechRecognition() {
		var host = this.getRootNode().host;
		if (host.speechRecognition)
			host.speechRecognition.stop();
		host.isRecording = false;
		//host.captureAudioButton.textContent = 'Record Audio Description';
		console.log('Speech transcription stopped.');
		host.speechRecognition = null;
	}
	stopRecordingStream() {
		var host = this.getRootNode().host;
		if (host.recordingStream) {
			host.recordingStream.getTracks().forEach(track => track.stop());
			host.recordingStream = null;
		}
		host.mediaRecorder = null;
	}
	captureSuccess(mediaFiles) {
		var host = this.getRootNode().host;
		const [file] = mediaFiles;
		host.currentEntry.audioFile = file.fullPath || file.localURL || file.name;
		host.currentEntry.audioName = file.name || 'Recorded audio';
		console.log(`Audio recorded: ${host.currentEntry.audioName}`);
		host.audioPlayer.hidden = false;
		host.audioPlayer.src = host.currentEntry.audioFile;
		host.appendAudioNoteToDescription();
	}
	captureError(error) {
		alert('Audio capture failed: ' + error.code);
	}
	appendAudioNoteToDescription() {
		const note = '[Audio recorded]';
		var input = this._root.querySelector('textarea');
		const currentText = input.value.trim();
		if (currentText.includes(note))
			return;
		input.value = currentText ? `${currentText}\n${note}` : note;
		this.currentEntry.description = input.value;
	}
}
