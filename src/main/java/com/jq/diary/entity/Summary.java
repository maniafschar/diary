package com.jq.diary.entity;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.ManyToOne;

@Entity
public class Summary extends BaseEntity {
	private int textLength;
	private int textSummary;
	@Column(columnDefinition = "TEXT")
	private String note;
	@Enumerated(EnumType.STRING)
	private Prompt prompt;
	private String image;
	private String imageThumbnail;
	@ManyToOne
	private Client client;
	private final List<String> adjectives = new ArrayList<>();
	private final List<String> emojis = new ArrayList<>();

	public enum Prompt {
		Summary("Summarize this diary in about {0} characters "
				+ ", emphasis the dates with the most feelings",
				"Create an image expressing the feelings of the people in this text"),
		AdvicePsychology("After analysing the diary, in about {0} characters give a psychological review and "
				+ "describe in at least 3 practical advices, how to improve his life in future",
				"Create an image describing the psychological past and showing a "
						+ "bright future, based on the recomentations in the text"),
		AdviceRoute("Analyse the locations and mood of the persons diary and " +
				"suggest at least 3 new cities/destinations, which could be of interest",
				"Create an image with some nice pictures of past locations and "
						+ "new pictures of suggested destinations");

		private final String image;
		private final String text;

		private Prompt(final String text, final String image) {
			this.text = text;
			this.image = image;
		}

		public String getImage() {
			return this.image;
		}

		public String getText() {
			return this.text;
		}
	};

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

	public String getImageThumbnail() {
		return this.imageThumbnail;
	}

	public void setImageThumbnail(final String imageThumbnail) {
		this.imageThumbnail = imageThumbnail;
	}

	public Prompt getPrompt() {
		return this.prompt;
	}

	public void setPrompt(final Prompt prompt) {
		this.prompt = prompt;
	}
}