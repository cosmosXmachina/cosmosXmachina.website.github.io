package it.cosmosxmachina.lab;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class PricingPolicy {
    public BigDecimal quote(BigDecimal unitPrice, int quantity, CustomerTier tier) {
        if (unitPrice.signum() < 0 || quantity <= 0) {
            throw new IllegalArgumentException("Price and quantity must be positive");
        }
        BigDecimal discount = tier == CustomerTier.GOLD
                ? new BigDecimal("0.08")
                : BigDecimal.ZERO;
        return unitPrice
                .multiply(BigDecimal.valueOf(quantity))
                .multiply(BigDecimal.ONE.subtract(discount))
                .setScale(2, RoundingMode.HALF_UP);
    }

    public enum CustomerTier {
        STANDARD,
        GOLD
    }
}
