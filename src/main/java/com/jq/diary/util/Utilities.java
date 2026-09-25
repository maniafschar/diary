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
import java.security.SecureRandom;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
import java.util.List;
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
}