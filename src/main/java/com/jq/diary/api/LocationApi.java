package com.jq.diary.api;

import java.math.BigInteger;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.jq.diary.entity.Location;
import com.jq.diary.service.ExternalService;
import com.jq.diary.service.LocationService;
import com.jq.diary.util.Utilities;

@RestController
@RequestMapping("api/location")
public class LocationApi extends ApplicationApi {
	@Autowired
	private LocationService locationService;

	@Autowired
	private ExternalService externalService;

	@GetMapping("{id}")
	public Location get(@PathVariable final BigInteger id) {
		return Utilities.filter(this.locationService.one(id));
	}

	@PutMapping
	public BigInteger put(@RequestHeader final BigInteger contactId, @RequestHeader final BigInteger clientId,
			@RequestBody final Location location) {
		if (location.getId() == null)
			location.setContact(this.verifyContactClient(contactId, clientId));
		else
			location.setContact(this.repository.one(Location.class, location.getId()).getContact());
		this.locationService.save(location);
		return location.getId();
	}

	@GetMapping("list")
	public List<Location> getList(@RequestHeader final BigInteger contactId,
			@RequestHeader final BigInteger clientId) {
		return Utilities.filter(
				this.locationService.list(this.verifyContactClient(contactId, clientId).getClient()));
	}

	@GetMapping("nearby")
	public Map<String, Object> getNearby(final double latitude, final double longitude) {
		return this.externalService.nearby(latitude, longitude);
	}
}