package com.restaurant.order.dto;

import java.util.List;

public record OrderRequest(
        String customerName,
        String customerPhone,
        List<Line> items
) {
    public record Line(Long menuItemId, int quantity, String note) {}
}
