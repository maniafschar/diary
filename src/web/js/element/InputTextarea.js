export { InputTextarea };

class InputTextarea extends HTMLElement {
	isRecording = false;
	speechRecognition = null;
	prepend = '';

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
		var textarea = this._root.appendChild(document.createElement('textarea'));
		textarea.onkeyup = e => this.value = this._root.querySelector('textarea').value;
		if (this.getAttribute('value'))
			textarea.value = this.getAttribute('value');
		if (SpeechRecognition) {
			var speechButton = this._root.appendChild(document.createElement('button'));
			speechButton.classList.add('icon');
			speechButton.classList.add('speech');
			speechButton.onclick = this.captureAudio;
			document.createElement('audio-player').controls = 'hidden';
		}
	}
	captureAudio() {
		var host = this.getRootNode().host;
		if (host.isRecording)
			host.stopSpeechRecognition();
		else
			host.startSpeechRecognition();
	}
	startSpeechRecognition() {
		this.speechRecognition = new SpeechRecognition();
		this.speechRecognition.lang = 'de-DE';
		this.speechRecognition.interimResults = true;
		this.speechRecognition.continuous = true;
		this.prepend = this._root.querySelector('textarea').value;
		if (this.prepend)
			this.prepend += ' ';

		this.speechRecognition.onresult = event => {
			this._root.querySelector('textarea').value = this.prepend +
				Array.from(event.results).map(result => result[0].transcript).join(' ');
			this.value = this._root.querySelector('textarea').value;
		};

		this.speechRecognition.onend = () => {
			this.isRecording = false;
			//this.captureAudioButton.textContent = 'Record Audio Description';
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
	stopSpeechRecognition() {
		if (this.speechRecognition)
			this.speechRecognition.stop();
		this.isRecording = false;
		//this.captureAudioButton.textContent = 'Record Audio Description';
		console.log('Speech transcription stopped.');
		this.speechRecognition = null;
	}
}