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
	color: white;
}

*::-webkit-scrollbar {
	display: none;
}`;
		var textarea = this._root.appendChild(document.createElement('textarea'));
		textarea.onkeyup = e => this.value = this._root.querySelector('textarea').value;
		if (this.getAttribute('value')) {
			textarea.value = this.getAttribute('value');
			this.value = textarea.value;
		}
		if (window.SpeechRecognition || window.webkitSpeechRecognition) {
			var speechButton = this._root.appendChild(document.createElement('button'));
			speechButton.classList.add('icon');
			speechButton.classList.add('speech');
			speechButton.onclick = this.captureAudio;
			speechButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 0 122 122">
  <path fill="currentColor" d="M59.89,20.83V52.3c0,27-37.73,27-37.73,0V20.83c0-27.77,37.73-27.77,37.73,0Zm-14.18,76V118.2a4.69,4.69,0,0,1-9.37,0V96.78a40.71,40.71,0,0,1-12.45-3.51A41.63,41.63,0,0,1,12.05,85L12,84.91A41.31,41.31,0,0,1,3.12,71.68,40.73,40.73,0,0,1,0,56a4.67,4.67,0,0,1,8-3.31l.1.1A4.68,4.68,0,0,1,9.37,56a31.27,31.27,0,0,0,2.4,12.06A32,32,0,0,0,29,85.28a31.41,31.41,0,0,0,24.13,0,31.89,31.89,0,0,0,10.29-6.9l.08-.07a32,32,0,0,0,6.82-10.22A31.27,31.27,0,0,0,72.68,56a4.69,4.69,0,0,1,9.37,0,40.65,40.65,0,0,1-3.12,15.65A41.45,41.45,0,0,1,70,85l-.09.08a41.34,41.34,0,0,1-11.75,8.18,40.86,40.86,0,0,1-12.46,3.51Z"/>
</svg>`;
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
		this.speechRecognition = window.SpeechRecognition ? new SpeechRecognition() : new webkitSpeechRecognition();
		this.speechRecognition.lang = 'de-DE';
		this.speechRecognition.interimResults = true;
		this.speechRecognition.continuous = true;
		this.prepend = this._root.querySelector('textarea').value;
		if (this.prepend)
			this.prepend += '\n\n';

		this.speechRecognition.onresult = event => {
			this._root.querySelector('textarea').value = this.prepend +
				Array.from(event.results).map(result => result[0].transcript).join(' ');
			this.value = this._root.querySelector('textarea').value;
		};

		this.speechRecognition.onend = () => {
			this.isRecording = false;
			this.speechRecognition = null;
		};

		this.speechRecognition.onerror = event => {
			this.isRecording = false;
			console.log('Speech transcription failed.');
			this.speechRecognition = null;
		};

		this.speechRecognition.start();
		this.isRecording = true;
		this._root.querySelector('button').style.color = 'red';
		console.log('Listening for speech...');
	}

	stopSpeechRecognition() {
		if (this.speechRecognition)
			this.speechRecognition.stop();
		this.isRecording = false;
		this._root.querySelector('button').style.color = '';
		console.log('Speech transcription stopped.');
		this.speechRecognition = null;
	}
}
