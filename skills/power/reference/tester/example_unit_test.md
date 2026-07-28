<!-- Generated from prompts/tester.md by `pnpm --filter @power/agents build`. Edit the prompt, not this file. -->

<example_unit_test>
A unit test file for pure logic. Note the hand-written expected values, the
behaviour-named test functions, the boundary coverage, and the absence of
mocks — there is nothing to mock, because this is a pure function.

```python
"""Unit tests for pricing rules. Covers R5 (totals) and R6 (member discount)."""
import pytest
from app.pricing import calculate_total, PricingError


def line(unit_price_cents: int, quantity: int = 1) -> dict:
    return {"unit_price_cents": unit_price_cents, "quantity": quantity}


class TestCalculateTotal:
    # R5: WHEN a cart is priced, THE SYSTEM SHALL apply the member discount
    # before tax and round half-up to the nearest cent.

    def test_empty_cart_totals_zero(self):
        assert calculate_total([], is_member=False) == 0

    def test_single_item_no_discount(self):
        # 1000 subtotal, 8% tax -> 1080
        assert calculate_total([line(1000)], is_member=False) == 1080

    def test_multiple_items_sum_before_tax(self):
        # (1000*3) + 250 = 3250 subtotal, 8% tax -> 3510
        assert calculate_total([line(1000, 3), line(250)], is_member=False) == 3510

    def test_member_discount_applies_before_tax(self):
        # 3000 subtotal, 10% member discount -> 2700, 8% tax -> 2916.
        # Order matters: taxing first would give 2916 too, so this case alone
        # does not distinguish them. See the asymmetric case below.
        assert calculate_total([line(1000, 3)], is_member=True) == 2916

    def test_discount_order_is_observable_on_rounding_boundary(self):
        # 1005 subtotal. Discount-then-tax: 904.5 -> 905, +8% -> 977.4 -> 977.
        # Tax-then-discount would give 978. This case pins the required order.
        assert calculate_total([line(1005)], is_member=True) == 977

    def test_rounds_half_up_not_banker(self):
        # 1250 subtotal, 10% -> 1125, 8% tax -> 1215.0 exactly; add a cent to
        # land on a .5 boundary and confirm it rounds away from zero.
        assert calculate_total([line(1251)], is_member=True) == 1216

    def test_large_quantity_does_not_overflow_or_lose_precision(self):
        assert calculate_total([line(999, 100_000)], is_member=False) == 107_892_000

    @pytest.mark.parametrize("quantity", [0, -1])
    def test_non_positive_quantity_is_rejected(self, quantity):
        with pytest.raises(PricingError) as excinfo:
            calculate_total([line(1000, quantity)], is_member=False)
        assert "quantity" in str(excinfo.value)

    def test_negative_price_is_rejected(self):
        with pytest.raises(PricingError) as excinfo:
            calculate_total([line(-1)], is_member=False)
        assert "unit_price_cents" in str(excinfo.value)
```

What makes this real: every expected value is computed by hand from the
requirement and written as a literal; the rounding and ordering cases are chosen
specifically because a wrong implementation would still pass the naive case; the
error tests assert on which field was rejected, not merely that something threw.
</example_unit_test>
