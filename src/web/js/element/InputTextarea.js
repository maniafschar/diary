export { InputTextarea };

class InputTextarea extends HTMLElement {
	isRecording = false;
	mediaRecorder = null;
	recordingStream = null;
	recordedChunks = [];
	speechRecognition = null;
	speechTranscript = '';

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
		var t = this;
		speechButton.onclick = () => this.captureAudio(t);
	}
	captureAudio(t) {
		if (navigator.device && navigator.device.capture) {
			navigator.device.capture.captureAudio(
				this.captureSuccess,
				this.captureError,
				{ limit: 1 }
			);
			return;
		}

		if (this.speechRecognition) {
			if (this.isRecording)
				this.stopSpeechRecognition(t);
			else
				this.startSpeechRecognition(t);
			return;
		}

		if (!navigator.mediaDevices || !window.MediaRecorder) {
			alert('Audio capture plugin is not available and browser recording is unsupported.');
			return;
		}

		if (this.isRecording)
			this.stopRecording(t);
		else
			this.startRecording(t);
	}
	startSpeechRecognition(t) {
		this.speechRecognition = new SpeechRecognition();
		this.speechRecognition.lang = 'de-DE';
		this.speechRecognition.interimResults = true;
		this.speechRecognition.continuous = false;
		this.speechTranscript = '';

		this.speechRecognition.onresult = event => {
			this.speechTranscript = Array.from(event.results)
				.map(result => result[0].transcript)
				.join(' ');
			descriptionInput.value = this.speechTranscript;
			currentEntry.description = this.speechTranscript;
		};

		this.speechRecognition.onend = () => {
			this.isRecording = false;
			//this.captureAudioButton.textContent = 'Record Audio Description';
			console.log(this.speechTranscript ? 'Speech transcription complete.' : 'No speech detected.');
			this.speechRecognition = null;
		};

		this.speechRecognition.onerror = event => {
			alert('Speech recognition error: ' + (event.error || event.message || 'unknown error'));
			this.isRecording = false;
			//this.captureAudioButton.textContent = 'Record Audio Description';
			console.log('Speech transcription failed.');
			this.speechRecognition = null;
		};

		this.speechRecognition.start();
		this.isRecording = true;
		console.log('Listening for speech...');
		//this.captureAudioButton.textContent = 'Stop Transcription';
	}
	startRecording(t) {
		navigator.mediaDevices.getUserMedia({ audio: true })
			.then(stream => {
				this.recordingStream = stream;
				this.recordingStream = [];
				this.mediaRecorder = new MediaRecorder(stream);

				this.mediaRecorder.ondataavailable = event => {
					if (event.data && event.data.size > 0) {
						this.recordingStream.push(event.data);
					}
				};

				this.mediaRecorder.onstop = () => {
					const blob = new Blob(this.recordingStream, { type: 'audio/webm' });
					const reader = new FileReader();

					reader.onload = () => {
						currentEntry.audioFile = reader.result;
						currentEntry.audioName = `Browser audio ${new Date().toISOString()}`;
						console.log(`Audio recorded: ${currentEntry.audioName}`);
						audioPlayer.hidden = false;
						audioPlayer.src = currentEntry.audioFile;
						this.appendAudioNoteToDescription();
						//this.captureAudioButton.textContent = 'Record Audio Description';
						this.isRecording = false;
						this.stopRecordingStream();
					};

					reader.onerror = () => {
						alert('Unable to read recorded audio.');
						this.isRecording = false;
						//this.captureAudioButton.textContent = 'Record Audio Description';
						this.stopRecordingStream();
					};

					reader.readAsDataURL(blob);
				};

				this.mediaRecorder.onerror = () => {
					alert('Browser audio recording failed.');
					this.isRecording = false;
					//this.captureAudioButton.textContent = 'Record Audio Description';
					this.stopRecordingStream();
				};

				this.mediaRecorder.start();
				this.isRecording = true;
				console.log('Recording audio...');
				//this.captureAudioButton.textContent = 'Stop Recording';
			})
			.catch(error => {
				alert('Unable to access microphone: ' + (error.message || error));
			});
	}
	stopRecording(t) {
		if (this.mediaRecorder && this.mediaRecorder.state === 'recording')
			this.mediaRecorder.stop();
		else {
			this.stopRecordingStream();
			this.isRecording = false;
			//this.captureAudioButton.textContent = 'Record Audio Description';
		}
	}
	stopSpeechRecognition(t) {
		if (this.speechRecognition)
			this.speechRecognition.stop();
		this.isRecording = false;
		//this.captureAudioButton.textContent = 'Record Audio Description';
		console.log('Speech transcription stopped.');
		this.speechRecognition = null;
	}
	stopRecordingStream(t) {
		if (this.recordingStream) {
			this.recordingStream.getTracks().forEach(track => track.stop());
			this.recordingStream = null;
		}
		this.mediaRecorder = null;
	}
	captureSuccess(mediaFiles) {
		const [file] = mediaFiles;
		currentEntry.audioFile = file.fullPath || file.localURL || file.name;
		currentEntry.audioName = file.name || 'Recorded audio';
		console.log(`Audio recorded: ${currentEntry.audioName}`);
		audioPlayer.hidden = false;
		audioPlayer.src = currentEntry.audioFile;
		this.appendAudioNoteToDescription();
	}
	captureError(error) {
		alert('Audio capture failed: ' + error.code);
	}
	appendAudioNoteToDescription() {
		const note = '[Audio recorded]';
		const currentText = descriptionInput.value.trim();
		if (currentText.includes(note))
			return;
		descriptionInput.value = currentText ? `${currentText}\n${note}` : note;
		currentEntry.description = descriptionInput.value;
	}
}