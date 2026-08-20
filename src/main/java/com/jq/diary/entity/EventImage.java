package com.jq.diary.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;

import jakarta.persistence.Entity;
import jakarta.persistence.ManyToOne;

@Entity
public class EventImage extends BaseEntity {
	@ManyToOne
	@JsonBackReference
	private Event event;
	@ManyToOne
	private Contact contact;
	private String image;
	private String imageThumbnail;

	public Contact getContact() {
		return this.contact;
	}

	public void setContact(final Contact contact) {
		this.contact = contact;
	}

	public String getImage() {
		return this.image;
	}

	public void setImage(final String image) {
		this.image = image;
	}

	public String getImageThumbnail() {
		return this.imageThumbnail;
	}

	public void setImageThumbnail(final String imageThumbnail) {
		this.imageThumbnail = imageThumbnail;
	}

	public Event getEvent() {
		return this.event;
	}

	public void setEvent(final Event event) {
		this.event = event;
	}
}