package com.jq.diary.service;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriUtils;

import com.fasterxml.jackson.databind.JsonNode;
import com.jq.diary.util.Json;

@Service
public class ExternalService {

	@Value("${app.google.key}")
	private String googleKey;

	public static record Response(String type, int place_rank, double importance, String addresstype, String name,
			Address address) {
	}

	public static record Address(String amenity, String house_number, String road, String neighbourhood, String suburb,
			String city, String town, String hamlet, String village, String municipality, String state, String postcode,
			String country, String country_code) {
	}

	public Map<String, String> address(final double latitude, final double longitude) {
		final Response response = WebClient
				.create("https://nominatim.openstreetmap.org/reverse?format=json&lat=" + latitude + "&lon=" + longitude)
				.get()
				.accept(MediaType.APPLICATION_JSON)
				.header("user-agent",
						"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36")
				.retrieve().toEntity(Response.class)
				.block().getBody();
		final Address address = response.address;
		final Map<String, String> result = new HashMap<>();
		result.put("name", response.name);
		result.put("address", (((address.road == null ? "" : address.road)
				+ (address.house_number == null ? "" : " " + address.house_number)).trim() + "\n" +
				((address.postcode == null ? "" : address.postcode)
						+ " " + (address.city == null
								? (address.town == null ? (address.village == null ? "" : address.village)
										: address.town)
								: address.city))
						.trim()
				+ "\n" +
				(address.country == null ? "" : address.country)).trim());
		result.put("countryCode", address.country_code);
		return result;
	}

	public double[] geoData(final String address) {
		final String response = WebClient
				.create("https://nominatim.openstreetmap.org/search?format=jsonv2&q=" + UriUtils.encode(address.replace("\n", ", "), StandardCharsets.UTF_8))
				.get()
				.accept(MediaType.APPLICATION_JSON)
				.header("user-agent",
						"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36")
				.retrieve().toEntity(String.class)
				.block().getBody();
		if (response != null && response.startsWith("[")) {
			final JsonNode node = Json.toNode(response);
			if (node.size() > 0)
				return new Double[] { node.get(0).get("lat").asDouble(), node.get(0).get("lon").asDouble() };
		}
		return null;
	}

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
										&& data.get(i2).get("types").size() > 0
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
