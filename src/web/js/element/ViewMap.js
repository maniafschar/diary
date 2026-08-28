export { ViewMap };

class ViewMap extends HTMLElement {
	map = null;
	currentIndex = 0;
	tourTimer = null;
	locations = [];
	markers = [];

	constructor() {
		super();
		this._root = this.attachShadow({ mode: 'open' });
	}
	connectedCallback() {
		this._root.appendChild(document.createElement('style')).textContent = `
:host(*) {
	position: relative;
	width: 100%;
	height: 100%;
	display: flex;
	box-sizing:border-box;
}
button {
	background: rgba(100, 150, 200, 0.2);
	border: none;
	border-radius: 1em;
	outline: none;
	cursor: pointer;
	font: inherit;
	margin: 0 0.5em;
	height: 2em;
	color: white;
	line-height: 1;
	z-index: 500;
	position: absolute;
	font-size: 1.3em;
	width: 2em;
	padding: 0;
	bottom: 0.5em;
	left: 50%;
}
.leaflet-popup-content-wrapper {
	background: var(--panel);
	color: var(--text);
	border-radius: 0.5em;
}
.leaflet-popup-tip {
	background: var(--panel);
}
.popup-box {
	min-width: 10em;
}
.popup-box img {
	width: 100%;
	border-radius: 0.5em;
	margin-bottom: 0.5em;
	display: block;
}
.popup-box h3 {
	margin: 0 0 0.5em 0;
	font-size: 1.3em;
}
.popup-box .addr {
	color: var(--muted);
	margin-bottom:  0.5em;
}
.popup-box .note {
	max-height: 6em;
	overflow: auto;
}
.leaflet-popup-content {
	margin: 0.5em !important;
}
.leaflet-container a.leaflet-popup-close-button {
	font-size: 2em !important;
	padding: 0.25em 0.4em 1em 1em !important;
	opacity: 0.3 !important;
}
.leaflet-popup-content {
	max-width: 150px !important;
}`;
		var link = this._root.appendChild(document.createElement('link'));
		link.setAttribute('rel', 'stylesheet');
		link.setAttribute('href', 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css');
		var script = this._root.appendChild(document.createElement('script'));
		script.onload = () => {
			var m = this._root.appendChild(document.createElement('div'));
			m.style.flex = 1;
			L.Marker.prototype.options.icon = L.icon({
				iconUrl: '/image/marker-icon.png',
				iconRetinaUrl: '/image/marker-icon-2x.png',
				iconSize: [34, 46],
				iconAnchor: [20, 45],
				popupAnchor: [-3, -36],
				shadowUrl: '/image/marker-shadow.png',
				shadowSize: [60, 50],
				shadowAnchor: [20, 45]
			});
			this.map = L.map(m, { zoomControl: true }).setView([48.137154, 11.576124], 4);
			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution: '&copy; OpenStreetMap contributors',
				maxZoom: 19
			}).addTo(this.map);
		};
		script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
		var start = this._root.appendChild(document.createElement('button'));
		start.style.marginLeft = '-1em';
		start.innerText = 'v';
		start.addEventListener('click', this.startTour);
		var next = this._root.appendChild(document.createElement('button'));
		next.style.marginLeft = '3em';
		next.innerText = '>';
		next.addEventListener('click', () =>
			this.flyToIndex((this.currentIndex + 1 + this.locations.length) % this.locations.length, true));
		var prev = this._root.appendChild(document.createElement('button'));
		prev.style.marginLeft = '-5em';
		prev.innerText = '<';
		prev.addEventListener('click', () =>
			this.flyToIndex((this.currentIndex - 1 + this.locations.length) % this.locations.length, true));
	}

	setLocations(locations) {
		this.locations = locations;
		this.locations.map((loc, index) => {
			const marker = L.marker([loc.latitude, loc.longitude], { index: index }).addTo(this.map);
			marker.bindPopup(`
<div class="popup-box">
	${loc.image ? `<img src="${loc.image}" alt="${this.escapeHtml(loc.name)}">` : ''}
	<h3>${this.escapeHtml(loc.name)}</h3>
	${loc.address ? `<div class="addr">${this.escapeHtml(loc.address)}</div>` : ''}
	${loc.note ? `<div class="note">${this.escapeHtml(loc.note)}</div>` : ''}
</div>`);
			marker.on('click', e => this.currentIndex = e.target.options.index);
			this.markers.push(marker);
			return marker;
		});
		this.flyToIndex(this.currentIndex, false);
	}

	escapeHtml(str) {
		return String(str)
			.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
			.replaceAll('>', '&gt;').replaceAll('"', '&quot;');
	}

	flyToIndex(i, stopAutoTour) {
		if (i < 0 || i >= this.locations.length)
			return;
		if (stopAutoTour)
			this.stopTour();

		this.currentIndex = i;
		const loc = this.locations[i];
		this.map.flyTo([loc.latitude, loc.longitude], 15, {
			duration: 2,
			easeLinearity: 0.25
		});
		this.map.once('moveend', () => this.markers[i].openPopup());
	}

	startTour() {
		var host = this.getRootNode().host;
		host.stopTour();
		let i = 0;
		const step = () => {
			host.flyToIndex(i, false);
			i++;
			if (i < host.locations.length)
				host.tourTimer = setTimeout(step, (2 * 1000) + 3500);
		};
		step();
	}

	stopTour() {
		if (this.tourTimer) {
			clearTimeout(this.tourTimer);
			this.tourTimer = null;
		}
	}
}
