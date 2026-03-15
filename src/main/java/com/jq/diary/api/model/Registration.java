package com.jq.diary.api.model;

import java.math.BigInteger;

public class Registration {
	private boolean agb;
	private int time;
	private String email;
	private String name;
	private BigInteger clientId;

	public BigInteger getClientId() {
		return this.clientId;
	}

	public void setClientId(final BigInteger clientId) {
		this.clientId = clientId;
	}

	public boolean isAgb() {
		return this.agb;
	}

	public void setAgb(final boolean agb) {
		this.agb = agb;
	}

	public int getTime() {
		return this.time;
	}

	public void setTime(final int time) {
		this.time = time;
	}

	public String getEmail() {
		return this.email;
	}

	public void setEmail(final String email) {
		this.email = email;
	}

	public String getName() {
		return this.name;
	}

	public void setName(final String name) {
		this.name = name;
	}

	@Override
	public String toString() {
		return super.toString() +
				"\nclientId: " + this.getClientId() +
				"\nagb: " + this.isAgb() +
				"\nemail: " + this.getEmail() +
				"\nname: " + this.getName() +
				"\ntime: " + this.getTime();
	}
}