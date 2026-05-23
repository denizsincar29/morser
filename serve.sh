#!/bin/bash
# Simple local dev server — requires Python 3
cd "$(dirname "$0")"
echo "Serving Morser at http://localhost:8080"
python3 -m http.server 8080
