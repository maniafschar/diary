package com.jq.diary.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.ManyToOne;

@Entity
public class EventFeedback extends BaseEntity {
	@Column(columnDefinition = "TEXT")
	private String note;
	@ManyToOne
	private Contact contact;
	@ManyToOne
	@JsonIgnore
	private Event event;

	public String getNote() {
		return this.note;
	}

	public void setNote(final String note) {
		this.note = note.length() > 1000 ? note.substring(0, 1000) : note;
	}

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
}