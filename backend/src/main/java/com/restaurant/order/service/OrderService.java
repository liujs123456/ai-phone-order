package com.restaurant.order.service;

import com.restaurant.order.dto.OrderRequest;
import com.restaurant.order.model.CustomerOrder;
import com.restaurant.order.model.MenuItem;
import com.restaurant.order.model.OrderItem;
import com.restaurant.order.repository.CustomerOrderRepository;
import com.restaurant.order.repository.MenuItemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

@Service
public class OrderService {

    private static final Set<String> ALLOWED_STATUSES =
            Set.of("PENDING", "COOKING", "READY", "COMPLETED", "CANCELLED");

    private final CustomerOrderRepository orderRepo;
    private final MenuItemRepository menuRepo;

    public OrderService(CustomerOrderRepository orderRepo, MenuItemRepository menuRepo) {
        this.orderRepo = orderRepo;
        this.menuRepo = menuRepo;
    }

    @Transactional
    public CustomerOrder placeOrder(OrderRequest req) {
        if (req.items() == null || req.items().isEmpty()) {
            throw new IllegalArgumentException("Order must include at least one item.");
        }

        CustomerOrder order = new CustomerOrder();
        order.setCustomerName(req.customerName());
        order.setCustomerPhone(req.customerPhone());

        BigDecimal total = BigDecimal.ZERO;
        for (OrderRequest.Line line : req.items()) {
            MenuItem item = menuRepo.findById(line.menuItemId())
                    .orElseThrow(() -> new IllegalArgumentException("Menu item not found: " + line.menuItemId()));
            if (!item.isAvailable()) {
                throw new IllegalArgumentException("Item unavailable: " + item.getName());
            }
            int qty = Math.max(1, line.quantity());

            OrderItem oi = new OrderItem();
            oi.setMenuItem(item);
            oi.setQuantity(qty);
            oi.setUnitPrice(item.getPrice());
            oi.setNote(line.note());
            order.addItem(oi);

            total = total.add(item.getPrice().multiply(BigDecimal.valueOf(qty)));
        }
        order.setTotalPrice(total);
        return orderRepo.save(order);
    }

    @Transactional(readOnly = true)
    public List<CustomerOrder> findAll() {
        List<CustomerOrder> orders = orderRepo.findAll();
        orders.forEach(o -> o.getItems().size()); // force-init the lazy collection
        return orders;
    }

    @Transactional(readOnly = true)
    public CustomerOrder findById(Long id) {
        CustomerOrder order = orderRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + id));
        order.getItems().size();
        return order;
    }

    @Transactional
    public CustomerOrder updateStatus(Long id, String status) {
        String normalized = status == null ? "" : status.trim().toUpperCase();
        if (!ALLOWED_STATUSES.contains(normalized)) {
            throw new IllegalArgumentException(
                    "Invalid status. Allowed: " + ALLOWED_STATUSES);
        }
        CustomerOrder order = findById(id);
        order.setStatus(normalized);
        return orderRepo.save(order);
    }

    @Transactional
    public void cancel(Long id) {
        CustomerOrder order = findById(id);
        if ("COMPLETED".equals(order.getStatus())) {
            throw new IllegalStateException("Cannot cancel a completed order.");
        }
        order.setStatus("CANCELLED");
        orderRepo.save(order);
    }
}
