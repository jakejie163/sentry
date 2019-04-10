from __future__ import absolute_import

from sentry import analytics


class SentryAppDeletedEvent(analytics.Event):
    type = 'sentry_app.deleted'

    attributes = (
        analytics.Attribute('user_id'),
        analytics.Attribute('sentry_app'),
    )


analytics.register(SentryAppDeletedEvent)
