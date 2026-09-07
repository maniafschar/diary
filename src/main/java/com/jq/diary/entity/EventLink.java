package com.jq.diary.entity;

import java.util.Date;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonBackReference;

import jakarta.persistence.Entity;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;

@Entity
public class EventLink extends BaseEntity {
	@ManyToMany(mappedBy = "eventLinks")
	@JsonBackReference
	private List<Event> events;
	@ManyToOne
	@JsonBackReference
	private Contact contact;
	private String email;
	private String identifier;
	private Date start;

	public Contact getContact() {
		return this.contact;
	}

	public void setContact(final Contact contact) {
		this.contact = contact;
	}

	public String getEmail() {
		return this.email;
	}

	public void setEmail(final String email) {
		this.email = email;
	}

	public String getIdentifier() {
		return this.identifier;
	}

	public void setIdentifier(final String identifier) {
		this.identifier = identifier;
	}

	public Date getStart() {
		return this.start;
	}

	public void setStart(final Date start) {
		this.start = start;
	}

	public List<Event> getEvents() {
		return this.events;
	}

	public void setEvents(final List<Event> events) {
		this.events = events;
	}
}
