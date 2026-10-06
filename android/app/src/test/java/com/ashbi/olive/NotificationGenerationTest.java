package com.ashbi.olive;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class NotificationGenerationTest {
    @Test
    public void stopInvalidatesAnInFlightStart() {
        NotificationGeneration generation = new NotificationGeneration();
        int pendingStart = generation.begin();
        assertTrue(generation.isCurrent(pendingStart));

        generation.invalidate();
        assertFalse(generation.isCurrent(pendingStart));
    }

    @Test
    public void newerStartSupersedesOlderPermissionCallback() {
        NotificationGeneration generation = new NotificationGeneration();
        int firstStart = generation.begin();
        int secondStart = generation.begin();
        assertFalse(generation.isCurrent(firstStart));
        assertTrue(generation.isCurrent(secondStart));
    }
}
