#!/usr/bin/env python
"""
Django development server runner for local network sharing.
This script runs the Django server on all network interfaces (0.0.0.0)
so it can be accessed by other devices on the local network.

Usage:
    python run_server.py [port]
    
    Default port is 8000
"""

import os
import sys
import socket
from pathlib import Path

# Add the backend directory to the Python path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

# Set Django settings module before importing Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

def get_local_ip():
    """Get the local IP address of this machine."""
    try:
        # Connect to a remote address to determine local IP
        # This doesn't actually send data, just determines the route
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        # Fallback to localhost if we can't determine IP
        return "127.0.0.1"

def main():
    """Run the Django development server on localhost only.
    
    The backend runs on localhost and is accessed by the frontend via Vite proxy.
    The frontend is shared on the network, and it proxies API requests to this backend.
    """
    # Get port from command line or use default
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    
    print("=" * 60)
    print("Django Development Server - Localhost Mode")
    print("=" * 60)
    print(f"\nBackend server running on:")
    print(f"  http://127.0.0.1:{port}")
    print(f"  http://localhost:{port}")
    print(f"\nAPI endpoint:")
    print(f"  http://localhost:{port}/api")
    print("\nNote: Backend is only accessible locally.")
    print("      Frontend will proxy API requests to this server.")
    print("\n" + "=" * 60)
    print("Starting server...")
    print("Press CTRL+C to stop the server")
    print("=" * 60 + "\n")
    
    try:
        from django.core.management import execute_from_command_line
        # Run on localhost only (127.0.0.1)
        execute_from_command_line(['manage.py', 'runserver', f'127.0.0.1:{port}'])
    except KeyboardInterrupt:
        print("\n\nServer stopped by user.")
        sys.exit(0)
    except ImportError as e:
        print(f"\nError: Could not import Django. Make sure you're in a virtual environment")
        print(f"and Django is installed. Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\nError starting server: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()

