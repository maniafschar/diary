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
		Summary("Fass dieses Tagebuch in etwa {0} Zeichen zusammen und hebe dabei die Daten hervor, "
				+ "die mit den stärksten positiven oder negativen Gefühlen verbunden sind",
				"Erstelle ein Bild, das die Gefühle der Menschen in diesem Text zum Ausdruck bringt"),
		AdvicePsychology("Erstelle nach der Analyse des Tagebuchs eine psychologische Einschätzung "
				+ "(Umfang: ca. {0} Zeichen) und beschreibe anhand von mindestens drei praktischen Ratschlägen, "
				+ "wie die Person sein Leben künftig verbessern kann",
				"Erstelle ein Bild, das die psychologische Vergangenheit darstellt und, basierend "
						+ "auf den Empfehlungen im Text, die Zukunft zeigt"),
		AdviceRoute("Schlage mindestens 7 neue Orte bzw. Reiseziele vor, die von Interesse sein könnten, "
				+ "basierend auf den Orten, die im Tagebuch erwähnt werden und den Stimmungen dort",
				"Erstelle ein Bild mit schönen Aufnahmen vergangener Orte im Tagebuch und "
						+ "Bildern der vorgeschlagenen Reiseziele");

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