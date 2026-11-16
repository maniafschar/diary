package com.jq.diary.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigInteger;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.fasterxml.jackson.databind.JsonNode;
import com.jq.diary.entity.Location;
import com.jq.diary.repository.Repository;
import com.jq.diary.util.Json;

class LocationAddressDetailsTest {
	private final Repository repository = mock(Repository.class);
	private final ExternalService externalService = mock(ExternalService.class);
	private final LocationService service = new LocationService();

	LocationAddressDetailsTest() {
		ReflectionTestUtils.setField(this.service, "repository", this.repository);
		ReflectionTestUtils.setField(this.service, "externalService", this.externalService);
	}

	@Test
	void enrichesExistingCityAndRetainsAllAddressComponents() {
		final Location location = location();
		location.setCity("Munich");
		final JsonNode details = Json.toNode(
				"{\"city\":\"München\",\"postcode\":\"80331\",\"road\":\"Straße\",\"house_number\":\"1\",\"state_district\":\"Oberbayern\",\"country\":\"Deutschland\",\"ISO3166-2-lvl4\":\"DE-BY\"}");
		when(this.repository.listFirst(anyString(), any(), any())).thenReturn(List.of(location));
		when(this.externalService.addressDetails(48.1, 11.5)).thenReturn(details);

		this.service.resolveAddressDetails();

		verify(this.repository).executeUpdate(
				"update Location set city=?1, addressDetailsJson=?2 where id=?3 and latitude=?4 and longitude=?5 and addressDetailsJson is null",
				"München", details.toString(), location.getId(), 48.1, 11.5);
		location.setAddressDetailsJson(details.toString());
		final JsonNode json = Json.toNode(Json.toString(location));
		assertEquals("80331", json.path("addressDetails").path("postcode").asText());
		assertEquals("Oberbayern", json.path("addressDetails").path("state_district").asText());
		assertEquals("DE-BY", json.path("addressDetails").path("ISO3166-2-lvl4").asText());
		assertFalse(json.has("addressDetailsJson"));
	}

	@Test
	void retriesFailuresWithoutSavingIncompleteData() {
		final Location location = location();
		when(this.repository.listFirst(anyString(), any(), any())).thenReturn(List.of(location));
		when(this.externalService.addressDetails(48.1, 11.5)).thenThrow(new IllegalStateException("unavailable"));

		this.service.resolveAddressDetails();

		verify(this.repository, never()).executeUpdate(anyString(), any(), any(), any(), any(), any());
	}

	@Test
	void usesTownWhenCityIsAbsent() {
		final Location location = location();
		final JsonNode details = Json.toNode("{\"town\":\"Dachau\",\"postcode\":\"85221\"}");
		when(this.repository.listFirst(anyString(), any(), any())).thenReturn(List.of(location));
		when(this.externalService.addressDetails(48.1, 11.5)).thenReturn(details);

		this.service.resolveAddressDetails();

		verify(this.repository).executeUpdate(
				"update Location set city=?1, addressDetailsJson=?2 where id=?3 and latitude=?4 and longitude=?5 and addressDetailsJson is null",
				"Dachau", details.toString(), location.getId(), 48.1, 11.5);
	}

	@Test
	void discardsDetailsWhenCoordinatesChangeButKeepsThemOtherwise() {
		final Location stored = location();
		stored.setCity("München");
		stored.setAddressDetailsJson("{\"postcode\":\"80331\"}");
		final Location changes = location();
		changes.setName("Ort");
		this.service.update(stored, changes);
		assertEquals("80331", stored.getAddressDetails().path("postcode").asText());

		changes.setLatitude(49.0);
		this.service.update(stored, changes);
		assertNull(stored.getCity());
		assertNull(stored.getAddressDetails());
	}

	private static Location location() {
		final Location location = new Location();
		location.setId(BigInteger.ONE);
		location.setName("Ort");
		location.setLatitude(48.1);
		location.setLongitude(11.5);
		return location;
	}
}
