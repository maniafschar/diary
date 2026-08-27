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
			image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600"
		},
		{
			name: "Kolosseum",
			address: "Piazza del Colosseo, 1, 00184 Roma RM, Italien",
			latitude: 41.8902,
			longitude: 12.4922,
			altitude: 21,
			note: "Größtes je gebautes Amphitheater des Römischen Reiches.",
			image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600"
		},
		{
			name: "Freiheitsstatue",
			address: "Liberty Island, New York, NY 10004, USA",
			latitude: 40.6892,
			longitude: -74.0445,
			altitude: 93,
			note: "Geschenk Frankreichs an die USA, eingeweiht 1886.",
			image: "https://images.unsplash.com/photo-1508433957232-3107f5fd5995?w=600"
		},
		{
			name: "Great Wall of China",
			address: "Huairou, China",
			latitude: 40.4319,
			longitude: 116.5704,
			altitude: 550,
			note: "Jahrtausende altes Bauwerk, über 20.000 km lang.",
			image: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=600"
		}];
	markers = null;

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
}
  *{box-sizing:border-box;}
  button{
 	background: rgba(100, 150, 200, 0.2);
	border: none;
	border-radius: 1em;
	outline: none;
	cursor: pointer;
	font: inherit;
	margin: 0 0.5em;
	font-size: 1em;
	height: 2em;
	color: white;
	line-height: 1;
	z-index: 2;
	position: absolute;
	font-size: 1.3em;
	width: 2em;
	padding: 0;
	bottom: 0.5em;
	left: 50%;
  }
  button:hover{background:var(--accent-dark);}
  button.secondary{
    background:#2a2f3a;
  }
  button.secondary:hover{background:#3a4150;}
  #map{flex:1;}
  .leaflet-popup-content-wrapper{
    background:var(--panel);
    color:var(--text);
    border-radius:10px;
  }
  .leaflet-popup-tip{background:var(--panel);}
  .popup-box{min-width:200px;}
  .popup-box img{width:100%;border-radius:8px;margin-bottom:8px;display:block;}
  .popup-box h3{margin:0 0 4px 0;font-size:15px;}
  .popup-box .addr{font-size:12px;color:var(--muted);margin-bottom:6px;}
  .popup-box .meta{font-size:11px;color:var(--muted);margin-bottom:6px;}
  .popup-box .note{font-size:12px;line-height:1.4;}`;
		var link = this._root.appendChild(document.createElement('link'));
		link.setAttribute('rel', 'stylesheet');
		link.setAttribute('href', 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css');
		var script = this._root.appendChild(document.createElement('script'));
		script.onload = () => {
			this.map = L.map(this._root.appendChild(document.createElement('div')), { zoomControl: true }).setView(
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
				return marker;
			});
			this.flyToIndex(0, false);
		};
		script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
		var start = this._root.appendChild(document.createElement('button'));
		start.style.marginLeft = '-1em';
		start.addEventListener('click', this.startTour);
		var next = this._root.appendChild(document.createElement('button'));
		next.style.marginLeft = '2em';
		next.addEventListener('click', () =>
			this.flyToIndex((this.currentIndex + 1 + this.locations.length) % this.locations.length, true));
		var prev = this._root.appendChild(document.createElement('button'));
		prev.style.marginLeft = '-2em';
		prev.addEventListener('click', () =>
			this.flyToIndex((this.currentIndex - 1 + this.locations.length) % this.locations.length, true));
	}

	escapeHtml(str) {
		return String(str)
			.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
			.replaceAll('>', '&gt;').replaceAll('"', '&quot;');
	}

	flyToIndex(i, stopAutoTour) {
		const FLY_DURATION = 1.8;      // Sekunden pro Flug
		const STOP_ZOOM = 15;           // Ziel-Zoomstufe pro Ort
		if (i < 0 || i >= this.locations.length)
			return;
		if (stopAutoTour)
			this.stopTour();

		this.currentIndex = i;
		const loc = this.locations[i];
		this.map.flyTo([loc.latitude, loc.longitude], STOP_ZOOM, {
			duration: FLY_DURATION,
			easeLinearity: 0.25
		});
		if (this.markers && this.markers[i])
			this.map.once('moveend', this.markers[i].openPopup);
	}

	startTour() {
		this.stopTour();
		let i = 0;
		const step = () => {
			this.flyToIndex(i, false);
			i++;
			if (i < this.locations.length)
				this.tourTimer = setTimeout(step, (FLY_DURATION * 1000) + 3500);
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