package com.restaurant.order.repository;

import com.restaurant.order.model.MenuItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MenuItemRepository extends JpaRepository<MenuItem, Long> {

    List<MenuItem> findByAvailableTrue();

    List<MenuItem> findByCategoryIgnoreCaseAndAvailableTrue(String category);

    @Query("""
            SELECT m FROM MenuItem m
            WHERE m.available = true
              AND (
                LOWER(m.name) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(COALESCE(m.nameCn, '')) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(COALESCE(m.description, '')) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(m.category) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            """)
    List<MenuItem> search(@Param("q") String q);
}
