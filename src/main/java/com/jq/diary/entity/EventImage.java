package com.jq.diary.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;

import jakarta.persistence.Entity;
import jakarta.persistence.ManyToOne;

@Entity
public class EventImage extends BaseEntity {
	@ManyToOne
	@JsonBackReference
	private Event event;
	private String image;
	private String imageThumpnail;

	public String getImage() {
		return this.image;
	}

	public void setImage(final String image) {
		this.image = image;
	}

	public String getImageThumpnail() {
		return this.imageThumpnail;
	}

	public void setImageThumpnail(final String imageThumpnail) {
		this.imageThumpnail = imageThumpnail;
	}

	public Event getEvent() {
		return this.event;
	}

	public void setEvent(final Event event) {
		this.event = event;
	}
}