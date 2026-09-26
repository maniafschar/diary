package com.jq.diary.entity;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.Column;

public class Summary extends BaseEntity {
	private int textLength;
	private int textSummary;
	@Column(columnDefinition = "TEXT")
	private String note;
	private String image;
	private Client client;
	private final List<String> adjectives = new ArrayList<>();
	private final List<String> emojis = new ArrayList<>();

	public int getTextLength() {
		return this.textLength;
	}

	public void setTextLength(final int textLength) {
		this.textLength = textLength;
	}

	public int getTextSummary() {
		return this.textSummary;
	}

	public void setTextSummary(final int textSummary) {
		this.textSummary = textSummary;
	}

	public String getNote() {
		return this.note;
	}

	public void setNote(final String note) {
		this.note = note;
	}

	public String getImage() {
		return this.image;
	}

	public void setImage(final String image) {
		this.image = image;
	}

	public List<String> getAdjectives() {
		return this.adjectives;
	}

	public List<String> getEmojis() {
		return this.emojis;
	}

	public Client getClient() {
		return this.client;
	}

	public void setClient(final Client client) {
		this.client = client;
	}
}