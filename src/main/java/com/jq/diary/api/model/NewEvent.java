package com.jq.diary.api.model;

import java.math.BigInteger;

public class NewEvent {
	private Event event;
	private Location location;

	public Event getEvent() {
		return event;
	}

	public void setEvent(Event event) {
		this.event = event;
	}

	public Location getLocation() {
		return location;
	}

	public void setLocation(Location location) {
		this.location = location;
	}
}
