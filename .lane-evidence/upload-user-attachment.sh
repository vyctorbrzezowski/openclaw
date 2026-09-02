#!/usr/bin/env bash
set -euo pipefail

file=$1
name=$2
token=$(gh auth token)

exec curl --silent --show-error --fail-with-body \
  "https://uploads.github.com/user-attachments/assets?name=${name}&content_type=image/png&repository_id=1103012935" \
  --request POST \
  --header "Authorization: Bearer ${token}" \
  --header "Accept: application/json" \
  --data-binary "@${file}"
