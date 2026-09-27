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
		Summary("Rolle: Reagiere als präziser und objektiver Textanalyst. \n\n"
				+ "Aufgabe: Fasse den folgenden Tagebucheintrag sachlich zusammen. Extrahiere die wesentlichen Ereignisse, Gedanken und Kernbotschaften, ohne den Text psychologisch zu interpretieren, zu bewerten oder Ratschläge zu erteilen. Bleibe nah am Originalton.\n\n"
				+ "Format der Ausgabe:\n"
				+ "- Kerngedanke (1-2 Sätze, die das Hauptthema auf den Punkt bringen)\n"
				+ "- Wichtigste Punkte (Eine kurze Bullet-Point-Liste der konkreten Ereignisse oder Gedanken)\n\n"
				+ "Hier ist mein Tagebucheintrag"),
		AdvicePsychology(
				"Rolle: Reagiere als erfahrener, empathischer psychologischer Berater und Coach. Analysiere das folgende Tagebuch strukturiert und sachlich. Nimm eine neutrale, unterstützende Perspektive ein.\n\n"
						+ "Aufgabe:\n"
						+ "Schritt 1: Analysiere den Text auf wiederkehrende emotionale Muster, Denkgewohnheiten (z.B. Glaubenssätze) und versteckte Stressoren.\n"
						+ "Schritt 2: Formuliere auf Basis dieser Analyse exakt 3 konkrete, handlungsorientierte und realistische Tipps, wie ich mein Wohlbefinden und mein Leben im Alltag verbessern kann.\n\n"
						+ "Format der Ausgabe:\n"
						+ "- Psychologische Kurzanalyse (Maximal 3 Absätze)\n"
						+ "- Die 3 Tipps (Als nummerierte Liste mit je einer kurzen Begründung aus dem Text)\n\n"
						+ "Hier ist mein Tagebucheintrag"),
		AdviceRoute(
				"Rolle: Du bist ein extrem erfahrener Reise-Concierge und Datenanalyst für personalisierte Reiseerlebnisse.\n\n"
						+ "Aufgabe:\n"
						+ "1. Analysiere die unten stehenden Tagebucheinträge. Achte besonders auf die Orte (Adressen/Koordinaten), an denen das Stimmungsbarometer am höchsten war (Werte 4 und 5). Leite daraus ab, welche Art von Umgebung (z. B. Natur, Großstadt, Küste, Berge) und welches Reisetempo dem Autor am besten tun.\n"
						+ "2. Basierend auf diesem Reiseprofil: Empfiehl 10 völlig neue Reisetipps (Orte, Regionen oder spezifische Sehenswürdigkeiten), die der Autor noch NICHT besucht hat, die aber perfekt zu den Mustern seiner Lieblingsorte passen.\n\n"
						+ "Regeln für die Ausgabe:\n"
						+ "- Nenne für jeden der 10 Tipps den genauen Namen des Ortes/der Region und das Land.\n"
						+ "- Füge jedem Tipp eine kurze, treffende Begründung hinzu, warum dieser Ort basierend auf den Daten (z. B. „Ähnelt Koordinate X, bietet aber mehr Ruhe...“) perfekt passt.\n"
						+ "- Preise oder Kosten dürfen im Text NICHT erwähnt werden. Zeige auch keine Sterne-Bewertungen oder Review-Zahlen.\n\n"
						+ "Hier sind die Tagebuch-Daten");

		private final String text;

		private Prompt(final String text) {
			this.text = text;
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