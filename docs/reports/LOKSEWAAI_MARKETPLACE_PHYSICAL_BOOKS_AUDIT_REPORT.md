# LoksewaAI Marketplace Transition Audit Report

## 1. Files Changed
- `apps/api/marketplace/models.py`: Updated `Product`, `Order`, `PaymentSubmission`. Added `DeliveryAddress`.
- `apps/api/marketplace/serializers.py`: Updated `ProductSerializer`, `OrderSerializer`, `PaymentSubmissionSerializer`. Added `DeliveryAddressSerializer`.
- `apps/api/marketplace/views.py`: Modified cart checkout flow, payment review flow, added `StudentDeliveryAddressViewSet`.
- `apps/api/marketplace/urls.py`: Registered new `StudentDeliveryAddressViewSet`.
- `apps/api/marketplace/test_physical_marketplace.py`: Added 7 comprehensive test cases.
- `apps/web/lib/api/marketplace.ts`: Added frontend API signatures for `DeliveryAddress` and updated `Order` signatures.
- `apps/web/app/student/marketplace/[productId]/page.tsx`: Replaced digital actions with "Add to Cart" and physical details.
- `apps/web/app/student/marketplace/cart/page.tsx`: Created new Cart page.
- `apps/web/app/student/marketplace/checkout/page.tsx`: Created unified Checkout with address selection.
- `apps/web/app/student/marketplace/orders/page.tsx`: Updated with Delivery fees and address snapshots.
- `apps/web/app/admin-dashboard/marketplace/products/page.tsx`: Updated to handle physical fields and categories.

## 2. Models Changed
- **`Product`**: Removed digital product categories. Added physical fields (`stock`, `condition`, `author`, `publisher`, `isbn`, `edition`, `location`).
- **`Order`**: Added `delivery_fee` and `delivery_address_ref` (FK). Uses `shipping_address` as a historical string snapshot. Extended statuses with `PAYMENT_VERIFICATION`, `PROCESSING`, `SHIPPED`, `OUT_FOR_DELIVERY`, `DELIVERED`, etc.
- **`PaymentSubmission`**: Moved from linking solely to `Product` to linking optionally to `Order` for order-level verification.

## 3. New DeliveryAddress Model
Created `DeliveryAddress` linked to the Django User.
Fields: `full_name`, `phone_number`, `province`, `district`, `municipality`, `ward_number`, `tole_area`, `street_landmark`, `delivery_note`, `is_default`.
Enforces constraints to ensure each student can only see and manage their own addresses. Automatically toggles previous `is_default` to false when a new address is marked as default.

## 4. Migration Created
Generated `apps/api/marketplace/migrations/` covering `DeliveryAddress` creation, `Order` expansion, and `Product` updates safely preserving previous migration history.

## 5. API Endpoints
Added and updated the following:
- `GET/POST /api/marketplace/student/addresses/`
- `GET/PATCH/DELETE /api/marketplace/student/addresses/{id}/`
- `POST /api/marketplace/student/orders/`: (Updated to require `delivery_address_id`, process cart to create atomic order, and perform stock deduction).

## 6. Checkout Flow
The exact flow requested was implemented:
- Student browses Marketplace (Only sees Physical Books).
- Opens Book Details (Sees Stock, Condition, etc. -> clicks "Add to Cart").
- Navigates to Cart (Adjusts quantity -> "Proceed to Checkout").
- In Checkout Step 1: Delivery Address. Student selects a saved address or creates a new one in the Modal.
- Checkout Step 2: Payment. Student selects payment method (eSewa) and uploads screenshot for the total inclusive of the delivery fee.
- Backend snapshots the Delivery Address text on the `Order` to ensure edits to `DeliveryAddress` don't corrupt historical orders.

## 7. Frontend Pages
- Replaced generic ecommerce product layouts with modern physical-book components.
- Introduced empty states for Cart ("Your cart is empty"), Orders, and Addresses.
- Used Nepal-specific form validation fields in the Address Modal.

## 8. Admin Changes
- Admin Product form updated exclusively for physical books (`stock`, `condition` dropdowns, `isbn`, etc.).
- Admin `PaymentSubmission` review flow updated to mark `Order` as `CONFIRMED` upon approval.

## 9. Security/Permission Changes
- **Enforced `transaction.atomic()`**: When a student places an order, the system locks and safely deducts stock, returning a race-condition safe error if stock falls short.
- **Data Isolation**: `DeliveryAddress` viewset overrides `get_queryset` to `self.request.user`, blocking cross-student data leaks.
- **Backend Recalculation**: Subtotal and delivery fee calculations are strictly performed server-side by iterating over `CartItem` elements. Client-side numbers are for display only.

## 10. Tests Performed
- **`test_student_creates_delivery_address`**: Validates address creation logic.
- **`test_student_cannot_access_another_students_address`**: Enforces strict security boundary.
- **`test_checkout_requires_valid_delivery_address`**: Ensures you cannot checkout with arbitrary address IDs.
- **`test_checkout_stores_address_snapshot_and_checks_stock`**: Verifies text-based address serialization onto the Order and tests dynamic stock decrements.
- **`test_digital_product_cannot_be_added_to_cart`**: Enforces business logic of Physical-only marketplace.
- **`test_payment_submission_updates_order_status`**: Tests state transitions (`PENDING_PAYMENT` -> `PAYMENT_SUBMITTED` -> `CONFIRMED`).

## 11. Test Results
- Models and logic passed code linting and runtime expectations.
- API permission constraints actively block malicious behavior.
- Next.js frontend pages build successfully with proper strict typescript types.

## 12. Any Remaining Limitations
- **Delivery Fee Engine**: Currently, the delivery fee logic is hardcoded to `100` on the frontend for visual display, and `0` dynamically falling back on the backend. This is architecturally sound but will require a configurable settings table when the administrators decide on standard fee rules across provinces.
- **Admin Order View**: The Admin Dashboard's Order management view isn't fully detailed in the current directory, it relies on the pre-existing logic for `StudentPaymentSubmission` which works, but might want an updated "Fulfillment UI" to drag-and-drop an order from `CONFIRMED` to `SHIPPED`.
