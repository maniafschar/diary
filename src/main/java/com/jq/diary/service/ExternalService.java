package com.jq.diary.service;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import com.fasterxml.jackson.databind.JsonNode;
import com.jq.diary.util.Json;

@Service
public class ExternalService {

	@Value("${app.google.key}")
	private String googleKey;

	public Map<String, Object> nearby(final double latitude, final double longitude) {
		final String value = WebClient
				.create("https://maps.googleapis.com/maps/api/geocode/json?latlng=" + latitude + "," + longitude
						+ "&key=" + this.googleKey)
				.get().retrieve().toEntity(String.class)
				.block().getBody();
		if (value != null && value.startsWith("{") && value.endsWith("}")) {
			final JsonNode address = Json.toNode(value);
			if ("OK".equals(address.get("status").asText()) && address.get("results") != null) {
				String street = null;
				String number = null;
				String town = null;
				String zipCode = null;
				String country = null;
				final Map<String, Object> result = new HashMap<>();
				for (int i = 0; i < address.get("results").size(); i++) {
					JsonNode data = address.get("results").get(i).get("address_components");
					if (data != null) {
						for (int i2 = 0; i2 < data.size(); i2++) {
							if (data.get(i2) != null) {
								final String type = data.get(i2).has("types")
										? data.get(i2).get("types").get(0).asText()
										: "";
								if (street == null && "route".equals(type))
									street = data.get(i2).get("long_name").asText();
								else if (number == null && "street_number".equals(type))
									number = data.get(i2).get("long_name").asText();
								else if (town == null
										&& ("locality".equals(type) || type.startsWith("administrative_area_level_")))
									town = data.get(i2).get("long_name").asText();
								else if (zipCode == null && "postal_code".equals(type))
									zipCode = data.get(i2).get("long_name").asText();
								else if (country == null && "country".equals(type))
									country = data.get(i2).get("long_name").asText();
							}
						}
						result.put("address",
								((street == null ? "" : street) + (number == null ? "" : " " + number)).trim() + "\n" +
										((zipCode == null ? "" : zipCode) + (town == null ? "" : " " + town)).trim()
										+ "\n" + (country == null ? "" : country));
						data = address.get("results").get(0).get("geometry");
						if (data != null) {
							data = data.get("location");
							if (data != null) {
								result.put("latitude", data.get("lat").asDouble());
								result.put("longitude", data.get("lng").asDouble());
							}
						}
					}
				}
				return result;
			}
		}
		return null;
	}
}