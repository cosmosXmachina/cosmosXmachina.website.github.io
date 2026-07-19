package it.cosmosxmachina.lab;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class PricingPolicyTest {
    private final PricingPolicy policy = new PricingPolicy();

    @Test
    void goldCustomerReceivesExplicitDiscount() {
        assertThat(policy.quote(new BigDecimal("189.00"), 20, PricingPolicy.CustomerTier.GOLD))
                .isEqualByComparingTo("3477.60");
    }

    @Test
    void standardCustomerKeepsListPrice() {
        assertThat(policy.quote(new BigDecimal("96.00"), 4, PricingPolicy.CustomerTier.STANDARD))
                .isEqualByComparingTo("384.00");
    }

    @Test
    void invalidQuantityIsRejectedAtTheBoundary() {
        assertThatThrownBy(() -> policy.quote(new BigDecimal("96.00"), 0, PricingPolicy.CustomerTier.STANDARD))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
