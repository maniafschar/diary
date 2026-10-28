package com.jq.diary.util;

import java.awt.Graphics2D;
import java.awt.geom.AffineTransform;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.PrintStream;
import java.lang.reflect.Field;
import java.net.Socket;
import java.net.URI;
import java.security.SecureRandom;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.imageio.ImageIO;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLEngine;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509ExtendedTrustManager;

import org.bytedeco.javacv.FFmpegFrameGrabber;
import org.bytedeco.javacv.Frame;
import org.bytedeco.javacv.Java2DFrameConverter;

import com.jq.diary.entity.BaseEntity;
import com.jq.diary.entity.Contact;

public class Utilities {
	private static final int MAX_CHARS = 6000;
	private static final String ATTRS = "(?:[^>\"']|\"[^\"]*\"|'[^']*')*";
	private static final Pattern IGNORED = Pattern
			.compile("(?is)<!--.*?-->|<(script|style|noscript|template|\\!doctype)" + ATTRS + ">.*?</\\1\\s*>",
					Pattern.CASE_INSENSITIVE);
	private static final Pattern ANCHOR = Pattern.compile("(?is)<a\\b(" + ATTRS + ")>(.*?)</a\\s*>");
	private static final Pattern HREF = Pattern
			.compile("(?i)\\bhref\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s\"'>]+))");
	public static final int MAX_TEXT_LENGTH = 65000;
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

	public static byte[] scaleImage(final byte[] data, final int size) {
		try {
			final BufferedImage originalImage = ImageIO.read(new ByteArrayInputStream(data));
			int width = originalImage.getWidth();
			int height = originalImage.getHeight();
			if (width > height) {
				height = height * size / width;
				width = size;
			} else {
				width = width * size / height;
				height = size;
			}
			final BufferedImage resizedImage = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
			final Graphics2D g = resizedImage.createGraphics();
			g.drawImage(originalImage, 0, 0, width, height, 0, 0, originalImage.getWidth(), originalImage.getHeight(),
					null);
			resizedImage.flush();
			g.dispose();
			final ByteArrayOutputStream out = new ByteArrayOutputStream();
			ImageIO.write(resizedImage, "jpg", out);
			return out.toByteArray();
		} catch (final IOException ex) {
			throw new RuntimeException(ex);
		}
	}

	public static byte[] createVideoThumbnail(final String path) throws IOException {
		try (FFmpegFrameGrabber grabber = new FFmpegFrameGrabber(new File(path));
				Java2DFrameConverter converter = new Java2DFrameConverter()) {
			grabber.start();
			final Frame frame = grabber.grabImage();
			if (frame == null)
				throw new IllegalArgumentException("No video frame");
			BufferedImage bufferedImage = converter.convert(frame);
			if (bufferedImage == null)
				throw new IllegalArgumentException("No video frame");
			bufferedImage = rotateImage(bufferedImage, grabber.getDisplayRotation());
			final ByteArrayOutputStream out = new ByteArrayOutputStream();
			ImageIO.write(bufferedImage, "jpg", out);
			return out.toByteArray();
		} catch (final FFmpegFrameGrabber.Exception ex) {
			throw new IOException("Unable to decode video: " + path, ex);
		}
	}

	private static BufferedImage rotateImage(final BufferedImage image, final double rotation) {
		final int normalizedRotation = ((int) Math.round(rotation) % 360 + 360) % 360;
		if (normalizedRotation == 0)
			return image;
		final boolean quarterTurn = normalizedRotation == 90 || normalizedRotation == 270;
		final BufferedImage rotated = new BufferedImage(quarterTurn ? image.getHeight() : image.getWidth(),
				quarterTurn ? image.getWidth() : image.getHeight(),
				image.getType() == 0 ? BufferedImage.TYPE_INT_ARGB : image.getType());
		final Graphics2D graphics = rotated.createGraphics();
		try {
			final AffineTransform transform = new AffineTransform();
			transform.translate(rotated.getWidth() / 2.0, rotated.getHeight() / 2.0);
			// FFmpeg reports display rotation clockwise, while Java2D rotates
			// counter-clockwise. For positive angle values, so the sign must be
			// inverted to keep the frame upright.
			transform.rotate(Math.toRadians(-normalizedRotation));
			transform.translate(-image.getWidth() / 2.0, -image.getHeight() / 2.0);
			graphics.drawImage(image, transform, null);
		} finally {
			graphics.dispose();
		}
		return rotated;
	}

