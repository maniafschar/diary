package com.jq.diary.entity;

import java.util.Date;
import java.util.List;

import org.hibernate.annotations.Formula;

import com.fasterxml.jackson.annotation.JsonManagedReference;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;

@Entity
public class Event extends BaseEntity {
	@Column(columnDefinition = "TEXT")
	private String note;
	@ManyToOne
	private Contact contact;
	@ManyToOne
	private Location location;
	@OneToMany(mappedBy = "event")
	@JsonManagedReference
	private List<ContactEvent> contactEvents;
	@OneToMany(mappedBy = "event")
	@JsonManagedReference
	private List<EventImage> eventImages;
	private Date date;
	@Formula("(select sum(er.rating) from event_rating er where er.event_id=id and er.rating is not null)")
	private Double rating;
	@Formula("(select count(1) from event_rating er where er.event_id=id and er.rating is not null)")
	private Integer ratingCount;

	public Double getRating() {
		return this.rating;
	}

	public Integer getRatingCount() {
		return this.ratingCount;
	}

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

	public Location getLocation() {
		return this.location;
	}

	public void setLocation(final Location location) {
		this.location = location;
	}

	public Date getDate() {
		return this.date;
	}

	public void setDate(final Date date) {
		this.date = date;
	}

	public List<ContactEvent> getContactEvents() {
		return this.contactEvents;
	}

	public void setContactEvents(final List<ContactEvent> contactEvents) {
		this.contactEvents = contactEvents;
	}

	public List<EventImage> getEventImages() {
		return this.eventImages;
	}

	public void setEventImages(final List<EventImage> eventImages) {
		this.eventImages = eventImages;
	}
}