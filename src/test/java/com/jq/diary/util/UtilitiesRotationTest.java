package com.jq.diary.util;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.awt.Graphics2D;
import java.awt.geom.AffineTransform;
import java.awt.image.BufferedImage;
import java.lang.reflect.Method;

import org.junit.jupiter.api.Test;

class UtilitiesRotationTest {
	@Test
	void rotateImage90DegreesClockwisePreservesImageContent() throws Exception {
		final BufferedImage source = new BufferedImage(2, 3, BufferedImage.TYPE_INT_ARGB);
		source.setRGB(0, 0, 0xFFFF0000);
		source.setRGB(1, 0, 0xFF00FF00);
		source.setRGB(0, 1, 0xFF0000FF);
		source.setRGB(1, 1, 0xFFFFFF00);
		source.setRGB(0, 2, 0xFFFF00FF);
		source.setRGB(1, 2, 0xFF00FFFF);

		final BufferedImage rotated = invokeRotate(source, 90.0);

		assertEquals(3, rotated.getWidth());
		assertEquals(2, rotated.getHeight());

		final BufferedImage expected = new BufferedImage(3, 2, BufferedImage.TYPE_INT_ARGB);
		final Graphics2D g = expected.createGraphics();
		try {
			final AffineTransform transform = new AffineTransform();
			transform.translate(expected.getWidth() / 2.0, expected.getHeight() / 2.0);
			transform.rotate(Math.toRadians(-90));
			transform.translate(-source.getWidth() / 2.0, -source.getHeight() / 2.0);
			g.drawImage(source, transform, null);
		} finally {
			g.dispose();
		}

		for (int y = 0; y < rotated.getHeight(); y++) {
			for (int x = 0; x < rotated.getWidth(); x++) {
				assertEquals(expected.getRGB(x, y), rotated.getRGB(x, y),
						"Pixel mismatch at x=" + x + ", y=" + y);
			}
		}
	}

	private static BufferedImage invokeRotate(final BufferedImage image, final double rotation) throws Exception {
		final Method method = Utilities.class.getDeclaredMethod("rotateImage", BufferedImage.class, double.class);
		method.setAccessible(true);
		return (BufferedImage) method.invoke(null, image, rotation);
	}
}
