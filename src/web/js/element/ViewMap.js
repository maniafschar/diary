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
	markers = this.locations.map(loc => {
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

	constructor() {
		super();
		this._root = this.attachShadow({ mode: 'open' });
	}
	connectedCallback() {
		this._root.appendChild(document.createElement('style')).textContent = `
:root{
    --bg:#0f1115;
    --panel:#171a21;
    --panel-border:#2a2f3a;
    --text:#e8eaed;
    --muted:#9aa1ac;
    --accent:#4f8cff;
    --accent-dark:#2f5fce;
  }
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;height:100%;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:var(--bg);color:var(--text);}
  #app{display:flex;height:100vh;width:100vw;}
  #sidebar{
    width:320px;
    min-width:320px;
    background:var(--panel);
    border-right:1px solid var(--panel-border);
    display:flex;
    flex-direction:column;
    overflow:hidden;
  }
  #sidebar header{
    padding:16px 18px;
    border-bottom:1px solid var(--panel-border);
  }
  #sidebar header h1{
    font-size:16px;
    margin:0 0 4px 0;
  }
  #sidebar header p{
    margin:0;
    font-size:12px;
    color:var(--muted);
  }
  #controls{
    padding:12px 18px;
    display:flex;
    gap:8px;
    border-bottom:1px solid var(--panel-border);
  }
  button{
    background:var(--accent);
    color:white;
    border:none;
    border-radius:8px;
    padding:8px 12px;
    font-size:13px;
    cursor:pointer;
    flex:1;
    transition:background .15s ease;
  }
  button:hover{background:var(--accent-dark);}
  button.secondary{
    background:#2a2f3a;
  }
  button.secondary:hover{background:#3a4150;}
  #list{
    flex:1;
    overflow-y:auto;
    padding:8px;
  }
  .stop{
    display:flex;
    gap:10px;
    padding:10px;
    border-radius:10px;
    cursor:pointer;
    margin-bottom:6px;
    border:1px solid transparent;
  }
  .stop:hover{background:#1e222c;}
  .stop.active{
    background:#1c2436;
    border-color:var(--accent);
  }
  .stop img{
    width:48px;height:48px;object-fit:cover;border-radius:8px;flex-shrink:0;background:#222;
  }
  .stop .info{overflow:hidden;}
  .stop .info .name{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .stop .info .addr{font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
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
  .popup-box .note{font-size:12px;line-height:1.4;}
  #progress{
    padding:10px 18px;
    border-top:1px solid var(--panel-border);
    font-size:12px;
    color:var(--muted);
    display:flex;
    justify-content:space-between;
  }`;
		var sidebar = this._root.appendChild(document.createElement('sidebar'));
		sidebar.innerHTML = `
    <div id="controls">
      <button id="startBtn">▶ Tour starten</button>
      <button id="prevBtn" class="secondary">◀</button>
      <button id="nextBtn" class="secondary">▶</button>
    </div>
    <div id="list"></div>
    <div id="progress">
      <span id="progressText">–</span>
      <span id="progressCount">0 / 0</span>
    </div>v`;
		this._root.appendChild(document.createElement('script')).setAttribute('src',
			'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js');
		this._root.appendChild(document.createElement('div')).setAttribute('id', 'map');
		this.map = L.map('map', { zoomControl: true }).setView(
			[this.locations[0].latitude, this.locations[0].longitude], 4);

		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; OpenStreetMap contributors',
			maxZoom: 19
		}).addTo(this.map);
	}

	// ---- Marker + Popups anlegen ----

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

		document.getElementById('progressText').textContent = this.locations[i]?.name || '–';
		document.getElementById('progressCount').textContent = `${i + 1} / ${this.locations.length}`;

		this.map.once('moveend', () => markers[i].openPopup());
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