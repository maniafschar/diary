package com.jq.diary.entity;

import java.math.BigInteger;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(uniqueConstraints = @UniqueConstraint(columnNames = { "event_id", "device_id", "kind" }))
public class PushDelivery extends BaseEntity {
	@Column(nullable = false)
	private BigInteger eventId;

	@ManyToOne(optional = false)
	private PushDevice device;

	@Column(nullable = false, length = 32)
	private String kind;

	public BigInteger getEventId() {
		return this.eventId;
	}

	public void setEventId(final BigInteger eventId) {
		this.eventId = eventId;
	}

	public PushDevice getDevice() {
		return this.device;
	}

	public void setDevice(final PushDevice device) {
		this.device = device;
	}

	public String getKind() {
		return this.kind;
	}

	public void setKind(final String kind) {
		this.kind = kind;
	}
}