	public static String markDown(final String html, final URI baseUrl) {
		String converted = replaceLinks(html, baseUrl);
		converted = convertBlockquote(convertOl(converted));
		converted = replaceIgnoreCase(converted, "<p>", "\n");
		converted = replaceIgnoreCase(converted, "</p>", "\n");
		converted = replaceIgnoreCase(converted, "><(strong|b)>", "> **");
		converted = replaceIgnoreCase(converted, "</(strong|b)><", "** <");
		converted = replaceIgnoreCase(converted, "</?(strong|b)>", "**");
		converted = replaceIgnoreCase(converted, "><(em|i)>", "> _");
		converted = replaceIgnoreCase(converted, "</(em|i)><", "_ <");
		converted = replaceIgnoreCase(converted, "</?(em|i)>", "_");
		converted = replaceIgnoreCase(converted, "</?ul>", "\n");
		converted = replaceIgnoreCase(converted, "<li>", "* ");
		converted = replaceIgnoreCase(converted, "</li>", "");
		converted = replaceIgnoreCase(converted, "<h1\\s+id=\"([-\\w]+)\">(.*?)</h1>", "\n# $2 {#$1}\n");
		converted = replaceIgnoreCase(converted, "<h2\\s+id=\"([-\\w]+)\">(.*?)</h2>", "\n## $2 {#$1}\n");
		converted = replaceIgnoreCase(converted, "<h3\\s+id=\"([-\\w]+)\">(.*?)</h3>", "\n### $2 {#$1}\n");
		converted = replaceIgnoreCase(converted, "<h4\\s+id=\"([-\\w]+)\">(.*?)</h4>", "\n#### $2 {#$1}\n");
		converted = replaceIgnoreCase(converted, "<h5\\s+id=\"([-\\w]+)\">(.*?)</h5>", "\n##### $2 {#$1}\n");
		converted = replaceIgnoreCase(converted, "<h6\\s+id=\"([-\\w]+)\">(.*?)</h6>", "\n###### $2 {#$1}\n");
		converted = replaceHeadingTags(converted);
		converted = replaceIgnoreCase(converted, "</h[123456]>", "\n");
		converted = replaceIgnoreCase(converted, "<hr\\s*/?>", "\n- - -\n");
		converted = replaceIgnoreCase(converted, "\\s*<table[^>]*>", "\n\n");
		converted = replaceIgnoreCase(converted, "\\s*<colgroup([^>]*)>.*?</colgroup>\\s*", "");
		converted = replaceIgnoreCase(converted, "\\s*</?thead([^>]*)>\\s*", "");
		converted = replaceIgnoreCase(converted, "\\s*</?tbody([^>]*)>\\s*", "");
		converted = replaceIgnoreCase(converted, "\\s*<tr>\\s*<th>", "\n");
		converted = replaceIgnoreCase(converted, "</th>\\s*<th>", " | ");
		converted = replaceIgnoreCase(converted, "</th>\\s*</tr>", "\n - | -\n");
		converted = replaceIgnoreCase(converted, "\\s*<tr>\\s*<td>", "\n");
		converted = replaceIgnoreCase(converted, "</td>\\s*<td>", " | ");
		converted = replaceIgnoreCase(converted, "</td>\\s*</tr>", "");
		converted = replaceIgnoreCase(converted, "\\s*</table>", "\n");
		converted = replaceIgnoreCase(converted, "</?font[^>]*>", "");
		converted = replaceIgnoreCase(converted, "<br ?/?>", "  \n");
		converted = replaceIgnoreCase(converted, "</?[a-z][^>]*>|<!doctype[^>]*>", "");
		converted = converted.replaceAll("\\n{3,}", "\n\n");
		converted = converted.replaceAll("(^\\n+|\\n+$)", "");
		converted = decodeEntities(converted);
		return replaceWhitespace(converted);
	}

