package com.jq.diary.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.ManyToOne;

@Entity
public class ChatSummary extends BaseEntity {
	@ManyToOne
	private Contact contact;

	@Enumerated(EnumType.STRING)
	private Category category;

	@Column(columnDefinition = "BOOLEAN")
	private Boolean dirty;

	@Column(name = "summary_text", columnDefinition = "TEXT")
	private String text;

	public enum Category {
		CHAT("Tagebuch-Zusammenfassung",
				"Fasse die folgenden Tagebucheinträge knapp als persönlichen Hintergrund für einen Chat zusammen. "
						+ "Berücksichtige zeitliche Entwicklung, Orte, Beschreibungen und Bewertungen. "),
		GUIDE("Orts-Guide",
				"Du bist ein Guide für die aktuelle Umgebung des Nutzers. Fasse aus den folgenden Tagebucheinträgen "
						+ "zusammen, welche Arten von Ereignissen, Orten und Aktivitäten der Nutzer mag, geordnet nach "
						+ "Ort/Region, damit später passende Vorschläge für seinen aktuellen Aufenthaltsort gemacht werden können. "),
		PSYCHOLOGY("Psychologische Reflexion",
				"Du bist ein einfühlsamer psychologischer Assistent. Analysiere die folgenden Tagebucheinträge "
						+ "reflexiv: wiederkehrende Themen, Stimmungen, Vorlieben, Belastungen und Entwicklungen über die Zeit. "
						+ "Formuliere Beobachtungen vorsichtig als Hypothesen, stelle keine Diagnosen und gib "
						+ "höchstens ein, zwei Reflexionsfragen mit. "),
		TRAVEL("Reiseplanung",
				"Du bist ein Tourenplaner. Fasse aus den folgenden Tagebucheinträgen zusammen, welche Orte, Regionen "
						+ "und Reiseformen der Nutzer bereits besucht hat, was ihm gefallen hat (Bewertungen) und welche "
						+ "Vorlieben sich daraus für die nächsten Reiseziele ableiten lassen. ");

		private final String title;
		private final String prompt;

		Category(final String title, final String prompt) {
			this.title = title;
			this.prompt = prompt;
		}

		public String getTitle() {
			return this.title;
		}

		public String getPrompt() {
			return this.prompt;
		}
	}

	public Contact getContact() {
		return this.contact;
	}

	public void setContact(final Contact contact) {
		this.contact = contact;
	}

	public String getText() {
		return this.text;
	}

	public void setText(final String text) {
		this.text = text;
	}

	public Category getCategory() {
		return this.category;
	}

	public void setCategory(final Category category) {
		this.category = category;
	}

	public boolean isDirty() {
		return Boolean.TRUE.equals(this.dirty);
	}

	public void setDirty(final boolean dirty) {
		this.dirty = dirty;
	}
}
