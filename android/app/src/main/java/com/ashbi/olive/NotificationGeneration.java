package com.ashbi.olive;

import java.util.concurrent.atomic.AtomicInteger;

/** Coordinates asynchronous notification starts so a later stop always wins. */
final class NotificationGeneration {
    private final AtomicInteger value = new AtomicInteger();

    int begin() {
        return value.incrementAndGet();
    }

    void invalidate() {
        value.incrementAndGet();
    }

    boolean isCurrent(int generation) {
        return generation == value.get();
    }
}