	private static String replaceLinks(final String html, final URI base) {
		final String withoutIgnored = IGNORED.matcher(html).replaceAll(" ").trim();
		final Matcher anchors = ANCHOR.matcher(withoutIgnored);
		final StringBuilder withLinks = new StringBuilder();
		while (anchors.find()) {
			final String href = link(anchors.group(1), base);
			final String label = anchors.group(2);
			anchors.appendReplacement(withLinks,
					Matcher.quoteReplacement(
							href == null ? label : "[" + label.replace('\n', ' ').trim() + "](" + href.trim() + ")"));
		}
		anchors.appendTail(withLinks);
		return withLinks.toString();
	}

	private static String link(final String attributes, final URI base) {
		final Matcher href = HREF.matcher(attributes);
		if (!href.find())
			return null;
		String raw = href.group(1) != null ? href.group(1) : href.group(2) != null ? href.group(2) : href.group(3);
		raw = decodeEntities(raw).trim();
		if (raw.isEmpty() || raw.startsWith("#") || raw.regionMatches(true, 0, "javascript:", 0, 11))
			return null;
		try {
			return base == null ? raw : base.resolve(raw).toString();
		} catch (final IllegalArgumentException ex) {
			return raw;
		}
	}

	private static String decodeEntities(final String text) {
		return text.replace("&nbsp;", " ").replace("&quot;", "\"").replace("&#39;", "'").replace("&#x27;", "'")
				.replace("&apos;", "'").replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&");
	}

	private static String replaceIgnoreCase(final String input, final String regex, final String replacement) {
		return Pattern.compile(regex, Pattern.CASE_INSENSITIVE | Pattern.MULTILINE).matcher(input)
				.replaceAll(replacement);
	}

	private static String replaceHeadingTags(final String input) {
		return Pattern.compile("<h([1-6])(?:\\s[^>]*)?>", Pattern.CASE_INSENSITIVE).matcher(input)
				.replaceAll(m -> "\n" + "#".repeat(Integer.parseInt(m.group(1))) + " ");
	}

	private static String replaceWhitespace(String text) {
		text = text.replaceAll("\t", " ");
		while (text.contains("  "))
			text = text.replaceAll("  ", " ");
		while (text.contains("\n \n"))
			text = text.replaceAll("\n \n", "\n");
		while (text.contains("\n\n"))
			text = text.replaceAll("\n\n", "\n");
		return text.trim();
	}

	private static String convertOl(final String str) {
		String r = str;
		final Pattern pat = Pattern.compile("<ol>([\\s\\S]*?)</ol>", Pattern.CASE_INSENSITIVE | Pattern.MULTILINE);
		final Pattern lipat = Pattern.compile("<li>", Pattern.CASE_INSENSITIVE);
		while (true) {
			final Matcher m = pat.matcher(r);
			if (!m.find())
				return r;
			final String mat = m.group(1).replaceAll("(?i)</li>", "");
			final Matcher li = lipat.matcher(mat);
			final StringBuilder numbered = new StringBuilder();
			for (int c = 1; li.find(); c++)
				li.appendReplacement(numbered, c + ". ");
			li.appendTail(numbered);
			r = r.substring(0, m.start()) + "\n" + numbered + "\n" + r.substring(m.end());
		}
	}

	private static String convertBlockquote(final String str) {
		String r = str;
		final Pattern pat = Pattern.compile("<blockquote>\\n?([\\s\\S]*?)\\n?</blockquote>",
				Pattern.CASE_INSENSITIVE | Pattern.MULTILINE);
		while (true) {
			final Matcher m = pat.matcher(r);
			if (!m.find())
				return r;
			String mat = m.group(1).replace("\n", "\n> ");
			mat = replaceIgnoreCase(mat, "<p>", "\n> ");
			mat = replaceIgnoreCase(mat, "</p>", "\n> \n> ");
			mat = mat.replaceAll("(\\n> ?){3,}", "\n> \n> ");
			r = r.substring(0, m.start()) + "\n" + mat + "\n" + r.substring(m.end());
		}
	}
}