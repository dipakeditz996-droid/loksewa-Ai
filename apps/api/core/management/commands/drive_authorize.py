"""One-time interactive OAuth authorization for the LoksewaAI Google Drive
storage account.

Run this ONCE, locally, by the actual Drive account owner:

    python manage.py drive_authorize

It opens a browser window for you to log into the Google account that should
own the storage, and approve access. It never asks for or sees your Google
password - Google handles that on its own page. On success, it prints a
refresh token to stdout for you (or whoever runs this) to place in
GOOGLE_DRIVE_REFRESH_TOKEN. The token is never written to any file this
command doesn't tell you about, and is never sent anywhere but your own
terminal.

Scope used: drive.file - the app can only see/manage files IT creates,
not your whole Drive. This is deliberate: it's the minimum permission that
still lets the app manage its own upload folder.
"""
import os
import sys

from django.core.management.base import BaseCommand, CommandError

SCOPES = ['https://www.googleapis.com/auth/drive.file']


class Command(BaseCommand):
    help = 'One-time OAuth authorization for the Google Drive storage account (run locally, interactively).'

    def handle(self, *args, **options):
        try:
            from google_auth_oauthlib.flow import InstalledAppFlow
        except ImportError:
            raise CommandError(
                'google-auth-oauthlib is not installed. Run: pip install google-auth-oauthlib'
            )

        client_id = os.environ.get('GOOGLE_DRIVE_CLIENT_ID', '').strip()
        client_secret = os.environ.get('GOOGLE_DRIVE_CLIENT_SECRET', '').strip()

        if not client_id or not client_secret:
            raise CommandError(
                'GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET must be set '
                'in your .env before running this command.'
            )

        client_config = {
            'installed': {
                'client_id': client_id,
                'client_secret': client_secret,
                'auth_uri': 'https://accounts.google.com/o/oauth2/auth',
                'token_uri': 'https://oauth2.googleapis.com/token',
                'redirect_uris': ['http://localhost'],
            }
        }

        flow = InstalledAppFlow.from_client_config(client_config, SCOPES)

        self.stdout.write(self.style.WARNING(
            '\nCopy the URL printed below into a browser YOU control, log into the '
            'Google account that should OWN this storage (your personal account, not '
            'a service account), and click Allow.\n'
        ))
        self.stdout.flush()

        credentials = flow.run_local_server(
            port=0,
            authorization_prompt_message='AUTHORIZE_URL_START\n{url}\nAUTHORIZE_URL_END',
            success_message='Authorization complete. You can close this tab and return to the terminal.',
            open_browser=False,
        )

        if not credentials.refresh_token:
            raise CommandError(
                'No refresh token was returned. This usually means this Google account '
                'already authorized this app before without revoking access. '
                'Go to https://myaccount.google.com/permissions, remove "LoksewaAI", '
                'and run this command again.'
            )

        self.stdout.write(self.style.SUCCESS('\nAuthorization successful.\n'))
        self.stdout.write('GOOGLE_DRIVE_REFRESH_TOKEN_START')
        self.stdout.write(credentials.refresh_token)
        self.stdout.write('GOOGLE_DRIVE_REFRESH_TOKEN_END\n')
        self.stdout.write(self.style.WARNING(
            'Copy the value between the markers above into GOOGLE_DRIVE_REFRESH_TOKEN in .env.\n'
            'This value is never logged or stored anywhere else by this command.'
        ))
