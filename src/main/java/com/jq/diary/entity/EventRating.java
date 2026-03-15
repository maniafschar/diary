package com.jq.diary.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;

import jakarta.persistence.Entity;
import jakarta.persistence.ManyToOne;

@Entity
public class EventRating extends BaseEntity {
	@ManyToOne
	@JsonBackReference
	private Event event;
	@ManyToOne
	private Contact contact;
	private Double rating;

	public Contact getContact() {
		return this.contact;
	}

	public void setContact(final Contact contact) {
		this.contact = contact;
	}

	public Event getEvent() {
		return this.event;
	}

	public void setEvent(final Event event) {
		this.event = event;
	}

	public Double getRating() {
		return this.rating;
	}

	public void setRating(final Double rating) {
		this.rating = rating;
	}
}