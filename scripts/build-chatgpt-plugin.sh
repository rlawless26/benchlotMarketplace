#!/usr/bin/env sh
# Zip the ChatGPT plugin package for upload at https://platform.openai.com/plugins
# Output: dist/benchlot-chatgpt-plugin.zip (paths relative to the plugin root).
set -eu
cd "$(dirname "$0")/../chatgpt-plugin"
mkdir -p ../dist
rm -f ../dist/benchlot-chatgpt-plugin.zip
grep -q REPLACE_WITH_REVIEWER_ACCESSIBLE_VIDEO_URL plugin.json && echo "warning: demo_recording_url is still a placeholder" >&2
zip -q -r ../dist/benchlot-chatgpt-plugin.zip plugin.json mcp.json assets -x '*.DS_Store'
echo "wrote dist/benchlot-chatgpt-plugin.zip"; unzip -l ../dist/benchlot-chatgpt-plugin.zip
