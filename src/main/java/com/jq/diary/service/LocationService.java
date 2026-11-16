package com.jq.diary.service;

import java.math.BigInteger;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.jq.diary.entity.Client;
import com.jq.diary.entity.Location;
import com.jq.diary.repository.Repository;

@Service
public class LocationService {
	private static final Logger log = LoggerFactory.getLogger(LocationService.class);
	private BigInteger lastResolvedId = BigInteger.ZERO;

	@Value("${app.location.address-enrichment-enabled:true}")
	private boolean addressEnrichmentEnabled = true;

	@Autowired
	private Repository repository;

	@Autowired
	private ExternalService externalService;

	public List<Location> list(final Client client) {
		return this.repository.list("from Location where client.id=?1", Location.class, client.getId());
	}

	public Location one(final BigInteger id) {
		return this.repository.one(Location.class, id);
	}

	public Location find(final Location location, final BigInteger clientId) {
		location.getLongitude();
		final List<Object> values = new ArrayList<>();
		String search = "from Location where client.id=?1 and lower(name) like ?2";
		values.add(clientId);
		values.add("%" + location.getName().trim().toLowerCase() + "%");
		if (location.getLongitude() == null) {
			search += " and lower(address) like ?3";
			values.add("%" + location.getAddress().toLowerCase() + "%");
		} else {
			final double delta = 0.003;
			search += " and longitude>?3 and longitude<?4 and latitude>?5 and latitude<?6";
			values.add(location.getLongitude() - delta);
			values.add(location.getLongitude() + delta);
			values.add(location.getLatitude() - delta);
			values.add(location.getLatitude() + delta);
		}
		final List<Location> locations = this.repository.list(search, Location.class, values.toArray());
		return locations.size() > 0 ? locations.get(0) : null;
	}

	public void save(final Location location) {
		if (location.getName() == null || location.getName().isBlank())
			throw new IllegalArgumentException("Der Name der Location darf nicht leer sein.");
		final Location locationStored = this.find(location, location.getContact().getClients().iterator().next().getId());
		if (locationStored == null) {
			if (location.getLongitude() == null)
				addGeoData(location);
			this.repository.save(location);
		} else {
			if (locationStored.getLongitude() == null) {
				addGeoData(locationStored);
				this.repository.save(locationStored);
			}
			location.setId(locationStored.getId());
		}
	}

	public void update(final Location stored, final Location changes) {
		if (changes.getName() == null || changes.getName().isBlank())
			throw new IllegalArgumentException("Der Name der Location darf nicht leer sein.");
		stored.setName(changes.getName().trim());
		stored.setAddress(changes.getAddress() == null ? "" : changes.getAddress().trim());
		if (!Objects.equals(stored.getLatitude(), changes.getLatitude())
				|| !Objects.equals(stored.getLongitude(), changes.getLongitude())) {
			stored.setCity(null);
			stored.setAddressDetailsJson(null);
		}
		stored.setLatitude(changes.getLatitude());
		stored.setLongitude(changes.getLongitude());
		stored.setAltitude(changes.getAltitude());
		if (stored.getLongitude() == null || stored.getLatitude() == null) {
			stored.setLatitude(null);
			stored.setLongitude(null);
			stored.setAltitude(null);
			if (!stored.getAddress().isBlank())
				this.addGeoData(stored);
		}
		this.repository.save(stored);
	}

	public void addGeoData(Location location) {
		final Double[] geoData = externalService.geoData(location.getAddress().replace("\n", ", "));
		if (geoData != null) {
			location.setLatitude(geoData[0]);
			location.setLongitude(geoData[1]);
			location.setAltitude(geoData[2]);
		}
	}

	@Scheduled(fixedDelay = 15000, initialDelay = 20000)
	void resolveAddressDetails() {
		if (!this.addressEnrichmentEnabled)
			return;
		List<Location> list = this.repository.listFirst(
				"from Location where addressDetailsJson is null and latitude is not null and longitude is not null and id > ?1 order by id",
				Location.class, this.lastResolvedId);
		if (list.isEmpty() && this.lastResolvedId.signum() != 0) {
			this.lastResolvedId = BigInteger.ZERO;
			list = this.repository.listFirst(
					"from Location where addressDetailsJson is null and latitude is not null and longitude is not null and id > ?1 order by id",
					Location.class, this.lastResolvedId);
		}
		if (list.isEmpty())
			return;
		final Location location = list.get(0);
		this.lastResolvedId = location.getId();
		try {
			final JsonNode details = this.externalService.addressDetails(location.getLatitude(), location.getLongitude());
			String city = "";
			for (final String key : new String[] { "city", "town", "village", "municipality", "hamlet" }) {
				if (details.path(key).isTextual() && !details.path(key).asText().isBlank()) {
					city = details.path(key).asText().trim();
					break;
				}
			}
			this.repository.executeUpdate(
					"update Location set city=?1, addressDetailsJson=?2 where id=?3 and latitude=?4 and longitude=?5 and addressDetailsJson is null",
					city, details.toString(), location.getId(), location.getLatitude(), location.getLongitude());
		} catch (final RuntimeException ex) {
			log.warn("Adressbestandteile für Location {} konnten nicht ermittelt werden", location.getId(), ex);
		}
	}
}
