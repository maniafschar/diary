package com.jq.diary.util;

import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.lang.reflect.Field;
import java.net.Socket;
import java.security.SecureRandom;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
import java.util.List;
import java.util.regex.Pattern;

import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLEngine;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509ExtendedTrustManager;

import com.jq.diary.entity.BaseEntity;
import com.jq.diary.entity.Contact;

public class Utilities {
	public static final Pattern EMAIL = Pattern.compile("([A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,6})",
			Pattern.CASE_INSENSITIVE);
	private static final SSLContext sslContext;
	static {
		try {
			sslContext = SSLContext.getInstance("SSL");
			sslContext.init(null, new TrustManager[] { new X509ExtendedTrustManager() {
				@Override
				public java.security.cert.X509Certificate[] getAcceptedIssuers() {
					return new java.security.cert.X509Certificate[0];
				}

				@Override
				public void checkServerTrusted(final java.security.cert.X509Certificate[] chain, final String authType)
						throws CertificateException {
				}

				@Override
				public void checkClientTrusted(final X509Certificate[] chain, final String authType)
						throws CertificateException {
				}

				@Override
				public void checkClientTrusted(final X509Certificate[] chain, final String authType,
						final Socket socket) throws CertificateException {
				}

				@Override
				public void checkServerTrusted(final X509Certificate[] chain, final String authType,
						final Socket socket) throws CertificateException {
				}

				@Override
				public void checkClientTrusted(final X509Certificate[] chain, final String authType,
						final SSLEngine engine) throws CertificateException {
				}

				@Override
				public void checkServerTrusted(final X509Certificate[] chain, final String authType,
						final SSLEngine engine) throws CertificateException {
				}
			} }, new SecureRandom());
		} catch (final Exception ex) {
			throw new RuntimeException(ex);
		}
	}

	public static boolean isEmail(final String email) {
		return EMAIL.matcher(email).replaceAll("").length() == 0;
	}

	public static String generatePin(final int length) {
		final StringBuilder s = new StringBuilder();
		char c;
		while (s.length() < length) {
			c = (char) (Math.random() * 150);
			if ((c >= '0' && c <= '9') || (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z'))
				s.append(c);
		}
		return s.toString();
	}

	public static String trim(String s, final int length) {
		if (s != null)
			s = s.replaceAll("\r", "").replaceAll("\n\n", "\n").trim();
		return s != null && s.length() > length ? s.substring(0, length - 1) + "…" : s;
	}

	public static String stackTraceToString(final Throwable ex) {
		if (ex == null)
			return "";
		final ByteArrayOutputStream baos = new ByteArrayOutputStream();
		ex.printStackTrace(new PrintStream(baos));
		String s = new String(baos.toByteArray());
		if (s.indexOf(ex.getClass().getName()) < 0)
			s = ex.getClass().getName() + ": " + s;
		return s.replaceAll("\r", "").replaceAll("\n\n", "\n");
	}

	public static <T> T filter(final T data) {
		if (data instanceof Contact) {
			((Contact) data).setEmail(null);
			((Contact) data).setLoginLink(null);
			((Contact) data).setPassword(null);
			((Contact) data).setPasswordReset(null);
		} else if (data instanceof List) {
			for (final Object element : (List<?>) data)
				Utilities.filter(element);
		} else if (data != null) {
			for (final Field field : data.getClass().getDeclaredFields()) {
				if (BaseEntity.class.equals(field.getType().getGenericSuperclass())) {
					field.setAccessible(true);
					try {
						Utilities.filter(field.get(data));
					} catch (final Exception e) {
						throw new RuntimeException(e);
					}
				}
			}
		}
		return data;
	}
}