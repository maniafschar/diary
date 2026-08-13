package com.jq.diary.entity;

import java.util.Date;
import java.util.List;

import org.hibernate.annotations.Formula;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.jq.diary.util.Utilities;

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
	private String locationName;
	private String address;
	private Double longitude;
	private Double latitude;
	private Double altitude;
	@OneToMany(mappedBy = "event")
	@JsonManagedReference
	private List<ContactEvent> contactEvents;
	@OneToMany(mappedBy = "event")
	@JsonManagedReference
	private List<EventImage> eventImages;
	@OneToMany(mappedBy = "event")
	@JsonManagedReference
	@JsonProperty(access = JsonProperty.Access.READ_ONLY)
	private List<EventRating> eventRatings;
	@OneToMany(mappedBy = "event")
	@JsonManagedReference
	@JsonProperty(access = JsonProperty.Access.READ_ONLY)
	private List<EventFeedback> eventFeedbacks;
	private Date date;
	@Formula("(select sum(er.rating) from event_rating er where er.event_id=id and er.rating is not null and er.rating > 0)")
	private Double rating;
	@Formula("(select count(1) from event_rating er where er.event_id=id and er.rating is not null and er.rating > 0)")
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
		this.note = note.length() > Utilities.MAX_TEXT_LENGTH ? note.substring(0, Utilities.MAX_TEXT_LENGTH) : note;
	}

	public Contact getContact() {
		return this.contact;
	}

	public void setContact(final Contact contact) {
		this.contact = contact;
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

	public List<EventRating> getEventRatings() {
		return this.eventRatings;
	}

	public void setEventRatings(final List<EventRating> eventRatings) {
		this.eventRatings = eventRatings;
	}

	public List<EventFeedback> getEventFeedbacks() {
		return this.eventFeedbacks;
	}

	public void setEventFeedbacks(final List<EventFeedback> eventFeedbacks) {
		this.eventFeedbacks = eventFeedbacks;
	}

	public String getLocationName() {
		return this.locationName;
	}

	public void setLocationName(final String locationName) {
		this.locationName = locationName;
	}

	public String getAddress() {
		return this.address;
	}

	public void setAddress(final String address) {
		this.address = address;
	}

	public Double getLongitude() {
		return this.longitude;
	}

	public void setLongitude(final Double longitude) {
		this.longitude = longitude;
	}

	public Double getLatitude() {
		return this.latitude;
	}

	public void setLatitude(final Double latitude) {
		this.latitude = latitude;
	}

	public Double getAltitude() {
		return this.altitude;
	}

	public void setAltitude(final Double altitude) {
		this.altitude = altitude;
	}

}