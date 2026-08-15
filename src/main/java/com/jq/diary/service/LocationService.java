package com.jq.diary.service;

import java.math.BigInteger;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.jq.diary.entity.Client;
import com.jq.diary.entity.Location;
import com.jq.diary.repository.Repository;

@Service
public class LocationService {
	@Autowired
	private Repository repository;

	public List<Location> list(final Client client) {
		return this.repository.list("from Location where contact.client.id=" + client.getId(), Location.class);
	}

	public Location one(final BigInteger id) {
		return this.repository.one(Location.class, id);
	}

	public Location find(final Location location) {
		location.getLongitude();
		String search = "from Location where contact.client.id=" + location.getContact().getClient().getId() +
				" and lower(name) like '%" + location.getName().trim().toLowerCase() + "%'";
		if (location.getLongitude() == null)
			search += " and lower(address) like '%" + location.getAddress().toLowerCase() + "%'";
		else {
			final double delta = 0.003;
			search += " and longitude>" + (location.getLongitude() - delta) +
					" and longitude<" + (location.getLongitude() + delta) +
					" and latitude>" + (location.getLatitude() - delta) +
					" and latitude<" + (location.getLatitude() + delta);
		}
		final List<Location> locations = this.repository.list(search, Location.class);
		return locations.size() > 0 ? locations.get(0) : null;
	}

	public void save(final Location location) {
		if (location.getName() == null || location.getName().isBlank())
			throw new IllegalArgumentException("Der Name der Location darf nicht leer sein.");
		final Location locationStored = this.find(location);
		if (locationStored == null)
			this.repository.save(location);
		else
			location.setId(location.getId());
	}
}
