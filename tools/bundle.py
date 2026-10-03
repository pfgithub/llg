#!/usr/bin/env python3
"""Inline style.css and the scripts into one self-contained HTML file."""
import re
import sys

html = open('index.html').read()
body = html.split('<body>')[1].split('</body>')[0]
scripts = re.findall(r'<script src="([^"]+)"></script>', body)
body = re.sub(r'<script src="[^"]+"></script>\n?', '', body)
css = open('style.css').read().replace(':root {', ':root {\n  color-scheme: dark;', 1)
js = '\n'.join(open(f).read() for f in scripts)
out = f'<title>·</title>\n<meta name="theme-color" content="#26252c">\n<style>\n{css}\n</style>\n{body}\n<script>\n{js}\n</script>\n'
open(sys.argv[1] if len(sys.argv) > 1 else 'bundle.html', 'w').write(out)
