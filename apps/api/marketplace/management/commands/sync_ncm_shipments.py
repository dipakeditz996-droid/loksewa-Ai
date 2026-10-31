import logging
from django.core.management.base import BaseCommand
from marketplace.models import CourierShipment
from marketplace.ncm_service import NCMService, NCMError

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Synchronizes active Nepal Can Move (NCM) courier shipments with provider tracking."

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=50,
            help='Maximum number of shipments to synchronize in one execution (default: 50).'
        )
        parser.add_argument(
            '--order-id',
            type=int,
            default=None,
            help='Specific order ID to synchronize.'
        )

    def handle(self, *args, **options):
        limit = options.get('limit')
        order_id = options.get('order_id')

        qs = CourierShipment.objects.filter(provider='NCM').select_related('order')
        if order_id:
            qs = qs.filter(order_id=order_id)
        else:
            qs = qs.exclude(order__status__in=['DELIVERED', 'CANCELLED', 'REFUNDED']).order_by('last_synced_at')[:limit]

        shipments = list(qs)
        if not shipments:
            self.stdout.write(self.style.SUCCESS("No active NCM shipments to synchronize."))
            return

        self.stdout.write(f"Synchronizing {len(shipments)} active NCM courier shipment(s)...")

        ncm_service = NCMService()
        synced_count = 0
        transitioned_count = 0
        error_count = 0

        for shipment in shipments:
            try:
                tracking_data = ncm_service.track_order(shipment.ncm_order_id)
                new_courier_status = None
                history_list = None
                tracking_id = None

                if isinstance(tracking_data, dict):
                    new_courier_status = (
                        tracking_data.get('status') or
                        tracking_data.get('state') or
                        tracking_data.get('courier_status')
                    )
                    tracking_id = (
                        tracking_data.get('tracking_id') or
                        tracking_data.get('trackingid')
                    )
                    history_list = tracking_data.get('history') or tracking_data.get('timeline')
                elif isinstance(tracking_data, list):
                    history_list = tracking_data
                    if tracking_data:
                        new_courier_status = str(tracking_data[-1].get('status') or shipment.courier_status)

                status_changed = shipment.apply_status_update(
                    new_courier_status=str(new_courier_status) if new_courier_status else None,
                    history_list=history_list,
                    tracking_id=str(tracking_id) if tracking_id else None,
                    source="sync_ncm_shipments_command"
                )

                synced_count += 1
                if status_changed:
                    transitioned_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"Order #{shipment.order_id} (NCM #{shipment.ncm_order_id}) status transitioned to {shipment.order.status}"
                        )
                    )
                else:
                    self.stdout.write(
                        f"Order #{shipment.order_id} (NCM #{shipment.ncm_order_id}) status verified: {shipment.courier_status}"
                    )
            except NCMError as e:
                error_count += 1
                self.stderr.write(
                    self.style.WARNING(f"Failed to track NCM shipment #{shipment.ncm_order_id} (Order #{shipment.order_id}): {e}")
                )
            except Exception as e:
                error_count += 1
                logger.exception("Unexpected error syncing NCM shipment #%s", shipment.ncm_order_id)
                self.stderr.write(
                    self.style.ERROR(f"Unexpected error syncing shipment #{shipment.ncm_order_id}: {e}")
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Sync completed: {synced_count} synced, {transitioned_count} transitioned, {error_count} failed."
            )
        )

