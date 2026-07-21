#!/bin/bash

# Shared helper for downloading and extracting a GitLab CI job artifact.
# Sourced by scripts/deploy-cdse-{stage,otc,production}.sh.
# Requires GITLAB_API_TOKEN to be set and 'unzip' to be installed.

gitlab_api_url="https://hello.planet.com/code/api/v4"
gitlab_project_id="9206"

download_artifact() {
  local job_name="$1"
  local ref_name="$2"
  local artifact_dir_name="$3"
  local temp_local_path="$4"
  local artifact_zip="$temp_local_path.zip"

  if ! command -v unzip >/dev/null 2>&1; then
    echo "Error: 'unzip' is required to extract the downloaded artifact but was not found."
    exit 1
  fi

  rm -rf "$temp_local_path" "$artifact_zip"
  mkdir -p "$temp_local_path"

  echo "Download build artifact from GitLab CI"
  local http_status
  http_status=$(curl --silent --show-error --location --write-out "%{http_code}" --output "$artifact_zip" \
    --header "PRIVATE-TOKEN: $GITLAB_API_TOKEN" \
    "$gitlab_api_url/projects/$gitlab_project_id/jobs/artifacts/$ref_name/download?job=$job_name")

  if [ "$http_status" -ne 200 ]; then
    echo "Error: Failed to download artifact for job $job_name on ref $ref_name (HTTP $http_status)."
    rm -f "$artifact_zip"
    exit 1
  fi

  if ! unzip -q -o "$artifact_zip" -d "$temp_local_path"; then
    echo "Error: Failed to extract artifact archive $artifact_zip."
    rm -f "$artifact_zip"
    exit 1
  fi
  rm -f "$artifact_zip"

  if [ ! -d "$temp_local_path/$artifact_dir_name" ]; then
    echo "Error: Expected directory $temp_local_path/$artifact_dir_name not found after extraction."
    exit 1
  fi
}
