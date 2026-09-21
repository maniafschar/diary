import { api } from '../api';

export { ViewStatistics };

class ViewStatistics extends HTMLElement {
	text = '';

	constructor() {
		super();
		this._root = this.attachShadow({ mode: 'open' });
	}

	connectedCallback() {
		this.parentElement.addEventListener('visible', () => this.init(), { once: true });
		this._root.appendChild(document.createElement('style')).textContent = `
:host(*) {
	width: 100%;
	height: 100%;
	position: relative;
	display: block;
}
wordcloud {
	position: relative;
	display: block;
	width: 100%;
	height: 100%;
	overflow: hidden;
	text-align: center;
}
word {
	position: absolute;
	transform: translate(-50%, -50%);
	cursor: pointer;
	user-select: none;
}
word:hover {
	text-decoration: underline;
}`;
	}

	init() {
		this.render(this.extract());
	}

	render(tokens) {
		const cloud = document.createElement('wordcloud');
		const max = tokens.length ? tokens[0].count : 1;
		const min = tokens.length ? tokens[tokens.length - 1].count : 1;
		tokens.forEach((token, index) => {
			const ratio = (token.count - min) / (max - min || 1);
			const angle = index * 2.399963229728653;
			const radius = index === 0 ? 0 : 8 + index * 5;
			const span = document.createElement('word');
			span.textContent = token.text;
			span.title = `${token.text}: ${token.count}`;
			span.dataset.word = token.text;
			span.dataset.count = token.count;
			span.style.left = `${50 + Math.cos(angle) * radius}%`;
			span.style.top = `${50 + Math.sin(angle) * radius}%`;
			span.style.fontSize = `${12 + ratio * 42}px`;
			span.style.color = this.createColor(ratio);
			span.addEventListener('click', event => {
				this.dispatchEvent(new CustomEvent('wordclick', {
					detail: token,
					bubbles: true,
					composed: true
				}));
			});
			cloud.appendChild(span);
		});
		this._root.appendChild(cloud);
	}

	createColor(ratio) {
		if (ratio > 0.45)
			return `rgb(0, 0, ${255 - Math.round(ratio * 150)})`;
		if (ratio > 0.15)
			return `rgb(0, ${255 - Math.round(ratio * 150)}, 0)`;
		return `rgb(${255 - Math.round(ratio * 150)}, 0, 0)`;
	}

