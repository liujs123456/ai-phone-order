package com.restaurant.order.service;

import com.restaurant.order.model.MenuItem;
import com.restaurant.order.repository.MenuItemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class MenuService {

    private final MenuItemRepository repo;

    public MenuService(MenuItemRepository repo) {
        this.repo = repo;
    }

    public List<MenuItem> all() {
        return repo.findByAvailableTrue();
    }

    public MenuItem byId(Long id) {
        return repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Menu item not found: " + id));
    }

    public List<MenuItem> byCategory(String category) {
        return repo.findByCategoryIgnoreCaseAndAvailableTrue(category);
    }

    public List<MenuItem> search(String query) {
        if (query == null || query.isBlank()) {
            return repo.findByAvailableTrue();
        }
        return repo.search(query.trim());
    }

    @Transactional
    public MenuItem create(MenuItem item) {
        item.setId(null);
        return repo.save(item);
    }

    @Transactional
    public MenuItem update(Long id, MenuItem patch) {
        MenuItem existing = byId(id);
        if (patch.getName() != null) existing.setName(patch.getName());
        if (patch.getNameCn() != null) existing.setNameCn(patch.getNameCn());
        if (patch.getDescription() != null) existing.setDescription(patch.getDescription());
        if (patch.getPrice() != null) existing.setPrice(patch.getPrice());
        if (patch.getCategory() != null) existing.setCategory(patch.getCategory());
        if (patch.getSpicyLevel() != null) existing.setSpicyLevel(patch.getSpicyLevel());
        existing.setAvailable(patch.isAvailable());
        return repo.save(existing);
    }

    @Transactional
    public void delete(Long id) {
        if (!repo.existsById(id)) {
            throw new IllegalArgumentException("Menu item not found: " + id);
        }
        repo.deleteById(id);
    }
}
