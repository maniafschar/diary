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
				t.captureSuccess,
				t.captureError,
				{ limit: 1 }
			);
			return;
		}

		if (t.speechRecognition) {
			if (t.isRecording)
				t.stopSpeechRecognition(t);
			else
				t.startSpeechRecognition(t);
			return;
		}

		if (!navigator.mediaDevices || !window.MediaRecorder) {
			alert('Audio capture plugin is not available and browser recording is unsupported.');
			return;
		}

		if (t.isRecording)
			t.stopRecording(t);
		else
			t.startRecording(t);
	}
	startSpeechRecognition(t) {
		t.speechRecognition = new SpeechRecognition();
		t.speechRecognition.lang = 'de-DE';
		t.speechRecognition.interimResults = true;
		t.speechRecognition.continuous = false;
		t.speechTranscript = '';

		t.speechRecognition.onresult = event => {
			t.speechTranscript = Array.from(event.results)
				.map(result => result[0].transcript)
				.join(' ');
			descriptionInput.value = t.speechTranscript;
			currentEntry.description = t.speechTranscript;
		};

		t.speechRecognition.onend = () => {
			t.isRecording = false;
			//t.captureAudioButton.textContent = 'Record Audio Description';
			console.log(t.speechTranscript ? 'Speech transcription complete.' : 'No speech detected.');
			t.speechRecognition = null;
		};

		t.speechRecognition.onerror = event => {
			alert('Speech recognition error: ' + (event.error || event.message || 'unknown error'));
			t.isRecording = false;
			//t.captureAudioButton.textContent = 'Record Audio Description';
			console.log('Speech transcription failed.');
			t.speechRecognition = null;
		};

		t.speechRecognition.start();
		t.isRecording = true;
		console.log('Listening for speech...');
		//t.captureAudioButton.textContent = 'Stop Transcription';
	}
	startRecording(t) {
		navigator.mediaDevices.getUserMedia({ audio: true })
			.then(stream => {
				t.recordingStream = stream;
				t.recordingStream = [];
				t.mediaRecorder = new MediaRecorder(stream);

				t.mediaRecorder.ondataavailable = event => {
					if (event.data && event.data.size > 0) {
						t.recordingStream.push(event.data);
					}
				};

				t.mediaRecorder.onstop = () => {
					const blob = new Blob(t.recordingStream, { type: 'audio/webm' });
					const reader = new FileReader();

					reader.onload = () => {
						currentEntry.audioFile = reader.result;
						currentEntry.audioName = `Browser audio ${new Date().toISOString()}`;
						console.log(`Audio recorded: ${currentEntry.audioName}`);
						audioPlayer.hidden = false;
						audioPlayer.src = currentEntry.audioFile;
						t.appendAudioNoteToDescription();
						//t.captureAudioButton.textContent = 'Record Audio Description';
						t.isRecording = false;
						t.stopRecordingStream();
					};

					reader.onerror = () => {
						alert('Unable to read recorded audio.');
						t.isRecording = false;
						//t.captureAudioButton.textContent = 'Record Audio Description';
						t.stopRecordingStream();
					};

					reader.readAsDataURL(blob);
				};

				t.mediaRecorder.onerror = () => {
					alert('Browser audio recording failed.');
					t.isRecording = false;
					//t.captureAudioButton.textContent = 'Record Audio Description';
					t.stopRecordingStream();
				};

				t.mediaRecorder.start();
				t.isRecording = true;
				console.log('Recording audio...');
				//t.captureAudioButton.textContent = 'Stop Recording';
			})
			.catch(error => {
				alert('Unable to access microphone: ' + (error.message || error));
			});
	}
	stopRecording(t) {
		if (t.mediaRecorder && t.mediaRecorder.state === 'recording')
			t.mediaRecorder.stop();
		else {
			t.stopRecordingStream();
			t.isRecording = false;
			//t.captureAudioButton.textContent = 'Record Audio Description';
		}
	}
	stopSpeechRecognition(t) {
		if (t.speechRecognition)
			t.speechRecognition.stop();
		t.isRecording = false;
		//t.captureAudioButton.textContent = 'Record Audio Description';
		console.log('Speech transcription stopped.');
		t.speechRecognition = null;
	}
	stopRecordingStream(t) {
		if (t.recordingStream) {
			t.recordingStream.getTracks().forEach(track => track.stop());
			t.recordingStream = null;
		}
		t.mediaRecorder = null;
	}
	captureSuccess(mediaFiles) {
		const [file] = mediaFiles;
		currentEntry.audioFile = file.fullPath || file.localURL || file.name;
		currentEntry.audioName = file.name || 'Recorded audio';
		console.log(`Audio recorded: ${currentEntry.audioName}`);
		audioPlayer.hidden = false;
		audioPlayer.src = currentEntry.audioFile;
		t.appendAudioNoteToDescription();
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
