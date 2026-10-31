"""
Celery tasks for LoksewaAI marketplace.
Automatically discovered by Celery application (backend.celery:app).
"""

import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    ignore_result=True,
    name='marketplace.tasks.dispatch_order_courier_shipment'
)
def dispatch_order_courier_shipment_task(self, order_id: int):
    """
    Celery background task to execute automated NCM courier dispatch.
    """
    from marketplace.dispatch_service import execute_ncm_dispatch
    logger.info("Executing Celery NCM courier dispatch task for Order #%s", order_id)
    return execute_ncm_dispatch(order_id, celery_task=self)