	extract() {
		var s = this.text.replaceAll(/[ \t\r\n,\.\-\!\?\[\]\{\}';:\/\(\)…0-9]/g, ' ').trim().toLowerCase().split(' ');
		var list = [];
		for (var i = 0; i < s.length; i++) {
			if (s[i].trim().length > 1) {
				var token = list.find(e => e.text == s[i]);
				if (token)
					token.count++;
				else if (!this.STOP_WORDS.includes(s[i]))
					list.push({ count: 1, text: s[i] });
			}
		}
		list.sort((e, e2) => e2.count - e.count);
		return list;
	}

	STOP_WORDS = [
		// English
		'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', "aren't", 'as', 'at',
		'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', "can't", 'cannot', 'could',
		"couldn't", 'did', "didn't", 'do', 'does', "doesn't", 'doing', "don't", 'down', 'during', 'each', 'few', 'for',
		'from', 'further', 'had', "hadn't", 'has', "hasn't", 'have', "haven't", 'having', 'he', "he'd", "he'll", "he's",
		'her', 'here', "here's", 'hers', 'herself', 'him', 'himself', 'his', 'how', "how's", 'i', "i'd", "i'll", "i'm",
		"i've", 'if', 'in', 'into', 'is', "isn't", 'it', "it's", 'its', 'itself', "let's", 'me', 'more', 'most', "mustn't",
		'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours',
		'ourselves', 'out', 'over', 'own', 'same', "shan't", 'she', "she'd", "she'll", "she's", 'should', "shouldn't",
		'so', 'some', 'such', 'than', 'that', "that's", 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there',
		"there's", 'these', 'they', "they'd", "they'll", "they're", "they've", 'this', 'those', 'through', 'to', 'too',
		'under', 'until', 'up', 'very', 'was', "wasn't", 'we', "we'd", "we'll", "we're", "we've", 'were', "weren't",
		'what', "what's", 'when', "when's", 'where', "where's", 'which', 'while', 'who', "who's", 'whom', 'why', "why's",
		'with', "won't", 'would', "wouldn't", 'you', "you'd", "you'll", "you're", "you've", 'your', 'yours', 'yourself',
		'yourselves',
		// German
		'aber', 'alle', 'allem', 'allen', 'aller', 'alles', 'als', 'also', 'am', 'an', 'ander', 'andere', 'anderem', 'anderen',
		'anderer', 'anderes', 'auch', 'auf', 'aus', 'bei', 'bin', 'bis', 'bist', 'da', 'damit', 'dann', 'das', 'dass', 'dazu',
		'dein', 'deine', 'dem', 'den', 'denn', 'der', 'die', 'dies', 'diese', 'diesem', 'diesen', 'dieser', 'dieses', 'dir',
		'doch', 'dort', 'du', 'durch', 'ein', 'eine', 'einem', 'einen', 'einer', 'eines', 'er', 'es', 'etwas', 'euch', 'für',
		'gegen', 'gewesen', 'haben', 'hat', 'hatte', 'hier', 'ich', 'ihm', 'ihn', 'ihnen', 'ihr', 'ihre', 'im', 'in', 'ist',
		'jede', 'jeder', 'jedes', 'jetzt', 'kann', 'kein', 'keine', 'können', 'machen', 'man', 'mehr', 'mein', 'meine', 'mich',
		'mir', 'mit', 'muss', 'nach', 'nicht', 'nichts', 'noch', 'nur', 'ob', 'oder', 'ohne', 'sehr', 'sein', 'seine', 'selbst',
		'sich', 'sie', 'sind', 'so', 'solche', 'soll', 'sondern', 'sonst', 'um', 'und', 'uns', 'unser', 'unter', 'vom', 'von',
		'vor', 'war', 'waren', 'was', 'weil', 'weiter', 'welche', 'wenn', 'wie', 'wieder', 'will', 'wir', 'wird', 'wo', 'zu',
		'zum', 'zur', 'über',
		// French, Italian, and Spanish
		'ai', 'aie', 'alors', 'au', 'aucun', 'aussi', 'autre', 'aux', 'avec', 'ce', 'ceci', 'cela', 'ces', 'cette', 'comme',
		'comment', 'dans', 'de', 'dedans', 'dehors', 'depuis', 'des', 'du', 'elle', 'elles', 'en', 'encore', 'est', 'et', 'eux',
		'faire', 'ici', 'il', 'ils', 'je', 'la', 'le', 'les', 'leur', 'leurs', 'lui', 'mais', 'me', 'mes', 'moi', 'mon', 'ne',
		'ni', 'nos', 'notre', 'nous', 'on', 'ou', 'par', 'pas', 'pour', 'que', 'quel', 'quelle', 'qui', 'sans', 'se', 'sera',
		'ses', 'si', 'soit', 'son', 'sont', 'sur', 'ta', 'te', 'tes', 'toi', 'ton', 'tous', 'tout', 'tu', 'un', 'une', 'vous',
		'anche', 'avere', 'che', 'chi', 'ci', 'come', 'con', 'da', 'dei', 'del', 'della', 'di', 'dove', 'e', 'gli', 'ha', 'hai',
		'hanno', 'ho', 'i', 'io', 'la', 'le', 'lo', 'loro', 'ma', 'mi', 'mia', 'mio', 'nei', 'nel', 'no', 'non', 'noi', 'o',
		'per', 'più', 'quale', 'quello', 'questa', 'questo', 'se', 'sei', 'si', 'sono', 'su', 'sua', 'suo', 'ti', 'tra', 'tua',
		'tuo', 'tutti', 'uno', 'vi', 'voi', 'a', 'al', 'algo', 'algunas', 'algunos', 'ante', 'antes', 'como', 'con', 'contra',
		'cual', 'cuando', 'del', 'desde', 'donde', 'durante', 'el', 'ella', 'ellas', 'ellos', 'en', 'entre', 'era', 'eres', 'es',
		'esa', 'esas', 'ese', 'eso', 'esos', 'esta', 'estas', 'este', 'esto', 'estos', 'fue', 'ha', 'hasta', 'hay', 'la', 'las',
		'le', 'les', 'lo', 'los', 'me', 'mi', 'mis', 'mucho', 'muy', 'más', 'nada', 'ni', 'no', 'nos', 'nosotros', 'o', 'otra',
		'otro', 'para', 'pero', 'por', 'porque', 'que', 'quien', 'se', 'sin', 'sobre', 'su', 'sus', 'también', 'te', 'ti', 'todo',
		'tu', 'tus', 'un', 'una', 'uno', 'ya', 'yo'
	];
}
