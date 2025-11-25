#!/usr/bin/env python
"""
Quick script to get your local network IP address.
This is the IP address you should share with your colleagues.
"""

import socket

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

if __name__ == '__main__':
    ip = get_local_ip()
    port = 8000
    
    print("=" * 60)
    print("Your Local Network IP Address")
    print("=" * 60)
    print(f"\nShare this IP address with your colleagues:")
    print(f"  {ip}:{port}")
    print(f"\nFull URLs:")
    print(f"  Backend API:  http://{ip}:{port}/api")
    print(f"  Backend Root: http://{ip}:{port}")
    print("\n" + "=" * 60)
    print("\nNote: Make sure you run 'python run_server.py' to start the server")
    print("      and that your firewall allows connections on port 8000")
    print("=" * 60)

