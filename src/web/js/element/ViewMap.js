export { ViewMap };

class ViewMap extends HTMLElement {
	map = null;
	currentIndex = -1;
	tourTimer = null;
	locations = [
		{
			name: "Eiffelturm",
			address: "Champ de Mars, 5 Av. Anatole France, 75007 Paris",
			latitude: 48.8584,
			longitude: 2.2945,
			altitude: 330,
			note: "Wahrzeichen von Paris, erbaut 1889 für die Weltausstellung.",
			image: "/med/10000/8.jpg"
		},
		{
			name: "Kolosseum",
			address: "Piazza del Colosseo, 1, 00184 Roma RM, Italien",
			latitude: 41.8902,
			longitude: 12.4922,
			altitude: 21,
			note: "Größtes je gebautes Amphitheater des Römischen Reiches.",
			image: "/med/10000/7.jpg"
		},
		{
			name: "Freiheitsstatue",
			address: "Liberty Island, New York, NY 10004, USA",
			latitude: 40.6892,
			longitude: -74.0445,
			altitude: 93,
			note: "Geschenk Frankreichs an die USA, eingeweiht 1886.",
			image: "/med/10000/6.jpg"
		},
		{
			name: "Great Wall of China",
			address: "Huairou, China",
			latitude: 40.4319,
			longitude: 116.5704,
			altitude: 550,
			note: "Jahrtausende altes Bauwerk, über 20.000 km lang.",
			image: "/med/10000/5.jpg"
		}];
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
	border-radius: 10px;
}
.leaflet-popup-tip {
	background: var(--panel);
}
.popup-box {
	min-width: 200px;
}
.popup-box img {
	width: 100%;
	border-radius: 8px;
	margin-bottom: 8px;
	display: block;
}
.popup-box h3 {
	margin: 0 0 4px 0;
	font-size: 15px;
}
.popup-box .addr {
	font-size: 12px;
	color: var(--muted);
	margin-bottom:  6px;
}
.popup-box .meta {
	font-size: 11px;
	color: var(--muted);
	margin-bottom: 6px;
}
.popup-box .note {
	font-size: 12px;
	line-height: 1.4;
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
				iconSize: [38, 95],
				iconAnchor: [22, 94],
				popupAnchor: [-3, -76],
				shadowUrl: '/image/marker-shadow.png',
				shadowSize: [68, 95],
				shadowAnchor: [22, 94]
			});
			this.map = L.map(m, { zoomControl: true }).setView(
				[this.locations[0].latitude, this.locations[0].longitude], 4);
			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution: '&copy; OpenStreetMap contributors',
				maxZoom: 19
			}).addTo(this.map);
			this.locations.map(loc => {
				const marker = L.marker([loc.latitude, loc.longitude]).addTo(this.map);
				const popupHtml = `
<div class="popup-box">
	${loc.image ? `<img src="${loc.image}" alt="${this.escapeHtml(loc.name)}">` : ''}
	<h3>${this.escapeHtml(loc.name)}</h3>
	${loc.address ? `<div class="addr">${this.escapeHtml(loc.address)}</div>` : ''}
	<div class="meta">Höhe: ${loc.altitude} m · ${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}</div>
	${loc.note ? `<div class="note">${this.escapeHtml(loc.note)}</div>` : ''}
</div>`;
				marker.bindPopup(popupHtml);
				this.markers.push(marker);
				return marker;
			});
			this.flyToIndex(0, false);
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