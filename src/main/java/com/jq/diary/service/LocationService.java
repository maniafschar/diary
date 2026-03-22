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
		return this.repository.list("from Location where contact.client.id=" + client.getId() + " order by name",
				Location.class);
	}

	public Location one(final BigInteger id) {
		return this.repository.one(Location.class, id);
	}

	public void save(final Location location) {
		if (location.getName() == null || location.getName().isBlank())
			throw new IllegalArgumentException("Der Name der Location darf nicht leer sein.");
		this.repository.save(location);
	}
}