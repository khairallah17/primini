#!/usr/bin/env python
import os
import sys
import warnings

# Suppress deprecation warnings from dj_rest_auth
warnings.filterwarnings('ignore', category=UserWarning, module='dj_rest_auth')


def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'primini_backend.settings')
    from django.core.management import execute_from_command_line
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
