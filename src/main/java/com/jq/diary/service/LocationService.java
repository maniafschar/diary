package com.jq.diary.service;

import java.math.BigInteger;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.jq.diary.entity.Client;
import com.jq.diary.entity.Location;
import com.jq.diary.repository.Repository;
import com.jq.diary.service.ExternalService;

@Service
public class LocationService {
	@Autowired
	private Repository repository;

	@Autowired
	private ExternalService externalService;

	public List<Location> list(final Client client) {
		return this.repository.list("from Location where contact.client.id=?1", Location.class, client.getId());
	}

	public Location one(final BigInteger id) {
		return this.repository.one(Location.class, id);
	}

	public Location find(final Location location) {
		location.getLongitude();
		final List<Object> values = new ArrayList<>();
		String search = "from Location where contact.client.id=?1 and lower(name) like ?2";
		values.add(location.getContact().getClient().getId());
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
		final Location locationStored = this.find(location);
		if (locationStored == null) {
			if (location.getLongitude() == null)
				addGeoData(location);
			this.repository.save(location);
		} else
			location.setId(locationStored.getId());
	}

	public void addGeoData(Location location) {
		final Double[] geoData = externalService.geoData(location.getAddress().replace("\n", ", "));
		if (geoData != null) {
			location.setLatitude(geoData[0]);
			location.setLongitude(geoData[1]);
			location.setAltitude(geoData[2]);
		}
	}
}
